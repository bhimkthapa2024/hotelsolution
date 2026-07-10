'use client';

import React, { useMemo, useState, Fragment } from 'react';
import { 
  Layers, 
  Maximize, 
  Layers2, 
  Plus, 
  ChevronRight, 
  Edit3, 
  Trash2,
  BookOpen
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { seedStandardAccounts, deleteAccount } from '@/actions/hotel';

interface LedgerRegistryProps {
  accounts: any[];
  onRefresh: () => void;
  onEdit: (acc: any) => void;
  onAddSub: (parentAcc: any) => void;
  onAddCustom: () => void;
  onDelete: (id: string) => void;
  onViewLedger?: (acc: any) => void;
}

export default function LedgerRegistry({ 
  accounts, 
  onRefresh, 
  onEdit, 
  onAddSub, 
  onAddCustom,
  onDelete,
  onViewLedger
}: LedgerRegistryProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'ROOT-ASSET': true, 'ROOT-LIABILITY': true, 'ROOT-EQUITY': true, 'ROOT-REVENUE': true, 'ROOT-EXPENSE': true
  });

  const toggleNode = (node: string) => setExpandedNodes(prev => ({...prev, [node]: !prev[node]}));

  const handleExpandAll = (expand: boolean) => {
    if (!expand) {
      setExpandedNodes({});
      return;
    }
    const newNodes: Record<string, boolean> = {};
    accounts.forEach(acc => {
      newNodes[`ROOT-${acc.type}`] = true;
      const catName = acc.category || 'GENERAL OPERATIONS';
      newNodes[`CAT-${acc.type}-${catName}`] = true;
    });
    setExpandedNodes(newNodes);
  };

  const groupedAccounts = useMemo(() => {
    return accounts.reduce((acc: any, curr: any) => {
      if (!acc[curr.type]) acc[curr.type] = { type: curr.type, balance: 0, categories: {} };
      const catName = curr.category || 'GENERAL OPERATIONS';
      if (!acc[curr.type].categories[catName]) acc[curr.type].categories[catName] = { name: catName, balance: 0, accounts: [] };
      
      acc[curr.type].categories[catName].accounts.push(curr);
      acc[curr.type].balance += curr.balance;
      acc[curr.type].categories[catName].balance += curr.balance;
      return acc;
    }, {} as any);
  }, [accounts]);

  const handleDelete = (id: string) => {
    onDelete(id);
  };

  return (
    <div className="bg-white p-4 sm:p-10 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-10 pb-4 border-b border-slate-50 text-indigo-950">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-[var(--radius-md)] text-white"><Layers className="w-5 h-5" /></div>
          <h3 className="text-lg font-bold uppercase tracking-tight italic">Chart of Accounts Registry</h3>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button 
            onClick={() => handleExpandAll(true)}
            className="px-4 py-2.5 bg-slate-50 text-slate-600 font-bold text-[0.6rem] uppercase tracking-widest rounded-[var(--radius-md)] flex items-center gap-2 hover:bg-slate-100 transition-all border border-slate-200 shadow-sm"
          >
            <Maximize className="w-3.5 h-3.5" /> Expand All
          </button>
          <button 
            onClick={() => handleExpandAll(false)}
            className="px-4 py-2.5 bg-slate-50 text-slate-600 font-bold text-[0.6rem] uppercase tracking-widest rounded-[var(--radius-md)] flex items-center gap-2 hover:bg-slate-100 transition-all border border-slate-200 shadow-sm"
          >
            Collapse All
          </button>
          <button 
            onClick={() => {
              seedStandardAccounts().then(() => {
                onRefresh();
              });
            }} 
            className="btn-protocol btn-protocol-primary"
          >
            <Layers2 className="w-4 h-4 text-indigo-400" /> Load Default Accounts
          </button>
          <button onClick={onAddCustom} className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-[0.6rem] uppercase tracking-widest rounded-[var(--radius-md)] shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4" /> Custom Account Head</button>
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-[var(--radius-lg)] shadow-sm">
        <table className="w-full text-left border-collapse classic-table">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-2.5 px-6 text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest w-[15%]">Root Type</th>
              <th className="py-2.5 px-4 text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest w-[20%]">Category Class</th>
              <th className="py-2.5 px-4 text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest w-[30%]">Account Head & Code</th>
              <th className="py-2.5 px-4 text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest w-[15%]">Sub Account</th>
              <th className="py-2.5 px-4 text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest w-[10%]">Normal</th>
              <th className="py-2.5 px-6 text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest text-right w-[10%]">Net Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.values(groupedAccounts).map((root: any) => (
              <Fragment key={root.type}>
                <tr className="bg-slate-100/50 hover:bg-slate-100 transition-colors cursor-pointer border-y border-slate-200" onClick={() => toggleNode(`ROOT-${root.type}`)}>
                  <td className="py-1.5 px-6 flex items-center gap-2">
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedNodes[`ROOT-${root.type}`] ? 'rotate-90' : ''}`} />
                    <span className={`px-2 py-0.5 rounded-[var(--radius-sm)] text-[0.55rem] font-bold uppercase tracking-widest ${
                      root.type === 'ASSET' ? 'bg-indigo-600 text-white' :
                      root.type === 'LIABILITY' ? 'bg-rose-600 text-white' :
                      root.type === 'EQUITY' ? 'bg-purple-600 text-white' :
                      root.type === 'REVENUE' ? 'bg-emerald-600 text-white' :
                      'bg-amber-600 text-white'
                    }`}>{root.type}</span>
                  </td>
                  <td className="py-1.5 px-4 text-[0.6rem] font-bold text-slate-400">-</td>
                  <td className="py-1.5 px-4 text-[0.6rem] font-bold text-slate-400">-</td>
                  <td className="py-1.5 px-4 text-[0.6rem] font-bold text-slate-300">-</td>
                  <td className="py-1.5 px-4 text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest">
                    {['ASSET','EXPENSE'].includes(root.type) ? 'DEBIT' : 'CREDIT'}
                  </td>
                  <td className="py-1.5 px-6 text-right text-[0.6rem] font-bold text-slate-950 tracking-tighter">
                    {formatCurrency(root.balance)}
                  </td>
                </tr>
                
                {expandedNodes[`ROOT-${root.type}`] && Object.values(root.categories).map((cat: any) => (
                  <Fragment key={`${root.type}-${cat.name}`}>
                    <tr className="bg-white hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleNode(`CAT-${root.type}-${cat.name}`)}>
                      <td className="py-1.5 px-6 border-r border-slate-50 text-[0.6rem] font-bold text-slate-300"></td>
                      <td className="py-1.5 px-4 flex items-center gap-2">
                        <ChevronRight className={`w-3 h-3 text-indigo-400 transition-transform ${expandedNodes[`CAT-${root.type}-${cat.name}`] ? 'rotate-90' : ''}`} />
                        <span className="text-[0.6rem] font-bold text-slate-600 uppercase tracking-widest">{cat.name}</span>
                      </td>
                      <td className="py-1.5 px-4 text-[0.6rem] font-bold text-slate-300">-</td>
                      <td className="py-1.5 px-4 text-[0.6rem] font-bold text-slate-300">-</td>
                      <td className="py-1.5 px-4 text-[0.6rem] font-bold text-slate-300">-</td>
                      <td className="py-1.5 px-6 text-right text-[0.6rem] font-bold text-slate-500 tracking-tighter">
                        {formatCurrency(cat.balance)}
                      </td>
                    </tr>

                     {expandedNodes[`CAT-${root.type}-${cat.name}`] && cat.accounts.filter((a: any) => !a.parentId).map((acc: any) => (
                      <Fragment key={acc.id}>
                        <tr 
                          onClick={() => onViewLedger?.(acc)}
                          className="bg-white hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        >
                          <td className="py-1.5 px-6 border-r border-slate-50 text-[0.6rem] font-bold text-slate-300"></td>
                          <td className="py-1.5 px-4 border-r border-slate-50 text-[0.6rem] font-bold text-slate-300"></td>
                          <td className="py-1.5 px-4 relative">
                            <div className="flex items-center gap-3">
                              <span className="text-[0.6rem] font-semibold text-slate-500 uppercase tracking-widest">{acc.code}</span>
                              <span className="text-[0.6rem] font-semibold text-slate-950 uppercase tracking-tight">{acc.name}</span>
                            </div>
                          </td>
                          <td className="py-1.5 px-4 text-[0.55rem] font-bold text-slate-300 italic tracking-widest uppercase">--</td>
                          <td className="py-1.5 px-4 text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest">
                            {acc.normal || (['ASSET','EXPENSE'].includes(acc.type) ? 'DEBIT' : 'CREDIT')}
                          </td>
                          <td className="py-1.5 px-6 text-right text-[0.6rem] font-bold text-slate-600 tracking-tighter">
                            <div className="flex items-center justify-end gap-3">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button title="View Ledger Statement" onClick={(e) => { e.stopPropagation(); onViewLedger?.(acc); }} className="p-1 hover:bg-indigo-100 rounded text-indigo-600 transition-colors"><BookOpen className="w-3 h-3" /></button>
                                <button title="Add Sub-Account Under This Head" onClick={(e) => { e.stopPropagation(); onAddSub(acc); }} className="p-1 hover:bg-emerald-100 rounded text-emerald-600 transition-colors"><Plus className="w-3 h-3" /></button>
                                <button title="Edit Master Head" onClick={(e) => { e.stopPropagation(); onEdit(acc); }} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"><Edit3 className="w-2.5 h-2.5" /></button>
                                <button title="Purge Master Head" onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }} className="p-1 hover:bg-rose-100 rounded text-rose-500 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                              </div>
                              <span>{formatCurrency(acc.balance)}</span>
                            </div>
                          </td>
                        </tr>
                        {cat.accounts.filter((sub: any) => sub.parentId === acc.id).map((subAcc: any) => (
                          <tr 
                            key={subAcc.id} 
                            onClick={() => onViewLedger?.(subAcc)}
                            className="bg-indigo-50/5 hover:bg-indigo-50/30 transition-colors group relative cursor-pointer"
                          >
                            <td className="py-1 px-6 border-r border-slate-50 text-[0.6rem] font-bold text-slate-300"></td>
                            <td className="py-1 px-4 border-r border-slate-50 text-[0.6rem] font-bold text-slate-300"></td>
                            <td className="py-1 px-4 border-r border-slate-50 relative">
                              <div className="absolute left-4 top-0 bottom-0 w-[1.5px] bg-indigo-400"></div>
                              <div className="absolute left-4 top-1/2 w-3 h-[1.5px] bg-indigo-400"></div>
                              <div className="flex items-center gap-3 ml-6">
                                <span className="text-[0.55rem] font-semibold text-slate-500 uppercase tracking-widest">{subAcc.code}</span>
                                <span className="text-[0.6rem] font-medium text-indigo-900 tracking-tight italic">{subAcc.name}</span>
                              </div>
                            </td>
                            <td className="py-1 px-4 text-[0.55rem] font-bold text-slate-200 italic tracking-widest uppercase">--</td>
                            <td className="py-1 px-4 text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                              {subAcc.normal || (['ASSET','EXPENSE'].includes(subAcc.type) ? 'DEBIT' : 'CREDIT')}
                            </td>
                            <td className="py-1 px-6 text-right text-[0.6rem] font-bold text-slate-400 tracking-tighter">
                              <div className="flex items-center justify-end gap-3">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                  <button title="View Ledger Statement" onClick={(e) => { e.stopPropagation(); onViewLedger?.(subAcc); }} className="p-1 hover:bg-indigo-100 rounded text-indigo-600 transition-colors"><BookOpen className="w-3 h-3" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); onEdit(subAcc); }} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"><Edit3 className="w-2.5 h-2.5" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(subAcc.id); }} className="p-1 hover:bg-rose-100 rounded text-rose-500 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                                </div>
                                <span>{formatCurrency(subAcc.balance)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </Fragment>
                ))}
              </Fragment>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400 text-[0.6rem] font-bold uppercase tracking-widest border-t border-slate-100 italic bg-slate-50/30">
                  No accounts found in the registry. Load the default accounts above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
