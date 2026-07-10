'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, ShieldCheck, Keyboard } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ProfessionalPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  subtitle: string;
  placeholder?: string;
  defaultValue?: string;
  icon?: React.ReactNode;
  autoClose?: boolean;
}

export function ProfessionalPrompt({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  placeholder = "INPUT DATA...",
  defaultValue = "",
  icon = <Keyboard className="w-5 h-5" />,
  autoClose = true
}: ProfessionalPromptProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
    if (autoClose) {
      onClose();
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-[480px] bg-white rounded-[var(--radius-lg)] shadow-2xl border border-slate-200 overflow-hidden relative"
          >
            {/* BRANDING STRIP */}
            <div className="h-2 bg-indigo-600 w-full" />
            
            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all hover:bg-rose-50 z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 pb-10">
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-[var(--radius-md)] flex items-center justify-center shadow-inner">
                    {icon}
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <ShieldCheck className="w-4 h-4 text-emerald-500" />
                       <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-[0.2em] italic">Authorized Institutional Portal</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none underline decoration-indigo-600/20 underline-offset-4 decoration-4">{title}</h3>
                 </div>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{subtitle}</label>
                    <div className="relative group">
                       <input
                          autoFocus
                          type="text"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={placeholder}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[var(--radius-md)] outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-[0.85rem] text-slate-900 placeholder:text-slate-300 uppercase tracking-widest shadow-inner"
                       />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.45rem] font-black text-slate-300 uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity flex items-center gap-2">
                          <Check className="w-3 h-3" /> Press Enter to Commit
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-4">
                    <button
                       onClick={onClose}
                       className="py-4 bg-slate-100 text-slate-500 font-black text-[0.7rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                    >
                       Abort Entry
                    </button>
                    <button
                       onClick={handleConfirm}
                       disabled={!value.trim()}
                       className="py-4 bg-indigo-600 text-white font-black text-[0.7rem] rounded-[var(--radius-md)] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:shadow-none hover:bg-black active:scale-95 group"
                    >
                       Execute Protocol <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>

                 <div className="pt-6 border-t border-slate-50 flex items-center justify-center gap-4">
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                    <span className="text-[0.45rem] font-black text-slate-300 uppercase tracking-[0.5em] italic">Vantage Data Integrity Suite v4.8</span>
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
