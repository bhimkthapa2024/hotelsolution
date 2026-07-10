import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { SimpleTree, flattenTreeForExcel } from './reportUtils';
import { Printer, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/excel';

export default function BalanceSheet({
  assetAccounts,
  liabAccounts,
  equityAccounts,
  totalAssets,
  totalLiab,
  totalEquity,
  netProfit,
  setSelectedAccount,
  hideZeroBalances,
  viewMode
}: {
  assetAccounts: any[];
  liabAccounts: any[];
  equityAccounts: any[];
  totalAssets: number;
  totalLiab: number;
  totalEquity: number;
  netProfit: number;
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

      const assetRows = getTreeData(assetAccounts);
      assetRows.push(["", "TOTAL ASSETS", "", totalAssets, 0]);

      const liabRows = getTreeData(liabAccounts);
      const equityRows = getTreeData(equityAccounts);
      const totalLE = totalLiab + totalEquity + netProfit;
      
      const liabEqRows = [
          ...liabRows,
          ...equityRows,
          ["", "TOTAL LIABILITIES & EQUITY", "", 0, totalLE]
      ];

      exportToExcel([
          { sheetName: "Assets", headers, rows: assetRows },
          { sheetName: "Liabilities & Equity", headers, rows: liabEqRows }
      ], "balance_sheet_export");
  };

  return (
     <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-none overflow-hidden min-h-[500px] print:border-none print:shadow-none">
        <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
           <div className="flex items-center gap-4">
              <h3 className="text-[0.6rem] font-normal uppercase">Constitutional Balance Sheet Registry</h3>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="p-4 sm:p-8 space-y-8 print:p-4">
               <h4 className="text-[0.6rem] font-black text-indigo-600 uppercase tracking-widest border-b border-slate-200 pb-2">I. Consolidated Assets</h4>
               <div className="space-y-1">
                  <SimpleTree accList={assetAccounts} onSelect={setSelectedAccount} hideZeroBalances={hideZeroBalances} viewMode={viewMode} />
               </div>
            </div>
            <div className="p-4 sm:p-8 space-y-8 print:p-4">
               <h4 className="text-[0.6rem] font-black text-rose-600 uppercase tracking-widest border-b border-slate-200 pb-2">II. Liabilities & Foundation Equity</h4>
               <div className="space-y-8">
                  <div className="space-y-1">
                     <SimpleTree accList={liabAccounts} onSelect={setSelectedAccount} hideZeroBalances={hideZeroBalances} viewMode={viewMode} />
                  </div>
                  <div className="space-y-1 pt-4 border-t border-slate-200">
                     <SimpleTree accList={equityAccounts} onSelect={setSelectedAccount} hideZeroBalances={hideZeroBalances} viewMode={viewMode} />
                  </div>
               </div>
            </div>
        </div>
        <div className="bg-slate-50 border-t border-slate-300 p-4 sm:p-8 flex justify-between items-center">
           <div className="flex flex-col">
              <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mb-1">Total Institutional Assets</span>
              <span className="text-lg font-black text-indigo-600">{formatCurrency(totalAssets)}</span>
           </div>
           
           <div className="flex items-center gap-12">
              <div className="flex flex-col items-end">
                 <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mb-1">Liab + Equity + Retained Prof.</span>
                 <span className="text-lg font-black text-indigo-950">{formatCurrency(totalLiab + totalEquity + netProfit)}</span>
              </div>
           </div>
        </div>
     </div>
  );
}
