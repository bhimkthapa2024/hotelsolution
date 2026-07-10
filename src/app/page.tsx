'use client';

import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BedDouble, 
  Activity, 
  PieChart, 
  ArrowUpRight,
  BarChart3,
  Wallet,
  Clock,
  ShieldCheck,
  Zap,
  RefreshCcw,
  ArrowRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardRegistry } from "@/actions/hotel";
import { formatCurrency } from "@/lib/utils";
import { motion, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import PageBanner from "@/components/PageBanner";
import { DashboardSkeleton } from "@/components/Skeleton";

export default function Dashboard() {
  const [data, setData] = useState<{
    rooms: any[];
    sales: any[];
    accounts: any[];
    config: any;
  } | null>(null);

  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getDashboardRegistry();
        setData(res);
      } catch (err: any) {
        console.error("DASHBOARD_LOAD_FAILURE:", err);
        setError("DATA_SYNC_FAILURE: The operational feed could not be established.");
      }
    }
    load();
  }, []);

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
       <div className="bg-rose-50 text-rose-600 p-6 rounded-[var(--radius-lg)] border border-rose-100 max-w-md shadow-xl">
          <h2 className="text-[0.6rem] font-black uppercase tracking-tighter mb-2 italic">Feed Synchronization Crash</h2>
          <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white text-white font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)]">Retry Protocol</button>
       </div>
    </div>
  );

  if (!data) return <DashboardSkeleton />;

  const { rooms, accounts, config } = data;
  const totalRev = accounts.filter(a => a.type === 'REVENUE').reduce((s, a) => s + a.balance, 0);
  const totalExp = accounts.filter(a => a.type === 'EXPENSE').reduce((s, a) => s + a.balance, 0);
  const totalCash = accounts.filter(a => a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank')).reduce((s, a) => s + a.balance, 0);
  const netProfit = totalRev - totalExp;

  const stats = [
    { label: 'Fiscal Revenue', value: formatCurrency(totalRev), icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', href: '/sales-report' },
    { label: 'Operational Costs', value: formatCurrency(totalExp), icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', href: '/procurement-report' },
    { label: 'Net Profit Yield', value: formatCurrency(netProfit), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', href: '/reports' },
    { label: 'Cash Liquidity', value: formatCurrency(totalCash), icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', href: '/ledger' },
  ];

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={container}
      className="p-4 max-w-[1550px] mx-auto min-h-screen bg-[var(--bg-color)]"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
         <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="p-1.5 bg-indigo-100 rounded-md text-indigo-600">
                  <Activity className="w-4 h-4" />
               </div>
               <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Analytics Summary</h1>
            </div>
            <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Institutional MIS Terminal & Operational Intelligence</p>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={() => window.location.reload()}
              className="h-8 sm:h-10 px-3 sm:px-4 bg-white border border-slate-200 text-slate-500 font-black text-[0.55rem] sm:text-[0.55rem] rounded-[var(--radius-sm)] hover:bg-slate-50 hover:text-indigo-600 transition-all uppercase tracking-widest flex items-center gap-2 group/refresh shadow-sm"
            >
              <RefreshCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5 group-hover/refresh:rotate-180 transition-transform duration-700" /> RE-SYNC FEED
            </button>
            <button 
              onClick={() => router.push('/sales')}
              className="h-8 sm:h-10 px-4 sm:px-6 bg-indigo-600 text-white rounded-[var(--radius-sm)] font-black text-[0.55rem] sm:text-[0.55rem] shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95"
            >
              <Zap className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-300" /> EXECUTE TRANSACTION
            </button>
         </div>
      </div>



      <div className="grid grid-cols-12 gap-2 sm:gap-4">
        {/* REVENUE VELOCITY CHART */}
        <motion.div variants={item} className="col-span-12 lg:col-span-8 bg-white p-2 sm:p-4 rounded-[var(--radius-md)] border border-slate-200 shadow-sm relative overflow-x-auto group">
           <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                 <div className="bg-white p-2 rounded-[var(--radius-sm)]"><BarChart3 className="w-3.5 h-3.5 text-white" /></div>
                 <div>
                    <h3 className="text-[0.6rem] font-normal text-slate-950 leading-none uppercase">Revenue Velocity Telemetry</h3>
                    <p className="text-slate-400 font-black text-[0.55rem] mt-1 uppercase tracking-widest opacity-80 ">High-fidelity cross-sectional trend monitoring</p>
                 </div>
              </div>
              <div className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-[var(--radius-xs)] text-[0.55rem] font-black text-slate-400 uppercase tracking-widest ">Active Fiscal Cycle</div>
           </div>
           
           <div className="w-full h-[120px] sm:h-[180px] bg-slate-50/50 rounded-[var(--radius-sm)] border border-dashed border-slate-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
              <Activity className="w-8 h-8 text-slate-100 mb-2 animate-pulse" />
              <p className="font-black text-slate-200 text-[0.55rem] uppercase tracking-widest italic ">Interpreting Real-time Ledger Stream...</p>
              
              <div className="absolute inset-x-4 bottom-2 h-12 flex items-end gap-1 justify-center overflow-hidden opacity-10 group-hover:opacity-30 transition-opacity">
                 {Array.from({length: 40}).map((_, i) => (
                    <div key={i} className="flex-1 bg-white rounded-t-[var(--radius-xs)]" style={{ height: `${20 + Math.random() * 80}%` }} />
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-3 gap-6 mt-4 pt-4 border-t border-slate-50">
              <div className="space-y-1">
                 <span className="text-[0.55rem] font-black text-slate-300 uppercase tracking-widest block leading-none">Net Growth</span>
                 <span className="text-xs font-black text-emerald-600 tracking-tighter">+24.8% VECT</span>
              </div>
              <div className="space-y-1">
                 <span className="text-[0.55rem] font-black text-slate-300 uppercase tracking-widest block leading-none">Asset Utilization</span>
                 <span className="text-xs font-black text-indigo-600 tracking-tighter">88.4% OCCUPANCY</span>
              </div>
              <div className="space-y-1 text-right">
                 <span className="text-[0.55rem] font-black text-slate-300 uppercase tracking-widest block leading-none">Risk Index</span>
                 <span className="text-xs font-black text-slate-950 tracking-tighter leading-none italic underline decoration-slate-100">STABLE</span>
              </div>
           </div>
        </motion.div>

        {/* OPERATIONAL LEDGER HUB */}
        <motion.div variants={item} className="col-span-12 lg:col-span-4 bg-white p-2 sm:p-4 rounded-[var(--radius-md)] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[0.6rem] font-normal text-slate-950 flex items-center gap-2 uppercase">
                <PieChart className="w-3.5 h-3.5 text-slate-900" /> Ledger Metrics
              </h3>
              <button onClick={() => router.push('/ledger')} className="text-[0.55rem] font-black text-indigo-600 uppercase tracking-widest hover:underline italic">Deep Trace</button>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[250px] scrollbar-hide">
                {accounts.slice(0, 7).map((acc, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => router.push('/ledger')}
                    className="flex items-center justify-between p-2 rounded-[var(--radius-sm)] bg-slate-50/50 hover:bg-slate-100 transition-all cursor-pointer border border-slate-50 group shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                       <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-indigo-600 transition-colors shrink-0" />
                       <span className="text-[0.55rem] font-black text-slate-500 group-hover:text-slate-950 uppercase tracking-widest truncate transition-colors italic">{acc.name}</span>
                    </div>
                    <span className="text-[0.6rem] font-black text-slate-950 tracking-tighter shrink-0">{formatCurrency(acc.balance)}</span>
                  </div>
                ))}
            </div>

            <button 
              onClick={() => router.push('/reports')}
              className="w-full mt-4 py-2.5 bg-white text-white font-black text-[0.55rem] rounded-[var(--radius-sm)] hover:bg-indigo-600 transition-all uppercase tracking-widest shadow-xl shadow-indigo-100"
            >
              Consolidated Balance Audit
            </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-2 sm:gap-4 mt-4">
         <motion.div 
            variants={item} 
            onClick={() => router.push('/housekeeping')}
            className="col-span-12 lg:col-span-3 bg-white p-4 rounded-[var(--radius-md)] text-white overflow-hidden relative group cursor-pointer shadow-xl border border-slate-900"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all transition-transform">
               <BedDouble className="w-12 h-12" />
            </div>
            <p className="text-[0.35rem] font-black uppercase tracking-widest text-slate-500 mb-2 leading-none">Inventory Readiness</p>
            <h4 className="text-[1.8rem] font-black tracking-tighter mb-1 leading-none italic">{rooms.filter(r => r.status === 'Ready').length} Units</h4>
            <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
               <p className="text-[0.55rem] font-black uppercase text-slate-400 tracking-widest">Available for Folio</p>
            </div>
         </motion.div>
         
         <motion.div variants={item} className="col-span-12 lg:col-span-9 bg-white border border-slate-200 p-4 rounded-[var(--radius-md)] flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-4 relative z-10">
               <div className="w-10 h-10 bg-emerald-50 rounded-[var(--radius-sm)] flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                  <TrendingUp className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="text-[0.6rem] font-normal text-slate-950 uppercase  mb-1">Performance Momentum Matrix</h4>
                  <p className="text-slate-400 font-black text-[0.55rem] uppercase tracking-widest opacity-80 leading-relaxed max-w-[550px]">Property yield vector remains positive. sustained asset utilization across all operational tiers detected.</p>
               </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => router.push('/reports')} className="h-9 px-4 bg-slate-50 text-slate-900 border border-slate-200 font-black text-[0.55rem] rounded-[var(--radius-sm)] hover:bg-white hover:text-white transition-all uppercase tracking-widest flex items-center gap-2">
                  Analytics <ArrowRight className="w-3 h-3" />
               </button>
            </div>
         </motion.div>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-[0.35rem] font-black text-slate-300 uppercase tracking-widest px-1 pointer-events-none italic opacity-50">
         <span>Institutional Core v2.94-Alpha</span>
         <span>Authorized Audit Session Activity: Active</span>
      </div>
    </motion.div>
  );
}




