'use client';

import { 
  History, 
  Trash2, 
  ArrowRightLeft,
  ShieldCheck,
  Zap,
  Wallet,
  Download,
  Upload,
  ArrowRight,
  Plus,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { postJV, upsertAccount } from "@/actions/hotel";
import { cn, handleEnterAsTab, formatDate } from "@/lib/utils";
import Combobox from "@/components/Combobox";
import { useRouter } from "next/navigation";
import PageBanner from "@/components/PageBanner";
import SuccessModal from "@/components/SuccessModal";

export default function FinanceClient({ accounts, config, categories = [] }: { accounts: any[], config: any, categories?: any[] }) {
  const [localAccounts, setLocalAccounts] = useState(accounts);
  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  const [loading, setLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastVoucher, setLastVoucher] = useState<{id: string, amount: number} | null>(null);

  const [isAddLedgerOpen, setIsAddLedgerOpen] = useState(false);
  const [addLedgerTarget, setAddLedgerTarget] = useState<'from' | 'to'>('from');
  const [newLedgerForm, setNewLedgerForm] = useState({ name: '', code: '', type: 'EXPENSE', category: '', parentId: '', creditLimit: 0 });
  const [isAddingLedger, setIsAddingLedger] = useState(false);

  const [entryType, setEntryType] = useState<'PAYMENT' | 'RECEIPT' | 'DEPOSIT'>('PAYMENT');
  
  const [simpleForm, setSimpleForm] = useState({
     date: config?.businessDate || new Date().toISOString().split('T')[0],
     fromAcc: '',
     toAcc: '',
     amount: '',
     note: ''
  });

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simpleForm.fromAcc || !simpleForm.toAcc || !simpleForm.amount || parseFloat(simpleForm.amount) <= 0) {
       alert("Please fill all required fields correctly.");
       return;
    }
    setLoading(true);
    
    let debitAcc = '';
    let creditAcc = '';
    
    if (entryType === 'PAYMENT') {
       debitAcc = simpleForm.toAcc;
       creditAcc = simpleForm.fromAcc;
    } else if (entryType === 'RECEIPT') {
       debitAcc = simpleForm.toAcc;
       creditAcc = simpleForm.fromAcc;
    } else if (entryType === 'DEPOSIT') {
       debitAcc = simpleForm.toAcc;
       creditAcc = simpleForm.fromAcc;
    }

    const dAcc = localAccounts.find((a: any) => a.id === debitAcc);
    const cAcc = localAccounts.find((a: any) => a.id === creditAcc);

    const payload = {
       date: simpleForm.date,
       note: simpleForm.note || `${entryType} ENTRY`,
       entryType,
       items: [
          { accountId: debitAcc, accountName: dAcc?.name || '', description: simpleForm.note || entryType, debit: parseFloat(simpleForm.amount), credit: 0 },
          { accountId: creditAcc, accountName: cAcc?.name || '', description: simpleForm.note || entryType, debit: 0, credit: parseFloat(simpleForm.amount) }
       ]
    };

    try {
      const res = await postJV(payload);
      if (res.success) {
        setLastVoucher({ id: res.refId || '', amount: parseFloat(simpleForm.amount) });
        setIsSuccessModalOpen(true);
      } else {
        alert("Failed to post entry: " + (res.error || "Unknown error"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Error posting transaction: " + (e.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsSuccessModalOpen(false);
    setSimpleForm({
      date: config?.businessDate || (() => {
         const now = new Date();
         return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      })(),
      fromAcc: '',
      toAcc: '',
      amount: '',
      note: ''
    });
  };

  const handleAddLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerForm.name || !newLedgerForm.type) return;
    setIsAddingLedger(true);
    try {
      const normalSide = ['ASSET', 'EXPENSE'].includes(newLedgerForm.type) ? 'Debit' : 'Credit';
      const newAcc = {
        id: `ACC-${Date.now()}`,
        code: newLedgerForm.code || `CA-${Math.floor(Math.random() * 9000) + 1000}`,
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
        setLocalAccounts(prev => [...prev, newAcc]);
        if (addLedgerTarget === 'from') {
           setSimpleForm(prev => ({...prev, fromAcc: newAcc.id}));
        } else {
           setSimpleForm(prev => ({...prev, toAcc: newAcc.id}));
        }
        setIsAddLedgerOpen(false);
        setNewLedgerForm({ name: '', code: '', type: 'EXPENSE', category: '', parentId: '', creditLimit: 0 });
        router.refresh();
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

  const parentIds = new Set(localAccounts.map((a: any) => a.parentId).filter(Boolean));
  const leafAccounts = localAccounts.filter((a: any) => !parentIds.has(a.id));

  const cashBankAccounts = leafAccounts.filter((a: any) => a.category === 'CASH & EQUIVALENTS' || a.name.toUpperCase().includes('CASH') || a.name.toUpperCase().includes('BANK'));
  const cashAccounts = leafAccounts.filter((a: any) => a.category === 'CASH & EQUIVALENTS' || a.name.toUpperCase().includes('CASH'));
  const bankAccounts = leafAccounts.filter((a: any) => a.category === 'CASH & EQUIVALENTS' || a.name.toUpperCase().includes('BANK'));

  const expenseAndVendorAccounts = leafAccounts.filter((a: any) => a.type === 'LIABILITY');
  const revenueAndClientAccounts = leafAccounts.filter((a: any) => a.type === 'REVENUE' || a.type === 'ASSET' || a.type === 'LIABILITY');

  return (
    <div className="p-4 max-w-[1000px] mx-auto min-h-screen bg-slate-50 animate-fadeIn printable-doc">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
         <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
                  <Wallet className="w-5 h-5" />
               </div>
               <h1 className="text-2xl font-bold text-slate-900">Finance Entry</h1>
            </div>
            <p className="text-sm text-slate-500">Financial Operations Transaction Module</p>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/ledger')}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
               <History className="w-4 h-4" /> Ledger Registry
            </button>
            <button 
              onClick={() => resetForm()}
              className="w-9 h-9 bg-white border border-slate-200 rounded flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-all group"
            >
               <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </button>
         </div>
      </div>

      <div className="mb-6 flex gap-2">
         <button 
           type="button" 
           onClick={() => { setEntryType('PAYMENT'); resetForm(); }}
           className={cn("px-5 py-2 text-sm font-medium rounded transition-all flex items-center gap-2", entryType === 'PAYMENT' ? "bg-rose-600 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200")}
         >
            <Upload className="w-4 h-4" /> Payment
         </button>
         <button 
           type="button" 
           onClick={() => { setEntryType('RECEIPT'); resetForm(); }}
           className={cn("px-5 py-2 text-sm font-medium rounded transition-all flex items-center gap-2", entryType === 'RECEIPT' ? "bg-emerald-600 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200")}
         >
            <Download className="w-4 h-4" /> Receipt
         </button>
         <button 
           type="button" 
           onClick={() => { setEntryType('DEPOSIT'); resetForm(); }}
           className={cn("px-5 py-2 text-sm font-medium rounded transition-all flex items-center gap-2", entryType === 'DEPOSIT' ? "bg-indigo-600 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200")}
         >
            <ArrowRightLeft className="w-4 h-4" /> Bank Deposit (Contra)
         </button>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleEnterAsTab} className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden transition-all">
         <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
               <ShieldCheck className={cn("w-4 h-4", entryType === 'PAYMENT' ? 'text-rose-500' : entryType === 'RECEIPT' ? 'text-emerald-500' : 'text-indigo-500')} />
               <h3 className="text-sm font-semibold text-slate-800">{entryType.charAt(0) + entryType.slice(1).toLowerCase()} Entry</h3>
            </div>
            <div className="flex items-center gap-2 bg-white rounded px-3 py-1.5 border border-slate-200 relative shadow-sm">
               <span className="text-xs font-medium text-slate-500 pointer-events-none">Date:</span>
               <span className="bg-transparent border-none outline-none font-medium text-slate-900 text-sm pointer-events-none whitespace-nowrap">
                  {simpleForm.date ? formatDate(simpleForm.date) : ''}
               </span>
               <input type="date" value={simpleForm.date} onChange={(e) => setSimpleForm({...simpleForm, date: e.target.value})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }} required />
            </div>
         </div>

         <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
               <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-100 rounded-full items-center justify-center border border-slate-200 z-10">
                  <ArrowRight className="w-4 h-4 text-slate-400" />
               </div>

               {/* LEFT SIDE: FROM ACCOUNT */}
               <div className="space-y-2 relative z-20">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-600 block">
                       {entryType === 'PAYMENT' ? 'Paid From (Cash/Bank)' : entryType === 'RECEIPT' ? 'Received From (Source/Client)' : 'Deposit From (Cash)'}
                    </label>
                    <button type="button" onClick={() => { setAddLedgerTarget('from'); setIsAddLedgerOpen(true); }} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3 h-3" /> New</button>
                  </div>
                  {(() => {
                     const list = entryType === 'PAYMENT' ? cashBankAccounts : entryType === 'DEPOSIT' ? cashAccounts : revenueAndClientAccounts;
                     return (
                        <div className="border border-slate-300 rounded focus-within:border-indigo-500 transition-all bg-white h-12 flex items-center relative shadow-sm">
                           <Combobox
                              value={simpleForm.fromAcc}
                              onChange={(val) => setSimpleForm({...simpleForm, fromAcc: val})}
                              options={list.map((a: any) => ({ label: a.name, value: a.id }))}
                              placeholder="Search Account..."
                              className="w-full h-full px-4 bg-transparent font-medium text-slate-900 text-sm"
                           />
                        </div>
                     );
                  })()}
               </div>

               {/* RIGHT SIDE: TO ACCOUNT */}
               <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-600 block">
                       {entryType === 'PAYMENT' ? 'Paid To (Vendor)' : entryType === 'RECEIPT' ? 'Received Into (Cash/Bank)' : 'Deposit To (Bank)'}
                    </label>
                    <button type="button" onClick={() => { setAddLedgerTarget('to'); setIsAddLedgerOpen(true); }} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3 h-3" /> New</button>
                  </div>
                  {(() => {
                     const list = entryType === 'RECEIPT' ? cashBankAccounts : entryType === 'DEPOSIT' ? bankAccounts : expenseAndVendorAccounts;
                     return (
                        <div className="border border-slate-300 rounded focus-within:border-indigo-500 transition-all bg-white h-12 flex items-center relative shadow-sm">
                           <Combobox
                              value={simpleForm.toAcc}
                              onChange={(val) => setSimpleForm({...simpleForm, toAcc: val})}
                              options={list.map((a: any) => ({ label: a.name, value: a.id }))}
                              placeholder="Search Account..."
                              className="w-full h-full px-4 bg-transparent font-medium text-slate-900 text-sm"
                           />
                        </div>
                     );
                  })()}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">Amount (Rs.)</label>
                  <input 
                     type="number" 
                     min="0.01"
                     step="0.01"
                     value={simpleForm.amount}
                     onChange={(e) => setSimpleForm({...simpleForm, amount: e.target.value})}
                     placeholder="0.00"
                     className="w-full h-12 px-4 bg-white border border-slate-300 rounded outline-none focus:border-indigo-500 font-medium text-slate-900 text-lg transition-all shadow-sm"
                     required
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">Description / Note</label>
                  <input 
                     type="text" 
                     value={simpleForm.note}
                     onChange={(e) => setSimpleForm({...simpleForm, note: e.target.value})}
                     placeholder="Reason for transaction..."
                     className="w-full h-12 px-4 bg-white border border-slate-300 rounded outline-none focus:border-indigo-500 text-sm text-slate-900 transition-all shadow-sm"
                     required
                  />
               </div>
            </div>
         </div>

         <div className="p-6 bg-slate-50 border-t border-slate-100">
            <button 
               type="submit"
               disabled={loading}
               className={cn("w-full py-3.5 text-white font-medium text-sm rounded shadow transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2",
                  entryType === 'PAYMENT' ? 'bg-rose-600 hover:bg-rose-700' : 
                  entryType === 'RECEIPT' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                  'bg-indigo-600 hover:bg-indigo-700'
               )}
            >
               <Zap className="w-4 h-4 text-white/70" />
               {loading ? 'Processing...' : `Commit ${entryType.charAt(0) + entryType.slice(1).toLowerCase()}`}
            </button>
         </div>
      </form>

      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={resetForm}
        title="Transaction Recorded"
        subtitle={`${entryType} entry has been posted to the ledger`}
        id={lastVoucher?.id}
        amount={lastVoucher?.amount}
        onPrint={() => { window.print(); setIsSuccessModalOpen(false); }}
        onSecondary={resetForm}
        secondaryLabel="New Transaction"
      />

      {isAddLedgerOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
               <div className="bg-white rounded-[var(--radius-lg)] w-full max-w-[500px] overflow-hidden shadow-2xl border border-slate-200 animate-slideUpAndFade">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic">Fiscal Identity Node</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure Ledger Architecture Parameter</p>
                     </div>
                     <button type="button" onClick={()=>setIsAddLedgerOpen(false)} className="p-2 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all"><Plus className="w-5 h-5 rotate-45" /></button>
                  </div>
                  <form onSubmit={handleAddLedger} className="p-8 space-y-6">
                     <div className="space-y-2">
                        <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Account Full Name</label>
                        <input type="text" value={newLedgerForm.name} onChange={(e)=>setNewLedgerForm({...newLedgerForm, name: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs focus:border-indigo-600 transition-all uppercase tracking-tight" placeholder="E.G. MARKETING EXPENSE" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block flex items-center justify-between">
                            System Code ID
                            <button 
                               type="button"
                               onClick={() => setNewLedgerForm({...newLedgerForm, code: `4${Math.floor(Math.random() * 900) + 100}`})}
                               className="text-[0.55rem] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-600 hover:text-white transition-all font-bold uppercase tracking-widest"
                            >Suggest</button>
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
                              const parent = localAccounts.find((a: any) => a.id === parentId);
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
                           {localAccounts.filter((a: any) => !a.parentId && a.id !== newLedgerForm.code && a.type === newLedgerForm.type).map((a: any) => (
                              <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>
                           ))}
                        </select>
                     </div>
                      <button type="submit" disabled={isAddingLedger || !newLedgerForm.name} className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-indigo-100 disabled:opacity-50">
                         {isAddingLedger ? 'COMMITTING...' : 'COMMIT TO LEDGER REGISTRY'}
                      </button>
                  </form>
               </div>
            </div>
      )}
    </div>
  );
}
