'use client';

import React from 'react';
import { CreditCard, Plus } from 'lucide-react';

interface SettlementTabProps {
  config: any;
  accounts: any[];
  setConfig: (config: any) => void;
  onUpdate: (e?: any) => void;
}

export default function SettlementTab({ config, accounts, setConfig, onUpdate }: SettlementTabProps) {
  return (
    <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm relative overflow-hidden group max-w-[1000px]">
      <form onSubmit={onUpdate}>
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-50 text-indigo-950">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-1.5 rounded-[var(--radius-sm)] text-white"><CreditCard className="w-4 h-4" /></div>
            <h3 className="text-xs font-bold uppercase tracking-tight italic">Settlement Registry Mapping</h3>
          </div>
          <button 
            type="button"
            onClick={() => setConfig({...config, paymentModes: [...(config.paymentModes || []), {label: 'NEW PAYMENT MODE', accountId: ''}]})}
            className="btn-protocol btn-protocol-primary"
          ><Plus className="w-3 h-3" /> Register Payment Protocol</button>
        </div>
        
        <div className="border border-slate-200 rounded-[var(--radius-md)] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse classic-table">
            <thead>
              <tr className="bg-white border-b border-white/5">
                <th className="px-4 py-2 text-[0.55rem] font-bold text-white/50 uppercase tracking-widest border-r border-white/5">Protocol Identifier (Payment Mode)</th>
                <th className="px-4 py-2 text-[0.55rem] font-bold text-white/50 uppercase tracking-widest">Institutional Ledger Mapping</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(config.paymentModes || []).map((pm: any, idx: number) => (
                <tr key={idx} className="group hover:bg-indigo-50/30 transition-all">
                  <td className="px-4 py-2 align-middle border-r border-slate-50">
                    <div className="flex flex-col gap-0.5">
                      <input 
                        type="text" 
                        value={pm.label}
                        onChange={(e) => {
                          const newModes = [...(config.paymentModes || [])];
                          newModes[idx] = { ...pm, label: e.target.value.toUpperCase() };
                          setConfig({...config, paymentModes: newModes});
                        }}
                        className="w-full h-8 px-3 bg-slate-50/50 border border-transparent rounded-[var(--radius-sm)] outline-none font-bold text-[0.6rem] uppercase text-indigo-950 focus:bg-white focus:border-indigo-600 transition-all tracking-tight"
                        placeholder="PROTOCOL NAME"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <select 
                      value={pm.accountId || pm.account}
                      onChange={(e) => {
                        const newModes = [...(config.paymentModes || [])];
                        newModes[idx] = { ...pm, accountId: e.target.value };
                        setConfig({...config, paymentModes: newModes});
                      }}
                      className="w-full h-8 px-3 bg-slate-50/50 border border-transparent rounded-[var(--radius-sm)] outline-none font-bold text-[0.55rem] uppercase text-slate-700 focus:bg-white focus:border-indigo-600 transition-all cursor-pointer"
                    >
                      <option value="">-- UNLINKED (PENDING MAPPING) --</option>
                      {accounts.filter(a => a.type === 'ASSET' || a.type === 'LIABILITY').map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 align-middle text-right">
                    <button 
                      type="button"
                      onClick={() => {
                        if(confirm("Expunge this settlement routing?")) {
                          const newModes = config.paymentModes.filter((_:any, i:number) => i !== idx);
                          setConfig({...config, paymentModes: newModes});
                        }
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-all opacity-0 group-hover:opacity-100"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-8 flex justify-start">
           <button 
              type="submit" 
              className="px-10 py-3.5 bg-indigo-600 text-white font-bold text-[0.6rem] uppercase tracking-widest rounded-[var(--radius-sm)] shadow-xl shadow-indigo-100 hover:bg-black transition-all"
           >
              Archive Settlement Registry
           </button>
        </div>
      </form>
    </div>
  );
}

