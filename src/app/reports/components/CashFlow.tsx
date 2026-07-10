import React from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/excel';

export default function CashFlow({
  cashFlow
}: {
  cashFlow: any;
}) {
  if (!cashFlow) return null;

  const handleExport = () => {
      const headers = ["Description", "Date", "Reference", "Amount"];
      
      const inflowRows = cashFlow.inflow.map((inf: any) => [
          inf.desc,
          formatDate(inf.date),
          inf.ref || "",
          inf.amount
      ]);
      inflowRows.push(["", "", "TOTAL INFLOW", cashFlow.totalInflow]);

      const outflowRows = cashFlow.outflow.map((out: any) => [
          out.desc,
          formatDate(out.date),
          out.ref || "",
          out.amount
      ]);
      outflowRows.push(["", "", "TOTAL OUTFLOW", cashFlow.totalOutflow]);

      const summaryRows = [
          ["Opening Liquidity", cashFlow.openingBalance],
          ["Net Cash Flow (Velocity)", cashFlow.netChange],
          ["Closing Liquidity", cashFlow.closingBalance]
      ];

      exportToExcel([
          { sheetName: "Inflow", headers, rows: inflowRows },
          { sheetName: "Outflow", headers, rows: outflowRows },
          { sheetName: "Summary", headers: ["Metric", "Amount"], rows: summaryRows }
      ], "cash_flow_export");
  };

  return (
     <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-none overflow-x-auto print:border-none print:shadow-none">
        <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
           <div className="flex items-center gap-4">
              <h3 className="text-[0.6rem] font-normal uppercase">Institutional Cash Flow Audit</h3>
           </div>
           <div className="text-right flex items-center gap-4">
              <div className="flex items-center gap-2 mr-4">
                  <button onClick={() => window.print()} className="h-7 px-4 bg-white/5 border border-white/10 text-slate-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
                     <Printer className="w-3 h-3" /> Export PDF / Print
                  </button>
                  <button onClick={handleExport} className="h-7 px-4 bg-emerald-600/10 border border-white/10 text-slate-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/20 hover:text-white transition-all flex items-center gap-2">
                     <Download className="w-3 h-3" /> Excel
                  </button>
              </div>
              <div className="flex flex-col items-end">
                 <p className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 opacity-60">Opening Liquidity</p>
                 <p className="text-xs font-black text-indigo-950 tracking-tighter leading-none italic">{formatCurrency(cashFlow.openingBalance)}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
           <div className="p-4 sm:p-8 print:p-4">
              <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                 <div className="flex items-center gap-3">
                    <h4 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest">Aggregate Receipts / Inflow</h4>
                 </div>
                 <span className="text-xs font-black text-emerald-600">{formatCurrency(cashFlow.totalInflow)}</span>
              </div>
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 print:max-h-none">
                 <table className="w-full text-left classic-table text-[0.6rem]">
                    <tbody>
                    {cashFlow.inflow.map((inf: any, i: number) => (
                       <tr key={i} className="border-b border-slate-100">
                          <td className="py-2">
                             <span className="font-bold text-slate-900">{inf.desc}</span>
                             <div className="text-[0.55rem] text-slate-500 mt-0.5">{formatDate(inf.date)} | {inf.ref}</div>
                          </td>
                          <td className="py-2 text-right font-black text-emerald-600">{formatCurrency(inf.amount)}</td>
                       </tr>
                    ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="p-4 sm:p-8 print:p-4">
              <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                 <div className="flex items-center gap-3">
                    <h4 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest">Aggregate Payments / Outflow</h4>
                 </div>
                 <span className="text-xs font-black text-rose-600">({formatCurrency(cashFlow.totalOutflow)})</span>
              </div>
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 print:max-h-none">
                 <table className="w-full text-left classic-table text-[0.6rem]">
                    <tbody>
                    {cashFlow.outflow.map((out: any, i: number) => (
                       <tr key={i} className="border-b border-slate-100">
                          <td className="py-2">
                             <span className="font-bold text-slate-900">{out.desc}</span>
                             <div className="text-[0.55rem] text-slate-500 mt-0.5">{formatDate(out.date)} | {out.ref}</div>
                          </td>
                          <td className="py-2 text-right font-black text-rose-600">{formatCurrency(out.amount)}</td>
                       </tr>
                    ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-300 p-4 sm:p-8 flex justify-between items-center">
           <div className="flex items-center gap-8">
              <div className="flex flex-col">
                 <span className="text-[0.55rem] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Net Velocity</span>
                 <span className={`text-lg font-black italic tracking-tighter ${cashFlow.netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {cashFlow.netChange >= 0 ? '+' : ''}{formatCurrency(cashFlow.netChange)}
                 </span>
              </div>
           </div>

           <div className="flex flex-col items-end">
              <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest mb-1">Closing Liquidity Registry</span>
              <h3 className="text-xl font-black tracking-tighter text-indigo-950">{formatCurrency(cashFlow.closingBalance)}</h3>
           </div>
        </div>
     </div>
  );
}
