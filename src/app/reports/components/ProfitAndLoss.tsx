import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { SimpleTree, renderVariance, flattenTreeForExcel } from './reportUtils';
import { Printer, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/excel';

export default function ProfitAndLoss({
  revAccounts,
  expAccounts,
  totalRev,
  totalExp,
  netProfit,
  revVar,
  expVar,
  setSelectedAccount,
  hideZeroBalances,
  viewMode
}: {
  revAccounts: any[];
  expAccounts: any[];
  totalRev: number;
  totalExp: number;
  netProfit: number;
  revVar: number;
  expVar: number;
  setSelectedAccount: (acc: any) => void;
  hideZeroBalances: boolean;
  viewMode: 'DETAILED' | 'COMPACT';
}) {
  const handleExport = () => {
      const headers = ["A/C Code", "Account Name", "Type", "Debit", "Credit"];
      const getTreeData = (list: any[]) => {
         const roots = list.filter((a: any) => !a.parentId);
         return roots.flatMap((r: any) => flattenTreeForExcel(list, r, 0, hideZeroBalances));
      };

      const revRows = getTreeData(revAccounts);
      revRows.push(["", "TOTAL REVENUE", "", 0, totalRev]);

      const expRows = getTreeData(expAccounts);
      expRows.push(["", "TOTAL EXPENSES", "", totalExp, 0]);

      exportToExcel([
          { sheetName: "Revenue", headers, rows: revRows },
          { sheetName: "Expenses", headers, rows: expRows },
          { sheetName: "Summary", headers: ["Metric", "Amount"], rows: [
              ["Total Revenue", totalRev],
              ["Total Expenses", totalExp],
              ["Net Profit", netProfit]
          ] }
      ], "profit_and_loss_export");
  };

  return (
     <div className="space-y-8">
         <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-none overflow-x-auto print:border-none print:shadow-none">
            <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
               <div className="flex items-center gap-3">
                  <h3 className="text-[0.6rem] font-normal uppercase">Profit & Loss Performance Report</h3>
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
            
            <div className="p-0 space-y-0">
                <div className="bg-white p-4 sm:p-8 border-b border-slate-200">
                   <h4 className="text-[0.6rem] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-500/20 pb-4 mb-6 italic leading-none">I. Revenue Report</h4>
                   <div className="space-y-1">
                      <SimpleTree accList={revAccounts} onSelect={setSelectedAccount} hideZeroBalances={hideZeroBalances} viewMode={viewMode} />
                      <div className="flex justify-between items-center pt-6 border-t-2 border-slate-200/50 text-lg font-black text-slate-950 mt-8 tracking-tighter italic">
                         <span className="uppercase text-[0.6rem] tracking-widest text-slate-400 not-italic">Total Revenue Registry</span>
                         <span>{formatCurrency(totalRev)}{renderVariance(revVar)}</span>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-4 sm:p-8 border-b border-slate-200">
                   <h4 className="text-[0.6rem] font-black text-rose-600 uppercase tracking-widest border-b border-rose-500/20 pb-4 mb-6 italic leading-none">II. Operational Outflow Registry</h4>
                   <div className="space-y-1">
                      <SimpleTree accList={expAccounts} onSelect={setSelectedAccount} hideZeroBalances={hideZeroBalances} viewMode={viewMode} />
                      <div className="flex justify-between items-center pt-6 border-t-2 border-slate-200/50 text-lg font-black text-slate-950 mt-8 tracking-tighter italic">
                         <span className="uppercase text-[0.6rem] tracking-widest text-slate-400 not-italic">Total Expenses</span>
                         <span className="text-rose-600">{formatCurrency(totalExp)}{renderVariance(expVar)}</span>
                      </div>
                   </div>
                </div>
                
                <div className="bg-slate-50 p-4 sm:p-8 flex justify-between items-center border-t-4 border-slate-300">
                   <span className="uppercase text-[0.6rem] tracking-widest text-slate-500 font-black">Net Fiscal Yield (Profit/Loss)</span>
                   <span className={`text-xl font-black italic tracking-tighter ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(netProfit)}</span>
                </div>
            </div>
         </div>
     </div>
  );
}
