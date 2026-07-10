'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ProfessionalConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'info' | 'success';
}

export function ProfessionalConfirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "PROCEED_EXECUTION",
  cancelText = "ABORT_PROTOCOL",
  variant = 'info'
}: ProfessionalConfirmProps) {
  
  const colors = {
    danger: {
      primary: 'bg-rose-600',
      secondary: 'bg-rose-50',
      border: 'border-rose-100',
      text: 'text-rose-600',
      icon: <AlertTriangle className="w-5 h-5" />,
      shadow: 'shadow-rose-200'
    },
    info: {
      primary: 'bg-indigo-600',
      secondary: 'bg-indigo-50',
      border: 'border-indigo-100',
      text: 'text-indigo-600',
      icon: <ShieldCheck className="w-5 h-5" />,
      shadow: 'shadow-indigo-200'
    },
    success: {
      primary: 'bg-emerald-600',
      secondary: 'bg-emerald-50',
      border: 'border-emerald-100',
      text: 'text-emerald-600',
      icon: <CheckCircle2 className="w-5 h-5" />,
      shadow: 'shadow-emerald-200'
    }
  };

  const style = colors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-[440px] bg-white rounded-[var(--radius-lg)] shadow-2xl border border-slate-200 overflow-hidden relative"
          >
            {/* BRANDING STRIP */}
            <div className={`h-2 ${style.primary} w-full`} />
            
            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all hover:bg-rose-50 z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                 <div className={`w-12 h-12 ${style.secondary} border ${style.border} ${style.text} rounded-[var(--radius-md)] flex items-center justify-center shadow-inner`}>
                    {style.icon}
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <ShieldCheck className="w-4 h-4 text-emerald-500" />
                       <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-[0.2em] italic">System Authority Protocol</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{title}</h3>
                 </div>
              </div>

              <p className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-8">
                {message}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={onClose}
                  className="py-4 bg-slate-100 text-slate-500 font-black text-[0.65rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`py-4 ${style.primary} text-white font-black text-[0.65rem] rounded-[var(--radius-md)] uppercase tracking-[0.2em] transition-all shadow-xl ${style.shadow} hover:brightness-110 active:scale-95`}
                >
                  {confirmText}
                </button>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-50 flex items-center justify-center gap-4 opacity-30">
                <span className="text-[0.4rem] font-black text-slate-400 uppercase tracking-[0.5em] italic text-center">Vantage Compliance Engine v9.0.2</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
