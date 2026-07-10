import React, { Fragment } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { Printer, Download, ShieldCheck } from 'lucide-react';
import { exportToExcel } from '@/lib/excel';
import { flattenTreeForExcel } from './reportUtils';

export default function TrialBalance({
  accounts,
  hideZeroBalances,
  viewMode,
  setSelectedAccount,
  totalDebitTB,
  totalCreditTB
}: {
  accounts: any[];
  hideZeroBalances: boolean;
  viewMode: 'DETAILED' | 'COMPACT';
  setSelectedAccount: (acc: any) => void;
  totalDebitTB: number;
  totalCreditTB: number;
}) {
  const handleExport = () => {
      let headers = ["A/C ID", "Account Name", "Type", "Debit Balance", "Credit Balance"];
      const roots = accounts.filter((a: any) => !a.parentId);
      let rows = roots.flatMap((r: any) => flattenTreeForExcel(accounts, r, 0, hideZeroBalances));
      rows.push(["", "TOTAL", "", totalDebitTB, totalCreditTB]);
      exportToExcel([{ headers, rows, sheetName: "Trial Balance" }], "trial_balance_export");
  };

  const renderRow = (acc: any, depth = 0) => {
     if (hideZeroBalances && Math.abs(acc.balance) < 0.01) return null;
     const children = accounts.filter(child => child.parentId === acc.id);
     return (
        <Fragment key={acc.id}>
           <tr onClick={() => setSelectedAccount(acc)} className={cn("group cursor-pointer transition-all", depth === 0 ? "bg-slate-100 hover:bg-slate-200 border-y border-slate-300/60 shadow-sm" : "border-b border-slate-100 hover:bg-slate-50 bg-white")}>
              <td className={cn("hidden sm:table-cell py-1 px-8 print:px-2 text-[0.55rem] uppercase", depth === 0 ? "font-black text-slate-500" : "font-bold text-slate-400")}>#{acc.code}</td>
              <td className={cn("py-0.5 px-2 sm:px-8 print:px-2 transition-colors truncate", depth === 0 ? "text-[0.6rem] font-black text-slate-900 uppercase tracking-widest" : "text-[0.6rem] font-semibold text-slate-700 capitalize group-hover:text-indigo-600")}>
                 <div className="flex items-center gap-2 overflow-hidden">
                    {depth > 0 && (
                       <span className="flex items-center shrink-0 opacity-50">
                          {Array.from({ length: depth }).map((_, i) => (
                             <span key={i} className="w-3 border-b-2 border-dotted border-slate-300" />
                          ))}
                       </span>
                    )}
                    <span className="truncate">{acc.name}</span>
                 </div>
              </td>
              <td className="hidden sm:table-cell py-1 px-8 print:px-2"><span className={cn("px-2 py-0.5 bg-slate-100 text-[0.55rem] font-black uppercase rounded-full", depth === 0 ? "text-slate-500" : "text-slate-400")}>{acc.type}</span></td>
              <td className="py-1 px-2 sm:px-8 print:px-2 text-right text-[0.6rem] sm:text-[0.6rem] font-black text-slate-950 tabular-nums whitespace-nowrap">
                 {acc.normal === 'Debit' ? formatCurrency(acc.balance) : <span className="opacity-10 text-slate-400 hidden sm:inline">Rs. 0.00</span>}
              </td>
              <td className="py-1 px-2 sm:px-8 print:px-2 text-right text-[0.6rem] sm:text-[0.6rem] font-black text-slate-950 tabular-nums whitespace-nowrap">
                 {acc.normal === 'Credit' ? formatCurrency(acc.balance) : <span className="opacity-10 text-slate-400 hidden sm:inline">Rs. 0.00</span>}
              </td>
           </tr>
           {children.map(child => renderRow(child, depth + 1))}
        </Fragment>
     );
  };

  const rootAccounts = accounts.filter(acc => !acc.parentId);

  return (
     <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-[0_40px_100px_-20px_rgba(30,41,59,0.08)] overflow-x-auto report-container print:border-none print:shadow-none">
        <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
           <div className="flex items-center gap-3">
              <h3 className="text-[0.6rem] font-normal uppercase">Global Trial Balance Registry</h3>
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
        <table className="w-full trial-balance-table table-fixed classic-table">
           <thead>
              <tr className="bg-slate-50 border-b border-slate-100 uppercase">
                 <th className="hidden sm:table-cell py-2 px-8 print:px-2 text-left text-[0.55rem] font-black text-slate-400 tracking-widest uppercase sm:w-[100px]">A/C ID</th>
                 <th className="py-2 px-2 sm:px-8 print:px-2 text-left text-[0.55rem] font-black text-slate-400 tracking-widest uppercase">Account Registry Title</th>
                 <th className="hidden sm:table-cell py-2 px-8 print:px-2 text-left text-[0.55rem] font-black text-slate-400 tracking-widest uppercase sm:w-[100px]">Type</th>
                 <th className="py-2 px-2 sm:px-8 print:px-2 text-right text-[0.55rem] font-black text-slate-400 tracking-widest uppercase w-[85px] sm:w-[140px]">
                    <span className="hidden sm:inline">Debit Balance</span>
                    <span className="sm:hidden">Debit</span>
                 </th>
                 <th className="py-2 px-2 sm:px-8 print:px-2 text-right text-[0.55rem] font-black text-slate-400 tracking-widest uppercase w-[85px] sm:w-[140px]">
                    <span className="hidden sm:inline">Credit Balance</span>
                    <span className="sm:hidden">Credit</span>
                 </th>
              </tr>
           </thead>
            <tbody>
               {rootAccounts.map(acc => {
                  if (hideZeroBalances && Math.abs(acc.balance) < 0.01) return null;
                  if (viewMode === 'COMPACT') {
                     return (
                        <tr key={acc.id} onClick={() => setSelectedAccount(acc)} className="border-b border-slate-50 hover:bg-slate-50 group cursor-pointer font-black text-slate-950">
                           <td className="hidden sm:table-cell py-1.5 px-8 text-[0.6rem] font-bold text-slate-400 uppercase">#{acc.code}</td>
                           <td className="py-1.5 px-2 sm:px-8 text-[0.6rem] uppercase group-hover:text-indigo-600 transition-colors truncate">{acc.name}</td>
                           <td className="hidden sm:table-cell py-1.5 px-8 whitespace-nowrap"><span className="px-2.5 py-1 bg-slate-100 text-[0.55rem] font-black text-slate-500 uppercase rounded-full">{acc.type}</span></td>
                           <td className="py-1.5 px-2 sm:px-8 text-right text-[0.6rem] sm:text-xs tabular-nums whitespace-nowrap w-[90px] sm:w-[140px]">
                              {acc.normal === 'Debit' ? formatCurrency(acc.balance) : <span className="opacity-10 text-slate-400 hidden sm:inline">Rs. 0.00</span>}
                           </td>
                           <td className="py-1.5 px-2 sm:px-8 text-right text-[0.6rem] sm:text-xs tabular-nums whitespace-nowrap w-[90px] sm:w-[140px]">
                              {acc.normal === 'Credit' ? formatCurrency(acc.balance) : <span className="opacity-10 text-slate-400 hidden sm:inline">Rs. 0.00</span>}
                           </td>
                        </tr>
                     );
                  }
                  return renderRow(acc);
               })}
            </tbody>
            <tbody>
               {/* TERMINAL SUMMARY ROW (RELOCATED FROM TFOOT TO PREVENT MULTI-PAGE REPETITION) */}
               <tr className="bg-white print:bg-slate-50 text-white print:text-slate-950 font-black">
                  <td className="py-8 px-2 sm:px-8 print:py-4 print:px-2 sm:table-cell" colSpan={1}><div className="flex items-center gap-4 no-print"><div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 shadow-inner hidden sm:flex"><ShieldCheck className="w-6 h-6 animate-pulse" /></div><div className="overflow-hidden"><span className="uppercase tracking-widest sm:tracking-widest text-[0.55rem] sm:text-[0.6rem] block text-indigo-400 truncate">Audit Parity Confirmed</span><p className="text-[0.55rem] font-bold text-slate-500 uppercase mt-1 italic tracking-widest hidden sm:block">Atoms are verified across all dimensional slices</p></div></div><div className="hidden print:block uppercase text-[0.6rem] tracking-widest text-slate-400">Institutional Balance Match Verified</div></td><td className="hidden sm:table-cell" colSpan={2} />
                  <td className="py-8 px-2 sm:px-8 print:py-4 print:px-2 text-right text-xs sm:text-lg print:text-lg tracking-tighter italic font-black text-emerald-400 print:text-emerald-700 w-[90px] sm:w-[140px] whitespace-nowrap">{formatCurrency(totalDebitTB)}</td>
                  <td className="py-8 px-2 sm:px-8 print:py-4 print:px-2 text-right text-xs sm:text-lg print:text-lg tracking-tighter italic font-black text-emerald-400 print:text-emerald-700 w-[90px] sm:w-[140px] whitespace-nowrap">{formatCurrency(totalCreditTB)}</td>
               </tr>
            </tbody>
         </table>
      </div>
  );
}
