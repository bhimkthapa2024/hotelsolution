import React, { useMemo } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/excel';

export default function EmployeeCommissions({
  employees,
  sales
}: {
  employees: any[];
  sales: any[];
}) {
  const { employeeStats, spaItems } = useMemo(() => {
     const stats = employees.map((emp) => {
        const empSales = sales.filter(s => !s.isVoided && s.items?.some((i: any) => i.employeeId === emp.id && !i.isImported));
        const jobsCount = empSales.reduce((sum, s) => sum + s.items.filter((i: any) => i.employeeId === emp.id && !i.isImported).length, 0);
        const revGen = empSales.reduce((sum, s) => {
           return sum + s.items.filter((i: any) => i.employeeId === emp.id && !i.isImported).reduce((acc: number, i: any) => acc + (parseFloat(i.amount) || 0), 0);
        }, 0);
        const commEarned = empSales.reduce((sum, s) => {
           return sum + s.items.filter((i: any) => i.employeeId === emp.id && !i.isImported).reduce((acc: number, i: any) => acc + ((parseFloat(i.amount) * (i.commissionRate || 10)) / 100), 0);
        }, 0);

        return { emp, jobsCount, revGen, commEarned };
     });

     const items = sales.filter(s => !s.isVoided && s.items?.some((i: any) => i.employeeId && !i.isImported)).flatMap((sale) => {
        const commItems = sale.items.filter((i: any) => i.employeeId && !i.isImported);
        return commItems.map((item: any, itemIdx: number) => ({ sale, item, itemIdx }));
     });

     return { employeeStats: stats, spaItems: items };
  }, [employees, sales]);

  const handleExport = () => {
     // Summary Sheet
     const summaryHeaders = ["Employee Name", "Employee ID", "Default Rate", "Jobs Completed", "Total Revenue Generated", "Commission Earned"];
     let totalJobs = 0;
     let totalRev = 0;
     let totalComm = 0;
     
     const summaryRows = employeeStats.map(({ emp, jobsCount, revGen, commEarned }) => {
        totalJobs += jobsCount;
        totalRev += revGen;
        totalComm += commEarned;

        return [
           emp.name,
           emp.id,
           (emp.commissionRate || 10) + "%",
           jobsCount,
           revGen,
           commEarned
        ];
     });
     summaryRows.push(["TOTAL", "", "", totalJobs, totalRev, totalComm]);

     // Detailed Logs Sheet
     const detailedHeaders = ["Date", "Bill ID", "Guest Name", "Service Category", "Assigned Staff", "Charge Amount", "Comm. %", "Comm. Earned"];
     
     const detailedRows = spaItems.map(({ sale, item }) => {
        const cAmt = (parseFloat(item.amount) * (item.commissionRate || 10)) / 100;
        return [
           formatDate(sale.date),
           sale.id?.slice(-6) || "",
           sale.guest || "WALK-IN",
           item.category || "",
           item.employeeName || "",
           parseFloat(item.amount) || 0,
           (item.commissionRate || 10) + "%",
           cAmt
        ];
     });

     exportToExcel([
        { sheetName: "Summary", headers: summaryHeaders, rows: summaryRows },
        { sheetName: "Detailed Logs", headers: detailedHeaders, rows: detailedRows }
     ], "employee_commissions_export");
  };

  return (
     <div className="space-y-6">
        {/* Summary Table by Employee */}
        <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-sm overflow-hidden report-container">
           <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
              <h3 className="text-[0.6rem] font-normal uppercase">Employee Commissions Summary</h3>
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
                       <th className="px-6 py-3 border-r border-slate-100">Employee Details</th>
                       <th className="px-6 py-3 border-r border-slate-100 text-center w-[150px]">Jobs Completed</th>
                       <th className="px-6 py-3 border-r border-slate-100 text-right w-[200px]">Total Revenue Generated</th>
                       <th className="px-6 py-3 text-right w-[200px]">Commission Earned</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white font-black text-[0.6rem] text-slate-950 uppercase tracking-tight">
                    {employeeStats.map(({ emp, jobsCount, revGen, commEarned }) => {
                       return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-6 py-3 border-r border-slate-50 flex items-center gap-3">
                                <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-[0.55rem] shrink-0">
                                   {emp.name?.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col text-left">
                                   <span className="text-[0.6rem]">{emp.name}</span>
                                   <span className="text-[0.55rem] font-bold text-slate-400">ID: {emp.id} | DEFAULT RATE: {emp.commissionRate || 10}%</span>
                                </div>
                             </td>
                             <td className="px-6 py-3 border-r border-slate-50 text-center text-slate-700">{jobsCount} Jobs</td>
                             <td className="px-6 py-3 border-r border-slate-50 text-right text-indigo-900">{formatCurrency(revGen)}</td>
                             <td className="px-6 py-3 text-right text-rose-600 tabular-nums italic font-black">{formatCurrency(commEarned)}</td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Detailed Logs Trace */}
        <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-sm overflow-hidden report-container">
           <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
              <h3 className="text-[0.6rem] font-normal uppercase">Detailed Job Completion Logs</h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-bold uppercase text-[0.6rem] classic-table">
                 <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[0.55rem] font-black text-slate-500 tracking-widest">
                       <th className="px-6 py-3 border-r border-slate-100 w-[120px]">Temporal</th>
                       <th className="px-6 py-3 border-r border-slate-100 w-[120px]">Bill ID</th>
                       <th className="px-6 py-3 border-r border-slate-100 w-[180px]">Guest Name</th>
                       <th className="px-6 py-3 border-r border-slate-100">Service Category</th>
                       <th className="px-6 py-3 border-r border-slate-100">Assigned Staff</th>
                       <th className="px-6 py-3 border-r border-slate-100 text-right w-[120px]">Charge Amount</th>
                       <th className="px-6 py-3 border-r border-slate-100 text-center w-[100px]">Comm. %</th>
                       <th className="px-6 py-3 text-right w-[120px]">Comm. Earned</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white font-black text-[0.6rem] text-slate-950 uppercase tracking-tight">
                    {(() => {
                       const spaItems = sales.filter(s => !s.isVoided && s.items?.some((i: any) => i.employeeId && !i.isImported)).flatMap((sale) => {
                          const commItems = sale.items.filter((i: any) => i.employeeId && !i.isImported);
                          return commItems.map((item: any, itemIdx: number) => ({
                             sale,
                             item,
                             itemIdx
                          }));
                       });

                       if (spaItems.length === 0) {
                          return (
                             <tr>
                                <td colSpan={8} className="p-12 text-center text-slate-300 text-[0.6rem] font-bold uppercase tracking-widest italic bg-slate-50/20">Zero Spa/Massage commission job logs in selected period</td>
                             </tr>
                          );
                       }

                       return spaItems.map(({ sale, item, itemIdx }) => {
                          const cAmt = (parseFloat(item.amount) * (item.commissionRate || 10)) / 100;
                          return (
                             <tr key={`${sale.id}-${itemIdx}`} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-2.5 border-r border-slate-50 text-slate-500 whitespace-nowrap">{formatDate(sale.date)}</td>
                                <td className="px-6 py-2.5 border-r border-slate-50 text-indigo-600 font-mono whitespace-nowrap">#{sale.id?.slice(-6)}</td>
                                <td className="px-6 py-2.5 border-r border-slate-50 truncate max-w-[180px] text-left">{sale.guest || 'WALK-IN'}</td>
                                <td className="px-6 py-2.5 border-r border-slate-50 text-slate-600 truncate text-left">{item.category}</td>
                                <td className="px-6 py-2.5 border-r border-slate-50 text-slate-800 font-black text-left">{item.employeeName}</td>
                                <td className="px-6 py-2.5 border-r border-slate-50 text-right text-slate-900 font-mono">{formatCurrency(parseFloat(item.amount) || 0)}</td>
                                <td className="px-6 py-2.5 border-r border-slate-50 text-center text-slate-600 font-mono">{item.commissionRate || 10}%</td>
                                <td className="px-6 py-2.5 text-right text-emerald-600 font-mono font-black italic">+{formatCurrency(cAmt)}</td>
                             </tr>
                          );
                       });
                    })()}
                 </tbody>
              </table>
           </div>
        </div>
     </div>
  );
}
