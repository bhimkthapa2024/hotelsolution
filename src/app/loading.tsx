import { RefreshCw } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-[60vh] gap-4 animate-fadeIn">
      <div className="w-16 h-16 bg-white border border-slate-200 rounded-[var(--radius-md)] flex items-center justify-center shadow-[0_20px_50px_-15px_rgba(30,41,59,0.1)]">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
      <div className="flex flex-col items-center text-center mt-2">
        <h2 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest">Executing Route Transition</h2>
        <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Compiling Data & Rendering Interface...</p>
      </div>
    </div>
  );
}
