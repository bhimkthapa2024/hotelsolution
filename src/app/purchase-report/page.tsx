'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPurchaseReport, getConfig, voidTransaction, getExpenseById } from '@/actions/hotel';
import { exportToExcel } from '@/lib/excel';
import { ShieldCheck, AlertTriangle, Zap, XCircle } from "lucide-react";
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";
import { ProfessionalPrompt } from '@/components/ProfessionalPrompt';
import { ProfessionalConfirm } from '@/components/ProfessionalConfirm';
import { ProfessionalAlert } from '@/components/ProfessionalAlert';
import AuthorityGuard from '@/components/AuthorityGuard';
import { getCurrentUser } from '@/actions/auth';

function PurchaseReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
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
    const [pData, cData, user] = await Promise.all([
      getPurchaseReport(filter.from, filter.to),
      getConfig(),
      getCurrentUser()
    ]);
    setPurchases(pData);
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
        const purchase = await getExpenseById(targetId) as any;
        if (purchase && purchase.date) {
          setFilter({ from: purchase.date, to: purchase.date });
          setSearch('');
          setSelectedPurchase(purchase);
        }
      }
      fetchDeepLink(id);
    }
  }, [searchParams]);

  const handleVoid = (id: string, shouldClone = false) => {
    if (shouldClone) {
      const purchase = purchases.find(p => p.id === id);
      if (purchase) {
        sessionStorage.setItem('edit_source', JSON.stringify({ ...purchase, originalId: id }));
        router.push('/purchase');
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
    const res = await voidTransaction(pendingAction.id, 'EXPENSE', pendingReason);
    if (res.success) {
      await loadData();
      setSelectedPurchase(null);
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

  const filteredPurchases = purchases.filter(p =>
    p.id.toString().includes(search) ||
    p.vendor?.toLowerCase().includes(search.toLowerCase()) ||
    p.note?.toLowerCase().includes(search.toLowerCase()) ||
    p.items?.some((i: any) => i.note?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalExpenses = useMemo(() =>
    filteredPurchases.filter(p => !p.isVoided).reduce((sum, p) =>
      sum + (parseFloat(p.amount) || p.items?.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0) || 0), 0
    ), [filteredPurchases]);

  const handleExport = () => {
    const headers = ["Voucher ID", "Date", "Vendor/Party", "Note", "Amount", "Settlement", "Status"];
    const rows = filteredPurchases.map(p => [
      p.id, formatDate(p.date), p.vendor || 'N/A', p.note || '',
      p.amount || p.items?.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0) || 0,
      p.paymentMode || p.settlements?.map((st: any) => st.mode).join('/') || 'N/A',
      p.isVoided ? "VOIDED" : "ACTIVE"
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purchase_report_${filter.from}_to_${filter.to}.csv`;
    link.click();
  };

  if (loading && purchases.length === 0) return (
    <div className="flex items-center justify-center h-full min-h-[300px] gap-3">
      <div className="w-6 h-6 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest text-rose-600">Loading Purchase Report...</span>
    </div>
  );

  return (
    <AuthorityGuard user={currentUser} requiredPermission="reports.view">
    <div className="relative w-full bg-white min-h-screen shadow-2xl print:shadow-none printable-doc p-8 print:p-0 mb-20 max-w-full" style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>

      {/* ── LIST VIEW ── hidden when a purchase is selected */}
      <div className={cn(selectedPurchase ? 'hidden' : 'block')}>

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
              <input type="date" value={filter.from} onChange={e => setFilter(p => ({ ...p, from: e.target.value }))} className="text-sm border border-gray-300 rounded p-1.5 focus:border-rose-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">To Date</label>
              <input type="date" value={filter.to} onChange={e => setFilter(p => ({ ...p, to: e.target.value }))} className="text-sm border border-gray-300 rounded p-1.5 focus:border-rose-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Voucher / Vendor..." className="text-sm border border-gray-300 rounded p-1.5 focus:border-rose-500 outline-none w-[200px]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="px-4 py-2 border border-emerald-600 text-emerald-700 font-bold text-xs uppercase rounded hover:bg-emerald-50 transition-all">Export CSV</button>
            <button onClick={() => exportToExcel(purchases, "export")} className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs uppercase rounded hover:bg-emerald-700 transition-all">Excel</button>
            <button onClick={() => window.print()} className="px-4 py-2 border border-rose-600 text-rose-700 font-bold text-xs uppercase rounded hover:bg-rose-50 transition-all">Print</button>
          </div>
        </div>

        {/* REPORT META */}
        <div className="text-[0.55rem] font-bold text-gray-700 uppercase mb-4">
          <span className="text-[0.65rem] text-rose-700">PURCHASE REPORT</span>
          <span className="ml-4 text-gray-500">FROM: {filter.from ? formatDate(filter.from) : '-'}</span>
          <span className="ml-4 text-gray-500">TO: {filter.to ? formatDate(filter.to) : '-'}</span>
        </div>

        {/* TABLE */}
        <div className="border border-gray-300 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[0.6rem] font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300">
                <th className="px-4 py-2.5 border-r border-gray-200">Voucher ID</th>
                <th className="px-4 py-2.5 border-r border-gray-200">Date</th>
                <th className="px-4 py-2.5 border-r border-gray-200">Vendor / Party</th>
                <th className="px-4 py-2.5 border-r border-gray-200">Line Items</th>
                <th className="px-4 py-2.5 border-r border-gray-200">Settlement</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map(p => {
                const amt = parseFloat(p.amount) || p.items?.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0) || 0;
                const settlement = p.paymentMode || p.settlements?.map((st: any) => st.mode).join(', ') || 'Unspecified';
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPurchase(p)}
                    className={cn(
                      "border-b border-gray-100 hover:bg-rose-50/30 cursor-pointer transition-colors",
                      p.isVoided && "bg-rose-50/40 text-gray-400"
                    )}
                  >
                    <td className="px-4 py-2 text-xs font-mono text-gray-500 border-r border-gray-100">
                      <span className={cn(p.isVoided && "line-through")}>#{p.id}</span>
                    </td>
                    <td className="px-4 py-2 text-xs font-bold text-gray-800 border-r border-gray-100">
                      <span className={cn(p.isVoided && "line-through")}>{formatDate(p.date)}</span>
                    </td>
                    <td className="px-4 py-2 text-xs border-r border-gray-100">
                      <div className="font-bold text-gray-900 uppercase">{p.vendor || 'Unknown Supplier'}</div>
                      {p.type && <div className="text-[0.6rem] text-gray-400">{p.type}</div>}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 border-r border-gray-100 max-w-[220px] truncate">
                      {p.items?.map((item: any) => `${item.category}: ${formatCurrency(item.amount)}`).join(' | ')}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-100">
                      {p.isVoided ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[0.6rem] font-bold uppercase rounded">Voided</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[0.6rem] font-bold uppercase rounded">{settlement}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={cn("text-xs font-bold font-mono", p.isVoided ? "line-through text-gray-400" : "text-gray-900")}>
                        {formatCurrency(amt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-700">Total Expenses</td>
                <td className="px-4 py-3 text-right text-base font-bold font-mono text-gray-900">{formatCurrency(totalExpenses)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── INLINE DETAIL VIEW (ledger-style) ── */}
      {selectedPurchase && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Back nav + actions */}
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4 no-print">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-widest hover:text-rose-700 transition-colors"
              >
                ← Back to Purchase List
              </button>
              <div className="flex items-center gap-2">
                {!selectedPurchase.isVoided && (
                  <>
                    <button onClick={() => handleVoid(selectedPurchase.id, true)} disabled={voiding} className="px-4 py-2 border border-rose-600 text-rose-700 font-bold text-xs uppercase rounded hover:bg-rose-50 transition-all">
                      {voiding ? 'Processing...' : 'Modify & Re-post'}
                    </button>
                    <button onClick={() => handleVoid(selectedPurchase.id, false)} disabled={voiding} className="px-4 py-2 border border-rose-400 text-rose-500 font-bold text-xs uppercase rounded hover:bg-rose-50 transition-all">
                      Reverse
                    </button>
                  </>
                )}
                <button onClick={() => window.print()} className="px-4 py-2 border border-gray-400 text-gray-600 font-bold text-xs uppercase rounded hover:bg-gray-50 transition-all">Print</button>
              </div>
            </div>

            {/* Voucher Header */}
            <div className="flex justify-between items-end border-b-2 border-gray-800 pb-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{config?.hotelName || 'Hotel'}</h1>
                <p className="text-xs text-gray-500 mt-0.5">{config?.address || ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase">Purchase Voucher</p>
                <p className="text-lg font-bold text-gray-900">#{selectedPurchase.id}</p>
                {selectedPurchase.isVoided && <p className="text-xs font-bold text-rose-600 uppercase mt-1">⚠ Voided / Reversed</p>}
              </div>
            </div>

            {selectedPurchase.isVoided && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-600 uppercase mb-1">Reversal Justification</p>
                  <p className="text-xs text-rose-800">"{selectedPurchase.voidReason || 'No reason recorded'}"</p>
                  {selectedPurchase.voidedByName && <p className="text-xs text-rose-500 mt-1">Reversed By: {selectedPurchase.voidedByName}</p>}
                </div>
              </div>
            )}

            {/* Vendor & Fiscal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">Vendor / Creditor</p>
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-gray-400 w-28 inline-block">Vendor Name:</span> <span className="font-bold text-gray-900 uppercase">{selectedPurchase.vendor || 'Unknown Supplier'}</span></div>
                  {selectedPurchase.pan && <div><span className="text-gray-400 w-28 inline-block">PAN / Tax ID:</span> <span className="font-bold text-gray-900">{selectedPurchase.pan}</span></div>}
                  {selectedPurchase.note && <div><span className="text-gray-400 w-28 inline-block">Note:</span> <span className="font-bold text-gray-900">{selectedPurchase.note}</span></div>}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">Fiscal Details</p>
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-gray-400 w-28 inline-block">Voucher Date:</span> <span className="font-bold text-gray-900">{formatDate(selectedPurchase.date)}</span></div>
                  <div><span className="text-gray-400 w-28 inline-block">Settlement:</span> <span className="font-bold text-rose-700">{selectedPurchase.paymentMode || selectedPurchase.settlements?.map((st: any) => st.mode).join(', ') || 'Unspecified'}</span></div>
                  {selectedPurchase.type && <div><span className="text-gray-400 w-28 inline-block">Type:</span> <span className="font-bold text-gray-900 uppercase">{selectedPurchase.type}</span></div>}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left border border-gray-200 mb-6">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-xs font-bold uppercase tracking-widest text-gray-700">
                  <th className="px-4 py-2.5 border-r border-gray-200">Ledger Head / Category</th>
                  <th className="px-4 py-2.5 border-r border-gray-200">Note / Description</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedPurchase.items?.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs font-medium text-gray-800 uppercase">{item.category}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      <div>{item.note || '—'}</div>
                      {(item.qty && item.qty !== 1 || item.rate) && (
                        <div className="text-[0.6rem] text-rose-600 font-bold mt-0.5">Qty: {item.qty || 1} × {formatCurrency(item.rate || item.amount)}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-right font-bold font-mono text-gray-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-800 bg-gray-50">
                  <td colSpan={2} className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600">Net Total</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-gray-900 font-mono">
                    {formatCurrency(selectedPurchase.amount || selectedPurchase.items?.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0) || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Audit Footprint */}
            <div className="bg-gray-50 border border-gray-200 rounded p-4 text-xs text-gray-600 mb-6">
              <p className="font-bold uppercase tracking-widest text-gray-500 mb-2">Audit Footprint</p>
              <div className="space-y-1">
                <div><span className="text-gray-400 w-24 inline-block">Posted By:</span> <span className="font-bold text-gray-800 uppercase">{selectedPurchase.createdByName || 'System'}</span></div>
                {selectedPurchase.createdAt && <div><span className="text-gray-400 w-24 inline-block">Timestamp:</span> <span className="font-bold text-gray-800">{new Date(selectedPurchase.createdAt).toLocaleString()}</span></div>}
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
        icon={<Zap className="w-5 h-5 text-rose-400" />}
      />
      <ProfessionalConfirm
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeVoid}
        title="Confirm Reversal"
        message="Are you sure you want to permanently reverse this purchase transaction?"
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

export default function PurchaseReport() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PurchaseReportContent />
    </Suspense>
  );
}
