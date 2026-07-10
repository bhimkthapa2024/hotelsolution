'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  getAccounts, 
  getConfig,
  getDebtors,
  getSuppliers
} from '@/actions/hotel';
import { 
  Search, 
  Printer, 
  Filter, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  ArrowLeft, 
  BookOpen, 
  ArrowRight,
  ChevronDown,
  Activity,
  Calendar,
  Layers,
  FileText,
  PieChart,
  RefreshCcw,
  X
} from "lucide-react";
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";
import PageBanner from '@/components/PageBanner';
import LedgerDrilldown from '@/components/LedgerDrilldown';
import { TableSkeleton } from '@/components/Skeleton';

import { useDebounce } from '@/hooks/useDebounce';

export default function Ledger() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [drilldownFilter, setDrilldownFilter] = useState<string | undefined>(undefined);
  const [drilldownOpeningBal, setDrilldownOpeningBal] = useState<number>(0);
  const [config, setConfig] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    setMounted(true);
    async function load() {
      const [accs, sups, debs, conf] = await Promise.all([
        getAccounts(),
        getSuppliers(),
        getDebtors(),
        getConfig()
      ]);
      setAccounts(accs || []);
      setSuppliers(sups || []);
      setDebtors(debs || []);
      setConfig(conf);
      setLoading(false);
    }
    load();
  }, []);

  const combinedAccounts = useMemo(() => {
    const list = [...accounts];

    // Add pseudo-accounts for Suppliers who use the consolidated shared Accounts Payable
    suppliers.forEach(s => {
      if (!s.accountId) {
        list.push({
          id: `SUP-${s.id}`,
          code: '2300-SUB',
          name: `${s.name} (Subsidiary Vendor)`,
          type: 'LIABILITY',
          normal: 'Credit',
          balance: s.openingBalance || 0,
          category: 'Sundry Creditors',
          isSubsidiary: true,
          supplierData: s
        });
      }
    });

    // Add pseudo-accounts for Debtors who use the consolidated shared Accounts Receivable
    debtors.forEach(d => {
      if (!d.accountId) {
        list.push({
          id: `DEB-${d.id}`,
          code: '1200-SUB',
          name: `${d.name} (Subsidiary Debtor)`,
          type: 'ASSET',
          normal: 'Debit',
          balance: d.openingBalance || 0,
          category: 'Sundry Debtors',
          isSubsidiary: true,
          debtorData: d
        });
      }
    });

    return list;
  }, [accounts, suppliers, debtors]);

  const filteredAccounts = useMemo(() => {
    return combinedAccounts.filter(acc => {
      const matchesSearch = acc.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            acc.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesGroup = selectedGroup === 'ALL' || acc.type === selectedGroup;
      return matchesSearch && matchesGroup;
    });
  }, [combinedAccounts, debouncedSearchTerm, selectedGroup]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="p-4 sm:p-8 w-full min-h-screen bg-[var(--bg-color)] animate-fadeIn print:p-0 print:max-w-none institutional-report-root printable-doc">
      {/* INSTITUTIONAL PRINT HEADER [ONLY VISIBLE ON AUDIT EXPORT] */}
      <div className={cn("print-only mb-12", selectedAccount && "no-print")}>
         <div className="flex justify-between items-end border-b-4 border-slate-950 pb-8">
            <div>
               <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{config?.hotelName || 'Institutional Registry'}</h1>
               <p className="text-[0.6rem] font-black uppercase tracking-widest mt-4 text-slate-500 italic">Chart of Accounts & Institutional Balance Registry</p>
            </div>
            <div className="text-right">
               <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mb-2">Audit Timestamp</p>
               <p className="text-lg font-black uppercase tracking-tighter">{mounted ? new Date().toLocaleDateString() : ''}</p>
            </div>
         </div>
      </div>

      {/* When selectedAccount is set, hide the main list */}
      <div className={cn(selectedAccount ? "hidden" : "block")}>
        <PageBanner
          prefix="Consolidated Asset Registry"
          subtitle="Institutional Audit Log Suite"
          title="General Ledger"
          description="FORENSIC SUBSIDIARY ACCOUNT DEPTH [v4.1.2]"
          icon={<Layers className="w-5 h-5 text-white" />}
        >
          <div className="relative group/search w-full lg:min-w-[340px]">
             <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-slate-500 group-focus-within/search:text-indigo-400 transition-colors">
                <Search className="w-4 h-4" />
                <div className="w-px h-3 bg-slate-200" />
             </div>
             <input 
               type="text" 
               placeholder="IDENTIFY ACCOUNT ENTITY..." 
               className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-lg)] pl-14 pr-6 py-4 text-[0.6rem] font-black text-white placeholder:text-slate-500 outline-none focus:bg-white/10 focus:border-white/20 transition-all uppercase tracking-widest"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </PageBanner>

        {/* GROUP FILTER TABS */}
        <div className="flex flex-wrap gap-2 mb-6">
           {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((group) => {
              const count = accounts.filter(a => group === 'ALL' || a.type === group).length;
              const isActive = selectedGroup === group;
              return (
                 <button
                    key={group}
                    onClick={() => setSelectedGroup(group)}
                    className={cn(
                       "px-4 py-2.5 rounded-[var(--radius-md)] border font-bold text-[0.55rem] uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm active:scale-95",
                       isActive 
                          ? "bg-white border-slate-900 text-slate-900 shadow-slate-900/10" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                 >
                    {group}
                    <span className={cn(
                       "px-1.5 py-0.5 rounded-full text-[0.55rem] font-bold",
                       isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                       {count}
                    </span>
                 </button>
              );
           })}
        </div>

        <div className="bg-white rounded-[var(--radius-md)] border border-slate-200 overflow-x-auto shadow-[0_20px_50px_-15px_rgba(30,41,59,0.05)]">
           <table className="w-full text-left classic-table">
              <thead>
                 <tr className="bg-white text-white text-[0.55rem] font-black uppercase tracking-widest shadow-sm">
                    <th className="px-6 py-2.5">Account Code</th>
                    <th className="px-6 py-2.5">Entity Registry Title</th>
                    <th className="px-6 py-2.5">Type / Category</th>
                    <th className="px-6 py-2.5">Primary Normal</th>
                    <th className="px-6 py-2.5 text-right">Balance</th>
                 </tr>
              </thead>
              <tbody>
                 <AnimatePresence>
                    {filteredAccounts.map(acc => (
                       <motion.tr 
                          key={acc.id}
                          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                          onClick={() => {
                            if (acc.isSubsidiary) {
                              const sharedAccName = acc.type === 'LIABILITY' ? 'Accounts Payable' : 'Accounts Receivable';
                              const sharedAcc = accounts.find(a => a.name === sharedAccName || a.id === sharedAccName) || {
                                id: acc.type === 'LIABILITY' ? '2300' : '1200',
                                name: sharedAccName,
                                code: acc.type === 'LIABILITY' ? '2300' : '1200',
                                type: acc.type,
                                normal: acc.normal
                              };
                              setSelectedAccount(sharedAcc);
                              setDrilldownFilter(acc.supplierData?.name || acc.debtorData?.name);
                              setDrilldownOpeningBal(acc.balance);
                            } else {
                              setSelectedAccount(acc);
                              setDrilldownFilter(undefined);
                              setDrilldownOpeningBal(0);
                            }
                          }}
                          className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer group transition-all"
                       >
                          <td className="px-6 py-2 text-[0.6rem] font-medium text-slate-400 font-mono tracking-tighter">#{acc.code}</td>
                          <td className="px-6 py-2">
                             <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"><ArrowRight className="w-2.5 h-2.5" /></div>
                                <span className="text-[0.6rem] font-semibold uppercase text-slate-900 group-hover:text-indigo-600 transition-colors spacing-tight">{acc.name}</span>
                             </div>
                          </td>
                          <td className="px-6 py-2 text-[0.55rem] font-medium uppercase text-slate-500 tracking-wider font-mono">
                             {acc.type} {acc.category ? `/ ${acc.category}` : ''}
                          </td>
                          <td className="px-6 py-2">
                              <span className={`px-2 py-0.5 rounded text-[0.55rem] font-bold uppercase tracking-widest ${acc.normal === 'Debit' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                 {acc.normal}
                              </span>
                          </td>
                          <td className="px-6 py-2 text-right">
                             <div className="flex flex-col items-end">
                                <span className={`text-[0.6rem] sm:text-[0.6rem] font-bold tracking-tight ${acc.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(acc.balance)}</span>
                                <span className="text-[0.35rem] font-medium text-slate-300 uppercase tracking-widest leading-none">Verified Trace</span>
                             </div>
                          </td>
                       </motion.tr>
                    ))}
                 </AnimatePresence>
              </tbody>
           </table>
           {filteredAccounts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-40 opacity-10">
                 <PieChart className="w-20 h-20 mb-6" />
                 <p className="text-lg font-medium uppercase tracking-widest italic">No Account Identified in Master Ledger</p>
              </div>
           )}
        </div>
      </div>

      <AnimatePresence>
        {selectedAccount && (
          <LedgerDrilldown 
            account={selectedAccount} 
            descriptionFilter={drilldownFilter}
            openingBalance={drilldownOpeningBal}
            config={config} 
            onClose={() => {
              setSelectedAccount(null);
              setDrilldownFilter(undefined);
              setDrilldownOpeningBal(0);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
