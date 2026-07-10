'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { 
  getConfig, 
  updateConfig, 
  upsertAccount,
  deleteAccount,
  getSetupRegistry,
  upsertDebtor,
  deleteDebtor,
  upsertSupplier,
  deleteSupplier,
  upsertRoom,
  deleteRoom,
  getEmployees,
  upsertEmployee,
  deleteEmployee
} from "@/actions/hotel";
import { 
  upsertUser, 
  seedAuthSystem,
  upsertRole
} from "@/actions/auth";
import { 
  BedDouble, 
  Plus, 
  Building2, 
  Settings, 
  Layers, 
  CreditCard,
  User,
  Palette,

  Briefcase,
  Lock,
  ArrowLeft,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import PageBanner from '@/components/PageBanner';
import { ProfessionalPrompt } from '@/components/ProfessionalPrompt';
import { ProfessionalAlert } from '@/components/ProfessionalAlert';
import { ProfessionalConfirm } from '@/components/ProfessionalConfirm';
import LedgerDrilldown from '@/components/LedgerDrilldown';
import AuthorityGuard from '@/components/AuthorityGuard';

// Dynamic Imports with Loading Skeletons for Instant Feedback
const IdentityTab = dynamic(() => import("./components/IdentityTab"), { 
  ssr: false, 
  loading: () => <TabSkeleton /> 
});
const InventoryTab = dynamic(() => import("./components/InventoryTab"), { 
  ssr: false, 
  loading: () => <TabSkeleton /> 
});
const LedgerRegistry = dynamic(() => import("./components/LedgerRegistry"), { 
  ssr: false, 
  loading: () => <TabSkeleton /> 
});
const SettlementTab = dynamic(() => import("./components/SettlementTab"), { 
  ssr: false, 
  loading: () => <TabSkeleton /> 
});
const DebtorsTab = dynamic(() => import("./components/DebtorsTab"), { 
  ssr: false, 
  loading: () => <TabSkeleton /> 
});
const SuppliersTab = dynamic(() => import("./components/SuppliersTab"), { 
  ssr: false, 
  loading: () => <TabSkeleton /> 
});
const UsersTab = dynamic(() => import("./components/UsersTab"), { 
  ssr: false, 
  loading: () => <TabSkeleton /> 
});
const AppearanceTab = dynamic(() => import("./components/AppearanceTab"), { 
  ssr: false, 
  loading: () => <TabSkeleton /> 
});
const EmployeesTab = dynamic(() => import("./components/EmployeesTab"), { 
  ssr: false, 
  loading: () => <TabSkeleton /> 
});

function TabSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="h-40 bg-slate-100 rounded-[var(--radius-lg)]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-64 bg-slate-50 rounded-[var(--radius-lg)]" />
        <div className="h-64 bg-slate-50 rounded-[var(--radius-lg)]" />
        <div className="h-64 bg-slate-50 rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}

type Tab = 'IDENTITY' | 'INVENTORY' | 'LEDGERS' | 'SETTLEMENT' | 'DEBTORS' | 'SUPPLIERS' | 'APPEARANCE' | 'USERS' | 'EMPLOYEES';

export default function Setup() {
  const [activeTab, setActiveTab] = useState<Tab>('APPEARANCE');
  const [activeRoleMatrix, setActiveRoleMatrix] = useState<string>('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<any>(null);
  
  // Modal states
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newAcc, setNewAcc] = useState<any>({ name: '', code: '', type: 'REVENUE', category: 'GENERAL OPERATIONS', normal: 'Credit', parentId: '' });
  const [newDebtor, setNewDebtor] = useState<any>({ name: '', type: 'CORPORATE', phone: '', email: '', address: '', pan: '', creditLimit: 0, creditDays: 30, accountId: '', contactPerson: '', openingBalance: 0, notes: '' });
  const [newSupplier, setNewSupplier] = useState<any>({ name: '', type: 'VENDOR', phone: '', email: '', address: '', pan: '', creditLimit: 0, creditDays: 30, accountId: '', contactPerson: '', openingBalance: 0, notes: '', isActive: true });
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', email: '', roles: [] as string[] });
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showBulkRoom, setShowBulkRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: '', type: 'STANDARD', floor: '1', status: 'Ready' });
  const [bulkRoom, setBulkRoom] = useState({ start: 101, end: 110, type: 'STANDARD', floor: '1' });
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState<any>({ name: '', phone: '', email: '', commissionRate: 10, isActive: true });
  
  const [promptData, setPromptData] = useState<any>({ isOpen: false, title: '', subtitle: '', onConfirm: () => {} });
  
  // Professional Dialogs
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertData, setAlertData] = useState({ title: '', message: '', variant: 'info' as any });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: '', message: '', onConfirm: () => {} });

  const loadData = useCallback(async () => {
    const data = await getSetupRegistry();
    setRooms(data.rooms);
    setConfig(data.config || { hotelName: '', address: '', phone: '', email: '', businessDate: new Date().toISOString().split('T')[0], paymentModes: [], display: {}, stayPlans: [] });
    setAccounts(data.accounts);
    setCategories(data.categories);
    setUsers(data.users);
    setRoles(data.roles);
    setPermissions(data.permissions);
    setCurrentUser(data.currentUser);
    setDebtors(data.debtors);
    setSuppliers(data.suppliers);
    const emps = await getEmployees();
    setEmployees(emps);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showMsg = (txt: string) => {
    setMsg(txt);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleUpdateConfig = async (e?: any) => {
    if (e) e.preventDefault();
    setSaving(true);
    await updateConfig(config);
    setSaving(false);
    showMsg("Setup Registry Archived Successfully.");
  };

  const handleSaveAccount = async () => {
    if (!newAcc.name || !newAcc.code) return;
    const savePayload = { ...newAcc, parentId: newAcc.parentId || null };
    await upsertAccount(savePayload);
    setShowAddAccount(false);
    setNewAcc({ name: '', code: '', type: 'REVENUE', category: 'GENERAL OPERATIONS', normal: 'Credit', parentId: '' });
    loadData();
  };

  const generateAccountCode = (type: string, parentId?: string | null) => {
     try {
         if (parentId) {
            const parent = accounts.find(a => a.id === parentId);
            if (!parent) return '';
            const subs = accounts.filter(a => a.parentId === parentId);
            if (subs.length === 0) return `${parent.code || '00'}-01`;
            const suffixes = subs.map(a => parseInt((a.code || '').split('-').pop() || '0', 10)).filter(n => !isNaN(n));
            const max = suffixes.length > 0 ? Math.max(...suffixes) : 0;
            return `${parent.code || '00'}-${(max + 1).toString().padStart(2, '0')}`;
         } else {
            const typeBase = type === 'ASSET' ? 1000 : type === 'LIABILITY' ? 2000 : type === 'EQUITY' ? 3000 : type === 'REVENUE' ? 4000 : 5000;
            const parents = accounts.filter(a => a.type === type && !a.parentId);
            if (parents.length === 0) return typeBase.toString();
            const codes = parents.map(a => parseInt(a.code || '', 10)).filter(n => !isNaN(n));
            const max = codes.length > 0 ? Math.max(...codes) : typeBase;
            return (Math.max(max, typeBase) + 10).toString();
         }
     } catch (e) {
         console.error("Error generating code:", e);
         return "AUTO-CODE";
     }
  };

  const handleSaveUser = async () => {
    if (!newUser.username || !newUser.password) {
      setAlertData({
        title: 'Identity Required',
        message: 'CRITICAL: IDENTITY_CREDENTIALS_REQUIRED. You must provide a unique identifier and security key.',
        variant: 'error'
      });
      setAlertOpen(true);
      return;
    }
    await upsertUser({ ...newUser });
    setShowAddUser(false);
    setNewUser({ username: '', password: '', fullName: '', email: '', roles: [] });
    loadData();
    showMsg("Account Added Successfully.");
  };

  const handleSaveRole = async () => {
    if (!newRole.name) return;
    await upsertRole({ ...newRole, id: `ROLE-${newRole.name.toUpperCase().replace(/\s+/g, '_')}` });
    setShowAddRole(false);
    setNewRole({ name: '', description: '' });
    loadData();
    showMsg("User Added Successfully.");
  };

  const handleSaveDebtor = async () => {
    if (!newDebtor.name) return;
    await upsertDebtor(newDebtor);
    setShowAddDebtor(false);
    setNewDebtor({ name: '', type: 'CORPORATE', phone: '', email: '', address: '', pan: '', creditLimit: 0, creditDays: 30, accountId: '', contactPerson: '', openingBalance: 0, notes: '' });
    loadData();
    showMsg("Debtor Profile Established.");
  };

  const handleSaveSupplier = async () => {
    if (!newSupplier.name) return;
    await upsertSupplier(newSupplier);
    setShowAddSupplier(false);
    setNewSupplier({ name: '', type: 'VENDOR', phone: '', email: '', address: '', pan: '', creditLimit: 0, creditDays: 30, accountId: '', contactPerson: '', openingBalance: 0, notes: '', isActive: true });
    loadData();
    showMsg("Supplier Profile Established.");
  };

  const handleSaveRoom = async () => {
    if (!newRoom.number) return;
    await upsertRoom(newRoom);
    setShowAddRoom(false);
    setNewRoom({ number: '', type: 'STANDARD', floor: '1', status: 'Ready' });
    loadData();
    showMsg("Item Added Successfully.");
  };

  const handleBulkRoom = async () => {
    setSaving(true);
    const start = bulkRoom.start;
    const end = bulkRoom.end;
    if (start > end) return;
    
    for (let i = start; i <= end; i++) {
       await upsertRoom({
          number: i.toString(),
          type: bulkRoom.type,
          floor: bulkRoom.floor,
          status: 'Ready'
       });
    }
    
    setShowBulkRoom(false);
    setSaving(false);
    loadData();
    showMsg(`Bulk Import of ${end - start + 1} Items Complete.`);
  };

  if (loading || !config) return (
    <div className="flex items-center justify-center h-screen bg-slate-50 gap-4">
       <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
       <div className="flex flex-col">
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-indigo-900 italic">Validating Administrative Authority...</span>
          <span className="text-[0.55rem] font-medium text-slate-400 uppercase tracking-widest mt-1">Booting Property Control Suite v4.8.2</span>
       </div>
    </div>
  );

  return (
    <AuthorityGuard user={currentUser} requiredPermission="setup.manage">
    <div className="p-8 max-w-[1550px] mx-auto min-h-screen bg-[var(--bg-color)] animate-fadeIn">
      {/* GLOBAL HEADER COMMAND */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
         <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="p-1.5 bg-indigo-100 rounded-md text-indigo-600">
                  <Settings className="w-4 h-4" />
               </div>
               <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Settings & Setup</h1>
            </div>
            <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Institutional Control Panel</p>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-black text-[0.55rem] rounded-[var(--radius-sm)] hover:bg-slate-50 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm group/refresh"
            >
               <ArrowLeft className="w-3.5 h-3.5 group-hover/refresh:-translate-x-1 transition-transform" /> Exit to Insight
            </button>
         </div>
      </div>
      
      <div className="flex bg-slate-100/50 border border-slate-200 p-2 rounded-[var(--radius-xl)] shadow-xl relative z-10 mt-8 lg:mt-0 flex-wrap justify-center gap-1.5 backdrop-blur-xl">
            {[
              { id: 'IDENTITY', label: 'Identity', icon: Building2 },
              { id: 'INVENTORY', label: 'Inventory', icon: BedDouble },
              { id: 'LEDGERS', label: 'Ledgers', icon: Layers },
              { id: 'SETTLEMENT', label: 'Settlement', icon: CreditCard },
              { id: 'DEBTORS', label: 'Debtors', icon: Briefcase },
              { id: 'SUPPLIERS', label: 'Suppliers', icon: Building2 },
              { id: 'EMPLOYEES', label: 'Employees', icon: User },
              { id: 'USERS', label: 'Users', icon: User, requiredPerm: 'users.manage' },
              { id: 'APPEARANCE', label: 'Appearance', icon: Palette }
            ].filter(t => !t.requiredPerm || currentUser?.permissions?.includes(t.requiredPerm) || currentUser?.permissions?.includes('admin.root')).map(t => (
               <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id as Tab)}
                  className={`flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-[var(--radius-lg)] text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-widest transition-all relative group/tab ${
                     activeTab === t.id 
                     ? 'bg-white text-slate-950 shadow-lg scale-[1.05]' 
                     : 'text-slate-500 hover:text-indigo-600 hover:bg-white/50'
                  }`}
               >
                  <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-indigo-600' : 'text-slate-400 group-hover/tab:text-indigo-600'}`} />
                  <span>{t.label}</span>
                  {activeTab === t.id && (
                     <motion.div layoutId="tab-aura" className="absolute inset-x-0 bottom-0 h-1 bg-indigo-600 pointer-events-none" />
                  )}
               </button>
            ))}
         </div>

      <div className="mt-8 relative min-h-[500px]">

        {showAddEmployee && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-white/80 backdrop-blur-md">
               <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[500px] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                     <div className="relative z-10">
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic">{newEmployee.id ? 'Modify Staff Profile' : 'Staff Onboarding'}</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1.5 italic">Configure High-Fidelity Performance Profile</p>
                     </div>
                     <button onClick={()=>setShowAddEmployee(false)} className="p-2.5 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all border border-slate-200 relative z-10"><Plus className="w-5 h-5 rotate-45" /></button>
                  </div>
                  <div className="p-8 space-y-5">
                     <div className="space-y-2">
                        <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Staff Legal Full Name</label>
                        <input type="text" value={newEmployee.name || ''} onChange={(e)=>setNewEmployee({...newEmployee, name: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs uppercase tracking-tight focus:border-indigo-600 transition-all" />
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Vector</label>
                           <input type="text" value={newEmployee.phone || ''} onChange={(e)=>setNewEmployee({...newEmployee, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs focus:border-indigo-600 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Default Comm. Rate (%)</label>
                           <input type="number" step="any" value={newEmployee.commissionRate ?? 10} onChange={(e)=>setNewEmployee({...newEmployee, commissionRate: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs focus:border-indigo-600 transition-all text-right" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Overtime Comm. Rate (%)</label>
                           <input type="number" step="any" value={newEmployee.overtimeCommRate ?? 20} onChange={(e)=>setNewEmployee({...newEmployee, overtimeCommRate: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs focus:border-indigo-600 transition-all text-right" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Vector</label>
                        <input type="email" value={newEmployee.email || ''} onChange={(e)=>setNewEmployee({...newEmployee, email: e.target.value.toLowerCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs focus:border-indigo-600 transition-all" />
                     </div>
                     
                     <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-[var(--radius-sm)] border border-slate-100">
                        <input 
                           type="checkbox" 
                           checked={newEmployee.isActive !== false} 
                           onChange={(e)=>setNewEmployee({...newEmployee, isActive: e.target.checked})}
                           className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                           id="employee-active-checkbox"
                        />
                        <label htmlFor="employee-active-checkbox" className="text-[0.55rem] font-black text-slate-600 uppercase tracking-widest cursor-pointer select-none">
                           Active Status Enabled
                        </label>
                     </div>

                     <button 
                        onClick={async () => {
                           if (!newEmployee.name) return;
                           await upsertEmployee(newEmployee);
                           setShowAddEmployee(false);
                           setNewEmployee({ name: '', phone: '', email: '', commissionRate: 10, overtimeCommRate: 20, isActive: true });
                           loadData();
                           showMsg("Staff Registry Updated Successfully.");
                        }} 
                        className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-xl mt-4"
                     >
                        Add Staff Profile
                     </button>
                  </div>
               </motion.div>
            </div>
         )}

        {/* Optimized Transition Container */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="w-full"
          >
            {activeTab === 'IDENTITY' && (
              <IdentityTab 
                  config={config} 
                  setConfig={setConfig} 
                  onUpdate={handleUpdateConfig}
                  onAddStayPlan={() => {
                    setPromptData({
                        isOpen: true,
                        title: "Lifecycle Strategy Protocol",
                        subtitle: "Define New Stay Plan / Meal Arrangement",
                        placeholder: "E.G. CP - BED & BREAKFAST",
                        icon: <Layers className="w-5 h-5" />,
                        onConfirm: (label: string) => {
                          const id = label.split(' ')[0].toUpperCase();
                          const newPlans = [...(config.stayPlans || []), { id, label: label.toUpperCase() }];
                          setConfig({...config, stayPlans: newPlans});
                        }
                    });
                  }}
              />
            )}

            {activeTab === 'INVENTORY' && (
              <InventoryTab 
                  rooms={rooms} 
                  onRefresh={loadData} 
                  onAddRoom={() => setShowAddRoom(true)}
                  onBulkAdd={() => setShowBulkRoom(true)}
                  onDelete={(id) => {
                    setConfirmData({
                      title: 'Asset Decommission',
                      message: 'Are you sure you want to decommission this room asset from the property registry? This action is irreversible.',
                      onConfirm: async () => {
                        await deleteRoom(id);
                        loadData();
                        showMsg("Asset Registry Decommissioned.");
                      }
                    });
                    setConfirmOpen(true);
                  }}
              />
            )}

             {activeTab === 'LEDGERS' && (
              <LedgerRegistry 
                  accounts={accounts}
                  onRefresh={loadData}
                  onEdit={(acc) => { setNewAcc(acc); setShowAddAccount(true); }}
                  onAddSub={(parentAcc) => {
                    setNewAcc({
                        name: '',
                        code: generateAccountCode(parentAcc.type, parentAcc.id),
                        type: parentAcc.type,
                        category: parentAcc.category,
                        normal: parentAcc.normal,
                        parentId: parentAcc.id
                    });
                    setShowAddAccount(true);
                  }}
                  onAddCustom={() => {
                    setNewAcc({ name: '', code: generateAccountCode('REVENUE'), type: 'REVENUE', category: 'GENERAL OPERATIONS', normal: 'Credit', parentId: '' });
                    setShowAddAccount(true);
                  }}
                  onDelete={(id) => {
                    setConfirmData({
                      title: 'Ledger Purge',
                      message: 'CRITICAL WARNING: This will permanently purge this account head and decouple any nested sub-accounts. This may cause archival discrepancies.',
                      onConfirm: async () => {
                        await deleteAccount(id);
                        loadData();
                        showMsg("Fiscal Node Purged.");
                      }
                    });
                    setConfirmOpen(true);
                  }}
                  onViewLedger={(acc) => {
                    setSelectedLedgerAccount(acc);
                  }}
              />
            )}

            {activeTab === 'SETTLEMENT' && (
              <SettlementTab 
                  config={config} 
                  accounts={accounts} 
                  setConfig={setConfig} 
                  onUpdate={handleUpdateConfig}
              />
            )}

            {activeTab === 'DEBTORS' && (
              <DebtorsTab 
                  debtors={debtors}
                  accounts={accounts}
                  onRefresh={loadData}
                  onEdit={(d) => { setNewDebtor(d); setShowAddDebtor(true); }}
                  onAdd={() => setShowAddDebtor(true)}
                  onDelete={(id) => {
                    setConfirmData({
                      title: 'Profile Purge',
                      message: 'Permanently purge this debtor entity profile? All historical ledger mappings will be decoupled.',
                      onConfirm: async () => {
                        await deleteDebtor(id);
                        loadData();
                        showMsg("Debtor Profile Purged.");
                      }
                    });
                    setConfirmOpen(true);
                  }}
              />
            )}

            {activeTab === 'SUPPLIERS' && (
              <SuppliersTab 
                  suppliers={suppliers}
                  onRefresh={loadData}
                  onEdit={(s) => { setNewSupplier(s); setShowAddSupplier(true); }}
                  onAdd={() => setShowAddSupplier(true)}
                  onDelete={(id) => {
                    setConfirmData({
                      title: 'Vendor Purge',
                      message: 'Permanently purge this supplier profile? Active procurement chains may be affected.',
                      onConfirm: async () => {
                        await deleteSupplier(id);
                        loadData();
                        showMsg("Supplier Profile Purged.");
                      }
                    });
                    setConfirmOpen(true);
                  }}
              />
            )}

            {activeTab === 'EMPLOYEES' && (
              <EmployeesTab 
                  employees={employees}
                  onRefresh={loadData}
                  onAdd={() => {
                     setNewEmployee({ name: '', phone: '', email: '', commissionRate: 10, isActive: true });
                     setShowAddEmployee(true);
                  }}
                  onEdit={(emp) => {
                     setNewEmployee(emp);
                     setShowAddEmployee(true);
                  }}
                  onDelete={(id) => {
                     setConfirmData({
                        title: 'Decommission Staff',
                        message: 'Are you sure you want to decommission this staff profile? Active commission registries will still preserve historical records.',
                        onConfirm: async () => {
                           await deleteEmployee(id);
                           loadData();
                           showMsg("Staff Profile Decommissioned.");
                        }
                     });
                     setConfirmOpen(true);
                  }}
              />
            )}

            {activeTab === 'USERS' && (
              <UsersTab 
                  users={users}
                  roles={roles}
                  permissions={permissions}
                  activeRoleMatrix={activeRoleMatrix}
                  setActiveRoleMatrix={setActiveRoleMatrix}
                  onRefresh={loadData}
                  onAddUser={() => setShowAddUser(true)}
                  onAddRole={() => setShowAddRole(true)}
              />
            )}

            {activeTab === 'APPEARANCE' && (
              <AppearanceTab 
                  config={config}
                  setConfig={setConfig}
                  onUpdate={handleUpdateConfig}
              />
            )}
          </motion.div>
           {showBulkRoom && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
               <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[500px] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                     <div className="relative z-10">
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic underline decoration-indigo-600/30 decoration-4 underline-offset-4">Bulk Item Import</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1.5 italic">Automated Range-Based Property Generation</p>
                     </div>
                     <button onClick={()=>setShowBulkRoom(false)} className="p-2.5 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all border border-slate-200 relative z-10"><Plus className="w-6 h-6 rotate-45" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Range Start #</label>
                           <input type="number" value={bulkRoom.start} onChange={(e)=>setBulkRoom({...bulkRoom, start: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-[1rem] focus:border-indigo-600 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Range End #</label>
                           <input type="number" value={bulkRoom.end} onChange={(e)=>setBulkRoom({...bulkRoom, end: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-[1rem] focus:border-indigo-600 transition-all" />
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Elevation (Floor)</label>
                           <input type="text" value={bulkRoom.floor} onChange={(e)=>setBulkRoom({...bulkRoom, floor: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Universal Type</label>
                           <select value={bulkRoom.type} onChange={(e)=>setBulkRoom({...bulkRoom, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                              {['STANDARD','DELUXE','SUPER DELUXE','SUITE','PENTHOUSE'].map(t=><option key={t} value={t}>{t}</option>)}
                           </select>
                        </div>
                     </div>
                     
                     <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-[var(--radius-md)] flex items-start gap-3">
                        <Activity className="w-4 h-4 text-indigo-600 mt-0.5" />
                        <p className="text-[0.55rem] font-medium text-indigo-900/60 leading-relaxed uppercase tracking-tight">
                           This operation will generate <span className="font-black text-indigo-700">{bulkRoom.end - bulkRoom.start + 1}</span> unit assets with sequential identification. Existing assets with identical IDs will be overwritten.
                        </p>
                     </div>

                     <button 
                        onClick={handleBulkRoom} 
                        disabled={saving}
                        className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3"
                     >
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Layers className="w-4 h-4 text-indigo-400" />}
                        Start Bulk Import
                     </button>
                  </div>
               </motion.div>
            </div>
          )}
       </AnimatePresence>
      </div>

      {/* GLOBAL MODALS */}
      <AnimatePresence>
         {showAddAccount && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
               <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[500px] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic">Fiscal Identity Node</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure Ledger Architecture Parameter</p>
                     </div>
                     <button onClick={()=>setShowAddAccount(false)} className="p-2 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all"><Plus className="w-5 h-5 rotate-45" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="space-y-2">
                        <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Account Descriptive Title</label>
                        <input type="text" value={newAcc.name} onChange={(e)=>setNewAcc({...newAcc, name: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs focus:border-indigo-600 transition-all uppercase tracking-tight" placeholder="E.G. ROOM REVENUE" />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block flex items-center justify-between">
                            System Code ID
                            <button 
                               type="button"
                               onClick={() => setNewAcc({...newAcc, code: generateAccountCode(newAcc.type, newAcc.parentId)})}
                               className="text-[0.55rem] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-600 hover:text-white transition-all font-bold uppercase tracking-widest"
                            >Suggest Pattern Code</button>
                         </label>
                           <input type="text" value={newAcc.code} onChange={(e)=>setNewAcc({...newAcc, code: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Classification Root</label>
                           <select value={newAcc.type} onChange={(e)=>setNewAcc({...newAcc, type: e.target.value, category: '', parentId: ''})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                              {['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].map(t=><option key={t} value={t}>{t}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Functional Category Class</label>
                        <select value={newAcc.category} onChange={(e)=>setNewAcc({...newAcc, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                           <option value="">-- SELECT CATEGORY --</option>
                           {categories.filter(c => c.type === newAcc.type).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Parent Identity Mapping (Head Account)</label>
                        <select 
                           value={newAcc.parentId || ''} 
                           onChange={(e)=>{
                              const parentId = e.target.value;
                              const parent = accounts.find(a => a.id === parentId);
                              if (parent) {
                                 setNewAcc({
                                    ...newAcc, 
                                    parentId, 
                                    type: parent.type, 
                                    category: parent.category
                                 });
                              } else {
                                 setNewAcc({...newAcc, parentId: ''});
                              }
                           }} 
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] uppercase tracking-widest"
                        >
                           <option value="">-- TOP-LEVEL (ROOT HEAD) --</option>
                           {accounts.filter(a => !a.parentId && a.id !== newAcc.id && a.type === newAcc.type).map(a => (
                              <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>
                           ))}
                        </select>
                     </div>
                      {newAcc.type === 'REVENUE' && (
                         <div className="space-y-2">
                            <label className="text-[0.6rem] font-bold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-600/30 pl-2 mb-1 block">Standard Sells Rate / Base Price (Rs.)</label>
                            <input 
                               type="number" 
                               value={newAcc.creditLimit || ''} 
                               onChange={(e)=>setNewAcc({...newAcc, creditLimit: parseFloat(e.target.value) || 0})} 
                               className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs focus:border-indigo-600 transition-all" 
                               placeholder="0.00" 
                            />
                         </div>
                      )}
                      <button onClick={handleSaveAccount} className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-indigo-100">Commit to Ledger Registry</button>
                  </div>
               </motion.div>
            </div>
         )}

         {showAddUser && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
               <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[500px] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic">Identity Provisioning</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorize New Operator Access</p>
                     </div>
                     <button onClick={()=>setShowAddUser(false)} className="p-2 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all"><Plus className="w-5 h-5 rotate-45" /></button>
                  </div>
                  <div className="p-8 space-y-5">
                      <div className="space-y-2">
                         <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Universal Identity ID (Username)</label>
                         <input type="text" value={newUser.username} onChange={(e)=>setNewUser({...newUser, username: e.target.value.toLowerCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs focus:border-indigo-600 transition-all lowercase" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Security Access Key (Password)</label>
                         <input type="password" value={newUser.password} onChange={(e)=>setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Legal Full Identity</label>
                         <input type="text" value={newUser.fullName} onChange={(e)=>setNewUser({...newUser, fullName: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-[0.6rem] uppercase tracking-tight" />
                      </div>
                      
                      <div className="space-y-3 pt-2">
                         <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Initial Authority Tiers</label>
                         <div className="grid grid-cols-2 gap-2">
                            {roles.map(r => (
                               <button 
                                  key={r.id}
                                  type="button"
                                  onClick={() => {
                                     const has = newUser.roles.includes(r.id);
                                     setNewUser({...newUser, roles: has ? newUser.roles.filter(id => id !== r.id) : [...newUser.roles, r.id]});
                                  }}
                                  className={`p-3 rounded-[var(--radius-sm)] border text-[0.55rem] font-bold uppercase tracking-widest transition-all ${
                                     newUser.roles.includes(r.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-indigo-200'
                                  }`}
                               >
                                  {r.name}
                               </button>
                            ))}
                         </div>
                      </div>

                      <button onClick={handleSaveUser} className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-xl mt-4">Save User</button>
                   </div>
               </motion.div>
            </div>
         )}

         {showAddRole && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
               <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[450px] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic">Authority Tier Definition</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Define New Administrative Rank</p>
                     </div>
                     <button onClick={()=>setShowAddRole(false)} className="p-2 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all"><Plus className="w-5 h-5 rotate-45" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="space-y-2">
                        <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Tier Designation Title</label>
                        <input type="text" value={newRole.name} onChange={(e)=>setNewRole({...newRole, name: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-bold text-xs uppercase tracking-widest" placeholder="E.G. SENIOR AUDITOR" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Tier Operational Description</label>
                        <textarea value={newRole.description} onChange={(e)=>setNewRole({...newRole, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] outline-none font-medium text-[0.6rem] h-24" placeholder="Briefly describe the scope of this role..." />
                     </div>
                     <button onClick={handleSaveRole} className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-xl">Establish Authority Tier</button>
                  </div>
               </motion.div>
            </div>
         )}

         {showAddDebtor && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
               <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[600px] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                     <div className="relative z-10">
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic underline decoration-indigo-600/30 decoration-4 underline-offset-4">Debtor Entity Profile</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1.5 italic">Configure High-Fidelity Corporate Account</p>
                     </div>
                     <button onClick={()=>setShowAddDebtor(false)} className="p-2.5 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all border border-slate-200 relative z-10"><Plus className="w-6 h-6 rotate-45" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Entity Name / Legal Title</label>
                           <input type="text" value={newDebtor.name} onChange={(e)=>setNewDebtor({...newDebtor, name: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs uppercase tracking-tight focus:border-indigo-600 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Entity Classification</label>
                           <select value={newDebtor.type} onChange={(e)=>setNewDebtor({...newDebtor, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                              {['CORPORATE','TRAVEL_AGENT','GOVERNMENT','INDIVIDUAL'].map(t=><option key={t} value={t}>{t}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">PAN / TAX ID</label>
                           <input type="text" value={newDebtor.pan} onChange={(e)=>setNewDebtor({...newDebtor, pan: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs uppercase tracking-tight focus:border-indigo-600 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Credit Threshold (NPR)</label>
                           <input type="number" value={newDebtor.creditLimit} onChange={(e)=>setNewDebtor({...newDebtor, creditLimit: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Settlement Period (Days)</label>
                           <input type="number" value={newDebtor.creditDays} onChange={(e)=>setNewDebtor({...newDebtor, creditDays: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Link Institutional Ledger Account</label>
                        <select value={newDebtor.accountId} onChange={(e)=>setNewDebtor({...newDebtor, accountId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                           <option value="">-- NO_LEDGER_MAPPING --</option>
                           {accounts.filter(a => a.type === 'ASSET').map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                     </div>
                     <button onClick={handleSaveDebtor} className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3">
                        Archive Entity Protocol <Plus className="w-4 h-4" />
                     </button>
                  </div>
               </motion.div>
            </div>
         )}

         {showAddSupplier && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
               <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[600px] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                     <div className="relative z-10">
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic underline decoration-rose-600/30 decoration-4 underline-offset-4">Supplier Entity Profile</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1.5 italic">Configure High-Fidelity Procurement Vendor</p>
                     </div>
                     <button onClick={()=>setShowAddSupplier(false)} className="p-2.5 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all border border-slate-200 relative z-10"><Plus className="w-6 h-6 rotate-45" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Vendor Name / Corporate ID</label>
                           <input type="text" value={newSupplier.name} onChange={(e)=>setNewSupplier({...newSupplier, name: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs uppercase tracking-tight focus:border-rose-600 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Vendor Classification</label>
                           <select value={newSupplier.type} onChange={(e)=>setNewSupplier({...newSupplier, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                              {['VENDOR','CONTRACTOR','UTILITY','GOVERNMENT'].map(t=><option key={t} value={t}>{t}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">PAN / TAX ID</label>
                           <input type="text" value={newSupplier.pan} onChange={(e)=>setNewSupplier({...newSupplier, pan: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs uppercase tracking-tight focus:border-rose-600 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Credit Limit (NPR)</label>
                           <input type="number" value={newSupplier.creditLimit} onChange={(e)=>setNewSupplier({...newSupplier, creditLimit: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Settlement Period (Days)</label>
                           <input type="number" value={newSupplier.creditDays} onChange={(e)=>setNewSupplier({...newSupplier, creditDays: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Link Institutional Ledger Account</label>
                        <select value={newSupplier.accountId} onChange={(e)=>setNewSupplier({...newSupplier, accountId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                           <option value="">-- NO_LEDGER_MAPPING --</option>
                           {accounts.filter(a => a.type === 'LIABILITY').map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                     </div>
                     <button onClick={handleSaveSupplier} className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3">
                        Archive Entity Protocol <Plus className="w-4 h-4" />
                     </button>
                  </div>
               </motion.div>
            </div>
         )}

         {showAddRoom && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
               <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[450px] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                     <div className="relative z-10">
                        <h3 className="text-xl font-bold text-slate-950 tracking-tighter uppercase italic underline decoration-indigo-600/30 decoration-4 underline-offset-4">Add New Item</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1.5 italic">Register New Physical Inventory Node</p>
                     </div>
                     <button onClick={()=>setShowAddRoom(false)} className="p-2.5 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full transition-all border border-slate-200 relative z-10"><Plus className="w-6 h-6 rotate-45" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Room Identification #</label>
                           <input type="text" value={newRoom.number} onChange={(e)=>setNewRoom({...newRoom, number: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs focus:border-indigo-600 transition-all" placeholder="E.G. 101" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Elevation (Floor)</label>
                           <input type="text" value={newRoom.floor} onChange={(e)=>setNewRoom({...newRoom, floor: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-xs" placeholder="1" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest ml-1">Classification Type</label>
                        <select value={newRoom.type} onChange={(e)=>setNewRoom({...newRoom, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] outline-none font-bold text-[0.6rem] uppercase tracking-widest">
                           {['STANDARD','DELUXE','SUPER DELUXE','SUITE','PENTHOUSE','MEETING ROOM'].map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                     </div>
                     <button onClick={handleSaveRoom} className="w-full py-4 bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-md)] uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3">
                        Save Item <Plus className="w-4 h-4" />
                     </button>
                  </div>
               </motion.div>
            </div>
          )}
      </AnimatePresence>

      <ProfessionalPrompt 
         isOpen={promptData.isOpen}
         onClose={() => setPromptData({...promptData, isOpen: false})}
         onConfirm={(val) => { promptData.onConfirm(val); setPromptData({...promptData, isOpen: false}); }}
         title={promptData.title}
         subtitle={promptData.subtitle}
         placeholder={promptData.placeholder}
         icon={promptData.icon}
      />

      <ProfessionalConfirm 
         isOpen={confirmOpen}
         onClose={() => setConfirmOpen(false)}
         onConfirm={confirmData.onConfirm}
         title={confirmData.title}
         message={confirmData.message}
         variant="danger"
      />

      <ProfessionalAlert 
         isOpen={alertOpen}
         onClose={() => setAlertOpen(false)}
         title={alertData.title}
         message={alertData.message}
         variant={alertData.variant}
      />

      <AnimatePresence>
        {msg && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 bg-white text-white font-bold text-[0.6rem] uppercase tracking-widest rounded-[var(--radius-md)] shadow-2xl z-[300] border border-white/10 flex items-center gap-4 italic"
          >
             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
             {msg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedLedgerAccount && (
          <LedgerDrilldown 
            account={selectedLedgerAccount} 
            config={config} 
            onClose={() => setSelectedLedgerAccount(null)} 
          />
        )}
      </AnimatePresence>
    </div>
    </AuthorityGuard>
  );
}
