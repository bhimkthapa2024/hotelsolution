'use client';

import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { getSales, getPeriodBalances, getConfig, getCashFlowReport, getDebtors, getSuppliers, getEmployees } from '@/actions/hotel';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { exportToExcel } from '@/lib/excel';
import { differenceInDays, subDays, format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, BarChart, Bar, ComposedChart } from 'recharts';
import { 
  BarChart3, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Calendar, 
  RefreshCcw,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Printer,
  ChevronDown,
  ChevronRight,
  Search,
  AlertCircle,
  Briefcase,
  Building2,
  User,
  BedDouble,
  Download,
  ArrowRightCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LedgerDrilldown from '@/components/LedgerDrilldown';
import PageBanner from '@/components/PageBanner';
import AuthorityGuard from '@/components/AuthorityGuard';
import { getCurrentUser } from '@/actions/auth';
import TrialBalance from './components/TrialBalance';
import ProfitAndLoss from './components/ProfitAndLoss';
import BalanceSheet from './components/BalanceSheet';
import CashFlow from './components/CashFlow';
import EmployeeCommissions from './components/EmployeeCommissions';
import SpaAnalytics from './components/SpaAnalytics';
import SundryDebtors from './components/SundryDebtors';
import SundryCreditors from './components/SundryCreditors';

type ViewMode = 'DETAILED' | 'COMPACT';

export default function ReportsClient({
  initialConfig,
  initialUser,
  initialDateRange,
}: {
  initialConfig: any;
  initialUser: any;
  initialDateRange: { from: string, to: string };
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'TRIAL_BALANCE');

  useEffect(() => {
     if (tabParam) {
        setActiveTab(tabParam);
     }
  }, [tabParam]);

  const [viewMode, setViewMode] = useState<ViewMode>('DETAILED');
  const [sales, setSales] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(initialUser);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [debtors, setDebtors] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [debtorSearch, setDebtorSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [drilldownFilter, setDrilldownFilter] = useState<string | undefined>(undefined);
  const [drilldownOpeningBal, setDrilldownOpeningBal] = useState<number>(0);
  const [hideZeroBalances, setHideZeroBalances] = useState(false);

  const [dateRange, setDateRange] = useState(initialDateRange);
  const [prevSales, setPrevSales] = useState<any[]>([]);
  const [prevAccounts, setPrevAccounts] = useState<any[]>([]);

  // Cache tracker to know what's been loaded
  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});

  const loadData = async (forceParam?: boolean | React.SyntheticEvent) => {
    const force = forceParam === true || (forceParam && typeof forceParam === 'object');
    const cacheKey = `${activeTab}_${dateRange.from}_${dateRange.to}`;
    if (!force && loadedTabs[cacheKey]) return; // Already loaded, use cache
    
    setLoading(true);
    
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const diffDays = differenceInDays(toDate, fromDate) + 1;
    const pTo = subDays(fromDate, 1);
    const pFrom = subDays(pTo, diffDays - 1);
    const prevRange = { from: format(pFrom, 'yyyy-MM-dd'), to: format(pTo, 'yyyy-MM-dd') };

    // Fetch config always if not present
    if (!config) {
        const c = await getConfig();
        setConfig(c);
        if (c?.businessDate && dateRange.to !== c.businessDate) {
           setDateRange({ from: c.businessDate, to: c.businessDate });
        }
    }

    // Lazy load based on tab
    try {
        if (activeTab === 'TRIAL_BALANCE' || activeTab === 'P_L' || activeTab === 'BALANCE_SHEET') {
            const [a, pAcc] = await Promise.all([
                getPeriodBalances(dateRange.from, dateRange.to),
                getPeriodBalances(prevRange.from, prevRange.to)
            ]);
            setAccounts(a);
            setPrevAccounts(pAcc || []);
        } 
        else if (activeTab === 'CASH_FLOW') {
            const cf = await getCashFlowReport(dateRange.from, dateRange.to);
            setCashFlow(cf);
        }
        else if (activeTab === 'SUNDRY_DEBTORS') {
            const [dData, a] = await Promise.all([
               getDebtors(),
               getPeriodBalances(dateRange.from, dateRange.to)
            ]);
            setDebtors(dData || []);
            setAccounts(a);
        }
        else if (activeTab === 'SUNDRY_CREDITORS') {
            const [supData, a] = await Promise.all([
               getSuppliers(),
               getPeriodBalances(dateRange.from, dateRange.to)
            ]);
            setSuppliers(supData || []);
            setAccounts(a);
        }
        else if (activeTab === 'EXECUTIVE_DASHBOARD' || activeTab === 'SALES_CONTRIBUTION' || activeTab === 'SPA_ANALYTICS') {
            const [s, pSales, a, pAcc] = await Promise.all([
                getSales(dateRange.from, dateRange.to),
                getSales(prevRange.from, prevRange.to),
                getPeriodBalances(dateRange.from, dateRange.to),
                getPeriodBalances(prevRange.from, prevRange.to)
            ]);
            setSales(s);
            setPrevSales(pSales || []);
            setAccounts(a);
            setPrevAccounts(pAcc || []);
        }
        else if (activeTab === 'EMPLOYEE_COMMISSIONS') {
            const [empData, s] = await Promise.all([
                getEmployees(),
                getSales(dateRange.from, dateRange.to)
            ]);
            setEmployees(empData || []);
            setSales(s);
        }

        setLoadedTabs(prev => ({ ...prev, [cacheKey]: true }));
    } catch (err) {
        console.error("Failed to load data for tab", activeTab, err);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [dateRange.from, dateRange.to, activeTab]);

  const { revAccounts, expAccounts, assetAccounts, liabAccounts, equityAccounts } = useMemo(() => {
    return {
      revAccounts: accounts.filter(a => a.type === 'REVENUE'),
      expAccounts: accounts.filter(a => a.type === 'EXPENSE'),
      assetAccounts: accounts.filter(a => a.type === 'ASSET'),
      liabAccounts: accounts.filter(a => a.type === 'LIABILITY'),
      equityAccounts: accounts.filter(a => a.type === 'EQUITY'),
    };
  }, [accounts]);

  const { totalRev, totalExp, netProfit } = useMemo(() => {
    const r = revAccounts.filter(a => !a.parentId).reduce((acc, a) => acc + a.balance, 0);
    const e = expAccounts.filter(a => !a.parentId).reduce((acc, a) => acc + a.balance, 0);
    return { totalRev: r, totalExp: e, netProfit: r - e };
  }, [revAccounts, expAccounts]);

  const { prevTotalRev, prevTotalExp, prevNetProfit } = useMemo(() => {
    const pRevAccounts = prevAccounts.filter(a => a.type === 'REVENUE');
    const pExpAccounts = prevAccounts.filter(a => a.type === 'EXPENSE');
    const pr = pRevAccounts.filter(a => !a.parentId).reduce((acc, a) => acc + a.balance, 0);
    const pe = pExpAccounts.filter(a => !a.parentId).reduce((acc, a) => acc + a.balance, 0);
    return { prevTotalRev: pr, prevTotalExp: pe, prevNetProfit: pr - pe };
  }, [prevAccounts]);

  const { revVar, expVar, netVar } = useMemo(() => {
    return {
      revVar: prevTotalRev === 0 ? 0 : ((totalRev - prevTotalRev) / prevTotalRev) * 100,
      expVar: prevTotalExp === 0 ? 0 : ((totalExp - prevTotalExp) / prevTotalExp) * 100,
      netVar: prevNetProfit === 0 ? 0 : ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100,
    };
  }, [totalRev, prevTotalRev, totalExp, prevTotalExp, netProfit, prevNetProfit]);

  const { totalDebitTB, totalCreditTB } = useMemo(() => {
    const tbRoots = accounts.filter(a => !a.parentId);
    const td = tbRoots.reduce((s, a) => {
      if (a.normal === 'Debit') return s + (a.balance > 0 ? a.balance : 0);
      return s + (a.balance < 0 ? Math.abs(a.balance) : 0);
    }, 0);
    const tc = tbRoots.reduce((s, a) => {
      if (a.normal === 'Credit') return s + (a.balance > 0 ? a.balance : 0);
      return s + (a.balance < 0 ? Math.abs(a.balance) : 0);
    }, 0);
    return { totalDebitTB: td, totalCreditTB: tc };
  }, [accounts]);

  const { totalAssets, totalLiab, totalEquity } = useMemo(() => {
    return {
      totalAssets: assetAccounts.filter(a => !a.parentId).reduce((s, a) => s + a.balance, 0),
      totalLiab: liabAccounts.filter(a => !a.parentId).reduce((s, a) => s + a.balance, 0),
      totalEquity: equityAccounts.filter(a => !a.parentId).reduce((s, a) => s + a.balance, 0),
    };
  }, [assetAccounts, liabAccounts, equityAccounts]);

  const renderSimpleTree = (accList: any[], onSelect: (a: any) => void) => {
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
                    "tabular-nums whitespace-nowrap",
                    depth === 0 ? "text-[0.6rem] font-black text-slate-900" : "text-[0.6rem] font-black text-slate-950",
                    acc.type === 'EXPENSE' ? 'text-rose-600 group-hover:text-indigo-600' : ''
                 )}>
                    {acc.type === 'EXPENSE' && depth === 0 ? `(${formatCurrency(acc.balance)})` : formatCurrency(acc.balance)}
                 </span>
              </div>
              {children.map(child => renderNode(child, depth + 1))}
           </Fragment>
        );
     };
     
     const roots = accList.filter(a => !a.parentId);
     if (viewMode === 'COMPACT') return roots.map(a => (
        <div 
          key={a.id}
          onClick={() => onSelect(a)} 
          className="flex justify-between items-center text-[0.6rem] font-black text-slate-950 hover:text-indigo-600 cursor-pointer pt-3 pb-1 border-b border-slate-50 uppercase group"
        >
           <span className="flex items-center gap-2">{a.name} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100" /></span>
           <span className={a.type === 'EXPENSE' ? 'text-rose-600' : ''}>{formatCurrency(a.balance)}</span>
        </div>
     ));
     return roots.map(node => renderNode(node));
  };

  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[] = [];

    const flattenTree = (acc: any, depth = 0): any[] => {
       const children = accounts.filter((child: any) => child.parentId === acc.id);
       const row = [
          acc.code || '',
          " ".repeat(depth * 4) + acc.name,
          acc.type,
          acc.normal === 'Debit' ? acc.balance : 0,
          acc.normal === 'Credit' ? acc.balance : 0
       ];
       return [row, ...children.flatMap((c: any) => flattenTree(c, depth + 1))];
    };

    if (activeTab === 'TRIAL_BALANCE') {
       headers = ["A/C ID", "Account Name", "Type", "Debit Balance", "Credit Balance"];
       const roots = accounts.filter((a: any) => !a.parentId);
       rows = roots.flatMap((r: any) => flattenTree(r));
    } else if (activeTab === 'P_L') {
       headers = ["A/C ID", "Account Name", "Type", "Debit Balance", "Credit Balance"];
       const revRoots = accounts.filter((a: any) => !a.parentId && a.type === 'REVENUE');
       const expRoots = accounts.filter((a: any) => !a.parentId && a.type === 'EXPENSE');
       rows = [...revRoots.flatMap((r: any) => flattenTree(r)), ...expRoots.flatMap((r: any) => flattenTree(r))];
    } else if (activeTab === 'BALANCE_SHEET') {
       headers = ["A/C ID", "Account Name", "Type", "Debit Balance", "Credit Balance"];
       const assetRoots = accounts.filter((a: any) => !a.parentId && a.type === 'ASSET');
       const liabRoots = accounts.filter((a: any) => !a.parentId && a.type === 'LIABILITY');
       const eqRoots = accounts.filter((a: any) => !a.parentId && a.type === 'EQUITY');
       rows = [
          ...assetRoots.flatMap((r: any) => flattenTree(r)), 
          ...liabRoots.flatMap((r: any) => flattenTree(r)),
          ...eqRoots.flatMap((r: any) => flattenTree(r))
       ];
    }

    if (!headers.length) return alert('Export is currently unsupported for this specific view.');
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab}_Audit_${dateRange.from}_to_${dateRange.to}.csv`;
    link.click();
  };

  const showZeroBalancesFilter = ['TRIAL_BALANCE', 'P_L', 'BALANCE_SHEET'].includes(activeTab);

  return (
    <AuthorityGuard user={currentUser} requiredPermission="reports.view">
    <div className="p-4 sm:p-6 w-full min-h-screen bg-[var(--bg-color)] animate-fadeIn print:p-0 print:w-full institutional-report-root printable-doc">
      
      {/* INSTITUTIONAL PRINT HEADER [ONLY VISIBLE IN ISOLATED EXPORT] */}
      <div className={cn("print-only mb-8 border-b-2 border-slate-900 pb-6", selectedAccount && "no-print")}>
         <div className="flex justify-between items-start">
            <div>
               <h1 className="text-lg font-black uppercase tracking-tighter text-slate-950">{config?.hotelName || 'Property Management System'}</h1>
               <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">{config?.address || 'Operational Registry'}</p>
            </div>
            <div className="text-right">
               <h2 className="text-lg font-black uppercase tracking-widest text-indigo-600">{activeTab.replace('_', ' ')}</h2>
               <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mt-1">Audit Period: {dateRange.from} TO {dateRange.to}</p>
            </div>
         </div>
         <div className="mt-4 flex justify-between items-center text-[0.55rem] font-black text-slate-300 uppercase tracking-widest">
            <span>Secured Archival Document [v3.0.4]</span>
            <span>Generated: {mounted ? new Date().toLocaleString() : ''}</span>
         </div>
      </div>

      <>
      <div className={cn("relative w-full bg-white min-h-screen shadow-2xl print:shadow-none printable-doc p-8 print:p-0 mb-20 max-w-full", selectedAccount && "hidden")}>

        {/* PERSISTENT GLOBAL FILTER BAR */}
        <div className="no-print mb-6 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Report Period</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="h-8 px-2 text-xs border border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="h-8 px-2 text-xs border border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-800"
            />
          </div>
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5">
            {[
              { label: 'Today', get: () => { const d = config?.businessDate || new Date().toISOString().split('T')[0]; return { from: d, to: d }; } },
              { label: 'This Month', get: () => { const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, to: new Date().toISOString().split('T')[0] }; } },
              { label: 'This Year', get: () => { const y = new Date().getFullYear(); return { from: `${y}-01-01`, to: new Date().toISOString().split('T')[0] }; } },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => setDateRange(preset.get())}
                className="h-7 px-2.5 text-[0.55rem] font-black uppercase tracking-widest bg-white border border-slate-300 rounded hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 text-slate-600 transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Zero Balances toggle — only for accounting reports */}
          {showZeroBalancesFilter && (
            <label className="flex items-center gap-1.5 cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={hideZeroBalances}
                onChange={() => setHideZeroBalances(!hideZeroBalances)}
                className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">Hide Zero Balances</span>
            </label>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.6rem] font-black uppercase tracking-widest rounded flex items-center gap-2 transition-all disabled:opacity-60 shadow-sm"
            >
              <RefreshCcw className={cn("w-3 h-3", loading && "animate-spin")} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={handleExport} className="h-8 px-4 bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 text-[0.6rem] font-black uppercase tracking-widest rounded flex items-center gap-2 transition-all shadow-sm">
              <Download className="w-3 h-3" /> Export CSV
            </button>
            <button onClick={() => window.print()} className="h-8 w-8 bg-white border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 shadow-sm transition-colors" title="Print">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
        {loading && <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /><span className="ml-3 text-[0.6rem] font-black text-indigo-600 uppercase tracking-widest">Loading Report...</span></div>}
        {!loading && (
        <>
      <PageBanner
        prefix="Financial Reports"
        subtitle={`Period: ${formatDate(dateRange.from)} — ${formatDate(dateRange.to)}`}
        title="Reports Suite"
        description="View and filter financial data by selecting your date range above."
        icon={<BarChart3 className="w-5 h-5 text-white" />}
      />

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>

          
          
                      {activeTab === 'EXECUTIVE_DASHBOARD' && (
              <div className="space-y-6 animate-fadeIn">
                 
                 {/* 1. HOTEL YIELD ANALYTICS */}
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm report-container">
                       <h3 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest mb-6">Hotel Yield & Velocity (ADR & RevPAR trends)</h3>
                       <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <ComposedChart data={
                                (() => {
                                   const dataMap: any = {};
                                   sales.filter(s => !s.isVoided && s.type === 'ROOM').forEach(s => {
                                      const d = s.date.split('T')[0];
                                      if (!dataMap[d]) dataMap[d] = { date: formatDate(d), roomRevenue: 0, roomsOccupied: new Set() };
                                      dataMap[d].roomRevenue += s.amount;
                                      if (s.room) dataMap[d].roomsOccupied.add(s.room);
                                   });
                                   return Object.values(dataMap).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((d: any) => ({
                                       date: d.date,
                                       adr: d.roomsOccupied.size > 0 ? Math.round(d.roomRevenue / d.roomsOccupied.size) : 0,
                                       revenue: d.roomRevenue
                                   }));
                                })()
                             }>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{fontSize: 9}} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" tick={{fontSize: 9}} tickLine={false} axisLine={false} tickFormatter={(val) => 'Rs.' + (val/1000) + 'k'} />
                                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 9}} tickLine={false} axisLine={false} tickFormatter={(val) => 'ADR Rs.' + val} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Bar yAxisId="left" dataKey="revenue" name="Room Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="adr" name="ADR (Average Daily Rate)" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                             </ComposedChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                    <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm report-container">
                       <h3 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest mb-6">Room Contribution</h3>
                       <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <RechartsPieChart>
                                <Pie 
                                   data={(() => {
                                       const roomMap: any = {};
                                       sales.filter(s => !s.isVoided && s.room).forEach(s => {
                                           if(!roomMap[s.room]) roomMap[s.room] = 0;
                                           roomMap[s.room] += s.amount;
                                       });
                                       return Object.entries(roomMap).map(([name, value]) => ({ name: 'Room ' + name, value })).sort((a:any,b:any) => b.value - a.value).slice(0, 8);
                                   })()}
                                   cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}
                                   dataKey="value"
                                >
                                   {(() => {
                                       const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#06b6d4'];
                                       return colors.map((c, i) => <Cell key={'cell-'+i} fill={c} />);
                                   })()}
                                </Pie>
                                <RechartsTooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                             </RechartsPieChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>

                 {/* 2. PAYMENT CHANNEL MATRIX & DEBTOR AGING */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm report-container">
                       <h3 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest mb-6">Payment Channel Matrix (Settlement)</h3>
                       <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={
                                (() => {
                                    const cMap: any = {};
                                    sales.filter(s => !s.isVoided && s.paymentMode).forEach(s => {
                                        if(!cMap[s.paymentMode]) cMap[s.paymentMode] = 0;
                                        cMap[s.paymentMode] += s.amount;
                                    });
                                    return Object.entries(cMap).map(([name, value]) => ({ name, value }));
                                })()
                             }>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                                <YAxis tick={{fontSize: 9}} tickLine={false} axisLine={false} tickFormatter={(val) => 'Rs.' + (val/1000) + 'k'} />
                                <RechartsTooltip formatter={(val: any) => formatCurrency(val)} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                                <Bar dataKey="value" name="Settled Volume" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                    <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm report-container">
                       <h3 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest mb-6">Debtor Risk Analysis (City Ledger)</h3>
                       <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart layout="vertical" data={
                                [...debtors].sort((a,b) => b.balance - a.balance).slice(0, 6)
                             }>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" tick={{fontSize: 9}} tickLine={false} axisLine={false} tickFormatter={(val) => 'Rs.' + (val/1000) + 'k'} />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                                <RechartsTooltip formatter={(val: any) => formatCurrency(val)} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                                <Bar dataKey="balance" name="Outstanding Debt" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>

                 {/* 3. VENDOR EXPENSE CONCENTRATION */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm report-container">
                       <h3 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest mb-6">Top Vendors / Suppliers by Volume</h3>
                       <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={
                                (() => {
                                   const suppMap: any = {};
                                   cashFlow?.outflow?.forEach((o: any) => {
                                      if (o.desc && o.desc.includes('Vendor:')) {
                                         const vName = o.desc.split('Vendor:')[1].trim();
                                         if (!suppMap[vName]) suppMap[vName] = 0;
                                         suppMap[vName] += o.amount;
                                      }
                                   });
                                   // fallback to suppliers list if outflow doesn't map clearly
                                   if (Object.keys(suppMap).length === 0) {
                                       return [...suppliers].sort((a,b) => b.balance - a.balance).slice(0, 6).map(s => ({ name: s.name, value: s.balance }));
                                   }
                                   return Object.entries(suppMap).map(([name, value]) => ({ name, value })).sort((a:any, b:any) => b.value - a.value).slice(0, 6);
                                })()
                             }>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                                <YAxis tick={{fontSize: 9}} tickLine={false} axisLine={false} tickFormatter={(val) => 'Rs.' + (val/1000) + 'k'} />
                                <RechartsTooltip formatter={(val: any) => formatCurrency(val)} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                                <Bar dataKey="value" name="Paid Volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                    <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm report-container">
                       <h3 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest mb-6">Expense Distribution Matrix</h3>
                       <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <RechartsPieChart>
                                <Pie 
                                   data={expAccounts.filter(a => !a.parentId && Math.abs(a.balance) > 0).map(a => ({ name: a.name, value: Math.abs(a.balance) }))}
                                   cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}
                                   dataKey="value"
                                >
                                   {expAccounts.filter(a => !a.parentId && Math.abs(a.balance) > 0).map((entry, index) => (
                                      <Cell key={'cell-' + index} fill={['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'][index % 6]} />
                                   ))}
                                </Pie>
                                <RechartsTooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                             </RechartsPieChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>
              </div>
           )}

{activeTab === 'TRIAL_BALANCE' && (
              <TrialBalance 
                  accounts={accounts}
                  hideZeroBalances={hideZeroBalances}
                  viewMode={viewMode}
                  setSelectedAccount={setSelectedAccount}
                  totalDebitTB={totalDebitTB}
                  totalCreditTB={totalCreditTB}
              />
          )}

          {activeTab === 'P_L' && (
              <ProfitAndLoss 
                  revAccounts={revAccounts}
                  expAccounts={expAccounts}
                  totalRev={totalRev}
                  totalExp={totalExp}
                  netProfit={netProfit}
                  revVar={revVar}
                  expVar={expVar}
                  setSelectedAccount={setSelectedAccount}
                  hideZeroBalances={hideZeroBalances}
                  viewMode={viewMode}
              />
          )}

           {activeTab === 'SALES_CONTRIBUTION' && (
              <div className="space-y-6 animate-fadeIn">
                 {/* Aggregations */}
                 {(() => {
                    const parseRooms = (roomStr: string): string[] => {
                       if (!roomStr) return [];
                       return roomStr
                          .split(/[,&/+\s]+/)
                          .map(r => r.trim().toUpperCase())
                          .filter(r => r.length > 0 && r !== 'ROOM');
                    };

                    const roomMap: { 
                       [room: string]: { 
                          roomNumber: string; 
                          roomRevenue: number; 
                          spaRevenue: number; 
                          otherRevenue: number; 
                          totalRevenue: number; 
                       } 
                    } = {};

                    const categoryMap: {
                       [category: string]: {
                          category: string;
                          qty: number;
                          revenue: number;
                       }
                    } = {};

                    let grandTotalRevenue = 0;

                    sales.filter(s => !s.isVoided).forEach(sale => {
                       (sale.items || []).forEach((item: any) => {
                          const amount = parseFloat(item.amount) || 0;
                          const qty = parseFloat(item.qty) || 0;
                          const category = (item.category || 'UNCLASSIFIED').toUpperCase().trim();

                          if (!categoryMap[category]) {
                             categoryMap[category] = { category: item.category || 'UNCLASSIFIED', qty: 0, revenue: 0 };
                          }
                          categoryMap[category].qty += qty;
                          categoryMap[category].revenue += amount;
                          grandTotalRevenue += amount;

                          const itemRoomStr = (item.roomNumber && item.roomNumber.trim()) || (sale.roomNumber && sale.roomNumber.trim()) || '';
                          const roomKeys = parseRooms(itemRoomStr);

                          if (roomKeys.length === 0) {
                             const walkInKey = 'WALK-IN';
                             if (!roomMap[walkInKey]) {
                                roomMap[walkInKey] = { roomNumber: 'WALK-IN', roomRevenue: 0, spaRevenue: 0, otherRevenue: 0, totalRevenue: 0 };
                             }
                             
                             if (category.includes('ROOM')) {
                                roomMap[walkInKey].roomRevenue += amount;
                             } else if (category.includes('SPA') || category.includes('MASSAGE')) {
                                roomMap[walkInKey].spaRevenue += amount;
                             } else {
                                roomMap[walkInKey].otherRevenue += amount;
                             }
                             roomMap[walkInKey].totalRevenue += amount;
                          } else {
                             const shareAmount = amount / roomKeys.length;
                             roomKeys.forEach(roomNo => {
                                if (!roomMap[roomNo]) {
                                   roomMap[roomNo] = { roomNumber: roomNo, roomRevenue: 0, spaRevenue: 0, otherRevenue: 0, totalRevenue: 0 };
                                }
                                
                                if (category.includes('ROOM')) {
                                   roomMap[roomNo].roomRevenue += shareAmount;
                                } else if (category.includes('SPA') || category.includes('MASSAGE')) {
                                   roomMap[roomNo].spaRevenue += shareAmount;
                                } else {
                                   roomMap[roomNo].otherRevenue += shareAmount;
                                }
                                roomMap[roomNo].totalRevenue += shareAmount;
                             });
                          }
                       });
                    });

                    const roomList = Object.values(roomMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
                    const categoryList = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);

                    const validRooms = roomList.filter(r => r.roomNumber !== 'WALK-IN');
                    const topRoom = validRooms.length > 0 ? `ROOM ${validRooms[0].roomNumber}` : 'WALK-IN ONLY';
                    const topRoomRevenue = validRooms.length > 0 ? validRooms[0].totalRevenue : (roomMap['WALK-IN']?.totalRevenue || 0);

                    const topCategory = categoryList.length > 0 ? categoryList[0].category : 'N/A';
                    const topCategoryRevenue = categoryList.length > 0 ? categoryList[0].revenue : 0;

                    return (
                        <div className="space-y-6">
                           {/* Metrics Cards Removed */}

                           {/* Main Tables Grid */}
                           <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                             {/* Left Side: Room Revenue Breakdown */}
                             <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-sm overflow-hidden report-container">
                                <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
                                   <h3 className="text-[0.6rem] font-normal uppercase">Folio Room Sales Ranking</h3>
                                   <button onClick={() => window.print()} className="h-7 px-4 bg-white/5 border border-white/10 text-slate-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"><Printer className="w-3 h-3" /> Print</button><button onClick={() => exportToExcel(roomList.map(r => ({ Room: r.roomNumber === 'WALK-IN' ? 'WALK-IN' : `ROOM ${r.roomNumber}`, Accommodation: r.roomRevenue, Spa_Massage: r.spaRevenue, Other: r.otherRevenue, Net_Total: r.totalRevenue })), 'Room_Sales_Ranking')} className="h-7 px-4 bg-emerald-600/10 border border-white/10 text-emerald-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/20 hover:text-white transition-all flex items-center gap-2 ml-2"><Download className="w-3 h-3" /> Excel</button>
                                </div>
                                <div className="overflow-x-auto">
                                   <table className="w-full text-left border-collapse font-bold uppercase text-[0.6rem] classic-table">
                                      <thead>
                                         <tr className="bg-slate-50 border-b border-slate-200 text-[0.55rem] font-black text-slate-500 tracking-widest">
                                            <th className="px-4 py-3 border-r border-slate-100">Room Target</th>
                                            <th className="px-4 py-3 border-r border-slate-100 text-right">Accommodation (Rs.)</th>
                                            <th className="px-4 py-3 border-r border-slate-100 text-right">Spa & Massage (Rs.)</th>
                                            <th className="px-4 py-3 border-r border-slate-100 text-right">Other Services (Rs.)</th>
                                            <th className="px-4 py-3 text-right w-[150px]">Net Billing (Rs.)</th>
                                         </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 bg-white font-black text-[0.6rem] text-slate-950 uppercase tracking-tight">
                                         {roomList.map((room, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                               <td className="px-4 py-3 border-r border-slate-50 flex items-center gap-3">
                                                  <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-[0.55rem] shrink-0">
                                                     {idx + 1}
                                                  </div>
                                                  <span className="text-[0.6rem]">{room.roomNumber === 'WALK-IN' ? 'WALK-IN CLIENTS' : `ROOM #${room.roomNumber}`}</span>
                                               </td>
                                               <td className="px-4 py-3 border-r border-slate-50 text-right text-slate-600 font-mono">{formatCurrency(room.roomRevenue)}</td>
                                               <td className="px-4 py-3 border-r border-slate-50 text-right text-slate-600 font-mono">{formatCurrency(room.spaRevenue)}</td>
                                               <td className="px-4 py-3 border-r border-slate-50 text-right text-slate-600 font-mono">{formatCurrency(room.otherRevenue)}</td>
                                               <td className="px-4 py-3 text-right text-indigo-600 font-mono font-black italic">{formatCurrency(room.totalRevenue)}</td>
                                            </tr>
                                         ))}
                                         {roomList.length === 0 && (
                                            <tr>
                                               <td colSpan={5} className="p-12 text-center text-slate-300 text-[0.6rem] font-bold uppercase tracking-widest italic bg-slate-50/20">Zero Room allocations recorded in selected period</td>
                                             </tr>
                                         )}
                                      </tbody>
                                   </table>
                                </div>
                             </div>

                             {/* Right Side: Service Head Contribution Share */}
                             <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-sm overflow-hidden report-container">
                                <div className="px-4 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between font-black text-gray-900 no-print">
                                   <h3 className="text-[0.6rem] font-normal uppercase">Service Classification Contribution</h3>
                                   <button onClick={() => window.print()} className="h-7 px-4 bg-white/5 border border-white/10 text-slate-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"><Printer className="w-3 h-3" /> Print</button><button onClick={() => exportToExcel(categoryList.map(cat => ({ Classification: cat.category, Units_Sold: cat.qty, Net_Revenue: cat.revenue, Contribution_Pct: grandTotalRevenue > 0 ? ((cat.revenue / grandTotalRevenue) * 100).toFixed(2) + '%' : '0%' })), 'Service_Classification')} className="h-7 px-4 bg-emerald-600/10 border border-white/10 text-emerald-400 font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-emerald-600/20 border-emerald-500/20 hover:text-white transition-all flex items-center gap-2 ml-2"><Download className="w-3 h-3" /> Excel</button>
                                </div>
                                <div className="overflow-x-auto">
                                   <table className="w-full text-left border-collapse font-bold uppercase text-[0.6rem] classic-table">
                                      <thead>
                                         <tr className="bg-slate-50 border-b border-slate-200 text-[0.55rem] font-black text-slate-500 tracking-widest">
                                            <th className="px-6 py-3 border-r border-slate-100">Classification Head</th>
                                            <th className="px-6 py-3 border-r border-slate-100 text-center w-[120px]">Units Sold</th>
                                            <th className="px-6 py-3 border-r border-slate-100 text-right w-[160px]">Net Revenue (Rs.)</th>
                                            <th className="px-6 py-3 text-left w-[200px]">Contribution Share</th>
                                         </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 bg-white font-black text-[0.6rem] text-slate-950 uppercase tracking-tight">
                                         {categoryList.map((cat, idx) => {
                                            const pct = grandTotalRevenue > 0 ? (cat.revenue / grandTotalRevenue) * 100 : 0;
                                            return (
                                               <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                  <td className="px-6 py-3 border-r border-slate-50 flex items-center gap-3">
                                                     <div className="w-7 h-7 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-[0.55rem] shrink-0">
                                                        {idx + 1}
                                                     </div>
                                                     <span className="text-[0.6rem]">{cat.category}</span>
                                                  </td>
                                                  <td className="px-6 py-3 border-r border-slate-50 text-center text-slate-700">{cat.qty}</td>
                                                  <td className="px-6 py-3 border-r border-slate-50 text-right text-slate-900 font-mono">{formatCurrency(cat.revenue)}</td>
                                                  <td className="px-6 py-3 align-middle">
                                                     <div className="space-y-1 max-w-[180px]">
                                                        <div className="flex justify-between items-center text-[0.55rem] font-bold">
                                                           <span className="text-slate-400">SHARE</span>
                                                           <span className="text-indigo-600 font-black">{pct.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                           <div 
                                                              style={{ width: `${pct}%` }} 
                                                              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                                                           />
                                                        </div>
                                                     </div>
                                                  </td>
                                               </tr>
                                            );
                                         })}
                                         {categoryList.length === 0 && (
                                            <tr>
                                               <td colSpan={4} className="p-12 text-center text-slate-300 text-[0.6rem] font-bold uppercase tracking-widest italic bg-slate-50/20">Zero sales recorded in selected period</td>
                                            </tr>
                                         )}
                                      </tbody>
                                   </table>
                                </div>
                             </div>
                          </div>
                       </div>
                    );
                 })()}
              </div>
           )}

           {activeTab === 'BALANCE_SHEET' && (
              <BalanceSheet
                  assetAccounts={assetAccounts}
                  liabAccounts={liabAccounts}
                  equityAccounts={equityAccounts}
                  totalAssets={totalAssets}
                  totalLiab={totalLiab}
                  totalEquity={totalEquity}
                  netProfit={netProfit}
                  setSelectedAccount={setSelectedAccount}
                  hideZeroBalances={hideZeroBalances}
                  viewMode={viewMode}
              />
           )}
           {activeTab === 'CASH_FLOW' && cashFlow && (
              <CashFlow cashFlow={cashFlow} />
           )}

          {activeTab === 'EMPLOYEE_COMMISSIONS' && (
             <EmployeeCommissions employees={employees} sales={sales} />
          )}
           {activeTab === 'SPA_ANALYTICS' && (
              <SpaAnalytics sales={sales} />
           )}

          {activeTab === 'SUNDRY_DEBTORS' && (
             <SundryDebtors
                debtors={debtors}
                accounts={accounts}
                debtorSearch={debtorSearch}
                setDebtorSearch={setDebtorSearch}
                setSelectedAccount={setSelectedAccount}
                setDrilldownFilter={setDrilldownFilter}
                setDrilldownOpeningBal={setDrilldownOpeningBal}
             />
          )}

          {activeTab === 'SUNDRY_CREDITORS' && (
             <SundryCreditors
                suppliers={suppliers}
                accounts={accounts}
                supplierSearch={supplierSearch}
                setSupplierSearch={setSupplierSearch}
                setSelectedAccount={setSelectedAccount}
                setDrilldownFilter={setDrilldownFilter}
                setDrilldownOpeningBal={setDrilldownOpeningBal}
             />
          )}
        </motion.div>
      </AnimatePresence>

      </>
        )}
      </div>

      <AnimatePresence>
        {selectedAccount && (
          <LedgerDrilldown 
            account={selectedAccount} 
            config={config} 
            descriptionFilter={drilldownFilter}
            openingBalance={drilldownOpeningBal}
            onClose={() => {
              setSelectedAccount(null);
              setDrilldownFilter(undefined);
              setDrilldownOpeningBal(0);
            }} 
          />
        )}
      </AnimatePresence>
      </>
    </div>
    </AuthorityGuard>
  );
}
