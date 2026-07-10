'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, UserPlus, ShieldCheck, History as HistoryIcon, ArrowRight, Lock, Trash2, Database, Layers, Check, Search, Filter, ShieldAlert } from 'lucide-react';
import { assignRoleToUser, removeRoleFromUser, assignPermissionToRole, removePermissionFromRole, seedAuthSystem } from '@/actions/auth';

interface UsersTabProps {
  users: any[];
  roles: any[];
  permissions: any[];
  activeRoleMatrix: string;
  setActiveRoleMatrix: (role: string) => void;
  onRefresh: () => void;
  onAddUser: () => void;
  onAddRole: () => void;
}

export default function UsersTab({ 
  users, 
  roles, 
  permissions, 
  activeRoleMatrix, 
  setActiveRoleMatrix, 
  onRefresh, 
  onAddUser, 
  onAddRole 
}: UsersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = (u.fullName || u.username).toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'ALL' || u.roles?.some((ur: any) => (ur.id || ur) === filterRole);
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    permissions.forEach(p => {
      const module = (p.code || 'system').split('.')[0].toUpperCase();
      if (!groups[module]) groups[module] = [];
      groups[module].push(p);
    });
    return groups;
  }, [permissions]);

  const handleToggleRole = async (userId: string, role: string, hasRole: boolean) => {
    if (hasRole) await removeRoleFromUser(userId, role);
    else await assignRoleToUser(userId, role);
    onRefresh();
  };

  const handleTogglePermission = async (roleId: string, permissionCode: string, hasPerm: boolean) => {
    if (hasPerm) await removePermissionFromRole(roleId, permissionCode);
    else await assignPermissionToRole(roleId, permissionCode);
    onRefresh();
  };

  const handleSeed = async () => {
    if (confirm("Reset and seed default authority protocols? This will overwrite existing system permissions.")) {
        await seedAuthSystem();
        onRefresh();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* IDENTITY ROSTER */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">
           <div className="px-8 py-6 bg-white border-b border-slate-100">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-[var(--radius-md)] text-white shadow-lg shadow-indigo-100"><User className="w-5 h-5" /></div>
                    <div>
                       <h3 className="text-[0.6rem] font-black text-slate-900 uppercase tracking-tighter italic">Institutional Identity Roster</h3>
                       <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5 italic underline decoration-indigo-600/30 decoration-2 underline-offset-4">Identity Provisioning & Governance</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button 
                       onClick={handleSeed}
                       className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                       title="Seed Default Permissions"
                    >
                       <Database className="w-4.5 h-4.5" />
                    </button>
                    <button 
                       onClick={onAddUser}
                       className="px-6 py-3 bg-white text-white font-bold text-[0.6rem] uppercase tracking-widest rounded-[var(--radius-md)] hover:bg-indigo-600 transition-all flex items-center gap-3 shadow-xl shadow-slate-200 group"
                    >
                       <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Authorize New Identity
                    </button>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                       type="text" 
                       placeholder="Search identities by name or digital identifier..."
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] focus:bg-white focus:border-indigo-600 transition-all uppercase tracking-tight"
                    />
                 </div>
                 <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-[var(--radius-md)] border border-slate-100">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select 
                       value={filterRole} 
                       onChange={(e) => setFilterRole(e.target.value)}
                       className="bg-transparent outline-none font-bold text-[0.55rem] uppercase tracking-widest text-slate-600"
                    >
                       <option value="ALL">ALL AUTHORITIES</option>
                       {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                 </div>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
              <table className="w-full text-left border-collapse classic-table">
                 <thead className="sticky top-0 bg-white z-10">
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                       <th className="px-8 py-4 text-[0.55rem] font-black uppercase text-slate-400 tracking-widest">Digital Identifier / Alias</th>
                       <th className="px-8 py-4 text-[0.55rem] font-black uppercase text-slate-400 tracking-widest">Authority Clearance</th>
                       <th className="px-8 py-4 text-[0.55rem] font-black uppercase text-slate-400 tracking-widest text-right">Tracing</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                       {filteredUsers.map((u, idx) => (
                          <motion.tr 
                             key={u.id}
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: idx * 0.02 }}
                             className="group hover:bg-indigo-50/30 transition-all"
                          >
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-[var(--radius-md)] bg-white border border-slate-800 flex flex-col items-center justify-center text-white shadow-xl group-hover:bg-indigo-600 transition-colors">
                                      <span className="font-black text-[0.6rem] uppercase tracking-tighter leading-none">{u.username.substring(0,2)}</span>
                                      <div className="w-3 h-0.5 bg-indigo-500 mt-1 rounded-full" />
                                   </div>
                                   <div>
                                      <div className="text-xs font-black text-slate-900 uppercase tracking-tighter italic">{u.fullName || u.username}</div>
                                      <div className="flex items-center gap-1.5 mt-1">
                                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                         <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest">{u.email || 'NO_COMMS_VECTOR'}</span>
                                      </div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex flex-wrap gap-1.5">
                                   {roles.map(r => {
                                      const hasRole = u.roles?.some((ur: any) => (ur.id || ur) === r.id);
                                      return (
                                         <button 
                                            key={r.id}
                                            onClick={() => handleToggleRole(u.id, r.id, hasRole)}
                                            className={`px-3 py-1.5 rounded-full text-[0.55rem] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                                               hasRole 
                                               ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                                               : 'bg-white text-slate-300 border-slate-100 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50'
                                            }`}
                                         >
                                            {hasRole ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3 opacity-30" />}
                                            {r.name}
                                         </button>
                                      );
                                   })}
                                </div>
                             </td>
                             <td className="px-8 py-5 text-right">
                                <div className="flex flex-col items-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                   <div className="flex items-center gap-2 text-slate-400">
                                      <HistoryIcon className="w-3.5 h-3.5" />
                                      <span className="text-[0.55rem] font-black uppercase tracking-widest">Trace: {u.id.substring(0,8)}</span>
                                   </div>
                                   <div className="text-[0.55rem] font-bold text-slate-300 uppercase italic">IDENTITY_VERIFIED_SECURE</div>
                                </div>
                             </td>
                          </motion.tr>
                       ))}
                    </AnimatePresence>
                    {filteredUsers.length === 0 && (
                       <tr>
                          <td colSpan={3} className="py-20 text-center">
                             <div className="flex flex-col items-center opacity-20">
                                <Search className="w-12 h-12 mb-4" />
                                <p className="text-[0.6rem] font-black uppercase tracking-widest">No Identities Matching Parameters</p>
                             </div>
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* AUTHORITY MATRIX */}
      <div className="lg:col-span-5 space-y-6">
         <div className="bg-white rounded-[var(--radius-lg)] border border-slate-200 p-8 text-slate-900 shadow-sm relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full blur-[80px] -translate-y-20 translate-x-20" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
               <div className="flex items-center gap-4">
                  <div className="bg-white p-2.5 rounded-[var(--radius-md)] shadow-xl shadow-slate-200">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-[0.6rem] font-black uppercase tracking-tighter italic text-slate-900 leading-none">Security Matrix</h3>
                    <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Clearance Protocol Configurator</p>
                  </div>
               </div>
               <button onClick={onAddRole} className="p-2.5 bg-slate-50 hover:bg-white hover:text-white border border-slate-200 rounded-full transition-all text-slate-400"><UserPlus className="w-4 h-4" /></button>
            </div>

            <div className="relative z-10 mb-6">
               <div className="flex items-center justify-between mb-4">
                  <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest italic">Authority Tiers</p>
                  <span className="text-[0.55rem] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{roles.length} Tiers Active</span>
               </div>
               <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {roles.map(r => (
                     <button 
                        key={r.id} 
                        onClick={() => setActiveRoleMatrix(activeRoleMatrix === r.id ? '' : r.id)}
                        className={`p-4 rounded-[var(--radius-md)] border text-left flex items-center justify-between transition-all group relative overflow-hidden ${
                           activeRoleMatrix === r.id 
                           ? 'bg-white border-slate-900 shadow-2xl text-white' 
                           : 'bg-slate-50 border-slate-100 hover:border-indigo-200 text-slate-700'
                        }`}
                     >
                        {activeRoleMatrix === r.id && <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/10 rounded-full blur-2xl -translate-y-12 translate-x-12" />}
                        <div className="relative z-10">
                           <div className={`text-[0.6rem] font-black uppercase tracking-tighter mb-0.5 ${activeRoleMatrix === r.id ? 'text-white' : 'text-slate-900'}`}>{r.name}</div>
                           <div className={`text-[0.55rem] font-bold uppercase italic ${activeRoleMatrix === r.id ? 'text-indigo-300' : 'text-slate-400'}`}>{r.description || 'Global Operations Clearance'}</div>
                        </div>
                        <div className={`p-1.5 rounded-full transition-all ${activeRoleMatrix === r.id ? 'bg-indigo-600 rotate-90 text-white' : 'bg-white border border-slate-200 text-slate-300'}`}><ArrowRight className="w-3.5 h-3.5" /></div>
                     </button>
                  ))}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
               <AnimatePresence mode="wait">
                  {activeRoleMatrix ? (
                     <motion.div 
                        key={activeRoleMatrix}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                     >
                        {Object.entries(groupedPermissions).map(([module, perms]) => (
                           <div key={module} className="space-y-4">
                              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                 <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                 <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-900 italic">{module} PROTOCOLS</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                 {perms.map(p => {
                                    const role = roles.find(r => r.id === activeRoleMatrix);
                                    const hasPerm = role?.permissions?.includes(p.code);
                                    return (
                                       <button 
                                          key={p.id}
                                          onClick={() => handleTogglePermission(activeRoleMatrix, p.code, hasPerm)}
                                          className={`p-4 rounded-[var(--radius-md)] flex items-center justify-between border transition-all text-left group/perm ${
                                             hasPerm 
                                             ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 shadow-sm' 
                                             : 'bg-white border-slate-50 text-slate-400 hover:border-slate-200'
                                          }`}
                                       >
                                          <div className="flex flex-col pr-4">
                                             <span className={`text-[0.6rem] font-black uppercase tracking-tight ${hasPerm ? 'text-indigo-950' : 'text-slate-600'}`}>{p.name || p.code}</span>
                                             <span className="text-[0.55rem] font-bold opacity-60 uppercase tracking-widest mt-1 leading-tight">{p.description}</span>
                                          </div>
                                          <div className={`w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center transition-all flex-shrink-0 ${
                                             hasPerm ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-transparent'
                                          }`}>
                                             <Check className="w-4 h-4" />
                                          </div>
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>
                        ))}
                     </motion.div>
                  ) : (
                     <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-[var(--radius-lg)] border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border border-slate-100 animate-float">
                           <Lock className="w-8 h-8 text-slate-200" />
                        </div>
                        <h4 className="text-[0.6rem] font-black uppercase tracking-widest text-slate-900 mb-2 italic">Authority Matrix Locked</h4>
                        <p className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400 max-w-[200px] leading-relaxed">Please select an administrative tier above to decode and configure the security matrix.</p>
                     </div>
                  )}
               </AnimatePresence>
            </div>
         </div>
      </div>
    </div>
  );
}
