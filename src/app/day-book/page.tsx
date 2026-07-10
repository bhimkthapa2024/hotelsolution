'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getDayBook, voidTransaction, runNightAudit, getAuditLogs, getConfig } from '@/actions/hotel';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Download,
  Calendar,
  Printer,
  Layers,
  ShieldCheck,
  Activity,
  Edit3,
  Calculator,
  Slash,
  RefreshCcw,
  Moon,
  History as HistoryIcon
} from 'lucide-react';
import { exportToExcel } from '@/lib/excel';
import { motion } from 'framer-motion';
import { exportToCSV } from '@/lib/export';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import PageBanner from '@/components/PageBanner';
import { ProfessionalPrompt } from '@/components/ProfessionalPrompt';
import { ProfessionalConfirm } from '@/components/ProfessionalConfirm';
import { ProfessionalAlert } from '@/components/ProfessionalAlert';
import { TableSkeleton } from '@/components/Skeleton';
import { SuccessModal } from '@/components/SuccessModal';

export default function DayBook() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);
  const [filter, setFilter] = useState({ from: today, to: today });
  const [viewMode, setViewMode] = useState<'COMPACT' | 'DETAILED'>('DETAILED');
  
  // Professional Prompt & Confirm State
  const [promptOpen, setPromptOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertData, setAlertData] = useState({ title: '', message: '', variant: 'info' as any });
  const [pendingTx, setPendingTx] = useState<any>(null);
  const [pendingReason, setPendingReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, cData, aData] = await Promise.all([
        getDayBook(filter.from, filter.to),
        getConfig(),
        getAuditLogs()
      ]);
      setData(res);
      setConfig(cData);
      setAudits(aData);
    } catch (e) {
      console.error("DayBook Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, [filter.from, filter.to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleModify = useCallback((tx: any) => {
     if (!tx || !tx.id) return;
     const isSale = tx.id.startsWith('SAL-') || tx.type === 'INFLOW' || tx.type === 'SALE';
     const sourceData = tx.source || tx;
     sessionStorage.setItem('edit_source', JSON.stringify({ ...sourceData, originalId: tx.id }));
     router.push(isSale ? '/sales' : '/purchase');
  }, [router]);

  const handleRowClick = useCallback((tx: any) => {
     if (!tx || !tx.id) return;
     const isSale = tx.id.startsWith('SAL-') || tx.type === 'INFLOW' || tx.type === 'SALE';
     router.push(isSale ? `/sales-report?id=${tx.id}` : `/purchase-report?id=${tx.id}`);
  }, [router]);

  const groups = useMemo(() => {
    const settlement: Record<string, any[]> = {};
    const outflow: any[] = [];
    if (!data?.transactions) return { settlement, outflow };

    data.transactions.forEach((tx: any) => {
      if (tx.type === 'OUTFLOW' || tx.type === 'OUT' || tx.type === 'EXPENSE') {
        outflow.push(tx);
      } else {
        const mode = tx.mode?.toUpperCase() || 'CASH';
        if (!settlement[mode]) settlement[mode] = [];
        settlement[mode].push(tx);
      }
    });
    return { settlement, outflow };
  }, [data]);

  const handleExport = () => {
    if (!data?.transactions) return;
    const exportData = data.transactions.map((tx: any) => ({
      TX_ID: tx.id,
      Date: tx.date,
      Description: tx.desc,
      Head: tx.category,
      Amount: tx.amount
    }));
    exportToCSV(exportData, 'Journal_Registry');
  };

  const handleNightAudit = async () => {
    setLoading(true);
    const res = await runNightAudit();
    if (res.success) {
      setIsSuccessModalOpen(true);
      await loadData();
    } else {
      setAlertData({ title: 'Execution Failed', message: res.error || "Protocol violation detected during night audit.", variant: 'error' });
      setAlertOpen(true);
    }
    setLoading(false);
  };

  return (
    <div className="relative w-full bg-white min-h-screen shadow-2xl print:shadow-none printable-doc p-8 print:p-0 mb-20 max-w-full" style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>
      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Night Audit Complete"
        subtitle="The night audit has been processed and saved successfully."
        secondaryLabel="Return to Ledger"
      />

      {loading ? <TableSkeleton /> : !data ? (
        <div className="py-40 text-center text-gray-500">
           <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <p className="text-xs font-bold uppercase tracking-widest mb-4">Protocol Connection Error</p>
           <button onClick={loadData} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded uppercase">Retry Connection</button>
        </div>
      ) : (
        <div className="mx-auto w-full">
            {/* COMPANY HEADER */}
            <div className="flex flex-col items-center justify-center mb-6 border-b border-gray-300 pb-4 relative">
               <h1 className="text-xl font-bold text-gray-900 tracking-wide uppercase">{config?.hotelName || 'HOTEL NAME NOT CONFIGURED'}</h1>
               {config?.address && <p className="text-[0.65rem] text-gray-600 mt-0.5">{config.address}</p>}
               <div className="flex items-center gap-4 mt-1 text-[0.55rem] text-gray-500">
                  {config?.phone && <span>📱 {config.phone}</span>}
                  {config?.email && <span>✉️ {config.email}</span>}
                  {config?.website && <span>🌐 {config.website}</span>}
               </div>
            </div>

            {/* FILTERS AND ACTIONS */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8 no-print">
               <div className="flex items-center gap-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">From Date</label>
                     <input type="date" value={filter.from} onChange={(e) => setFilter(prev => ({ ...prev, from: e.target.value }))} className="text-sm border border-gray-300 rounded p-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">To Date</label>
                     <input type="date" value={filter.to} onChange={(e) => setFilter(prev => ({ ...prev, to: e.target.value }))} className="text-sm border border-gray-300 rounded p-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={handleExport} className="px-4 py-2 border border-emerald-600 text-emerald-700 font-bold text-xs uppercase rounded hover:bg-emerald-50 transition-all">Export CSV</button>
                  <button onClick={() => window.print()} className="px-4 py-2 border border-indigo-600 text-indigo-700 font-bold text-xs uppercase rounded hover:bg-indigo-50 transition-all">Print</button>
                  <button onClick={() => exportToExcel(data.transactions, "export")} className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs uppercase rounded hover:bg-emerald-700 transition-all">Excel</button>
               </div>
            </div>

            {/* METADATA SUB-HEADER */}
            <div className="flex justify-between items-start mb-6">
               <div className="text-[0.55rem] leading-snug font-bold text-gray-700 uppercase">
                  <div className="text-[0.65rem] text-indigo-700 mb-1">DAY BOOK REPORT</div>
                  <div className="grid grid-cols-[80px_1fr] gap-x-2">
                     <span className="text-gray-500">FISCAL YEAR :</span> <span>{config?.fiscalYear}</span>
                     <span className="text-gray-500">FROM DATE :</span> <span>{filter.from ? formatDate(filter.from) : '-'}</span>
                     <span className="text-gray-500">TO DATE :</span> <span>{filter.to ? formatDate(filter.to) : '-'}</span>
                     <span className="text-gray-500">ADDRESS :</span> <span>{config?.address}</span>
                     <span className="text-gray-500">PAN :</span> <span>{config?.pan}</span>
                  </div>
               </div>
               <div className="no-print">
                  <button onClick={handleNightAudit} disabled={loading} className="px-4 py-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded hover:bg-indigo-700 transition-all">
                     {loading ? 'Processing...' : 'Run Night Audit'}
                  </button>
               </div>
            </div>

            {/* TABLES */}
            <div className="space-y-8">
               {Object.entries(groups.settlement).sort().map(([mode, items]: [string, any]) => (
                  <div key={mode}>
                     <div className="text-[0.65rem] font-bold text-gray-800 uppercase mb-2 pb-1 border-b border-gray-300 flex justify-between">
                        <span>{mode} JOURNAL</span>
                        <span>Total: {formatCurrency(items.reduce((s:any,i:any)=>s+i.amount,0))}</span>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300 text-[0.6rem] text-gray-800 mb-4 min-w-[600px]">
                        <thead>
                           <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-left">
                              <th className="border-r border-gray-300 px-3 py-2 w-[15%]">Date</th>
                              <th className="border-r border-gray-300 px-3 py-2 w-[15%]">Voucher</th>
                              <th className="border-r border-gray-300 px-3 py-2 w-[20%]">Category</th>
                              <th className="border-r border-gray-300 px-3 py-2">Description</th>
                              <th className="px-3 py-2 text-right w-[15%]">Amount</th>
                           </tr>
                        </thead>
                        <tbody>
                           {items.map((tx: any) => (
                              <tr key={tx.id} onClick={() => handleRowClick(tx)} className={cn("border-b border-gray-200 hover:bg-gray-50 cursor-pointer", tx.isVoided && "line-through text-gray-400")}>
                                 <td className="border-r border-gray-200 px-3 py-2">{formatDate(tx.date)}</td>
                                 <td className="border-r border-gray-200 px-3 py-2">#{tx.id?.slice(-6)}</td>
                                 <td className="border-r border-gray-200 px-3 py-2">{tx.category}</td>
                                 <td className="border-r border-gray-200 px-3 py-2">{tx.desc} {tx.isVoided ? '(REVERSED)' : ''}</td>
                                 <td className="px-3 py-2 text-right font-medium text-emerald-600">+{formatCurrency(tx.amount)}</td>
                              </tr>
                           ))}
                           {items.length === 0 && (
                              <tr><td colSpan={5} className="px-3 py-4 text-center italic text-gray-500">No transactions</td></tr>
                           )}
                        </tbody>
                        <tfoot>
                           <tr className="bg-gray-50 font-bold border-t border-gray-300">
                              <td colSpan={4} className="border-r border-gray-300 px-3 py-2 text-right">Total {mode}</td>
                              <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(items.reduce((s:any,i:any)=>s+i.amount,0))}</td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
                  </div>
               ))}

               {groups.outflow.length > 0 && (
                  <div>
                     <div className="text-[0.65rem] font-bold text-gray-800 uppercase mb-2 pb-1 border-b border-gray-300 flex justify-between">
                        <span>OPERATIONAL EXPENDITURES</span>
                        <span>Total: {formatCurrency(groups.outflow.reduce((s:any,i:any)=>s+i.amount,0))}</span>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300 text-[0.6rem] text-gray-800 mb-4 min-w-[600px]">
                        <thead>
                           <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-left">
                              <th className="border-r border-gray-300 px-3 py-2 w-[15%]">Date</th>
                              <th className="border-r border-gray-300 px-3 py-2 w-[15%]">Voucher</th>
                              <th className="border-r border-gray-300 px-3 py-2 w-[20%]">Category</th>
                              <th className="border-r border-gray-300 px-3 py-2">Description</th>
                              <th className="px-3 py-2 text-right w-[15%]">Amount</th>
                           </tr>
                        </thead>
                        <tbody>
                           {groups.outflow.map((tx: any) => (
                              <tr key={tx.id} onClick={() => handleRowClick(tx)} className={cn("border-b border-gray-200 hover:bg-gray-50 cursor-pointer", tx.isVoided && "line-through text-gray-400")}>
                                 <td className="border-r border-gray-200 px-3 py-2">{formatDate(tx.date)}</td>
                                 <td className="border-r border-gray-200 px-3 py-2">#{tx.id?.slice(-6)}</td>
                                 <td className="border-r border-gray-200 px-3 py-2">{tx.category}</td>
                                 <td className="border-r border-gray-200 px-3 py-2">{tx.desc} {tx.isVoided ? '(REVERSED)' : ''}</td>
                                 <td className="px-3 py-2 text-right font-medium text-rose-600">-{formatCurrency(tx.amount)}</td>
                              </tr>
                           ))}
                        </tbody>
                        <tfoot>
                           <tr className="bg-gray-50 font-bold border-t border-gray-300">
                              <td colSpan={4} className="border-r border-gray-300 px-3 py-2 text-right">Total Expenditures</td>
                              <td className="px-3 py-2 text-right text-rose-600">{formatCurrency(groups.outflow.reduce((s:any,i:any)=>s+i.amount,0))}</td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
                  </div>
               )}
            </div>

            {/* AUDIT LOG HISTORY */}
            <div className="mt-12 pt-8 border-t-2 border-gray-900">
               <div className="text-[0.65rem] font-bold text-gray-800 uppercase mb-4">Master Audit History (Last 5 Closures)</div>
               <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 text-[0.6rem] text-gray-800 min-w-[600px]">
                   <thead className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-left">
                     <tr>
                       <th className="border-r border-gray-300 px-3 py-2">Audit Date</th>
                       <th className="border-r border-gray-300 px-3 py-2">Revenue Audited</th>
                       <th className="border-r border-gray-300 px-3 py-2">Daily Total (Sales/Exp)</th>
                       <th className="px-3 py-2 text-right">Processed Logistics</th>
                     </tr>
                   </thead>
                   <tbody>
                     {audits.length > 0 ? (
                       audits.map((a, i) => (
                         <tr key={a.id || i} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="border-r border-gray-200 px-3 py-2">{formatDate(a.date)}</td>
                            <td className="border-r border-gray-200 px-3 py-2">{formatCurrency(a.auditRevenue || 0)}</td>
                            <td className="border-r border-gray-200 px-3 py-2">
                               <span className="text-emerald-600">{formatCurrency(a.totalSales || 0)}</span>
                               <span className="mx-1">/</span>
                               <span className="text-rose-600">{formatCurrency(a.totalExpenses || 0)}</span>
                            </td>
                            <td className="px-3 py-2 text-right">
                               {Array.isArray(a.details) ? a.details.length : 0} UNITS_POSTED
                            </td>
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan={4} className="px-3 py-4 text-center italic text-gray-500">Zero Historical Audit Logs Detected</td>
                       </tr>
                     )}
                   </tbody>
               </table>
            </div>

            {/* FOOTER */}
            <div className="mt-8 flex justify-between items-end text-[0.55rem] font-bold text-gray-700">
               <div>
                  <div>Generated By: ADMIN</div>
                  <div>Generated On: {new Date().toLocaleString('en-GB')}</div>
               </div>
            </div>

            </div>
         </div>
      )}



      <ProfessionalAlert
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertData.title}
        message={alertData.message}
        variant={alertData.variant}
      />
    </div>
  );
}
