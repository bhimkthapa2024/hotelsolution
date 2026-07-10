'use client';

import React from 'react';
import { Settings, Layers, Plus, Trash2 } from 'lucide-react';

interface IdentityTabProps {
  config: any;
  setConfig: (config: any) => void;
  onUpdate: (e?: any) => void;
  onAddStayPlan: () => void;
}

export default function IdentityTab({ config, setConfig, onUpdate, onAddStayPlan }: IdentityTabProps) {
  return (
    <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm max-w-[1000px]">
      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-50 text-indigo-950">
        <div className="bg-indigo-600 p-1.5 rounded-[var(--radius-sm)] text-white"><Settings className="w-4 h-4" /></div>
        <h3 className="text-xs font-bold uppercase tracking-tight italic">Constitutional Property Identity</h3>
      </div>
      <form onSubmit={onUpdate} className="grid grid-cols-2 gap-8">
        <div className="space-y-2 col-span-2">
            <label className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Official Property Registry Title</label>
            <input 
              type="text" 
              value={config.hotelName}
              onChange={(e)=>setConfig({...config, hotelName: e.target.value.toUpperCase()})}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-lg focus:border-indigo-600 transition-all uppercase tracking-tighter"
              placeholder="HOTEL NAME"
            />
        </div>
        <div className="space-y-2 col-span-2">
            <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Property Narrative Tagline</label>
            <input 
              type="text" 
              value={config.tagline || ''}
              onChange={(e)=>setConfig({...config, tagline: e.target.value.toUpperCase()})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] focus:border-indigo-600 transition-all uppercase tracking-widest"
              placeholder="E.G. PROPERTY MANAGEMENT SYSTEMS"
            />
        </div>
        <div className="space-y-2">
            <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Physical Address Registry</label>
            <input 
              type="text" 
              value={config.address}
              onChange={(e)=>setConfig({...config, address: e.target.value.toUpperCase()})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem]"
            />
        </div>
        <div className="space-y-2">
            <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Archive Contact Line</label>
            <input 
              type="text" 
              value={config.phone || ''}
              onChange={(e)=>setConfig({...config, phone: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem]"
            />
        </div>
        <div className="space-y-2">
            <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Official Email Address</label>
            <input 
              type="text" 
              value={config.email || ''}
              onChange={(e)=>setConfig({...config, email: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem]"
            />
        </div>
        <div className="space-y-2">
            <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Corporate Website URL</label>
            <input 
              type="text" 
              value={config.website || ''}
              onChange={(e)=>setConfig({...config, website: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem]"
            />
        </div>
        <div className="space-y-2">
            <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Permanent Account Number (PAN)</label>
            <input 
              type="text" 
              value={config.pan || ''}
              onChange={(e)=>setConfig({...config, pan: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem]"
            />
        </div>
          <div className="col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-slate-50 mt-2">
            <div className="space-y-3">
               <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Financial Levy Policies</label>
               <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-[var(--radius-sm)] border border-slate-100">
                     <span className="text-[0.55rem] font-bold text-slate-900 uppercase tracking-widest">Apply Service Charge (10%)</span>
                     <button 
                        type="button"
                        onClick={() => setConfig({...config, applyServiceCharge: !config.applyServiceCharge})}
                        className={`toggle-protocol ${config.applyServiceCharge ? 'toggle-protocol-active' : 'toggle-protocol-inactive'}`}
                     >
                        {config.applyServiceCharge ? 'ENABLED' : 'DISABLED'}
                     </button>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-[var(--radius-sm)] border border-slate-100">
                     <span className="text-[0.55rem] font-bold text-slate-900 uppercase tracking-widest">Apply Federal VAT (13%)</span>
                     <button 
                        type="button"
                        onClick={() => setConfig({...config, applyVat: !config.applyVat})}
                        className={`toggle-protocol ${config.applyVat ? 'toggle-protocol-active' : 'toggle-protocol-inactive'}`}
                     >
                        {config.applyVat ? 'ENABLED' : 'DISABLED'}
                     </button>
                  </div>
               </div>
               <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest leading-relaxed ml-1 italic">Toggling these affects all future bill calculations and night audit postings system-wide.</p>
            </div>

            <div className="space-y-3">
               <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Taxation Strategy</label>
               <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-[var(--radius-sm)] border border-slate-100">
                     <span className="text-[0.55rem] font-bold text-slate-900 uppercase tracking-widest">Tax Inclusive Pricing</span>
                     <button 
                        type="button"
                        onClick={() => setConfig({...config, taxInclusive: !config.taxInclusive})}
                        className={`toggle-protocol ${config.taxInclusive ? 'toggle-protocol-active' : 'toggle-protocol-inactive'}`}
                     >
                        {config.taxInclusive ? 'ACTIVE' : 'INACTIVE'}
                     </button>
                  </div>
               </div>
               <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest leading-relaxed ml-1 italic">When active, unit rates are treated as gross totals (Reverse Tax Calculation applied).</p>
            </div>
         </div>

         <div className="col-span-2 pt-6 mt-2 border-t border-slate-50">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-950 italic">Stay Plan Architecture Registry</h4>
                 </div>
                 <button 
                    type="button"
                    onClick={onAddStayPlan}
                    className="btn-protocol btn-protocol-primary h-8"
                 >
                    <Plus className="w-3 h-3" /> Append Protocol Plan
                 </button>
              </div>
              <div className="border border-slate-200 rounded-[var(--radius-sm)] overflow-hidden">
                 <table className="w-full text-left border-collapse classic-table">
                    <thead>
                       <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-1.5 text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest">Plan Identity (PID)</th>
                          <th className="px-4 py-1.5 text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest">Protocol Description</th>
                          <th className="w-10"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {(config.stayPlans || []).map((plan: any, idx: number) => (
                          <tr key={idx} className="group hover:bg-slate-50/50">
                             <td className="px-4 py-1.5">
                                <span className="text-[0.55rem] font-bold text-indigo-600 uppercase tracking-widest">{plan.id}</span>
                             </td>
                             <td className="px-4 py-1.5">
                                <input 
                                   type="text" 
                                   value={plan.label}
                                   onChange={(e) => {
                                      const newPlans = [...(config.stayPlans || [])];
                                      newPlans[idx] = { ...newPlans[idx], label: e.target.value.toUpperCase() };
                                      setConfig({...config, stayPlans: newPlans});
                                   }}
                                   className="w-full bg-transparent border-none outline-none font-bold text-[0.6rem] text-slate-950 uppercase tracking-tight"
                                   placeholder="PLAN TITLE"
                                />
                             </td>
                             <td className="px-2">
                                <button 
                                   type="button"
                                   onClick={() => {
                                      const tmp = (config.stayPlans || []).filter((_: any, i: number) => i !== idx);
                                      setConfig({...config, stayPlans: tmp});
                                   }}
                                   className="p-1 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 rounded transition-all"
                                >
                                   <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

          <div className="col-span-2 pt-6">
             <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-bold text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] shadow-xl shadow-indigo-100/50 hover:bg-black transition-all">Archive Identity Registry</button>
          </div>
      </form>
    </div>
  );
}
