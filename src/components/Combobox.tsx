import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  label: string;
  value: string;
}

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function Combobox({ value, onChange, options, placeholder, className, dropdownClassName, disabled, autoFocus }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getLabel = (val: string) => options.find(o => o.value === val)?.label || '';
  const [search, setSearch] = useState(getLabel(value));
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(getLabel(value));
  }, [value, options]);

  useEffect(() => {
    if (autoFocus) {
      setIsOpen(true);
    }
  }, [autoFocus]);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  const commitSelection = () => {
    const match = options.find(o => o.label.toLowerCase() === search.toLowerCase());
    if (match) {
      onChange(match.value);
      setSearch(match.label);
    } else {
      setSearch(getLabel(value));
    }
    setIsOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        commitSelection();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, search, options, onChange, isOpen, highlightedIndex, filteredOptions]);



  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [filteredOptions.length, highlightedIndex]);

  const scrollToHighlighted = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('button');
    if (items[index]) {
       items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const nextIndex = highlightedIndex < filteredOptions.length - 1 ? highlightedIndex + 1 : highlightedIndex;
      setHighlightedIndex(nextIndex);
      scrollToHighlighted(nextIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = highlightedIndex > 0 ? highlightedIndex - 1 : highlightedIndex;
      setHighlightedIndex(prevIndex);
      scrollToHighlighted(prevIndex);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (isOpen && filteredOptions.length > 0) {
        if (e.key === 'Enter') e.preventDefault();
        const selected = filteredOptions[highlightedIndex];
        if (selected) {
          onChange(selected.value);
          setSearch(selected.label);
        }
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={ref}>
      <div className="flex items-center relative w-full">
        <input
          type="text"
          value={search}
          onChange={(e) => {
             setSearch(e.target.value.toUpperCase());
             setIsOpen(true);
          }}
          onClick={() => setIsOpen(true)}
          onFocus={(e) => {
            e.target.select();
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "SEARCH..."}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn("w-full outline-none pr-6", className)}
        />
        <button 
           type="button" 
           tabIndex={-1}
           onClick={() => {
              if (disabled) return;
              if (!isOpen) setSearch('');
              setIsOpen(!isOpen);
           }} 
           className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1 flex items-center justify-center h-full"
        >
           <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && filteredOptions.length > 0 && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-[var(--radius-sm)] shadow-2xl z-[99999] max-h-[250px] overflow-y-auto py-1 scrollbar-hide",
              dropdownClassName
            )}
          >
            {filteredOptions.map((opt, idx) => (
               <button
                 key={idx}
                 type="button"
                 onMouseEnter={() => setHighlightedIndex(idx)}
                 onClick={() => {
                   onChange(opt.value);
                   setSearch(opt.label);
                   setIsOpen(false);
                 }}
                 className={cn(
                   "w-full text-left px-3 py-2 text-[0.6rem] font-black uppercase tracking-widest transition-colors flex items-center justify-between group",
                   highlightedIndex === idx ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600",
                   value === opt.value && "font-extrabold"
                 )}
               >
                 <span className="pr-2 whitespace-normal break-words leading-relaxed">{opt.label}</span>
                 {value === opt.value && <Check className="w-3 h-3 shrink-0" />}
               </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
