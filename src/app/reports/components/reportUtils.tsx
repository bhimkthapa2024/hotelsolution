import React, { Fragment } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

export const renderVariance = (val: number) => {
    if (val === 0) return null;
    const isPos = val > 0;
    return (
       <span className={`text-[0.55rem] font-black uppercase ml-2 px-1.5 py-0.5 rounded-full ${isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {isPos ? '▲' : '▼'} {Math.abs(val).toFixed(1)}% vs Prev
       </span>
    );
};

export const SimpleTree = ({ 
    accList, 
    onSelect, 
    hideZeroBalances,
    viewMode
}: { 
    accList: any[], 
    onSelect: (a: any) => void, 
    hideZeroBalances: boolean,
    viewMode?: 'DETAILED' | 'COMPACT'
}) => {
    const renderNode = (acc: any, depth = 0) => {
       if (hideZeroBalances && Math.abs(acc.balance) < 0.01) return null;
       const children = accList.filter(child => child.parentId === acc.id);
       return (
          <Fragment key={acc.id}>
             <div 
                onClick={() => onSelect(acc)} 
                className={cn(
                   "flex justify-between items-center cursor-pointer transition-all group",
                   depth === 0 
                     ? "bg-slate-100 hover:bg-slate-200 border-y border-slate-300/60 shadow-sm py-1.5 px-2 mt-2 mb-0.5" 
                     : "bg-transparent hover:bg-slate-50 border-b border-slate-50 py-0.5 px-2"
                )}
             >
                <span className="flex items-center gap-2">
                   {depth > 0 && (
                      <span className="flex items-center shrink-0 opacity-50">
                         {Array.from({ length: depth }).map((_, i) => (
                            <span key={i} className="w-4 border-b-2 border-dotted border-slate-300" />
                         ))}
                      </span>
                   )}
                   <span className={cn(
                      "flex items-center gap-2 truncate",
                      depth === 0 ? "text-[0.6rem] font-black text-slate-900 uppercase tracking-widest" : "text-[0.6rem] font-semibold text-slate-700 capitalize group-hover:text-indigo-600"
                   )}>
                      {acc.name} 
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </span>
                </span>
                <span className={cn(
                   "tabular-nums text-right",
                   depth === 0 ? "text-[0.65rem] font-black text-slate-950" : "text-[0.65rem] font-black text-slate-700"
                )}>
                   {formatCurrency(acc.balance)}
                </span>
             </div>
             {children.map(child => renderNode(child, depth + 1))}
          </Fragment>
       );
    };

    const rootAccounts = accList.filter(acc => !acc.parentId);
    
    if (viewMode === 'COMPACT') {
       return (
          <>
             {rootAccounts.map(a => (
                <div 
                  key={a.id}
                  onClick={() => onSelect(a)} 
                  className="flex justify-between items-center text-[0.6rem] font-black text-slate-950 hover:text-indigo-600 cursor-pointer pt-3 pb-1 border-b border-slate-50 uppercase group"
                >
                   <span className="flex items-center gap-2">{a.name} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100" /></span>
                   <span className={a.type === 'EXPENSE' ? 'text-rose-600' : ''}>{formatCurrency(a.balance)}</span>
                </div>
             ))}
          </>
       );
    }
    
   return (
      <>
         {rootAccounts.map(acc => renderNode(acc))}
      </>
   );
};

export const flattenTreeForExcel = (
   accList: any[],
   root: any,
   depth = 0,
   hideZeroBalances = false
): any[][] => {
   if (hideZeroBalances && Math.abs(root.balance) < 0.01) return [];
   const children = accList.filter((child: any) => child.parentId === root.id);
   const row = [
      root.code || '',
      `${' '.repeat(depth * 4)}${root.name}`,
      root.type || '',
      root.normal === 'Debit' ? root.balance : 0,
      root.normal === 'Credit' ? root.balance : 0
   ];
   return [row, ...children.flatMap((c: any) => flattenTreeForExcel(accList, c, depth + 1, hideZeroBalances))];
};
