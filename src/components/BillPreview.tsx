'use client';

import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Zap,
  Tag,
  X,
  Printer
} from "lucide-react";
import { motion } from "framer-motion";

export default function BillPreview({ sale, config, isOpen, onClose }: { sale: any, config: any, isOpen?: boolean, onClose?: () => void }) {
  if (!sale || !isOpen) return null;

  const guestName = sale.guestName || sale.guest || 'Anonymous resident';
  const billDate = sale.billDate || sale.date || new Date();
  const lineItems = sale.billItems || sale.items || [];

  const isInclusive = !!config?.taxInclusive;
  const scRate = (config?.applyServiceCharge && (sale.applySC ?? true)) ? (config?.serviceChargeRate || 10) / 100 : 0;
  const vatRate = (config?.applyVat && (sale.applyVat ?? true)) ? (config?.vatRate || 13) / 100 : 0;
  const factor = (1 + scRate) * (1 + vatRate);

  const rawSubtotal = lineItems.reduce((sum: number, item: any) => sum + (parseFloat(item.amount || item.price) || 0), 0);
  const rawExclusiveSubtotal = isInclusive ? (rawSubtotal / factor) : rawSubtotal;
  
  const discountAmount = sale.discount || 0;
  const subtotal = sale.subtotal !== undefined ? sale.subtotal : (rawExclusiveSubtotal - (isInclusive ? (discountAmount / factor) : discountAmount));
  
  // Calculate exclusive discount to be rounding-safe:
  const exclusiveDiscount = discountAmount > 0 ? parseFloat((rawExclusiveSubtotal - subtotal).toFixed(2)) : 0;

  const tax = sale.taxAmount || sale.tax || 0;
  const sc = sale.serviceCharge || sale.sc || 0;
  const total = sale.netAmount || sale.amount || (subtotal + tax + sc);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center overflow-y-auto pt-4 pb-10 print:block print:p-0">
      {/* BACKGROUND BACKDROP (NO PRINT) */}
      <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl no-print" onClick={onClose} />
      
      {/* EXIT BUTTON (NO PRINT) */}
      <div className="fixed top-6 right-6 z-[210] no-print">
         <button 
           onClick={onClose}
           className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-3xl transition-all border border-white/20 shadow-2xl"
         >
           <X className="w-6 h-6" />
         </button>
      </div>
 
      {/* PRINT ACTION BUTTON (NO PRINT) */}
      <div className="fixed bottom-8 right-8 z-[210] no-print">
         <button 
           onClick={() => window.print()}
           className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.2em] text-[0.7rem] rounded-full flex items-center gap-4 transition-all shadow-2xl group"
         >
           <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" /> Print Document Suite
         </button>
      </div>
 
      {/* --- A4 SCALEABLE SHEET --- */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 0.9, y: 0 }}
        className="relative bg-white w-[210mm] print:w-full print:max-w-none min-h-[297mm] flex flex-col shadow-2xl border border-slate-200 overflow-hidden select-none origin-top print:shadow-none print:border-none print:h-auto institutional-report-root printable-doc"
        id="printable-folio"
      >
          {/* HEADER (STYLIZED COMPACT) */}
          <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-slate-950 flex items-center justify-center text-white rounded-sm shadow-xl">
                    <Building2 className="w-6 h-6" />
                </div>
                <div>
                   <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-none mb-2">
                       {config?.hotelName || 'Institutional Property'}
                   </h1>
                   <div className="flex gap-6 text-[0.5rem] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none">
                       <p>{config?.address}</p>
                       <p>{config?.phone}</p>
                   </div>
                </div>
             </div>
             
             <div className="text-right pl-8 border-l border-slate-200">
                <p className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Folio ID</p>
                <h2 className="text-lg font-black text-indigo-600 tracking-tighter leading-none italic mb-3">#{sale.id?.toString().replace('SAL-', '') || 'PREVIEW'}</h2>
                <div className="flex flex-col items-end gap-1.5">
                    <p className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest leading-none">Registry Date</p>
                    <p className="text-[0.6rem] font-bold text-slate-950 leading-none">{new Date(billDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
             </div>
          </div>

          {/* GUEST SECTION */}
          <div className="px-10 py-6 border-b border-slate-50 flex justify-between items-center bg-white">
              <div>
                  <p className="text-[0.5rem] font-black text-indigo-400 uppercase tracking-[0.5em] mb-3 leading-none">Registered Resident Portfolio</p>
                  <h3 className="text-xl font-black text-slate-950 tracking-tight uppercase leading-none italic">
                      {guestName}
                  </h3>
                  <div className="flex gap-8 mt-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none">
                      <p className="flex items-center gap-2"><Phone className="w-3 h-3 text-slate-400" /> {sale.phone || 'N/A'}</p>
                      <p className="flex items-center gap-2"><Tag className="w-3 h-3 text-slate-400" /> PAN/VAT: {sale.pan || 'UNREG'}</p>
                  </div>
              </div>
              <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-sm border border-emerald-100 flex items-center gap-2 shadow-sm">
                  <ShieldCheck className="w-3 h-3" />
                  <span className="text-[0.45rem] font-black uppercase tracking-widest">Post-Settled Folio</span>
              </div>
          </div>

          {/* LOGISTICS ROW */}
          <div className="px-10 py-4 grid grid-cols-2 bg-slate-50/30 border-b border-slate-50">
              <div className="flex gap-10 items-center border-r border-slate-100 pr-10">
                  <p className="text-[0.45rem] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Stay context</p>
                  <p className="text-[0.7rem] font-bold text-slate-950 tracking-[0.2em] italic leading-none">{sale.roomNumber ? `Room ${sale.roomNumber}` : 'Inhouse'} / {sale.plan || 'EP'}</p>
              </div>
              <div className="flex gap-10 items-center justify-end pl-10">
                  <p className="text-[0.45rem] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Pax Registry</p>
                  <p className="text-[0.7rem] font-bold text-slate-950 leading-none tracking-widest">{sale.pax || '1'} VERIFIED</p>
              </div>
          </div>

          {/* LEDGER AREA (FLEX GROW) */}
          <div className="flex-1 flex flex-col pt-3">
              <div className="grid grid-cols-12 border-b-2 border-slate-950 px-10 py-3 mb-3">
                  <div className="col-span-1 text-[0.45rem] font-black text-slate-500 uppercase tracking-widest">RF</div>
                  <div className="col-span-8 text-[0.45rem] font-black text-slate-500 uppercase tracking-widest">Description of Service Registry</div>
                  <div className="col-span-3 text-[0.45rem] font-black text-slate-500 uppercase tracking-widest text-right px-4">Value (NPR)</div>
              </div>
              <div className="px-10 space-y-4 pb-8">
                  {Array.isArray(lineItems) && lineItems.map((item: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-12 items-baseline">
                          <div className="col-span-1 text-[0.55rem] font-bold text-slate-400">{(idx + 1).toString().padStart(2, '0')}</div>
                          <div className="col-span-8">
                              <h4 className="text-[0.7rem] font-black text-slate-950 uppercase tracking-[0.1em] italic leading-none">
                                {item.spaItemName || item.itemName || item.category || 'Service Item'}
                              </h4>
                              {item.note && <p className="text-[0.45rem] text-slate-500 mt-0.5 uppercase tracking-widest">{item.note}</p>}
                              {item.employeeName && <p className="text-[0.4rem] text-indigo-600 mt-0.5 uppercase tracking-wider font-semibold">Therapist: {item.employeeName}</p>}
                              {item.roomNumber && (item.category || '').toUpperCase().includes('SPA') && <p className="text-[0.4rem] text-emerald-600 mt-0.5 uppercase tracking-wider font-black">Charged to Room {item.roomNumber}</p>}
                          </div>
                          <div className="col-span-3 text-right">
                              <p className="text-[0.75rem] font-black text-slate-950 tracking-tight leading-none px-4">
                                {formatCurrency(item.amount || item.price)}
                              </p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* FOOTER (CLEAN & ABSOLUTE ZERO OVERLAP) */}
          <div className="px-10 pt-8 pb-10 bg-white border-t border-slate-950 mt-auto">
              <div className="flex items-start justify-between">
                  {/* SIGNATURES */}
                  <div className="flex flex-col gap-16">
                      {/* SETTLEMENT ARCHIVAL BREAKDOWN (FOR MULTI-MODE BALANCING) */}
                      {sale.settlements && Array.isArray(sale.settlements) && sale.settlements.length > 0 && (
                        <div className="space-y-3">
                           <p className="text-[0.5rem] font-black text-indigo-400 uppercase tracking-[0.5em] italic leading-none">Settlement Protocols</p>
                           <div className="flex flex-col gap-2 max-w-[300px]">
                              {sale.settlements.map((s: any, i: number) => {
                                const modeLabel = typeof s.mode === 'object' ? (s.mode?.label || 'Cash') : (s.mode || 'Cash');
                                const amt = parseFloat(s.amount) || 0;
                                return (
                                <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-1">
                                   <div>
                                      <p className="text-[0.55rem] font-black text-slate-700 uppercase tracking-widest">{modeLabel} {s.debtorName && `(${s.debtorName})`}</p>
                                      <p className="text-[0.4rem] font-bold text-slate-400 uppercase leading-none mt-0.5">{new Date(s.date || sale.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                   </div>
                                   <span className="text-[0.7rem] font-black text-slate-950 tracking-tight italic">{formatCurrency(amt)}</span>
                                </div>
                                );
                              })}
                           </div>
                        </div>
                      )}

                      <div className="flex gap-16">
                        <div className="text-center">
                            <div className="w-32 border-t border-slate-200 pt-3">
                               <p className="text-[0.45rem] font-bold text-slate-300 uppercase tracking-[0.3em]">Guest Resident Signature</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="w-32 border-t border-slate-200 pt-3">
                               <p className="text-[0.45rem] font-bold text-slate-300 uppercase tracking-[0.3em]">Institutional Verification</p>
                            </div>
                        </div>
                      </div>
                  </div>

                  {/* TOTALS: STACKED BLOCK */}
                  <div className="min-w-[280px] flex flex-col gap-3">
                       <div className="flex justify-between items-center text-[0.6rem] font-bold text-slate-400 uppercase tracking-[0.2em]">
                           <span>Subtotal</span>
                           <span className="text-slate-950 font-black">{rawExclusiveSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                       </div>
                       {exclusiveDiscount > 0 && (
                        <div className="flex justify-between items-center text-[0.6rem] font-bold text-indigo-500 uppercase tracking-[0.2em] italic">
                            <span>Discount Allowed</span>
                            <span className="text-indigo-600 font-black">-{exclusiveDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                       )}
                       {sc > 0 && (
                        <div className="flex justify-between items-center text-[0.6rem] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
                            <span>Service Surcharge ({config?.serviceChargeRate}%)</span>
                            <span className="text-slate-950 font-black">{sc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                       )}
                       {tax > 0 && (
                        <div className="flex justify-between items-center text-[0.6rem] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
                            <span>Value Added Tax ({config?.vatRate}%)</span>
                            <span className="text-slate-950 font-black">{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                       )}
                       
                       <div className="mt-4 pt-5 border-t-2 border-slate-950 flex justify-between items-baseline gap-6">
                           <p className="text-[0.7rem] font-black text-indigo-500 uppercase tracking-[0.5em] italic leading-none">Net Total</p>
                           <div className="flex items-baseline gap-2">
                               <span className="text-[0.55rem] font-black text-slate-200 tracking-widest uppercase">NPR</span>
                               <span className="text-2xl font-black text-slate-950 tracking-tighter italic">
                                   {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                               </span>
                           </div>
                       </div>
                  </div>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-50 flex justify-between items-center opacity-60 text-[0.42rem] font-black text-slate-500 uppercase tracking-[0.4em]">
                  <p>Saved Document Archive [v.2.01-A4]</p>
                  <div className="flex items-center gap-3">
                    <span>{config?.hotelName}</span>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
              </div>
          </div>
      </motion.div>

    </div>
  );
}
