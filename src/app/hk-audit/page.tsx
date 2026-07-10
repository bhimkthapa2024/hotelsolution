'use client';

import { useEffect, useState } from 'react';
import { 
  getHousekeepingActivity
} from '@/actions/hotel';
import { 
  History as HistoryIcon, 
  Printer, 
  MapPin, 
  ChevronRight, 
  ShieldCheck, 
  UserPlus, 
  Zap, 
  BarChart3,
  Search,
  RefreshCcw
} from "lucide-react";
import { formatCurrency, formatDate } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";
import PageBanner from '@/components/PageBanner';

export default function HousekeepingAudit() {
  const [hkLogs, setHkLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const h = await getHousekeepingActivity();
    setHkLogs(h || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = hkLogs.filter(l => 
     l.roomNumber.includes(searchQuery) || 
     l.newStatus.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (l.note && l.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && !hkLogs.length) return (
     <div className="flex items-center justify-center h-screen bg-slate-50 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-[var(--radius-md)] animate-spin" />
        <span className="text-[0.6rem] font-black uppercase tracking-widest text-indigo-900 italic">Accessing Audit Registry...</span>
     </div>
  );

  return (
    <div className="p-8 max-w-[1550px] mx-auto min-h-screen bg-[var(--bg-color)] animate-fadeIn printable-doc">
      
      {/* HEADER COMMAND STRIP */}
      <PageBanner
        prefix="Institutional Operational Audit Suite"
        subtitle="Administrative Audit Access Registry"
        title="Housekeeping Audit"
        description="Forensic Monitoring for Institutional Asset Maintenance Flow"
        icon={<BarChart3 className="w-5 h-5 text-white" />}
      >
        <div className="search-bar relative group/search">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within/search:text-indigo-400 transition-colors" />
           <input 
              type="text" 
              placeholder="SEARCH AUDIT..."
              className="w-full lg:w-[280px] pl-10 pr-4 h-10 bg-white/5 border border-white/10 rounded-[var(--radius-sm)] shadow-inner outline-none focus:bg-white/10 focus:border-indigo-600 transition-all font-black text-white text-[0.6rem] uppercase tracking-widest placeholder:text-slate-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>
        <button 
          onClick={() => window.print()}
          className="h-10 px-6 bg-indigo-600 text-white font-black text-[0.6rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-black transition-all flex items-center gap-2 shadow-xl active:scale-95 whitespace-nowrap group/pbtn"
        >
          <Printer className="w-4 h-4 text-white" /> Commit Print Registry
        </button>
      </PageBanner>

      {/* INSTITUTIONAL PRINT HEADER */}
      <div className="print-only mb-8 border-b-2 border-slate-900 pb-6">
         <div className="flex justify-between items-start">
            <div>
               <h1 className="text-lg font-black uppercase tracking-tighter text-slate-950">Property Management System</h1>
               <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Operational Registry • Housekeeping Audit</p>
            </div>
            <div className="text-right">
               <h2 className="text-lg font-black uppercase tracking-widest text-indigo-600">HK PERFORMANCE AUDIT</h2>
               <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mt-1">Audit Protocol [v3.0.4]</p>
            </div>
         </div>
         <div className="mt-4 flex justify-between items-center text-[0.55rem] font-black text-slate-300 uppercase tracking-widest">
            <span>Secured Archival Document</span>
            <span>Generated: {mounted ? new Date().toLocaleString() : ''}</span>
         </div>
      </div>



      <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] report-container">
         <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
            <div className="flex items-center gap-3">
               <h3 className="text-[0.6rem] font-normal uppercase">Management Operational Ledger Registry</h3>
            </div>
            <button onClick={loadData} className="w-7 h-7 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-black rounded-[var(--radius-xs)] transition-all flex items-center justify-center border border-white/10 active:scale-95">
               <RefreshCcw className="w-3.5 h-3.5" />
            </button>
         </div>

         <div className="p-0">
            <table className="w-full classic-table">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                     <th className="py-2 px-8 text-left text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Audit Timestamp</th>
                     <th className="py-2 px-8 text-left text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Asset ID</th>
                     <th className="py-2 px-8 text-left text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Transition Mapping</th>
                     <th className="py-2 px-8 text-left text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Protocol Admin</th>
                     <th className="py-2 px-8 text-left text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Forensic Remarks</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredLogs.map((log, idx) => (
                     <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-all group">
                        <td className="py-1.5 px-8">
                           <p className="text-[0.6rem] font-black text-slate-950 uppercase leading-none">{log.date}</p>
                           <p className="text-[0.55rem] font-bold text-slate-400 italic mt-0.5 leading-none">{log.timestamp}</p>
                        </td>
                        <td className="py-1.5 px-8">
                           <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-slate-300" />
                              <span className="text-xs font-black text-slate-950 tracking-tighter leading-none">#{log.roomNumber}</span>
                           </div>
                        </td>
                        <td className="py-1.5 px-8">
                           <div className="flex items-center gap-3 leading-none">
                              <span className="text-[0.55rem] font-bold text-slate-300 uppercase italic leading-none">{log.prevStatus || 'INIT'}</span>
                              <ChevronRight className="w-3 h-3 text-slate-200" />
                              <span className={`px-2 py-0.5 rounded-[var(--radius-md)] text-[0.55rem] font-black uppercase tracking-widest leading-none ${
                                 log.newStatus === 'Ready' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                 log.newStatus === 'Dirty' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              }`}>{log.newStatus}</span>
                           </div>
                        </td>
                        <td className="py-1.5 px-8">
                           <div className="flex items-center gap-2 leading-none">
                              <UserPlus className="w-3 h-3 text-indigo-400" />
                              <span className="text-[0.55rem] font-black text-slate-950 uppercase tracking-widest leading-none">{log.actionedBy}</span>
                           </div>
                        </td>
                        <td className="py-1.5 px-8 text-[0.55rem] font-bold text-slate-500 uppercase italic opacity-90 leading-none">{log.note || 'Institutional Monitoring Registry Override'}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {filteredLogs.length === 0 && (
               <div className="flex flex-col items-center justify-center py-40 opacity-10">
                  <BarChart3 className="w-20 h-20 mb-6" />
                  <p className="text-lg font-black uppercase tracking-widest italic">No Audit History Identified</p>
               </div>
            )}
         </div>
      </div>

    </div>
  );
}




