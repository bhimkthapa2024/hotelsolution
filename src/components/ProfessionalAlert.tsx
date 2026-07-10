'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface ProfessionalAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'error' | 'info' | 'success' | 'warning';
}

export function ProfessionalAlert({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info'
}: ProfessionalAlertProps) {
  
  const colors = {
    error: {
      primary: 'bg-rose-600',
      secondary: 'bg-rose-50',
      border: 'border-rose-100',
      text: 'text-rose-600',
      icon: <AlertCircle className="w-5 h-5" />,
    },
    warning: {
      primary: 'bg-amber-500',
      secondary: 'bg-amber-50',
      border: 'border-amber-100',
      text: 'text-amber-600',
      icon: <AlertCircle className="w-5 h-5" />,
    },
    info: {
      primary: 'bg-indigo-600',
      secondary: 'bg-indigo-50',
      border: 'border-indigo-100',
      text: 'text-indigo-600',
      icon: <Info className="w-5 h-5" />,
    },
    success: {
      primary: 'bg-emerald-600',
      secondary: 'bg-emerald-50',
      border: 'border-emerald-100',
      text: 'text-emerald-600',
      icon: <CheckCircle2 className="w-5 h-5" />,
    }
  };

  const style = colors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            className="w-full max-w-[400px] bg-white rounded-[var(--radius-lg)] shadow-2xl border border-slate-200 overflow-hidden relative"
          >
            <div className={`h-1.5 ${style.primary} w-full`} />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6">
              <div className="flex items-start gap-4">
                 <div className={`mt-1 w-10 h-10 shrink-0 ${style.secondary} ${style.text} rounded-[var(--radius-md)] flex items-center justify-center`}>
                    {style.icon}
                 </div>
                 <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1 italic">{title}</h3>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                      {message}
                    </p>
                 </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 text-white font-black text-[0.55rem] rounded-[var(--radius-sm)] uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-lg"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
