'use client';

import { getConfig, resetSystemData } from "@/actions/hotel";
import { getCurrentUser } from "@/actions/auth";
import { formatDate } from "@/lib/utils";
import { Database, RefreshCw, AlertTriangle, ShieldCheck, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { SuccessModal } from "@/components/SuccessModal";
import PageBanner from "@/components/PageBanner";
import { ProfessionalConfirm } from "@/components/ProfessionalConfirm";
import { ProfessionalAlert } from "@/components/ProfessionalAlert";

export default function AdminPanel() {
  const [config, setConfig] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  
  // Professional UI State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertData, setAlertData] = useState({ title: '', message: '', variant: 'info' as any });
  const [pendingAction, setPendingAction] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const [c, u] = await Promise.all([getConfig(), getCurrentUser()]);
      setConfig(c);
      setCurrentUser(u);
    }
    load();
  }, []);



  const handleReset = () => {
    setPendingAction('RESET');
    setConfirmOpen(true);
  };

  const executeReset = async () => {
    setConfirmOpen(false);
    setLoading(true);
    const res = await resetSystemData();
    if (res.success) {
      setIsSuccessModalOpen(true);
      const c = await getConfig();
      setConfig(c);
    } else {
      setAlertData({ title: 'Purge Failed', message: res.error || "Master data purge protocol was blocked by the system.", variant: 'error' });
      setAlertOpen(true);
    }
    setLoading(false);
    setPendingAction(null);
  };

  const isRoot = currentUser?.permissions?.includes('admin.root');
  const canAudit = currentUser?.permissions?.includes('admin.audit') || isRoot;
  
  if (currentUser && !canAudit) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-8 text-center">
        <Lock className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 uppercase italic">Authority Rejected</h2>
        <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mt-2">You do not have administrative clearance to access the System Control suite.</p>
      </div>
    );
  }
  
  return (
    <div className="p-8 max-w-[1450px] mx-auto min-h-screen bg-[var(--bg-color)] animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
         <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="p-1.5 bg-indigo-100 rounded-md text-indigo-600">
                  <Lock className="w-4 h-4" />
               </div>
               <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">{isRoot ? "System Master Control" : "Audit & Day-End Control"}</h1>
            </div>
            <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">{isRoot ? "Administrative Command Level 4" : "Financial Audit Authority"}</p>
         </div>
         <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 font-black text-[0.55rem] rounded-[var(--radius-sm)] uppercase tracking-widest flex items-center gap-2 shadow-sm">
               <RefreshCw className="w-3.5 h-3.5 text-rose-500 animate-spin" /> Authorized Override Enabled
            </div>
         </div>
      </div>

      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Action Successful"
        subtitle="The administrative action has been completed successfully."
        secondaryLabel="Return to Panel"
      />

      <div className="grid grid-cols-12 gap-6">

        {/* SYSTEM INTEGRITY SECTION - ONLY FOR ROOT */}
        {isRoot && (
          <div className="col-span-12 grid grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-[var(--radius-md)] border border-[var(--border-color)] shadow-sm flex flex-col items-center text-center group hover:bg-[var(--bg-color)] transition-all">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><Database className="w-6 h-6" /></div>
                <h4 className="text-xs font-black text-[var(--text-main)] leading-none mb-2 uppercase ">Inventory Synchronization</h4>
                <p className="text-[0.6rem] font-black text-[var(--text-light)] uppercase tracking-widest mb-6 leading-relaxed opacity-90">REPARATIVE CONSOLIDATION OF UNIT STATES & LEDGER BALANCES</p>
                <button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // Force a hard reload so the app re-fetches and recalculates all live balances
                      window.location.reload();
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full py-2 bg-white text-[var(--text-light)] border border-[var(--border-color)] rounded font-black text-[0.55rem] hover:bg-[var(--primary-color)] hover:text-white transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-sm active:translate-y-0.5 disabled:opacity-50"
                >
                   <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Re-Index Operational Assets
                </button>
             </div>
             
             <div className="bg-white p-6 rounded-[var(--radius-md)] border border-red-50 shadow-sm flex flex-col items-center text-center group hover:bg-red-50 transition-all border-l-4 border-l-red-500">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded flex items-center justify-center mb-4 border border-red-100"><AlertTriangle className="w-6 h-6" /></div>
                <h4 className="text-xs font-black text-red-900 leading-none mb-2 uppercase ">Recursive Data Purge</h4>
                <p className="text-[0.6rem] font-black text-red-700/60 uppercase tracking-widest mb-6 leading-relaxed">IRREVERSIBLE INITIALIZATION OF MASTER FINANCIAL DATABASE</p>
                <button 
                  onClick={handleReset}
                  className="w-full py-2 bg-red-600 text-white rounded font-black text-[0.55rem] shadow-md hover:bg-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:translate-y-0.5 ring-1 ring-white/10"
                >
                   <ShieldCheck className="w-3.5 h-3.5" /> EXEC_WIPE_MASTER_TRANSACTIONS
                </button>
             </div>
          </div>
        )}


      </div>

      <ProfessionalConfirm
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeReset}
        title="CRITICAL_SYSTEM_RESET"
        message="This will permanently expunge all transaction registries, ledger entries, and audit logs. This action is irreversible and will zero all account balances. PROCEED?"
        variant="danger"
        confirmText="EXECUTE_MASTER_PURGE"
      />

      <ProfessionalAlert
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertData.title}
        message={alertData.message}
        variant={alertData.variant}
      />
    </div>
  );
}




