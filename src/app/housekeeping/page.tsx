'use client';

import { useEffect, useState } from 'react';
import { getRooms, updateRoomStatus } from '@/actions/hotel';
import { getCurrentUser } from '@/actions/auth';
import { 
  BedDouble, 
  CheckCircle2, 
  Trash2, 
  Wrench, 
  Zap, 
  MapPin,
  Clock,
  Waves,
  Printer,
  Search,
  Filter,
  Layers,
  Sparkles,
  Droplets,
  AlertCircle,
  ShieldCheck,
  RefreshCcw,
  UserCheck,
  ArrowUpRight,
  ClipboardList,
  Activity,
  UserPlus,
  ChevronRight,
  X,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageBanner from '@/components/PageBanner';
import { ProfessionalAlert } from '@/components/ProfessionalAlert';

export default function Housekeeping() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFloor, setFilterFloor] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  
  // Professional Alert State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertData, setAlertData] = useState({ title: '', message: '', variant: 'info' as any });

  const loadData = async () => {
    setLoading(true);
    const [r, user] = await Promise.all([
      getRooms(),
      getCurrentUser()
    ]);
    setRooms(r);
    setPermissions(user?.permissions || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasPerm = (p: string) => permissions.includes('admin.root') || permissions.includes(p);

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!hasPerm('housekeeping.update')) {
        setAlertData({
            title: 'Authority Rejected',
            message: 'TASK_NOT_PERMITTED: You do not have the operational clearance to recalibrate asset readiness.',
            variant: 'error'
        });
        setAlertOpen(true);
        return;
    }
    
    setLoading(true);
    const res = await updateRoomStatus(id, status);
    if (res.success) {
      await loadData();
      const statusLabels: Record<string, string> = {
        'Ready': 'Asset marked as READY for occupancy.',
        'Dirty': 'Service required protocol initiated.',
        'Cleaning': 'Service currently in progress.',
        'Locked': 'Asset decommissioned for maintenance.'
      };
      
      setAlertData({
        title: 'Status Synchronized',
        message: statusLabels[status] || `Room status updated to ${status}.`,
        variant: 'success'
      });
      setAlertOpen(true);
    } else {
        setAlertData({
            title: 'Registry Error',
            message: 'The system was unable to commit the status update to the cloud registry.',
            variant: 'error'
        });
        setAlertOpen(true);
    }
    setLoading(false);
  };

  const floors = ['ALL', ...Array.from(new Set(rooms.map(r => r.floor || '1'))).sort()];
  
  const filteredRooms = rooms.filter(r => {
    const floorMatch = filterFloor === 'ALL' || (r.floor || '1') === filterFloor;
    const searchMatch = r.number.includes(searchQuery) || r.type.toLowerCase().includes(searchQuery.toLowerCase());
    return floorMatch && searchMatch;
  });

  const stats = {
     ready: rooms.filter(r => r.status === 'Ready').length,
     cleaning: rooms.filter(r => r.status === 'Cleaning').length,
     dirty: rooms.filter(r => r.status === 'Dirty').length,
     maintenance: rooms.filter(r => r.status === 'Locked').length,
     total: rooms.length
  };

  if (loading && rooms.length === 0) return (
    <div className="flex items-center justify-center h-screen bg-slate-50 gap-4">
       <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-[var(--radius-md)] animate-spin" />
       <span className="text-[0.6rem] font-bold uppercase tracking-widest text-indigo-900 ">Synchronizing Fleet Registry...</span>
    </div>
  );

  if (!hasPerm('housekeeping.view')) {
     return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
           <div className="bg-white/5 p-12 rounded-[var(--radius-lg)] border border-white/10 text-center max-w-md backdrop-blur-3xl shadow-2xl">
              <div className="inline-flex p-4 bg-rose-600 rounded-[var(--radius-md)] mb-6 shadow-2xl shadow-rose-600/20"><Lock className="w-8 h-8 text-white" /></div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tighter mb-4 italic">Task Unauthorized</h2>
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">You do not have the 'housekeeping.view' permission required to access this task module.</p>
           </div>
        </div>
     );
  }

  return (
    <div className="p-8 max-w-[1550px] mx-auto min-h-screen bg-[var(--bg-color)] font-main tracking-main printable-doc">
      
      {/* HEADER COMMAND STRIP */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
         <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="p-1.5 bg-indigo-100 rounded-md text-indigo-600">
                  <CheckCircle2 className="w-4 h-4" />
               </div>
               <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Housekeeping</h1>
            </div>
            <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Operational Readiness Registry</p>
         </div>
         <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 px-4 py-2 bg-white border border-slate-200 rounded-[var(--radius-sm)] shadow-sm">
               <div className="flex flex-col">
                  <span className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Active Service</span>
                  <span className="text-sm font-bold text-amber-500 tracking-tighter">{stats.cleaning}</span>
               </div>
               <div className="h-6 w-px bg-slate-200" />
               <div className="flex flex-col">
                  <span className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Maintenance</span>
                  <span className="text-sm font-bold text-rose-500 tracking-tighter">{stats.dirty + stats.maintenance}</span>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button 
                  onClick={loadData}
                  className="w-10 h-10 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-[var(--radius-sm)] flex items-center justify-center transition-all group/refresh shadow-sm"
               >
                  <RefreshCcw className="w-4 h-4 group-hover/refresh:rotate-180 transition-transform duration-700" />
               </button>
               {hasPerm('housekeeping.audit') && (
                  <button 
                    onClick={() => window.print()}
                    className="h-10 px-4 bg-indigo-600 text-white font-black text-[0.55rem] uppercase tracking-widest rounded-[var(--radius-sm)] hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" /> Commit Audit Print
                  </button>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20 report-container">
         {/* LEFT SIDE: CONTROLS */}
         <div className="lg:col-span-3 space-y-6 no-print">
            <div className="bg-white p-6 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm">
               <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50 text-indigo-950">
                  <div className="bg-indigo-600 p-2 rounded-[var(--radius-md)] text-white"><Filter className="w-4 h-4" /></div>
                  <h3 className="text-[0.6rem] font-normal uppercase tracking-widest [word-spacing:0.6rem]">Topology Filter</h3>
               </div>
               
               <div className="space-y-4">
                  <div className="relative group">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                     <input 
                       type="text" 
                       placeholder="SEARCH ASSET NO..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-[var(--radius-md)] font-bold text-[0.6rem] uppercase outline-none focus:bg-white focus:border-indigo-600 transition-all tracking-widest"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                     {floors.map(f => (
                        <button 
                          key={f}
                          onClick={() => setFilterFloor(f)}
                          className={`px-3 py-2 rounded-[var(--radius-md)] text-[0.55rem] font-bold uppercase tracking-widest border transition-all ${
                            filterFloor === f ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:text-indigo-600'
                          }`}
                        >
                           {f === 'ALL' ? 'GLOBAL' : `LEVEL ${f}`}
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            <div className="p-6 bg-white text-white rounded-[var(--radius-lg)] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ShieldCheck className="w-20 h-20" />
               </div>
               <h4 className="text-[0.55rem] font-bold uppercase tracking-widest text-indigo-400 mb-2">Protocol Note</h4>
               <p className="text-[0.6rem] font-bold uppercase tracking-tight italic leading-relaxed">Ensure physical verification of every 'Ready' unit before committing to the digital registry.</p>
            </div>
         </div>

         {/* RIGHT SIDE: LIVE GRID */}
         <div className="lg:col-span-9">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
               {filteredRooms.map((room, idx) => (
                 <motion.div 
                   key={room.id}
                   whileHover={{ y: -4, scale: 1.02 }}
                   onClick={() => setSelectedRoom(room)}
                   className="group bg-white p-5 rounded-[var(--radius-lg)] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-300 relative aspect-square flex flex-col justify-between cursor-pointer overflow-hidden border-b-4 border-b-transparent hover:border-b-indigo-600"
                 >
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 opacity-5 scale-150 ${
                      room.status === 'Ready' ? 'bg-emerald-500' : 
                      room.status === 'Cleaning' ? 'bg-amber-500' :
                      room.status === 'Dirty' ? 'bg-rose-500' : 'bg-indigo-500'
                    }`} />

                    <div className="relative z-10 h-full flex flex-col justify-between">
                       <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mb-1">LEVEL {room.floor || '1'}</p>
                            <h3 className="text-3xl font-bold text-slate-950 tracking-tighter leading-none uppercase group-hover:text-indigo-600 transition-colors">#{room.number}</h3>
                          </div>
                          <div className={`p-1.5 rounded-[var(--radius-md)] border shadow-inner ${
                            room.status === 'Ready' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            room.status === 'Cleaning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            room.status === 'Dirty' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-indigo-50 text-indigo-600 border-indigo-100'
                          }`}>
                            {room.status === 'Ready' ? <Sparkles className="w-4 h-4" /> : room.status === 'Cleaning' ? <RefreshCcw className="w-4 h-4 animate-spin-slow" /> : room.status === 'Dirty' ? <Droplets className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                          </div>
                       </div>

                       <div className="mt-auto">
                          <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest italic mb-1.5">{room.type}</p>
                          <div className="flex items-center gap-1.5">
                             <div className={`w-2 h-2 rounded-[var(--radius-md)] ${
                                room.status === 'Ready' ? 'bg-emerald-500' : 
                                room.status === 'Cleaning' ? 'bg-amber-500' :
                                room.status === 'Dirty' ? 'bg-rose-500' : 'bg-indigo-500'
                             }`} />
                             <span className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest">{room.status}</span>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ))}
            </div>
         </div>
      </div>

      {/* QUICK STATUS UPDATE MODAL */}
      <AnimatePresence>
         {selectedRoom && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
               <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="bg-white rounded-[var(--radius-lg)] w-full max-w-[450px] overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-slate-100 bg-white flex justify-between items-center overflow-hidden relative">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none" />
                     <div className="flex items-center gap-4 relative z-10">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-[var(--radius-md)] flex items-center justify-center text-3xl font-bold italic tracking-tighter shadow-inner group-hover:scale-110 transition-transform">
                           #{selectedRoom.number}
                        </div>
                        <div>
                           <p className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400 block mb-1.5 italic leading-none">Inventory Management Module</p>
                           <h3 className="text-lg font-bold uppercase tracking-tighter italic leading-none text-slate-950 underline decoration-indigo-600/30 decoration-4 underline-offset-4">{selectedRoom.type}</h3>
                        </div>
                     </div>
                     <button onClick={() => setSelectedRoom(null)} className="p-2.5 bg-slate-50 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-600 transition-all border border-slate-200 relative z-10"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="p-10 space-y-8">
                     {hasPerm('housekeeping.update') ? (
                        <div className="space-y-4">
                           <label className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest ml-1">Recalibrate Operational Status</label>
                           <div className="grid grid-cols-1 gap-3">
                              {[
                                 { id: 'Ready', label: 'MARK AS READY', icon: Sparkles, color: 'hover:bg-emerald-600 hover:border-emerald-700' },
                                 { id: 'Cleaning', label: 'CLEANING ON PROCESS', icon: RefreshCcw, color: 'hover:bg-amber-600 hover:border-amber-700' },
                                 { id: 'Dirty', label: 'SERVICE REQUIRED', icon: Droplets, color: 'hover:bg-rose-600 hover:border-rose-700' },
                                 { id: 'Locked', label: 'OUT OF SERVICE', icon: Wrench, color: 'hover:bg-white' }
                              ].map(s => (
                                 <button 
                                    key={s.id}
                                    onClick={() => { handleStatusUpdate(selectedRoom.id, s.id); setSelectedRoom(null); }}
                                    className={`w-full p-4 border border-slate-200 rounded-[var(--radius-md)] flex items-center justify-between transition-all group font-bold text-[0.6rem] tracking-widest hover:text-white ${s.color}`}
                                 >
                                    <span className="flex items-center gap-3"><s.icon className="w-4 h-4 opacity-50 group-hover:opacity-100" /> {s.label}</span>
                                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                 </button>
                              ))}
                           </div>
                        </div>
                     ) : (
                        <div className="p-8 bg-rose-50 border border-rose-100 rounded-[var(--radius-md)] text-center">
                           <Lock className="w-8 h-8 text-rose-600 mx-auto mb-4" />
                           <h4 className="text-[0.6rem] font-bold text-rose-900 uppercase tracking-widest mb-2">Authority Required</h4>
                           <p className="text-[0.55rem] font-bold text-rose-400 uppercase tracking-tight leading-relaxed">You do not have the 'housekeeping.update' permission to modify room readiness states.</p>
                        </div>
                     )}

                     <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                        <p className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest italic">Room {selectedRoom.number} • LVL {selectedRoom.floor}</p>
                        <button onClick={() => setSelectedRoom(null)} className="text-[0.55rem] font-bold text-rose-600 uppercase tracking-widest hover:underline">Abort Command</button>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
      
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
