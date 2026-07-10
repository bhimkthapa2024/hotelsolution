'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit3, ShieldCheck, Mail, Phone, User, Percent, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmployeesTabProps {
  employees: any[];
  onRefresh: () => void;
  onAdd: () => void;
  onEdit: (employee: any) => void;
  onDelete: (id: string) => void;
}

export default function EmployeesTab({
  employees,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
}: EmployeesTabProps) {
  const [search, setSearch] = useState('');

  const filtered = employees.filter(
    (emp) =>
      emp.name?.toUpperCase().includes(search.toUpperCase()) ||
      emp.phone?.includes(search) ||
      emp.email?.toUpperCase().includes(search.toUpperCase())
  );

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[var(--radius-md)] border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="FILTER STAFF BY NAME, EMAIL, PHONE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-[0.6rem] uppercase tracking-widest focus:border-indigo-600 transition-all shadow-inner"
          />
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="h-10 px-6 bg-white text-white font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-lg active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" /> Onboard Staff Profile
        </button>
      </div>

      {/* Grid listing */}
      <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-[0_20px_50px_-15px_rgba(30,41,59,0.05)] overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-[0.6rem] font-normal text-white uppercase">Staff Master Registry</h3>
          </div>
          <div className="text-[0.55rem] font-black text-white/50 uppercase tracking-widest opacity-50">Active Operational Units</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse classic-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-3 border-r border-slate-100">Employee Details</th>
                <th className="px-6 py-3 border-r border-slate-100">Contact Vector</th>
                <th className="px-6 py-3 border-r border-slate-100 text-center w-[160px]">Default Comm. Rate</th>
                <th className="px-6 py-3 border-r border-slate-100 text-center w-[160px]">Overtime Comm. Rate</th>
                <th className="px-6 py-3 border-r border-slate-100 text-center w-[100px]">Status</th>
                <th className="px-6 py-3 text-center w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-300 text-[0.6rem] font-bold uppercase tracking-widest italic bg-slate-50/20">
                    No active staff profiles matches in registry.
                  </td>
                </tr>
              ) : (
                filtered.map((emp: any, idx: number) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-3 border-r border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-[0.55rem]">
                          {emp.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.6rem] font-black text-slate-950 uppercase tracking-tight">
                            {emp.name}
                          </span>
                          <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            ID: {emp.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 border-r border-slate-50 text-[0.6rem] font-bold text-slate-700 uppercase space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="lowercase font-mono text-[0.55rem] text-slate-500">{emp.email || 'no_email@hotel.com'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{emp.phone || 'NO PHONE'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 border-r border-slate-50 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full font-black text-[0.6rem] italic">
                        <Percent className="w-3.5 h-3.5" />
                        {emp.commissionRate || 10}%
                      </div>
                    </td>
                    <td className="px-6 py-3 border-r border-slate-50 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 text-rose-700 rounded-full font-black text-[0.6rem] italic">
                        <Percent className="w-3.5 h-3.5" />
                        {emp.overtimeCommRate || 20}%
                      </div>
                    </td>
                    <td className="px-6 py-3 border-r border-slate-50 text-center">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[0.55rem] font-black uppercase tracking-wider border",
                          emp.isActive !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        )}
                      >
                        {emp.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(emp)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all active:scale-95"
                          title="Modify Staff Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(emp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all active:scale-95"
                          title="Decommission Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
