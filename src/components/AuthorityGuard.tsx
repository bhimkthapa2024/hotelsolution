'use client';

import { Lock } from 'lucide-react';
import { seedAuthSystem } from '@/actions/auth';
import { useState } from 'react';
import { ProfessionalConfirm } from './ProfessionalConfirm';

interface AuthorityGuardProps {
   user: any;
   requiredPermission: string;
   children: React.ReactNode;
}

export default function AuthorityGuard({ user, requiredPermission, children }: AuthorityGuardProps) {
   const [confirmOpen, setConfirmOpen] = useState(false);
   const [confirmData, setConfirmData] = useState({ title: '', message: '', onConfirm: () => {} });

   if (!user) return null; // Still loading

   const hasPerm = user.permissions?.includes(requiredPermission) || user.permissions?.includes('admin.root');

   if (hasPerm) {
      return <>{children}</>;
   }

   return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden w-full h-full">
         <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
         <div className="bg-white/5 p-12 rounded-[var(--radius-lg)] border border-white/10 text-center max-w-md backdrop-blur-3xl shadow-2xl relative z-10">
            <div className="inline-flex p-4 bg-rose-600 rounded-[var(--radius-md)] mb-6 shadow-2xl shadow-rose-600/20">
               <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-tighter mb-4 italic">Authority Rejected</h2>
            <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
               IDENTITY_UID_NOT_AUTHORIZED: You do not have the required administrative clearance [{requiredPermission}] to access this module.
            </p>
            
            <div className="flex flex-col gap-3">
               <button 
                  onClick={() => window.location.href = '/'} 
                  className="px-10 py-4 bg-white text-black font-bold text-[0.65rem] uppercase tracking-widest rounded-[var(--radius-md)] hover:bg-slate-200 transition-all w-full"
               >
                  Relocate to Dashboard
               </button>
               
               <div className="pt-6 border-t border-white/5">
                  <p className="text-[0.45rem] font-bold text-slate-500 uppercase tracking-widest mb-4">Are you a System Administrator? Perform a protocol re-sync.</p>
                  <button 
                     onClick={async () => {
                        setConfirmData({
                           title: 'Authority Re-Sync',
                           message: 'INITIATE AUTHORITY PROTOCOL RE-SYNC? This will restore default administrative roles and reset local permission matrices.',
                           onConfirm: async () => {
                              await seedAuthSystem();
                              window.location.reload();
                           }
                        });
                        setConfirmOpen(true);
                     }}
                     className="px-6 py-3 bg-slate-900 text-indigo-400 border border-indigo-900/30 font-bold text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-md)] hover:bg-indigo-950 transition-all w-full"
                  >
                     Execute Security Re-Sync
                  </button>
               </div>
            </div>
         </div>
         <ProfessionalConfirm
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={confirmData.onConfirm}
            title={confirmData.title}
            message={confirmData.message}
            confirmText="CONFIRM"
         />
      </div>
   );
}
