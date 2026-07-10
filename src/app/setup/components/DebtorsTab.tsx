'use client';

import React from 'react';
import { Briefcase, Plus, Edit3, Trash2 } from 'lucide-react';
import { deleteDebtor } from '@/actions/hotel';

interface DebtorsTabProps {
  debtors: any[];
  accounts: any[];
  onRefresh: () => void;
  onEdit: (debtor: any) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export default function DebtorsTab({ debtors, accounts, onRefresh, onEdit, onAdd, onDelete }: DebtorsTabProps) {
  const handleDelete = (id: string) => {
    onDelete(id);
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-3 border-b border-slate-50 text-indigo-950">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-[var(--radius-sm)] text-white"><Briefcase className="w-4 h-4" /></div>
          <h3 className="text-xs font-bold uppercase tracking-tight italic">Corporate Debtor Registry</h3>
        </div>
        <button 
          onClick={onAdd}
          className="btn-protocol btn-protocol-primary"
        ><Plus className="w-3 h-3" /> Append Debtor Entity</button>
      </div>
      
      <div className="border border-slate-200 rounded-[var(--radius-md)] overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse classic-table">
          <thead>
            <tr className="bg-white border-b border-white/5">
              <th className="px-4 py-2 text-[0.55rem] font-bold text-white/50 uppercase tracking-widest border-r border-white/5">Entity Identity</th>
              <th className="px-4 py-2 text-[0.55rem] font-bold text-white/50 uppercase tracking-widest border-r border-white/5">Channel / Contact</th>
              <th className="px-4 py-2 text-[0.55rem] font-bold text-white/50 uppercase tracking-widest border-r border-white/5">Fiscal Limit</th>
              <th className="px-4 py-2 text-[0.55rem] font-bold text-white/50 uppercase tracking-widest text-right">Outstanding Amount</th>
              <th className="px-4 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {debtors.map((d: any) => (
              <tr key={d.id} className="group hover:bg-indigo-50/30 transition-all">
                <td className="px-4 py-3 align-middle border-r border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[0.6rem] font-bold text-slate-950 uppercase tracking-tight">{d.name}</span>
                    <span className="text-[0.55rem] font-bold text-indigo-600 uppercase tracking-widest italic">{d.type}</span>
                    {d.pan && <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">PAN: {d.pan}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle border-r border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[0.6rem] font-bold text-slate-600">{d.contactPerson || 'N/A'}</span>
                    <span className="text-[0.55rem] font-medium text-slate-400">{d.phone || d.email || 'NO_VECTOR_DATA'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle border-r border-slate-50">
                   <div className="flex flex-col">
                      <span className="text-[0.6rem] font-bold text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR' }).format(d.creditLimit || 0)}</span>
                      <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest">{d.creditDays || 30} DAYS_TERM</span>
                   </div>
                </td>
                <td className="px-4 py-3 align-middle text-right border-r border-slate-50">
                   {(() => {
                      const acc = accounts.find(a => a.id === d.accountId);
                      const bal = acc ? acc.balance : (d.openingBalance || 0);
                      return (
                         <span className={`text-[0.6rem] font-black tracking-tighter italic ${bal > 0 ? 'text-rose-600' : bal < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR' }).format(bal)}
                         </span>
                      );
                   })()}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                   <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => onEdit(d)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                   </div>
                </td>
              </tr>
            ))}
            {debtors.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-300 text-[0.6rem] font-bold uppercase tracking-widest italic bg-slate-50/20">Zero debtor entities indexed in active registry</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
