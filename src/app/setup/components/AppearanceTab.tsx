'use client';

import React from 'react';
import { Palette, Box, Type, MousePointer2, Layers } from 'lucide-react';

interface AppearanceTabProps {
  config: any;
  setConfig: (config: any) => void;
  onUpdate: () => void;
}

export default function AppearanceTab({ config, setConfig, onUpdate }: AppearanceTabProps) {
  return (
    <div className="bg-white p-10 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm max-w-[900px] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full blur-3xl -translate-y-20 translate-x-20 opacity-50 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-3 mb-10 pb-4 border-b border-slate-50 text-indigo-950 relative z-10">
         <div className="bg-indigo-600 p-2 rounded-[var(--radius-md)] text-white"><Palette className="w-5 h-5" /></div>
         <h3 className="text-lg font-bold uppercase tracking-tight italic">Interface Aesthetic Protocol</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
         <div className="space-y-6">
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[var(--radius-md)] space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <Box className="w-4 h-4 text-indigo-600" />
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Structural Curvature</span>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  {['0', '4', '8', '12', '16', '24'].map(r => (
                     <button 
                        key={r}
                        onClick={() => setConfig({...config, display: {...(config.display||{}), radius: r}})}
                        className={`py-3 rounded-[var(--radius-sm)] border text-[0.55rem] font-bold transition-all ${
                           String(config.display?.radius || '12') === r ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'
                        }`}
                     >
                        {r}PX
                     </button>
                  ))}
               </div>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[var(--radius-md)] space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <Type className="w-4 h-4 text-indigo-600" />
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Typographic Scaling</span>
               </div>
               <div className="grid grid-cols-2 gap-2">
                  {['14', '16', '18', '20'].map(s => (
                     <button 
                        key={s}
                        onClick={() => setConfig({...config, display: {...(config.display||{}), fontSize: s}})}
                        className={`py-3 rounded-[var(--radius-sm)] border text-[0.55rem] font-bold transition-all ${
                           String(config.display?.fontSize || '16') === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'
                        }`}
                     >
                        {s}PX
                     </button>
                  ))}
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[var(--radius-md)] space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Institutional Density</span>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  {[0.8, 1.0, 1.2].map(d => (
                     <button 
                        key={d}
                        onClick={() => setConfig({...config, display: {...(config.display||{}), density: d}})}
                        className={`py-3 rounded-[var(--radius-sm)] border text-[0.55rem] font-bold transition-all ${
                           (config.display?.density || 1.0) === d ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'
                        }`}
                     >
                        {d.toFixed(1)}X
                     </button>
                  ))}
               </div>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[var(--radius-md)] space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Padding Scale</span>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  {[0.8, 1.0, 1.2].map(p => (
                     <button 
                        key={p}
                        onClick={() => setConfig({...config, display: {...(config.display||{}), internalPadding: p}})}
                        className={`py-3 rounded-[var(--radius-sm)] border text-[0.55rem] font-bold transition-all ${
                           (config.display?.internalPadding || 1.0) === p ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'
                        }`}
                     >
                        {p.toFixed(1)}X
                     </button>
                  ))}
               </div>
            </div>
            
            <button 
               onClick={onUpdate}
               className="w-full py-4 bg-white text-white font-bold text-[0.6rem] uppercase tracking-widest rounded-[var(--radius-md)] hover:bg-black transition-all shadow-2xl shadow-indigo-200 active:scale-95"
            >
               Save Settings
            </button>
         </div>
      </div>
    </div>
  );
}
