'use client';

import { 
  Building2, 
  Trash2, 
  Plus, 
  Search, 
  History as HistoryIcon, 
  ChevronRight, 
  Wallet,
  Calculator,
  ArrowRight,
  User,
  Package,
  ShieldCheck,
  X,
  CreditCard,
  Zap,
  RefreshCcw,
  ArrowUpRight,
  Store,
  Tag,
  ShoppingBag,
  PackageOpen,
  LayoutList,
  BookOpen
} from "lucide-react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getSuppliers, getAccounts, getConfig, postExpense, getSuppliersBySearch, getSupplierBalance, postSupplierSettlement, upsertAccount, getAccountCategories } from "@/actions/hotel";
import { formatCurrency, cn, handleEnterAsTab, formatDate } from "@/lib/utils";
import Combobox from "@/components/Combobox";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import PageBanner from "@/components/PageBanner";
import SuccessModal from "@/components/SuccessModal";
import QuickSupplier from "@/components/QuickSupplier";

export default function PurchaseEntry() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastVoucher, setLastVoucher] = useState<{id: string, amount: number} | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierBalance, setSupplierBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settlementForm, setSettlementForm] = useState<any>({
    mode: 'CASH',
    amount: 0,
    date: '',
    note: ''
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [isAddLedgerOpen, setIsAddLedgerOpen] = useState(false);
  const [newLedgerForm, setNewLedgerForm] = useState({ name: '', code: '', type: 'EXPENSE', category: '', parentId: '', creditLimit: 0 });
  const [isAddingLedger, setIsAddingLedger] = useState(false);
  const [addLedgerTargetIdx, setAddLedgerTargetIdx] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<any>({
    vendor: '',
    vendorId: '',
    vendorAccountId: '',
    date: '',
    items: [{ category: 'Inventory Purchase', qty: 1, rate: 0, amount: 0, note: '' }],
    settlements: [{ mode: 'CASH', amount: 0, status: 'Completed' }],
    paymentMode: 'CASH', // Legacy support
    note: ''
  });

  const router = useRouter();

  const postableAccounts = useMemo(() => {
    const parentIds = new Set(accounts.filter((a: any) => a.parentId).map((a: any) => a.parentId));
    return accounts.filter((a: any) => a.type === 'EXPENSE');
  }, [accounts, accounts.length]);

  const refreshSuppliers = useCallback(async () => {
    try {
      const sData = await getSuppliers();
      setSuppliers(sData);
    } catch (e) {
      console.error("Refresh suppliers error:", e);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const combinedSuppliers = useMemo(() => {
    const list = [...suppliers];
    const creditorAccounts = accounts.filter((a: any) => 
      a.type === 'LIABILITY' && 
      (a.category === 'TRADE PAYABLES' || a.category?.toUpperCase() === 'SUNDRY CREDITORS' || a.parentId === 'ACC-2300' || a.parentId === '2300')
    );
    const linkedAccountIds = new Set(suppliers.map((s: any) => s.accountId).filter(Boolean));
    
    creditorAccounts.forEach((acc: any) => {
      if (!linkedAccountIds.has(acc.id)) {
        list.push({
          id: `pseudo-${acc.id}`,
          name: acc.name,
          accountId: acc.id,
          pan: '',
          phone: acc.code || '',
          type: 'CREDITOR_ACCOUNT'
        });
      }
    });
    return list;
  }, [suppliers, accounts]);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return combinedSuppliers;
    const query = searchQuery.toLowerCase();
    return combinedSuppliers.filter((s: any) => 
      s.name?.toLowerCase().includes(query) || 
      s.phone?.toLowerCase().includes(query) ||
      (s.pan && s.pan.toLowerCase().includes(query))
    );
  }, [combinedSuppliers, searchQuery]);

  useEffect(() => {
    async function load() {
      const [sData, aData, cData, catsData] = await Promise.all([
        getSuppliers(),
        getAccounts(),
        getConfig(),
        getAccountCategories()
      ]);
      setSuppliers(sData);
      setAccounts(aData);
      setCategories(catsData);
      setConfig(cData);
      setForm((prev: any) => ({ 
        ...prev, 
        date: cData?.businessDate || new Date().toISOString().split('T')[0],
        items: [{ category: aData.find(a => (a.type === 'EXPENSE' || a.name.includes('Purchase')) && !aData.some((p: any) => p.parentId === a.id))?.name || 'Inventory Purchase', qty: 1, rate: 0, amount: 0, note: '' }]
      }));

      // Check for edit source (Deferred Correction)
      const editSource = sessionStorage.getItem('edit_source');
      if (editSource) {
         try {
            const data = JSON.parse(editSource);
            setForm((prev: any) => ({ 
               ...prev, 
               ...data, 
               id: undefined, 
               isVoided: false, 
               voidReason: undefined, 
               voidedAt: undefined,
               originalId: data.originalId,
               date: cData?.businessDate || data.date 
            }));
            if (data.vendor) setSearchQuery(data.vendor);
            sessionStorage.removeItem('edit_source');
         } catch(e) {
            console.error("EDIT_HYDRATION_ERROR:", e);
         }
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!form.vendor) {
      setSupplierBalance(null);
    }
  }, [form.vendor]);

  const handleSupplierSearch = (val: string) => {
    setSearchQuery(val);
    setShowDropdown(true);
  };

  const selectSupplier = async (s: any) => {
    setForm((prev: any) => ({ ...prev, vendor: s.name, vendorId: s.id, vendorAccountId: s.accountId || '' }));
    setSearchQuery(s.name);
    setShowDropdown(false);

    try {
      setLoadingBalance(true);
      const bal = await getSupplierBalance(s.name, s.accountId || '');
      setSupplierBalance(bal);
    } catch (e) {
      console.error("Balance retrieval failed:", e);
      setSupplierBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...form.items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'qty' || field === 'rate') {
      const q = parseFloat(field === 'qty' ? value : item.qty) || 0;
      const r = parseFloat(field === 'rate' ? value : item.rate) || 0;
      item.amount = q * r;
    } else if (field === 'amount') {
      const amt = parseFloat(value) || 0;
      const q = parseFloat(item.qty) || 1;
      item.rate = amt / q;
    }
    newItems[index] = item;
    setForm((prev: any) => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setForm((prev: any) => ({ 
      ...prev, 
      items: [...prev.items, { category: accounts.find(a => (a.type === 'EXPENSE' || a.name.includes('Purchase')) && !accounts.some((p: any) => p.parentId === a.id))?.name || 'Inventory Purchase', qty: 1, rate: 0, amount: 0, note: '' }] 
    }));
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm((prev: any) => ({ 
      ...prev, 
      items: prev.items.filter((_: any, i: number) => i !== index) 
    }));
  };

  const addSettlement = () => {
    setForm((prev: any) => ({
      ...prev,
      settlements: [...prev.settlements, { mode: 'CASH', amount: 0, status: 'Completed' }]
    }));
  };

  const updateSettlement = (index: number, field: string, value: any) => {
    const newSettlements = [...form.settlements];
    newSettlements[index] = { ...newSettlements[index], [field]: value };
    setForm((prev: any) => ({ ...prev, settlements: newSettlements }));
  };

  const removeSettlement = (index: number) => {
    if (form.settlements.length <= 1) return;
    setForm((prev: any) => ({
      ...prev,
      settlements: prev.settlements.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleAddLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerForm.name || !newLedgerForm.type) return;
    setIsAddingLedger(true);
    try {
      const normalSide = ['ASSET', 'EXPENSE'].includes(newLedgerForm.type) ? 'Debit' : 'Credit';
      const newAcc = {
        id: `ACC-${Date.now()}`,
        code: newLedgerForm.code || `EXP-${Math.floor(Math.random() * 9000) + 1000}`,
        name: newLedgerForm.name.toUpperCase(),
        type: newLedgerForm.type,
        category: newLedgerForm.category.toUpperCase() || 'GENERAL OPERATIONS',
        normal: normalSide,
        balance: 0,
        isActive: true,
        parentId: newLedgerForm.parentId || undefined
      };
      
      const res = await upsertAccount(newAcc);
      if (res.success) {
        setAccounts(prev => [...prev, newAcc]);
        if (addLedgerTargetIdx !== null) {
            updateItem(addLedgerTargetIdx, 'category', newAcc.name);
        }
        setIsAddLedgerOpen(false);
        setNewLedgerForm({ name: '', code: '', type: 'EXPENSE', category: '', parentId: '', creditLimit: 0 });
      } else {
        alert("Failed to add account head");
      }
    } catch (e) {
      console.error(e);
      alert("Error adding account head");
    } finally {
      setIsAddingLedger(false);
    }
  };

  const totalAmount = form.items.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0);
  const settlementTotal = form.settlements.reduce((sum: number, s: any) => sum + (parseFloat(s.amount as any) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(totalAmount - settlementTotal) > 0.01) return;

    // Resolve vendor/party if they typed it manually without clicking dropdown
    let finalForm = { ...form };
    if (searchQuery && (!form.vendor || form.vendor !== searchQuery)) {
       const matched = combinedSuppliers.find((s: any) => s.name.toUpperCase() === searchQuery.toUpperCase());
       if (matched) {
          finalForm.vendor = matched.name;
          finalForm.vendorId = matched.id;
          finalForm.vendorAccountId = matched.accountId || '';
       } else {
          finalForm.vendor = searchQuery.toUpperCase();
       }
    }

    setLoading(true);
    try {
      const res = await postExpense(finalForm);
      if (res.success) {
        setLastVoucher({ ...finalForm, id: res.id || '', amount: totalAmount });
        setIsSuccessModalOpen(true);
      } else {
        alert("Failed to post expenditure: " + (res.error || "Unknown error"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Error posting expenditure: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsSuccessModalOpen(false);
    setForm({
      vendor: '',
      vendorId: '',
      vendorAccountId: '',
      date: config?.businessDate || new Date().toISOString().split('T')[0],
      items: [{ category: accounts.find(a => a.type === 'EXPENSE' || a.name.includes('Purchase'))?.name || 'Inventory Purchase', qty: 1, rate: 0, amount: 0, note: '' }],
      settlements: [{ mode: 'CASH', amount: 0, status: 'Completed' }],
      paymentMode: 'CASH',
      note: ''
    });
    setSearchQuery('');
    setSupplierBalance(null);
    setLoadingBalance(false);
    setShowSettlementModal(false);
  };

  if (loading && !accounts.length) return (
    <div className="flex items-center justify-center h-full gap-3">
       <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-[var(--radius-md)] animate-spin" />
       <span className="text-[0.6rem] font-bold uppercase tracking-widest text-rose-600 ">Synchronizing Expenditure Registry...</span>
    </div>
  );

  return (
    <div className="p-6 max-w-[1550px] mx-auto min-h-screen bg-white institutional-report-root animate-fadeIn">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print border-b border-slate-200 pb-4">
         <div>
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-xl font-black text-slate-950 uppercase tracking-tighter">PROCUREMENT ENTRY</h1>
            </div>
            <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Authorized Expenditure Protocol Suite</p>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/purchase-report')}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-black text-[0.55rem] rounded-[var(--radius-sm)] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
               <HistoryIcon className="w-3.5 h-3.5" /> RECENT ARCHIVE
            </button>
            <button 
              onClick={() => resetForm()}
              className="w-8 h-8 bg-rose-50 border border-rose-200 rounded-[var(--radius-sm)] flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-all active:scale-95 group"
            >
               <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </button>
         </div>
      </div>

      <form 
        onSubmit={handleSubmit} 
        onKeyDown={handleEnterAsTab}
        className="grid grid-cols-12 gap-6"
      >
        
        <div className="col-span-12 lg:col-span-8 space-y-6">
           {/* VENDOR REGISTRY */}
           <section className="bg-white">
              <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                     <h3 className="text-[0.6rem] font-black text-slate-700 uppercase tracking-widest">Subsidiary Vendor Registry</h3>
                  </div>
                  <button 
                     type="button"
                     onClick={() => setShowSupplierModal(true)}
                     className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded text-[0.55rem] uppercase tracking-widest font-black hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                     <Plus className="w-3 h-3" /> New Vendor
                  </button>
              </div>

              <div className="p-1.5 sm:p-3 bg-white">
                  <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 lg:col-span-9 space-y-1 relative" ref={dropdownRef}>
                         <label className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest block mb-1">Vendor Full Name</label>
                         <div className="relative">
                            <input 
                               required
                               type="text" 
                               value={searchQuery}
                               onChange={(e) => handleSupplierSearch(e.target.value)}
                               onFocus={() => setShowDropdown(true)}
                               placeholder="Search vendor..."
                               className="w-full h-10 px-3 bg-white border border-slate-300 rounded outline-none focus:border-rose-500 text-[0.6rem] font-black text-slate-900 uppercase tracking-tight transition-colors shadow-sm"
                            />
                            <AnimatePresence>
                               {showDropdown && filteredSuppliers.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-b-[var(--radius-sm)] shadow-2xl z-50 max-h-[180px] overflow-y-auto overflow-x-hidden p-1 scrollbar-hide">
                                     {filteredSuppliers.map((s: any, idx: number) => (
                                        <button key={idx} type="button" onClick={() => selectSupplier(s)} className="w-full text-left p-2 hover:bg-rose-50 rounded-[var(--radius-xs)] border-b border-slate-50 flex items-center justify-between group/sitem">
                                           <div className="flex flex-col">
                                              <span className="text-[0.6rem] font-black text-slate-950 uppercase tracking-tight">{s.name}</span>
                                              <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">{s.pan || 'NO_VAT'} | {s.phone || 'NO_PH'}</span>
                                           </div>
                                           <ArrowRight className="w-3 h-3 text-slate-200 group-hover/sitem:text-rose-600" />
                                        </button>
                                     ))}
                                  </motion.div>
                               )}
                            </AnimatePresence>
                         </div>
                      </div>
                      <div className="col-span-12 lg:col-span-3 space-y-1">
                         <label className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest block mb-1">Voucher Date</label>
                         <div className="relative w-full h-10">
                            <div className="absolute inset-0 px-3 flex items-center bg-white border border-slate-300 rounded shadow-sm pointer-events-none">
                               <span className="text-[0.6rem] font-black text-slate-900 uppercase tracking-tight">{form.date ? formatDate(form.date) : ''}</span>
                            </div>
                            <input 
                               required
                               type="date" 
                               value={form.date} 
                               onChange={(e) => setForm({...form, date: e.target.value})} 
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }} 
                            />
                         </div>
                      </div>
                      {form.vendor && (
                         <div className="col-span-12 border-t border-slate-100 pt-3 mt-1 flex items-center justify-between animate-fadeIn">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                                  <Wallet className="w-4 h-4 text-slate-600" />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest leading-none">Outstanding Dues</span>
                                  <span className="text-[0.6rem] font-black text-slate-950 mt-1">
                                     {loadingBalance ? (
                                        <span className="text-[0.55rem] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Calculating Balance...</span>
                                     ) : (
                                        formatCurrency(supplierBalance || 0)
                                     )}
                                  </span>
                               </div>
                            </div>
                            {supplierBalance !== null && supplierBalance > 0 && !loadingBalance && (
                               <button 
                                 type="button" 
                                 onClick={() => {
                                    setSettlementForm({
                                       mode: 'CASH',
                                       amount: supplierBalance,
                                       date: form.date || config?.businessDate || new Date().toISOString().split('T')[0],
                                       note: `SETTLEMENT OF OUTSTANDING DUES`
                                    });
                                    setShowSettlementModal(true);
                                 }}
                                 className="h-8 px-4 bg-white hover:bg-rose-600 text-white text-[0.55rem] font-black uppercase tracking-widest rounded-[var(--radius-sm)] shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                               >
                                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Settle Dues
                               </button>
                            )}
                         </div>
                      )}
                  </div>
              </div>
           </section>

           {/* EXPENDITURE ITEMIZATION */}
           <section className="bg-white flex flex-col mt-4">
              <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 bg-slate-50">
                 <div className="flex items-center gap-2">
                    <h3 className="text-[0.6rem] font-black text-slate-700 uppercase tracking-widest">Expenditure Matrix</h3>
                 </div>
              </div>

              <div className="p-0 overflow-visible">
                  <table className="w-full text-left border-collapse text-[0.6rem] uppercase tracking-tight min-w-[800px]">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[0.55rem] font-black text-slate-500 tracking-widest text-left">
                           <th className="px-4 py-3 border-r border-slate-100">Ledger Category / Narrative</th>
                           <th className="px-4 py-3 border-r border-slate-100 text-center w-[80px]">Qty</th>
                           <th className="px-4 py-3 border-r border-slate-100 text-right w-[110px]">Rate</th>
                           <th className="px-4 py-3 border-r border-slate-100 text-right w-[130px]">Amount</th>
                           <th className="px-2 py-3 text-center w-[50px]"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 font-bold text-slate-950">
                         {form.items.map((item: any, idx: number) => (
                          <tr key={idx} className="bg-white group hover:bg-slate-50/50 transition-colors">
                             <td className="p-3 border-r border-slate-50">
                                <div className="flex flex-col gap-2">
                                   {(() => {
                                       const expenseAccounts = accounts.filter((a: any) => a.type === 'EXPENSE');
                                       const parentIds = new Set(expenseAccounts.map((a: any) => a.parentId).filter(Boolean));
                                       const leafAccounts = expenseAccounts;
                                       
                                       const options = leafAccounts.map((a: any) => {
                                          const parent = expenseAccounts.find((p: any) => p.id === a.parentId);
                                          const parentStr = parent ? `${parent.name.toUpperCase()} › ` : '';
                                          return {
                                             label: `${parentStr}${a.name.toUpperCase()}`,
                                             value: a.name
                                          };
                                       });

                                       return (
                                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 h-10 rounded shrink-0 transition-all w-full relative shadow-sm focus-within:border-rose-500">
                                             <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                             <Combobox 
                                                value={item.category} 
                                                onChange={(val) => updateItem(idx, 'category', val)}
                                                options={options}
                                                placeholder="Search Expense Category..."
                                                className="bg-transparent border-none outline-none font-black text-slate-900 text-[0.6rem] uppercase tracking-tight w-full"
                                                dropdownClassName="w-[300px]"
                                             />
                                             <button 
                                                type="button"
                                                onClick={() => {
                                                   setAddLedgerTargetIdx(idx);
                                                   setIsAddLedgerOpen(true);
                                                }}
                                                className="w-5 h-5 bg-white border border-slate-200 text-slate-400 rounded hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center justify-center shrink-0 shadow-sm"
                                                title="Add New Category"
                                             >
                                                <Plus className="w-3 h-3" />
                                             </button>
                                          </div>
                                       );
                                    })()}
                                   <input 
                                      value={item.note} 
                                      onChange={(e) => updateItem(idx, 'note', e.target.value)}
                                      placeholder="Supplementary Note..." 
                                      className="w-full bg-transparent border-none outline-none text-slate-500 text-[0.55rem] font-black uppercase tracking-widest pl-1 py-1"
                                   />
                                </div>
                             </td>
                             <td className="p-3 border-r border-slate-50 bg-slate-50/10 w-[80px]">
                                <input 
                                   type="number"
                                   value={item.qty === 0 ? '' : (item.qty ?? 1)} 
                                   onChange={(e) => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                                   placeholder="1" 
                                   className="w-full h-10 bg-white border border-slate-200 rounded px-2 font-black text-slate-900 text-[0.6rem] uppercase tracking-tight text-center outline-none focus:border-rose-500 shadow-sm"
                                />
                             </td>
                             <td className="p-3 border-r border-slate-50 w-[110px]">
                                <input 
                                   type="number"
                                   value={item.rate === 0 ? '' : (item.rate ?? (parseFloat(item.amount) || 0))} 
                                   onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                                   placeholder="0.00" 
                                   className="w-full h-10 bg-white border border-slate-200 rounded px-2 font-black text-slate-900 text-[0.6rem] uppercase tracking-tight text-right outline-none focus:border-rose-500 shadow-sm"
                                />
                             </td>
                             <td className="p-3 border-r border-slate-50 bg-slate-50/30 group-hover:bg-rose-50/30 w-[130px]">
                                <input 
                                   type="number" 
                                   value={item.amount || ''} 
                                   onChange={(e) => updateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                   className="w-full bg-transparent border-none outline-none font-black text-emerald-600 text-[0.6rem] uppercase tracking-tight text-right italic"
                                   placeholder="0.00"
                                />
                             </td>
                             <td className="p-3 text-center w-[50px]">
                                <button 
                                   type="button"
                                   onClick={() => removeItem(idx)}
                                   className="w-6 h-6 flex items-center justify-center text-slate-200 hover:text-rose-600 transition-colors"
                                >
                                   <X className="w-4 h-4" />
                                </button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
                 <button 
                    type="button"
                    onClick={addItem}
                    className="w-full py-3 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2 border-t border-slate-200"
                 >
                    <Plus className="w-4 h-4" /> Add Row
                 </button>
              </div>
           </section>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
           {/* SETTLEMENT AUDIT */}
           <section className="bg-white p-4 rounded border border-slate-200 shadow-sm relative group">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                 <h3 className="text-sm font-semibold text-slate-800">Settlement Audit</h3>
                 <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-slate-500" />
                 </div>
              </div>

              <div className="flex flex-col bg-slate-50 border border-slate-200 p-4 rounded mb-4">
                 <span className="text-xs font-semibold text-slate-600 mb-1">Total Liability NPR</span>
                 <span className="text-2xl font-bold text-slate-900 leading-none">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[0.6rem] font-black text-slate-700 uppercase tracking-widest">Partition Registry</span>
                     <button type="button" onClick={addSettlement} className="h-6 px-2 bg-white border border-slate-300 rounded text-[0.55rem] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all">Split Payment</button>
                  </div>
                  
                  <div className="space-y-2">
                     {form.settlements.map((s: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 p-2 border border-slate-200 rounded space-y-2 group/s">
                           <div className="flex items-center justify-between gap-2 h-9">
                              <select
                                 value={s.mode}
                                 onChange={(e) => updateSettlement(idx, 'mode', e.target.value)}
                                 className="flex-1 h-9 bg-white border border-slate-200 rounded px-2 font-black text-slate-900 text-[0.6rem] uppercase tracking-tight outline-none focus:border-rose-500 cursor-pointer"
                              >
                                 <option value="">-- Select Mode --</option>
                                 <option value="PAYABLE">Deferred / Credit (Payable)</option>
                                 {(config?.paymentModes || []).map((pm: any, pmIdx: number) => (
                                    <option key={pmIdx} value={pm.label}>{pm.label}</option>
                                 ))}
                              </select>
                              <input 
                                 type="number" 
                                 value={s.amount || ''} 
                                 onChange={(e) => updateSettlement(idx, 'amount', parseFloat(e.target.value) || 0)} 
                                 className="w-28 h-9 px-2 bg-white border border-slate-200 rounded font-black text-slate-900 text-[0.6rem] uppercase tracking-tight text-right outline-none focus:border-rose-500" 
                                 placeholder="0.00" 
                              />
                              {form.settlements.length > 1 && (
                                 <button type="button" onClick={() => removeSettlement(idx)} className="p-1 text-slate-400 hover:text-rose-600 transition-all"><X className="w-4 h-4" /></button>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>

                  <button 
                     type="button"
                     onClick={addSettlement}
                     className="w-full py-2 bg-white border border-slate-300 rounded text-slate-700 text-[0.55rem] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 mb-4 mt-2 shadow-sm"
                  >
                     <Plus className="w-3 h-3" /> Add Settlement
                  </button>

                  <div className="space-y-2 pt-4 border-t border-slate-200 font-bold text-[0.6rem] uppercase tracking-tight text-slate-950">
                     <div className="flex items-center justify-between">
                        <span className="text-[0.55rem] text-slate-500 tracking-widest font-black">Calculated Total</span>
                        <span className="font-black">{formatCurrency(totalAmount)}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-[0.55rem] text-slate-500 tracking-widest font-black">Total Allocated</span>
                        <span className="font-black">{formatCurrency(settlementTotal)}</span>
                     </div>
                     
                     <div className={cn(
                        "mt-3 p-3 rounded flex items-center justify-between transition-all border",
                        (Math.abs(totalAmount - settlementTotal) < 0.01) ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
                     )}>
                        <div className="flex flex-col">
                           <span className={cn("text-[0.55rem] font-black uppercase tracking-widest", (Math.abs(totalAmount - settlementTotal) < 0.01) ? "text-emerald-700" : "text-rose-700")}>
                              { (Math.abs(totalAmount - settlementTotal) < 0.01) ? "Fully Allocated" : "Variance Remaining" }
                           </span>
                           <span className={cn("text-[0.8rem] font-black", (Math.abs(totalAmount - settlementTotal) < 0.01) ? "text-emerald-800" : "text-rose-800")}>
                              {formatCurrency(totalAmount - settlementTotal)}
                           </span>
                        </div>
                     </div>

                     <div className="space-y-1 mt-4">
                        <label className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest block">Administrative Notes</label>
                        <textarea 
                           value={form.note}
                           onChange={(e) => setForm({...form, note: e.target.value})}
                           placeholder="Reason for expenditure..."
                           className="w-full h-16 p-2 bg-white border border-slate-300 rounded outline-none focus:border-rose-500 text-[0.6rem] font-black text-slate-900 uppercase tracking-tight resize-none shadow-sm"
                        />
                     </div>

                     <button 
                        type="submit"
                        disabled={loading || Math.abs(totalAmount - settlementTotal) > 0.01 || totalAmount <= 0}
                        className={cn(
                           "w-full py-3.5 mt-3 font-black text-[0.6rem] uppercase tracking-widest rounded shadow transition-all active:scale-[0.99] disabled:opacity-50",
                           form.originalId ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"
                        )}
                     >
                        {loading ? 'Processing...' : (form.originalId ? 'Update & Post' : 'Commit Expenditure')}
                     </button>
                  </div>
               </div>
           </section>
        </div>
      </form>

      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={resetForm}
        title="Purchase Saved"
        subtitle="The purchase voucher has been saved successfully"
        id={lastVoucher?.id}
        amount={lastVoucher?.amount}
        onPrint={() => { window.print(); setIsSuccessModalOpen(false); }}
        onSecondary={resetForm}
        secondaryLabel="New Purchase"
      />

      <AnimatePresence>
        {showSupplierModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-white/80 backdrop-blur-md">
             <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="bg-white rounded-[var(--radius-md)] w-full max-w-[800px] overflow-hidden shadow-2xl">
                <div className="px-4 py-1.5 bg-white text-white flex justify-between items-center border-b border-white/10">
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-rose-600 rounded flex items-center justify-center"><User className="w-3.5 h-3.5 text-white" /></div>
                      <div>
                         <h3 className="text-[0.6rem] font-normal uppercase leading-none">Institutional Onboarding</h3>
                         <p className="text-[0.55rem] font-bold text-white/70 uppercase tracking-widest mt-1">Adding new profile</p>
                      </div>
                   </div>
                   <button onClick={() => setShowSupplierModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-0">
                   <QuickSupplier onSuccess={() => { setShowSupplierModal(false); refreshSuppliers(); }} />
                </div>
             </motion.div>
          </div>
        )}
        {showSettlementModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-white/80 backdrop-blur-md">
             <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="bg-white rounded-[var(--radius-md)] w-full max-w-[550px] overflow-hidden shadow-2xl">
                <div className="px-4 py-3 bg-white text-white flex justify-between items-center border-b border-white/10">
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-rose-600 rounded flex items-center justify-center"><Wallet className="w-3.5 h-3.5 text-white" /></div>
                      <div>
                         <h3 className="text-[0.6rem] font-black uppercase leading-none">Vendor Payment Settlement</h3>
                         <p className="text-[0.55rem] font-bold text-white/70 uppercase tracking-widest mt-1">Settle Outstanding Creditor Dues</p>
                      </div>
                   </div>
                   <button type="button" onClick={() => setShowSettlementModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={async (e) => {
                   e.preventDefault();
                   if (settlementForm.amount <= 0 || settling) return;
                   
                   setSettling(true);
                   try {
                      const res = await postSupplierSettlement({
                         supplierName: form.vendor,
                         accountId: form.vendorAccountId,
                         paymentMode: settlementForm.mode,
                         amount: settlementForm.amount,
                         date: settlementForm.date,
                         note: settlementForm.note
                      });
                      
                      if (res.success) {
                         // Successfully settled!
                         // Update balance locally by subtracting the paid amount
                         setSupplierBalance(prev => prev !== null ? Math.max(0, prev - settlementForm.amount) : 0);
                         setShowSettlementModal(false);
                         alert(`Outstanding dues of ${form.vendor} successfully settled by ${formatCurrency(settlementForm.amount)}.`);
                      }
                   } catch(err: any) {
                      console.error("Settlement error:", err);
                      alert(err.message || "Unable to authorize payment settlement.");
                   } finally {
                      setSettling(false);
                   }
                }} className="p-6 space-y-4">
                   <div className="space-y-1">
                      <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest block">Creditor / Party</label>
                      <p className="text-[0.6rem] font-black text-slate-950 uppercase">{form.vendor}</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest block">Total Outstanding Dues</label>
                         <p className="text-[0.6rem] font-black text-rose-600 font-mono">{formatCurrency(supplierBalance || 0)}</p>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest block">Settlement Date</label>
                         <div className="relative w-full h-9">
                            <div className="absolute inset-0 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] pointer-events-none">
                               <span className="font-bold text-slate-950 text-[0.6rem] uppercase">{settlementForm.date ? formatDate(settlementForm.date) : ''}</span>
                            </div>
                            <input 
                               required
                               type="date" 
                               value={settlementForm.date} 
                               onChange={(e) => setSettlementForm({...settlementForm, date: e.target.value})} 
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }} 
                            />
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest block">Payment Mode</label>
                         <Combobox
                            value={settlementForm.mode}
                            onChange={(val) => setSettlementForm({...settlementForm, mode: val as any})}
                            options={['CASH', 'BANK', 'CHEQUE', 'E-BANKING'].map(m => ({ label: m, value: m }))}
                            className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] font-bold text-slate-950 text-[0.6rem] uppercase outline-none"
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest block">Amount Paid (NPR)</label>
                         <input 
                            required
                            type="number"
                            step="any"
                            max={supplierBalance || undefined}
                            min={0.01}
                            value={settlementForm.amount || ''} 
                            onChange={(e) => setSettlementForm({...settlementForm, amount: parseFloat(e.target.value) || 0})} 
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] font-bold text-slate-950 text-[0.6rem] text-right text-rose-600 outline-none focus:border-rose-600" 
                            placeholder="0.00" 
                         />
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest block">Settlement Narrative / Note</label>
                      <textarea 
                         value={settlementForm.note}
                         onChange={(e) => setSettlementForm({...settlementForm, note: e.target.value.toUpperCase()})}
                         placeholder="SETTLEMENT REMARKS..."
                         className="w-full h-16 p-2 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none focus:border-rose-600 font-bold text-slate-950 text-[0.55rem] uppercase placeholder:opacity-30 scrollbar-hide resize-none"
                      />
                   </div>

                   <button 
                      type="submit"
                      disabled={settling || settlementForm.amount <= 0}
                      className="w-full py-4 bg-white hover:bg-rose-600 text-white font-bold text-[0.6rem] uppercase tracking-widest rounded-[var(--radius-md)] shadow-xl transition-all active:scale-95 disabled:opacity-30"
                   >
                      {settling ? 'AUTHORIZING SETTLEMENT...' : 'EXECUTE PAYMENT SETTLEMENT'}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
        {isAddLedgerOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
               <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[500px] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic">Fiscal Identity Node</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure Ledger Architecture Parameter</p>
                     </div>
                     <button type="button" onClick={()=>setIsAddLedgerOpen(false)} className="p-2 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all"><Plus className="w-5 h-5 rotate-45" /></button>
                  </div>
                  <form onSubmit={handleAddLedger} className="p-8 space-y-6">
                     <div className="space-y-2">
                        <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Account Descriptive Title</label>
                        <input type="text" value={newLedgerForm.name} onChange={(e)=>setNewLedgerForm({...newLedgerForm, name: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs focus:border-indigo-600 transition-all uppercase tracking-tight" placeholder="E.G. ROOM REVENUE" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block flex items-center justify-between">
                            System Code ID
                            <button 
                               type="button"
                               onClick={() => setNewLedgerForm({...newLedgerForm, code: `4${Math.floor(Math.random() * 900) + 100}`})}
                               className="text-[0.55rem] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-600 hover:text-white transition-all font-bold uppercase tracking-widest"
                            >Suggest Pattern Code</button>
                         </label>
                           <input type="text" value={newLedgerForm.code} onChange={(e)=>setNewLedgerForm({...newLedgerForm, code: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Classification Root</label>
                           <select value={newLedgerForm.type} onChange={(e)=>setNewLedgerForm({...newLedgerForm, type: e.target.value, category: '', parentId: ''})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                              {['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].map(t=><option key={t} value={t}>{t}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Functional Category Class</label>
                        <select value={newLedgerForm.category} onChange={(e)=>setNewLedgerForm({...newLedgerForm, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                           <option value="">-- SELECT CATEGORY --</option>
                           {categories.filter((c: any) => c.type === newLedgerForm.type).map((c: any)=><option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Parent Identity Mapping (Head Account)</label>
                        <select 
                           value={newLedgerForm.parentId || ''} 
                           onChange={(e)=>{
                              const parentId = e.target.value;
                              const parent = accounts.find(a => a.id === parentId);
                              if (parent) {
                                 setNewLedgerForm({
                                    ...newLedgerForm, 
                                    parentId, 
                                    type: parent.type, 
                                    category: parent.category || ''
                                 });
                              } else {
                                 setNewLedgerForm({...newLedgerForm, parentId: ''});
                              }
                           }} 
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] uppercase tracking-widest"
                        >
                           <option value="">-- TOP-LEVEL (ROOT HEAD) --</option>
                           {accounts.filter(a => !a.parentId && a.id !== newLedgerForm.code && a.type === newLedgerForm.type).map(a => (
                              <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>
                           ))}
                        </select>
                     </div>
                      {newLedgerForm.type === 'REVENUE' && (
                         <div className="space-y-2">
                            <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Standard Sells Rate / Base Price (Rs.)</label>
                            <input 
                               type="number" 
                               value={newLedgerForm.creditLimit || ''} 
                               onChange={(e)=>setNewLedgerForm({...newLedgerForm, creditLimit: parseFloat(e.target.value) || 0})} 
                               className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs focus:border-indigo-600 transition-all" 
                               placeholder="0.00" 
                            />
                         </div>
                      )}
                      <button type="submit" disabled={isAddingLedger || !newLedgerForm.name} className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-indigo-100 disabled:opacity-50">
                         {isAddingLedger ? 'COMMITTING...' : 'COMMIT TO LEDGER REGISTRY'}
                      </button>
                  </form>
               </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
