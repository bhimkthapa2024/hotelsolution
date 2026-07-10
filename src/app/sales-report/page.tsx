'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSalesReport, getConfig, voidTransaction, getSaleById } from '@/actions/hotel';
import { 
  ShieldCheck,
  User,
  XCircle,
  Download,
  Printer,
  AlertTriangle,
  RefreshCcw,
  Slash,
  Zap
} from "lucide-react";
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";
import { ProfessionalPrompt } from '@/components/ProfessionalPrompt';
import { ProfessionalConfirm } from '@/components/ProfessionalConfirm';
import { ProfessionalAlert } from '@/components/ProfessionalAlert';
import AuthorityGuard from '@/components/AuthorityGuard';
import { getCurrentUser } from '@/actions/auth';

const getSettledModes = (s: any, separator = ', ', fallback = 'PENDING') => {
  const active = s?.settlements
    ?.filter((st: any) => (parseFloat(st.amount) || 0) > 0)
    .map((st: any) => st.mode) || [];
  if (active.length > 0) {
    return active.join(separator);
  }
  return s?.paymentMode || fallback;
};

function SalesReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sales, setSales] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const today = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  }, []);

  const [filter, setFilter] = useState({ from: today, to: today });

  const [promptOpen, setPromptOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertData, setAlertData] = useState({ title: '', message: '', variant: 'info' as any });
  const [pendingAction, setPendingAction] = useState<{ id: string, shouldClone: boolean } | null>(null);
  const [pendingReason, setPendingReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [sData, cData, user] = await Promise.all([
      getSalesReport(filter.from, filter.to),
      getConfig(),
      getCurrentUser()
    ]);
    setSales(sData);
    setConfig(cData);
    setCurrentUser(user);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filter.from, filter.to]);

  // Deep Link Handling
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      async function fetchDeepLink(targetId: string) {
        const sale = await getSaleById(targetId) as any;
        if (sale && sale.date) {
          setFilter({ from: sale.date, to: sale.date });
          setSearch('');
          setSelectedSale(sale);
        }
      }
      fetchDeepLink(id);
    }
  }, [searchParams]);

  const handleVoid = (id: string, shouldClone = false) => {
    if (shouldClone) {
      const sale = sales.find(s => s.id === id);
      if (sale) {
        sessionStorage.setItem('edit_source', JSON.stringify({ ...sale, originalId: id }));
        router.push('/sales');
      }
      return;
    }
    setPendingAction({ id, shouldClone: false });
    setPromptOpen(true);
  };

  const initiateReversal = (reason: string) => {
    setPendingReason(reason);
    setConfirmOpen(true);
  };

  const executeVoid = async () => {
    if (!pendingAction || !pendingReason) return;
    setVoiding(true);
    const res = await voidTransaction(pendingAction.id, 'SALE', pendingReason);
    if (res.success) {
      await loadData();
      setSelectedSale(null);
      setAlertData({ title: 'Success', message: 'Transaction reversed successfully.', variant: 'success' });
      setAlertOpen(true);
    } else {
      setAlertData({ title: 'Failed', message: res.error || 'Unable to reverse transaction.', variant: 'error' });
      setAlertOpen(true);
    }
    setVoiding(false);
    setPendingAction(null);
    setPendingReason('');
  };

  const filteredSales = sales.filter(s =>
    s.id.toString().includes(search) ||
    s.guest?.toLowerCase().includes(search.toLowerCase()) ||
    s.roomNumber?.toString().includes(search)
  );

  const settlementTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredSales.filter(s => !s.isVoided).forEach(s => {
      if (s.settlements && Array.isArray(s.settlements) && s.settlements.length > 0) {
        s.settlements.forEach((st: any) => {
          const amt = parseFloat(st.amount) || 0;
          if (amt > 0) {
            const mode = typeof st.mode === 'object' ? (st.mode?.label || 'Cash') : (st.mode || 'Cash');
            totals[mode.toUpperCase()] = (totals[mode.toUpperCase()] || 0) + amt;
          }
        });
      } else {
        const mode = (s.paymentMode || 'PENDING').toUpperCase();
        const amt = parseFloat(s.amount) || 0;
        if (amt > 0) totals[mode] = (totals[mode] || 0) + amt;
      }
    });
    return totals;
  }, [filteredSales]);

  const handleExport = () => {
    const headers = ["Bill ID", "Date", "Guest", "Room", "Items", "Amount", "Settlement", "Status"];
    const rows = filteredSales.map(s => [
      s.id, formatDate(s.date), s.guest || 'N/A', s.roomNumber || 'N/A',
      s.items?.length || 0, s.amount, getSettledModes(s, '/', 'UNSETTLED'),
      s.isVoided ? "VOIDED" : "ACTIVE"
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_report_${filter.from}_to_${filter.to}.csv`;
    link.click();
  };

  if (loading && sales.length === 0) return (
    <div className="flex items-center justify-center h-full gap-3 min-h-[300px]">
      <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Loading Sales Report...</span>
    </div>
  );

  return (
    <AuthorityGuard user={currentUser} requiredPermission="reports.view">
    <div className="relative w-full bg-white min-h-screen shadow-2xl print:shadow-none printable-doc p-8 print:p-0 mb-20 max-w-full" style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>

      {/* ── LIST VIEW ── hidden when a sale is selected */}
      <div className={cn(selectedSale ? 'hidden' : 'block')}>

        {/* COMPANY HEADER */}
        <div className="flex flex-col items-center justify-center mb-6 border-b border-gray-300 pb-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-wide uppercase">{config?.hotelName || 'Hotel'}</h1>
          <p className="text-[0.65rem] text-gray-600 mt-0.5">{config?.address || ''}</p>
          <div className="flex items-center gap-4 mt-1 text-[0.55rem] text-gray-500">
            {config?.phone && <span>📱 {config.phone}</span>}
            {config?.email && <span>✉️ {config.email}</span>}
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6 no-print">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">From Date</label>
              <input type="date" value={filter.from} onChange={e => setFilter(p => ({ ...p, from: e.target.value }))} className="text-sm border border-gray-300 rounded p-1.5 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">To Date</label>
              <input type="date" value={filter.to} onChange={e => setFilter(p => ({ ...p, to: e.target.value }))} className="text-sm border border-gray-300 rounded p-1.5 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Bill ID / Guest..." className="text-sm border border-gray-300 rounded p-1.5 focus:border-indigo-500 outline-none w-[200px]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="px-4 py-2 border border-emerald-600 text-emerald-700 font-bold text-xs uppercase rounded hover:bg-emerald-50 transition-all">Export CSV</button>
            <button onClick={() => window.print()} className="px-4 py-2 border border-indigo-600 text-indigo-700 font-bold text-xs uppercase rounded hover:bg-indigo-50 transition-all">Print</button>
          </div>
        </div>

        {/* REPORT META */}
        <div className="text-[0.55rem] font-bold text-gray-700 uppercase mb-4">
          <span className="text-[0.65rem] text-indigo-700">SALES REPORT</span>
          <span className="ml-4 text-gray-500">FROM: {filter.from ? formatDate(filter.from) : '-'}</span>
          <span className="ml-4 text-gray-500">TO: {filter.to ? formatDate(filter.to) : '-'}</span>
        </div>

        {/* TABLE */}
        <div className="border border-gray-300 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[0.6rem] font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300">
                <th className="px-4 py-2.5 border-r border-gray-200">Bill ID</th>
                <th className="px-4 py-2.5 border-r border-gray-200">Date</th>
                <th className="px-4 py-2.5 border-r border-gray-200">Guest / Room</th>
                <th className="px-4 py-2.5 border-r border-gray-200">Settlement</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(s => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedSale(s)}
                  className={cn(
                    "border-b border-gray-100 hover:bg-indigo-50 cursor-pointer transition-colors",
                    s.isVoided && "bg-rose-50/50 text-gray-400"
                  )}
                >
                  <td className="px-4 py-2 text-xs font-mono text-gray-500 border-r border-gray-100">
                    <span className={cn(s.isVoided && "line-through")}>#{s.id.toString().padStart(5,'0')}</span>
                  </td>
                  <td className="px-4 py-2 text-xs font-bold text-gray-800 border-r border-gray-100">
                    <span className={cn(s.isVoided && "line-through")}>{formatDate(s.date)}</span>
                  </td>
                  <td className="px-4 py-2 text-xs border-r border-gray-100">
                    <div className="font-bold text-gray-900 uppercase">{s.guest || 'Walk-in'}</div>
                    <div className="text-[0.6rem] text-gray-400">Room {s.roomNumber || 'Gen'}</div>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-100">
                    {s.isVoided ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[0.6rem] font-bold uppercase rounded">Voided</span>
                    ) : (
                      <span className={cn(
                        "px-2 py-0.5 text-[0.6rem] font-bold uppercase rounded",
                        (s.paymentMode || s.settlements?.some((st: any) => parseFloat(st.amount) > 0))
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-600'
                      )}>
                        {getSettledModes(s, ', ', 'Pending')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={cn("text-xs font-bold font-mono", s.isVoided ? "line-through text-gray-400" : "text-gray-900")}>
                      {formatCurrency(s.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-200 bg-gray-50">
              {Object.entries(settlementTotals).map(([mode, amt]) => (
                <tr key={mode} className="border-b border-gray-100">
                  <td colSpan={4} className="px-4 py-1.5 text-right text-[0.6rem] font-bold text-gray-500 uppercase">{mode} Total</td>
                  <td className="px-4 py-1.5 text-right text-[0.6rem] font-bold font-mono text-gray-700">{formatCurrency(amt)}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-300">
                <td colSpan={4} className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-700">Net Sales Total</td>
                <td className="px-4 py-3 text-right text-base font-bold font-mono text-gray-900">
                  {formatCurrency(filteredSales.filter(s => !s.isVoided).reduce((sum, s) => sum + (s.amount || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── INLINE DETAIL VIEW (ledger-style) ── shown when a sale is selected */}
      {selectedSale && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Back nav + actions */}
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4 no-print">
              <button
                onClick={() => setSelectedSale(null)}
                className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
              >
                ← Back to Sales List
              </button>
              <div className="flex items-center gap-2">
                {!selectedSale.isVoided && (
                  <>
                    <button onClick={() => handleVoid(selectedSale.id, true)} disabled={voiding} className="px-4 py-2 border border-indigo-600 text-indigo-700 font-bold text-xs uppercase rounded hover:bg-indigo-50 transition-all">
                      {voiding ? 'Processing...' : 'Modify & Re-post'}
                    </button>
                    <button onClick={() => handleVoid(selectedSale.id, false)} disabled={voiding} className="px-4 py-2 border border-rose-500 text-rose-600 font-bold text-xs uppercase rounded hover:bg-rose-50 transition-all">
                      Reverse
                    </button>
                  </>
                )}
                <button onClick={() => window.print()} className="px-4 py-2 border border-gray-400 text-gray-600 font-bold text-xs uppercase rounded hover:bg-gray-50 transition-all">Print</button>
              </div>
            </div>

            {/* Bill Header */}
            <div className="flex justify-between items-end border-b-2 border-gray-800 pb-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{config?.hotelName || 'Hotel'}</h1>
                <p className="text-xs text-gray-500 mt-0.5">{config?.address || ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase">Sales Bill</p>
                <p className="text-lg font-bold text-gray-900">#{selectedSale.id?.toString().padStart(5,'0')}</p>
                {selectedSale.isVoided && <p className="text-xs font-bold text-rose-600 uppercase mt-1">⚠ Voided / Reversed</p>}
              </div>
            </div>

            {selectedSale.isVoided && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-600 uppercase mb-1">Reversal Justification</p>
                  <p className="text-xs text-rose-800">"{selectedSale.voidReason || 'No reason recorded'}"</p>
                  {selectedSale.voidedByName && <p className="text-xs text-rose-500 mt-1">Reversed By: {selectedSale.voidedByName}</p>}
                </div>
              </div>
            )}

            {/* Guest & Stay */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">Client Details</p>
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-gray-400 w-28 inline-block">Guest Name:</span> <span className="font-bold text-gray-900 uppercase">{selectedSale.guest || 'Walk-in'}</span></div>
                  {selectedSale.phone && <div><span className="text-gray-400 w-28 inline-block">Phone:</span> <span className="font-bold text-gray-900">{selectedSale.phone}</span></div>}
                  {selectedSale.pan && <div><span className="text-gray-400 w-28 inline-block">PAN / ID:</span> <span className="font-bold text-gray-900">{selectedSale.pan}</span></div>}
                  {selectedSale.nationality && <div><span className="text-gray-400 w-28 inline-block">Nationality:</span> <span className="font-bold text-gray-900">{selectedSale.nationality}</span></div>}
                  {selectedSale.address && <div><span className="text-gray-400 w-28 inline-block">Address:</span> <span className="font-bold text-gray-900">{selectedSale.address}</span></div>}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">Stay & Fiscal</p>
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-gray-400 w-28 inline-block">Room:</span> <span className="font-bold text-gray-900">{selectedSale.roomNumber || 'General'}</span></div>
                  {selectedSale.pax && <div><span className="text-gray-400 w-28 inline-block">Pax:</span> <span className="font-bold text-gray-900">{selectedSale.pax}</span></div>}
                  <div><span className="text-gray-400 w-28 inline-block">Bill Date:</span> <span className="font-bold text-gray-900">{formatDate(selectedSale.date)}</span></div>
                  {selectedSale.arrivalDate && <div><span className="text-gray-400 w-28 inline-block">Arrival:</span> <span className="font-bold text-gray-900">{formatDate(selectedSale.arrivalDate)}</span></div>}
                  {selectedSale.departureDate && <div><span className="text-gray-400 w-28 inline-block">Departure:</span> <span className="font-bold text-gray-900">{formatDate(selectedSale.departureDate)}</span></div>}
                  <div><span className="text-gray-400 w-28 inline-block">Settlement:</span> <span className="font-bold text-indigo-700">{getSettledModes(selectedSale, ', ', 'Pending')}</span></div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left border border-gray-200 mb-6">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-xs font-bold uppercase tracking-widest text-gray-700">
                  <th className="px-4 py-2.5 border-r border-gray-200">Service / Item</th>
                  <th className="px-4 py-2.5 border-r border-gray-200 text-center">Qty</th>
                  <th className="px-4 py-2.5 border-r border-gray-200 text-right">Rate</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items?.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs font-medium text-gray-800 uppercase">{item.name || item.category}</td>
                    <td className="px-4 py-2 text-xs text-center text-gray-700">{item.qty || 1}</td>
                    <td className="px-4 py-2 text-xs text-right text-gray-700 font-mono">{formatCurrency(item.price || item.amount)}</td>
                    <td className="px-4 py-2 text-xs text-right font-bold text-gray-900 font-mono">{formatCurrency((item.price || item.amount) * (item.qty || 1))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-800 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600">Net Total</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-gray-900 font-mono">{formatCurrency(selectedSale.amount)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Audit Footprint */}
            <div className="bg-gray-50 border border-gray-200 rounded p-4 text-xs text-gray-600 mb-6">
              <p className="font-bold uppercase tracking-widest text-gray-500 mb-2">Audit Footprint</p>
              <div className="space-y-1">
                <div><span className="text-gray-400 w-24 inline-block">Posted By:</span> <span className="font-bold text-gray-800 uppercase">{selectedSale.createdByName || 'System'}</span></div>
                {selectedSale.createdAt && <div><span className="text-gray-400 w-24 inline-block">Timestamp:</span> <span className="font-bold text-gray-800">{new Date(selectedSale.createdAt).toLocaleString()}</span></div>}
              </div>
            </div>

            {/* Signature Line */}
            <div className="flex justify-between items-end mt-12 border-t border-gray-200 pt-6">
              <div className="flex items-center gap-16">
                <div className="w-32 border-b border-gray-500 pb-1 text-center text-xs text-gray-400 pt-8">Authorization</div>
                <div className="w-32 border-b border-gray-500 pb-1 text-center text-xs text-gray-400 pt-8">Registry Stamp</div>
              </div>
              <ShieldCheck className="w-5 h-5 text-gray-200" />
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <ProfessionalPrompt
        isOpen={promptOpen}
        onClose={() => setPromptOpen(false)}
        onConfirm={initiateReversal}
        title="Audit Justification"
        subtitle="Please provide a reason for this reversal:"
        placeholder="ENTER REASON..."
        icon={<Zap className="w-5 h-5 text-indigo-400" />}
      />
      <ProfessionalConfirm
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeVoid}
        title="Confirm Reversal"
        message="Are you sure you want to permanently reverse this transaction?"
        variant="danger"
        confirmText="REVERSE"
      />
      <ProfessionalAlert
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertData.title}
        message={alertData.message}
        variant={alertData.variant}
      />
    </div>
    </AuthorityGuard>
  );
}

export default function SalesReport() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SalesReportContent />
    </Suspense>
  );
}
