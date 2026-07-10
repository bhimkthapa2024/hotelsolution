'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Printer, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  id?: string;
  amount?: number;
  onPrint?: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
}

export function SuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  id, 
  amount, 
  onPrint, 
  onSecondary, 
  secondaryLabel = "New Entry" 
}: SuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-[480px] bg-white rounded-[var(--radius-lg)] shadow-2xl border border-slate-200 overflow-hidden relative group"
          >
            {/* BACKGROUND GLOW */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-32 translate-x-32 group-hover:bg-emerald-500/10 transition-all duration-700 pointer-events-none" />
            
            {/* CLOSE BUTTON */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-full transition-all hover:bg-slate-100 z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-10 flex flex-col items-center text-center">
              {/* ANIMATED ICON */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-inner border border-emerald-100"
              >
                <CheckCircle2 className="w-12 h-12" />
              </motion.div>

              <div className="space-y-3 mb-10">
                <div className="flex items-center justify-center gap-2 mb-2">
                   <div className="px-2 py-0.5 bg-emerald-600 text-[0.45rem] font-black text-white rounded-[var(--radius-sm)] uppercase tracking-[0.3em] shadow-lg shadow-emerald-200">Success</div>
                   <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 underline decoration-emerald-600/30 underline-offset-4 italic"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Saved Successfully</span>
                </div>
                <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase italic leading-none">{title}</h2>
                <p className="text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.2em] max-w-[300px] mx-auto italic">{subtitle}</p>
              </div>

              {/* VOUCHER / RECEIPT SUMMARY */}
              {id && (
                <div className="w-full bg-slate-50 rounded-[var(--radius-md)] border border-slate-100 p-6 mb-10 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
                    <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest ">Transaction ID</span>
                    <span className="text-[0.8rem] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-[var(--radius-sm)]">#{id}</span>
                  </div>
                  {amount !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest ">Total Amount</span>
                      <span className="text-[1.25rem] font-black text-slate-950 tracking-tighter italic">{formatCurrency(amount)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="w-full grid grid-cols-2 gap-3">
                 {onPrint && (
                   <button 
                     onClick={onPrint}
                     className="py-2.5 bg-slate-950 hover:bg-black text-white rounded-[var(--radius-md)] transition-all shadow-lg active:scale-95 group/print flex items-center justify-center gap-2 border border-slate-800"
                   >
                     <Printer className="w-4 h-4 text-indigo-400 group-hover/print:scale-110 transition-transform shrink-0" />
                     <span className="text-[0.6rem] font-black uppercase tracking-[0.2em] whitespace-nowrap">Print Receipt</span>
                   </button>
                 )}
                 <button 
                   onClick={onSecondary || onClose}
                   className={`py-2.5 rounded-[var(--radius-md)] transition-all shadow-lg active:scale-95 group/next flex items-center justify-center gap-2 ${
                     onPrint ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'col-span-2 bg-indigo-600 text-white hover:bg-indigo-700'
                   }`}
                 >
                    <span className="text-[0.6rem] font-black uppercase tracking-[0.2em] whitespace-nowrap">{secondaryLabel}</span>
                    <ArrowRight className="w-4 h-4 text-white group-hover/next:translate-x-1 transition-transform shrink-0" />
                 </button>
              </div>

              <p className="mt-8 text-[0.45rem] font-black text-slate-300 uppercase tracking-[0.4em] italic ">Secured by Hotel Management System</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default SuccessModal;
