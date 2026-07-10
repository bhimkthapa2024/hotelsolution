'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Search, Bell, Calendar, User, Clock, ShieldCheck, Check } from 'lucide-react';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Link from 'next/link';
import Sidebar from "./Sidebar";
import { getNotifications, markNotificationAsRead } from '@/actions/hotel';
import { logout } from '@/actions/auth';
import { formatDistanceToNow } from 'date-fns';
import { usePathname } from 'next/navigation';
import { ProfessionalConfirm } from './ProfessionalConfirm';

import { User as LuciaUser } from 'lucia';

export default function MainLayout({ children, config, businessDate, user }: { children: React.ReactNode, config: any, businessDate: string, user: (LuciaUser & { roles: string[], permissions: string[] }) | null }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
     async function load() {
        const res = await getNotifications();
        setNotifications(res);
     }
     load();
     const interval = setInterval(load, 30000); // 30s Poll for Industrial reliability
     return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="font-sans flex bg-[var(--bg-color)] h-screen overflow-hidden w-full relative print:h-auto print:overflow-visible">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Adaptive */}
      <aside className={`fixed inset-y-0 left-0 z-[70] transform transition-transform duration-150 lg:translate-x-0 lg:static lg:inset-auto no-print ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setMobileMenuOpen(false)} permissions={user?.permissions || []} config={config} />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative print:h-auto print:overflow-visible">
        <header className="h-[var(--header-height)] bg-[var(--sidebar-bg)] border-b border-[var(--border-color)] flex items-center justify-between px-4 lg:px-6 shrink-0 z-50 no-print">
          <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-[var(--bg-color)] rounded-[var(--radius-md)] text-[var(--text-muted)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="h-6 w-1 bg-[var(--primary-color)] rounded-[var(--radius-md)] shrink-0" />
            <div className="overflow-hidden">
              <h2 className="text-[0.8rem] lg:text-[1rem] font-bold text-[var(--primary-color)] tracking-tight leading-none uppercase truncate">{config?.hotelName || 'SYSTEM DASHBOARD'}</h2>
              <span className="text-[0.5rem] lg:text-[0.6rem] font-bold text-[var(--text-light)] uppercase tracking-widest mt-1 block truncate">Property Management Suite</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
             {pathname !== '/ledger' && (
               <div className="hidden md:flex search-box relative group">
                  <input 
                    type="text" 
                    placeholder="Search accounts..." 
                    className="pl-9 pr-4 py-1.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-[var(--radius-md)] text-[0.8rem] font-semibold text-[var(--text-muted)] w-[180px] lg:w-[280px] outline-none focus:bg-white focus:border-[var(--accent-color)] transition-all"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-light)] group-focus-within:text-[var(--primary-color)]" />
               </div>
             )}
             
             <div className="flex items-center gap-2 lg:gap-3">
               <div className="hidden sm:flex items-center gap-2 px-2 lg:px-3 py-1 lg:py-1.5 bg-[var(--primary-light)] border border-[var(--border-color)] rounded-[var(--radius-md)]">
                  <div className="w-1.5 h-1.5 rounded-[var(--radius-md)] bg-[var(--primary-color)] animate-pulse" />
                  <span className="text-[0.6rem] lg:text-[0.7rem] font-bold text-[var(--primary-color)] whitespace-nowrap truncate">{businessDate}</span>
               </div>
               
               <div className="flex items-center gap-2 border-l border-[var(--border-color)] pl-2 lg:pl-4 relative">
                  <div className="relative">
                    <button 
                      onClick={() => setShowNotifs(!showNotifs)}
                      className={`w-8 h-8 lg:w-9 lg:h-9 rounded-[var(--radius-md)] bg-white border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] transition-all ${unreadCount > 0 ? 'text-[var(--primary-color)]' : ''}`}
                    >
                       <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
                       {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white flex items-center justify-center text-[0.5rem] font-black rounded-[var(--radius-md)] border-2 border-white animate-bounce">
                             {unreadCount}
                          </span>
                       )}
                    </button>

                    {/* Industrial Notification Feed */}
                    {showNotifs && (
                       <div className="absolute right-0 mt-3 w-[320px] bg-white border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-2xl z-[100] animate-fadeIn">
                          <div className="p-4 border-b border-[var(--bg-color)] flex items-center justify-between">
                             <h4 className="text-[0.65rem] font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Property Event Log</h4>
                             <span className="text-[0.45rem] font-bold text-[var(--text-light)] uppercase">Live Stream</span>
                          </div>
                          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                             {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-300  text-[0.6rem] font-bold uppercase tracking-widest">No Recent Operational Activity</div>
                             ) : (
                                notifications.map(n => (
                                   <div 
                                      key={n.id} 
                                      onClick={async () => {
                                         await markNotificationAsRead(n.id);
                                         setNotifications(notifications.map(x => x.id === n.id ? { ...x, read: true } : x));
                                      }}
                                      className={`p-4 border-b border-[var(--bg-color)] hover:bg-[var(--bg-color)] transition-all cursor-pointer relative group ${!n.read ? 'bg-blue-50/30' : ''}`}
                                   >
                                      {!n.read && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-[var(--radius-md)]" />}
                                      <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1">
                                             <div className="flex items-center gap-2 mb-1">
                                                <div className={`text-[0.45rem] font-black px-1.5 py-0.5 rounded uppercase ${n.type === 'ALARM' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{n.type}</div>
                                                <span className="text-[0.45rem] font-bold text-[var(--text-light)]">{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}</span>
                                             </div>
                                             <p className="text-[0.65rem] font-black text-[var(--text-main)] leading-relaxed uppercase tracking-tight">{n.message}</p>
                                          </div>
                                          {n.read && <Check className="w-3.5 h-3.5 text-emerald-500 opacity-20 group-hover:opacity-100" />}
                                      </div>
                                   </div>
                                ))
                             )}
                          </div>
                          <div className="p-3 bg-[var(--bg-color)] text-center">
                             <button className="text-[0.55rem] font-black text-[var(--primary-color)] uppercase tracking-widest hover:underline">Archive Context View</button>
                          </div>
                       </div>
                    )}
                  </div>
                   <div className="flex items-center gap-2 group/identity">
                      <div className="hidden lg:flex flex-col items-end opacity-0 group-hover/identity:opacity-100 transition-opacity duration-300">
                         <div className="flex gap-1.5 mb-1">
                            {user?.roles?.map(r => (
                               <span key={r} className="text-[0.4rem] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase tracking-widest">{r}</span>
                            ))}
                         </div>
                         <span className="text-[0.6rem] font-black text-slate-800 uppercase tracking-tight">{user?.fullName || user?.username || 'GUEST_ADMIN'}</span>
                      </div>
                      <Link 
                         href="/setup" 
                         className="w-10 h-10 lg:w-11 lg:h-11 rounded-[var(--radius-md)] bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-black text-[0.55rem] lg:text-[0.65rem] shadow-2xl uppercase shrink-0 hover:bg-black hover:scale-105 transition-all cursor-pointer relative overflow-hidden group/admin"
                      >
                         <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/admin:opacity-100 transition-opacity" />
                         {user?.username ? user.username.substring(0,2) : 'AD'}
                      </Link>
                      
                      <button 
                         onClick={() => setIsLogoutConfirmOpen(true)}
                         className="p-2.5 rounded-[var(--radius-md)] bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all group/logout shadow-sm"
                         title="Terminate Authority Session"
                      >
                         <ShieldCheck className="w-4 h-4 lg:w-5 lg:h-5 group-hover/logout:animate-pulse" />
                      </button>
                   </div>
               </div>
             </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin bg-[var(--bg-color)] print:h-auto print:overflow-visible">
          {children}
        </div>

        <ProfessionalConfirm
          isOpen={isLogoutConfirmOpen}
          onClose={() => setIsLogoutConfirmOpen(false)}
          onConfirm={async () => {
             await logout();
             window.location.href = '/login';
          }}
          title="Authority Termination"
          message="Are you sure you want to terminate your current administrative session? All uncommitted protocol changes will be discarded."
          variant="danger"
          confirmText="EXECUTE_LOGOUT"
        />
      </main>
    </div>
  );
}
