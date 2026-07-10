import React, { useMemo } from 'react';
import { Search, Printer, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/excel';
import { useDebounce } from '@/hooks/useDebounce';

export default function SundryCreditors({
  suppliers,
  accounts,
  supplierSearch,
  setSupplierSearch,
  setSelectedAccount,
  setDrilldownFilter,
  setDrilldownOpeningBal
}: {
  suppliers: any[];
  accounts: any[];
  supplierSearch: string;
  setSupplierSearch: (val: string) => void;
  setSelectedAccount: (acc: any) => void;
  setDrilldownFilter: (val: string | undefined) => void;
  setDrilldownOpeningBal: (val: number) => void;
}) {
  const debouncedSearch = useDebounce(supplierSearch, 300);

  const filteredSuppliers = useMemo(() => {
     return suppliers.filter(s => 
        s.name?.toUpperCase().includes(debouncedSearch.toUpperCase()) ||
        s.type?.toUpperCase().includes(debouncedSearch.toUpperCase()) ||
        s.pan?.toUpperCase().includes(debouncedSearch.toUpperCase())
     );
  }, [suppliers, debouncedSearch]);

  const handleExport = () => {
     const headers = ["Supplier Name", "Type", "PAN", "Contact Person", "Phone/Email", "Ledger Account", "Outstanding Payable"];
     
     const rows = filteredSuppliers.map(s => {
        const acc = accounts.find(a => a.id === s.accountId);
        const bal = acc ? acc.balance : (s.openingBalance || 0);
        const accName = acc ? acc.name : "Accounts Payable (Shared)";

        return [
           s.name,
           s.type || "N/A",
           s.pan || "N/A",
           s.contactPerson || "N/A",
           s.phone || s.email || "N/A",
           accName,
           bal
        ];
     });

     exportToExcel([{ sheetName: "Sundry Creditors", headers, rows }], "sundry_creditors_export");
  };

  return (
     <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-[0_20px_50px_-15px_rgba(30,41,59,0.05)] overflow-hidden min-h-[500px] report-container print:border-none print:shadow-none">
        <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
           <div className="flex items-center gap-4">
              <h3 className="text-[0.6rem] font-normal uppercase">Sundry Creditors Ledger (Payable Registry)</h3>
           </div>
           <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="h-7 px-4 bg-white/5 border border-white/10 text-slate-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
                 <Printer className="w-3 h-3" /> Export PDF / Print
              </button>
              <button onClick={handleExport} className="h-7 px-4 bg-emerald-600/10 border border-white/10 text-slate-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/20 hover:text-white transition-all flex items-center gap-2">
                 <Download className="w-3 h-3" /> Excel
              </button>
           </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 no-print">
           <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                 type="text" 
                 value={supplierSearch}
                 onChange={(e) => setSupplierSearch(e.target.value)}
                 placeholder="FILTER REGISTERED VENDORS / UTILITIES / CONTRACTORS..."
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] uppercase tracking-widest focus:border-indigo-600 transition-all shadow-inner"
              />
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse classic-table">
              <thead>
                 <tr className="bg-white border-b border-slate-200 uppercase">
                    <th className="px-6 py-3 text-[0.55rem] font-black text-slate-500 tracking-widest border-r border-slate-100">Supplier / Vendor Name</th>
                    <th className="px-6 py-3 text-[0.55rem] font-black text-slate-500 tracking-widest border-r border-slate-100">Contact Vector</th>
                    <th className="px-6 py-3 text-[0.55rem] font-black text-slate-500 tracking-widest border-r border-slate-100">Ledger Mapping</th>
                    <th className="px-6 py-3 text-[0.55rem] font-black text-slate-500 tracking-widest text-right w-[180px]">Outstanding Payable</th>
                    <th className="px-6 py-3 text-[0.55rem] font-black text-slate-500 tracking-widest w-[120px] no-print">Status</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                 {(() => {
                    if (filteredSuppliers.length === 0) {
                       return (
                          <tr>
                             <td colSpan={5} className="p-12 text-center text-slate-300 text-[0.6rem] font-bold uppercase tracking-widest italic bg-slate-50/20">Zero supplier profiles matched in search registry</td>
                          </tr>
                       );
                    }
                    
                    return filteredSuppliers.map((s: any) => {
                       const acc = accounts.find(a => a.id === s.accountId);
                       const bal = acc ? acc.balance : (s.openingBalance || 0);
                       
                       const handleDrilldown = () => {
                          const defaultHead = 'Accounts Payable';
                          const targetAccId = s.accountId || accounts.find(a => a.name === defaultHead || a.id === defaultHead)?.id || defaultHead;
                          const finalAcc = accounts.find(a => a.id === targetAccId) || {
                             id: targetAccId,
                             name: defaultHead,
                             code: '2200',
                             type: 'LIABILITY',
                             normal: 'Credit'
                          };
                          
                          setSelectedAccount({ ...finalAcc, name: s.name });
                          if (!s.accountId) {
                             setDrilldownFilter(s.name);
                             setDrilldownOpeningBal(s.openingBalance || 0);
                          } else {
                             setDrilldownFilter(undefined);
                             setDrilldownOpeningBal(s.openingBalance || 0);
                          }
                       };
                       
                       return (
                          <tr 
                             key={s.id} 
                             onClick={handleDrilldown}
                             className="group hover:bg-rose-50/10 cursor-pointer transition-all"
                          >
                             <td className="px-6 py-4 align-middle border-r border-slate-50">
                                <div className="flex flex-col">
                                   <span className="text-[0.6rem] font-black text-slate-950 uppercase tracking-tight">{s.name}</span>
                                   <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[0.55rem] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded">{s.type}</span>
                                      {s.pan && <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest">PAN: {s.pan}</span>}
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 align-middle border-r border-slate-50">
                                <div className="flex flex-col">
                                   <span className="text-[0.6rem] font-black text-slate-700">{s.contactPerson || 'N/A'}</span>
                                   <span className="text-[0.55rem] font-medium text-slate-400 uppercase mt-0.5">{s.phone || s.email || 'NO_VECTOR_DATA'}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4 align-middle border-r border-slate-50">
                                <div className="flex flex-col">
                                   {acc ? (
                                      <>
                                         <span className="text-[0.6rem] font-black text-slate-900 uppercase">#{acc.code}</span>
                                         <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-wide truncate max-w-[180px]">{acc.name}</span>
                                      </>
                                   ) : (
                                      <>
                                         <span className="text-[0.6rem] font-black text-amber-600 uppercase">Consolidated</span>
                                         <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-wide">Accounts Payable (Shared)</span>
                                      </>
                                   )}
                                </div>
                             </td>
                             <td className="px-6 py-4 align-middle text-right border-r border-slate-50">
                                <div className="flex flex-col items-end justify-center">
                                   <span className={`text-[0.6rem] font-black tracking-tighter italic border-b border-transparent group-hover:border-rose-600 transition-all ${bal > 0 ? 'text-rose-600' : bal < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR' }).format(bal)}
                                   </span>
                                   <span className="text-[0.35rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Drill Down Ledger ↗</span>
                                </div>
                             </td>
                             <td className="px-6 py-4 align-middle no-print">
                                <span className={`px-3 py-1 text-[0.55rem] font-black uppercase tracking-widest rounded-full ${s.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {s.isActive !== false ? 'ACTIVE' : 'SUSPENDED'}
                                </span>
                             </td>
                          </tr>
                       );
                    });
                 })()}
              </tbody>
           </table>
        </div>
     </div>
  );
}
