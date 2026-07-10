'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, User, BedDouble, BookCheck, ArrowRight, Loader2, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { globalSearch } from '@/actions/hotel';
import { useRouter } from 'next/navigation';

export default function Spotlight() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const res = await globalSearch(query);
      setResults(res);
      setLoading(false);
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleNavigate = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleNavigate(results[selectedIndex].href);
    }
  };

  const IconMap: any = { BedDouble, User, BookCheck };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 pb-4 px-4 bg-black/40 backdrop-blur-md animate-fadeIn">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -20 }}
            className="w-full max-w-2xl bg-[#1e1e3f] rounded-[var(--radius-md)] shadow-2xl border border-white/5 overflow-hidden"
          >
            {/* Search Input Area */}
            <div className="relative group px-6 pt-6 pb-4 border-b border-white/5">
                <Search className="absolute left-10 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:scale-110 transition-all" />
                <input 
                  ref={inputRef}
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Execute Global System Query (Guests, Rooms, Ledger...)"
                  className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-[var(--radius-md)] outline-none text-white font-black text-[0.85rem] uppercase tracking-widest placeholder:text-white/20 focus:bg-white/10 focus:border-blue-500/50 transition-all "
                />
                <button 
                  onClick={() => setIsOpen(false)}
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-2 bg-white/5 hover:bg-white/10 rounded-[var(--radius-md)] transition-all text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
            </div>

            {/* Results Area */}
            <div className="max-h-[450px] overflow-y-auto scrollbar-thin p-3">
               {loading && (
                 <div className="p-10 flex flex-col items-center gap-3 text-blue-400/50">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-[0.6rem] font-bold uppercase tracking-[0.3em]">Scanned Indexing...</span>
                 </div>
               )}

               {!loading && query.length > 0 && results.length === 0 && (
                 <div className="p-10 text-center opacity-30">
                    <p className="text-[0.7rem] font-black uppercase tracking-widest text-white ">Zero results for this Operational ID</p>
                 </div>
               )}

               {!loading && query.length === 0 && (
                 <div className="p-10 text-center space-y-4 opacity-90">
                    <div className="flex items-center justify-center gap-4 text-blue-300">
                       <Command className="w-10 h-10 opacity-20" />
                       <p className="text-[0.6rem] font-black text-left uppercase tracking-widest leading-relaxed">
                          Enter Query Sequence <br /> 
                          <span className="text-[0.5rem] opacity-90  uppercase">ALT+S: Sales | ALT+D: DayBook | ESC: Close</span>
                       </p>
                    </div>
                 </div>
               )}

               <div className="space-y-1">
                 {results.map((r, i) => {
                    const Icon = IconMap[r.icon] || ArrowRight;
                    return (
                      <div 
                        key={i}
                        onClick={() => handleNavigate(r.href)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`p-4 rounded-[var(--radius-md)] cursor-pointer flex items-center justify-between transition-all relative overflow-hidden group/item
                          ${selectedIndex === i ? 'bg-blue-600 shadow-lg text-white' : 'hover:bg-white/5 text-white/70'}`}
                      >
                         <div className="flex items-center gap-4 relative z-10">
                            <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center transition-all ${selectedIndex === i ? 'bg-white/20' : 'bg-white/5 text-blue-400'}`}>
                               <Icon className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="text-[0.85rem] font-black uppercase tracking-tighter  leading-none mb-1">{r.title}</p>
                               <p className={`text-[0.6rem] font-bold uppercase tracking-widest opacity-90 ${selectedIndex === i ? 'text-white' : 'text-slate-400'}`}>{r.sub}</p>
                            </div>
                         </div>
                         <ArrowRight className={`w-4 h-4 transition-all transform ${selectedIndex === i ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`} />
                      </div>
                    );
                 })}
               </div>
            </div>

            {/* Footer Commands */}
            <div className="px-6 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[0.55rem] font-black uppercase tracking-widest text-white/30 ">
               <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white/10 rounded uppercase">Enter</span> SELECT COMMAND</span>
                  <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white/10 rounded uppercase">Esc</span> DISMISS TERMINAL</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 opacity-90" /> Secure Property Indexing Agent
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
