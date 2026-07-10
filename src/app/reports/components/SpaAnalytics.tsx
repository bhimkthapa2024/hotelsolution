import React, { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Zap, DollarSign, Printer, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/excel';

export default function SpaAnalytics({ sales }: { sales: any[] }) {
  const { treatmentSummary, totalQty, totalRevenue, topSelling, avgTicket } = useMemo(() => {
     // Get all spa/massage sales item entries
     const spaSaleItems = sales
        .filter(s => !s.isVoided)
        .flatMap(s => (s.items || [])
           .filter((item: any) => !item.isImported && (item.spaItemId || (item.category && (item.category.toUpperCase().includes('SPA') || item.category.toUpperCase().includes('MASSAGE')))))
           .map((item: any) => ({
              ...item,
              spaItemName: item.spaItemName || [item.category, item.note].filter(Boolean).join(' - ') || 'UNSPECIFIED SPA TREATMENT',
              spaItemId: item.spaItemId || 'UNSPECIFIED',
              amount: parseFloat(item.amount) || 0,
              qty: parseFloat(item.qty) || 0,
              rate: parseFloat(item.rate) || 0
           }))
        );

     // Group by treatment name
     const treatmentSummaryMap: { [key: string]: { name: string, rate: number, qty: number, revenue: number } } = {};
     
     spaSaleItems.forEach(item => {
        const key = item.spaItemName.toUpperCase().trim();
        if (!treatmentSummaryMap[key]) {
           treatmentSummaryMap[key] = {
              name: item.spaItemName,
              rate: item.rate,
              qty: 0,
              revenue: 0
           };
        }
        treatmentSummaryMap[key].qty += item.qty;
        treatmentSummaryMap[key].revenue += item.amount;
        if (item.rate > 0) {
           treatmentSummaryMap[key].rate = item.rate;
        }
     });

     const summary = Object.values(treatmentSummaryMap).sort((a, b) => b.revenue - a.revenue);

     const tQty = summary.reduce((sum, t) => sum + t.qty, 0);
     const tRev = summary.reduce((sum, t) => sum + t.revenue, 0);
     const tSelling = summary.length > 0 ? summary[0].name : 'N/A';
     const aTicket = tQty > 0 ? (tRev / tQty) : 0;

     return {
        treatmentSummary: summary,
        totalQty: tQty,
        totalRevenue: tRev,
        topSelling: tSelling,
        avgTicket: aTicket
     };
  }, [sales]);

  const handleExport = () => {
     const headers = ["Treatment Name", "Standard Price", "Packages Sold", "Gross Revenue"];
     const rows = treatmentSummary.map(t => [
         t.name,
         t.rate,
         t.qty,
         t.revenue
     ]);
     rows.push(["TOTAL", "", totalQty, totalRevenue]);
     exportToExcel([{ sheetName: "Spa Analytics", headers, rows }], "spa_analytics_export");
  };

  return (
     <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
           <div className="bg-white p-5 rounded-[var(--radius-md)] border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Spa Revenue</span>
                 <span className="text-xl font-black text-emerald-600 tracking-tight italic">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
           </div>
           <div className="bg-white p-5 rounded-[var(--radius-md)] border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Top Selling Treatment</span>
                 <span className="text-[0.6rem] font-black text-indigo-950 tracking-tight uppercase truncate max-w-[200px] block mt-1">{topSelling}</span>
              </div>
              <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600"><Zap className="w-5 h-5" /></div>
           </div>
           <div className="bg-white p-5 rounded-[var(--radius-md)] border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Average Ticket Size</span>
                 <span className="text-xl font-black text-indigo-600 tracking-tight italic">{formatCurrency(avgTicket)}</span>
              </div>
              <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600"><DollarSign className="w-5 h-5" /></div>
           </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-sm overflow-hidden report-container">
           <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
              <h3 className="text-[0.6rem] font-normal uppercase">Spa Treatment Sales Breakdown</h3>
              <div className="flex items-center gap-2">
                 <button onClick={() => window.print()} className="h-7 px-4 bg-white/5 border border-white/10 text-slate-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
                    <Printer className="w-3 h-3" /> Export PDF / Print
                 </button>
                 <button onClick={handleExport} className="h-7 px-4 bg-emerald-600/10 border border-white/10 text-slate-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/20 hover:text-white transition-all flex items-center gap-2">
                    <Download className="w-3 h-3" /> Excel
                 </button>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-bold uppercase text-[0.6rem] classic-table">
                 <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[0.55rem] font-black text-slate-500 tracking-widest">
                       <th className="px-6 py-3 border-r border-slate-100">Spa Menu Treatment Name</th>
                       <th className="px-6 py-3 border-r border-slate-100 text-right w-[150px]">Standard Price (Rs.)</th>
                       <th className="px-6 py-3 border-r border-slate-100 text-center w-[150px]">Total Packages Sold</th>
                       <th className="px-6 py-3 text-right w-[200px]">Total Gross Revenue</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white font-black text-[0.6rem] text-slate-950 uppercase tracking-tight">
                    {treatmentSummary.map((treatment, idx) => (
                       <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 border-r border-slate-50 flex items-center gap-3">
                             <div className="w-7 h-7 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-[0.55rem] shrink-0">
                                {idx + 1}
                             </div>
                             <span className="text-[0.6rem]">{treatment.name}</span>
                          </td>
                          <td className="px-6 py-3 border-r border-slate-50 text-right text-slate-700 font-mono">{formatCurrency(treatment.rate)}</td>
                          <td className="px-6 py-3 border-r border-slate-50 text-center text-slate-900">{treatment.qty} Pkgs</td>
                          <td className="px-6 py-3 text-right text-emerald-600 font-mono font-black italic">{formatCurrency(treatment.revenue)}</td>
                       </tr>
                    ))}
                    {treatmentSummary.length === 0 && (
                       <tr>
                          <td colSpan={4} className="p-12 text-center text-slate-300 text-[0.6rem] font-bold uppercase tracking-widest italic bg-slate-50/20">Zero Spa treatment sales recorded in selected period</td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
     </div>
  );
}
