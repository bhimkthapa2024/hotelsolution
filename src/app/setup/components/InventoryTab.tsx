'use client';

import React, { useState } from 'react';
import { BedDouble, Plus, Trash2, Layers, MapPin, CheckCircle2, AlertCircle, Sparkles, LayoutGrid, List } from 'lucide-react';
import { upsertRoom } from '@/actions/hotel';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryTabProps {
  rooms: any[];
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onAddRoom: () => void;
  onBulkAdd: () => void;
}

export default function InventoryTab({ rooms, onRefresh, onDelete, onAddRoom, onBulkAdd }: InventoryTabProps) {
  const [editingRoom, setEditingRoom] = useState<{id: string, field: string, value: string} | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');

  const handleUpdate = async (room: any, field: string, value: string) => {
    if (room[field] === value) {
      setEditingRoom(null);
      return;
    }
    await upsertRoom({ ...room, [field]: value });
    setEditingRoom(null);
    onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* LUXURY HEADER SECTION */}
      <div className="relative overflow-hidden bg-white p-4 sm:p-8 rounded-[var(--radius-xl)] border border-slate-200 shadow-2xl shadow-slate-200/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-[100px] -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/30 rounded-full blur-[80px] translate-y-32 -translate-x-32" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="relative">
               <div className="absolute inset-0 bg-indigo-600 blur-xl opacity-20 animate-pulse" />
               <div className="relative bg-white p-4 rounded-2xl shadow-2xl shadow-indigo-200">
                 < BedDouble className="w-8 h-8 text-indigo-400" />
               </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Unit Inventory Registry</h3>
                 <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span className="text-[0.55rem] font-black text-indigo-600 uppercase tracking-widest">Premium Registry</span>
                 </div>
              </div>
              <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-2 italic flex items-center gap-2">
                 <span className="w-8 h-[1px] bg-slate-200" /> Global Asset Management Protocol v4.8
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-6 border-r border-slate-100 pr-8">
               <span className="text-[1.2rem] font-black text-slate-950 tracking-tighter leading-none">{rooms.length}</span>
               <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Items Added</span>
            </div>
            
            <button 
              onClick={onBulkAdd} 
              className="px-6 py-4 bg-white border border-slate-200 hover:border-indigo-600 text-slate-600 hover:text-indigo-600 font-bold text-[0.6rem] rounded-[var(--radius-lg)] uppercase tracking-widest transition-all flex items-center gap-3 shadow-sm hover:shadow-xl hover:shadow-indigo-50"
            >
              <Layers className="w-4 h-4" /> Bulk Setup
            </button>
            <button 
              onClick={onAddRoom} 
              className="px-8 py-4 bg-white hover:bg-indigo-600 text-white font-bold text-[0.6rem] rounded-[var(--radius-lg)] uppercase tracking-widest transition-all shadow-2xl shadow-indigo-100 flex items-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Deploy Asset
            </button>
          </div>
        </div>
      </div>

      {/* LUXURY REGISTRY CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-[var(--radius-xl)] overflow-x-auto shadow-2xl shadow-slate-200/40 flex flex-col min-h-[400px]">
        <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <button 
                onClick={() => setViewMode('GRID')}
                className={`flex items-center gap-2 transition-all group/btn ${viewMode === 'GRID' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                 <LayoutGrid className={`w-4 h-4 transition-transform ${viewMode === 'GRID' ? 'scale-110' : 'group-hover:scale-110'}`} />
                 <span className={`text-[0.55rem] uppercase tracking-widest ${viewMode === 'GRID' ? 'font-black' : 'font-bold'}`}>Grid View</span>
              </button>
              <div className="w-[1px] h-4 bg-slate-200" />
              <button 
                onClick={() => setViewMode('LIST')}
                className={`flex items-center gap-2 transition-all group/btn ${viewMode === 'LIST' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                 <List className={`w-4 h-4 transition-transform ${viewMode === 'LIST' ? 'scale-110' : 'group-hover:scale-110'}`} />
                 <span className={`text-[0.55rem] uppercase tracking-widest ${viewMode === 'LIST' ? 'font-black' : 'font-bold'}`}>Detailed Roster</span>
              </button>
           </div>
           <div className="text-[0.55rem] font-bold text-slate-300 uppercase tracking-widest italic">Encrypted Database Access [SECURE_NODE_04]</div>
        </div>

        <div className="flex-1">
          {rooms.length === 0 ? (
            <div className="py-32 text-center h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-dashed border-slate-200">
                <BedDouble className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-300 italic">No Assets Authenticated in Registry</p>
            </div>
          ) : (
            viewMode === 'LIST' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse classic-table">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="px-4 sm:px-10 py-4 sm:py-6 text-[0.6rem] font-black text-slate-400 uppercase tracking-widest border-r border-slate-50 w-40">Identity</th>
                      <th className="px-4 sm:px-10 py-4 sm:py-6 text-[0.6rem] font-black text-slate-400 uppercase tracking-widest border-r border-slate-50">Operational Classification</th>
                      <th className="px-4 sm:px-10 py-4 sm:py-6 text-[0.6rem] font-black text-slate-400 uppercase tracking-widest border-r border-slate-50 w-48 text-center">Elevation</th>
                      <th className="px-4 sm:px-10 py-4 sm:py-6 text-[0.6rem] font-black text-slate-400 uppercase tracking-widest w-48 text-center">Status Protocol</th>
                      <th className="px-6 py-6 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                      {rooms.map((room, idx) => (
                        <motion.tr 
                          key={room.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="group hover:bg-slate-50/50 transition-all relative"
                        >
                          <td className="px-10 py-6 align-middle border-r border-slate-50">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all shadow-inner">
                                  <span className="text-xs font-black text-slate-900 group-hover:text-white tracking-tighter">#{room.number}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-6 align-middle border-r border-slate-50">
                            <div className="relative group/input">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-white rounded-md shadow-sm border border-slate-100 group-focus-within/input:border-indigo-600 transition-all">
                                <Layers className="w-3.5 h-3.5 text-slate-300 group-focus-within/input:text-indigo-600" />
                              </div>
                              <input 
                                type="text" 
                                value={editingRoom?.id === room.id && editingRoom?.field === 'type' ? editingRoom.value : room.type}
                                onChange={(e) => setEditingRoom({ id: room.id, field: 'type', value: e.target.value.toUpperCase() })}
                                onBlur={() => editingRoom && handleUpdate(room, 'type', editingRoom.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(room, 'type', (e.target as HTMLInputElement).value.toUpperCase())}
                                className="w-full h-14 pl-14 pr-4 bg-slate-100/30 border border-transparent rounded-[var(--radius-lg)] outline-none font-black text-[0.6rem] uppercase text-slate-800 focus:bg-white focus:border-indigo-600 focus:shadow-2xl focus:shadow-indigo-100/50 transition-all tracking-tighter"
                              />
                            </div>
                          </td>
                          <td className="px-10 py-6 align-middle border-r border-slate-50">
                            <div className="relative group/input max-w-[140px] mx-auto">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-white rounded-md shadow-sm border border-slate-100 group-focus-within/input:border-indigo-600 transition-all">
                                <MapPin className="w-3.5 h-3.5 text-slate-300 group-focus-within/input:text-indigo-600" />
                              </div>
                              <input 
                                type="text" 
                                value={editingRoom?.id === room.id && editingRoom?.field === 'floor' ? editingRoom.value : room.floor}
                                onChange={(e) => setEditingRoom({ id: room.id, field: 'floor', value: e.target.value })}
                                onBlur={() => editingRoom && handleUpdate(room, 'floor', editingRoom.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(room, 'floor', (e.target as HTMLInputElement).value)}
                                className="w-full h-14 pl-14 pr-4 bg-slate-100/30 border border-transparent rounded-[var(--radius-lg)] outline-none font-black text-[0.6rem] text-slate-800 focus:bg-white focus:border-indigo-600 focus:shadow-2xl focus:shadow-indigo-100/50 transition-all text-center tracking-tighter"
                              />
                            </div>
                          </td>
                          <td className="px-10 py-6 align-middle text-center">
                            <div className="flex items-center justify-center">
                              {room.status === 'Ready' ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-xl shadow-emerald-100/20 group-hover:scale-110 transition-transform">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[0.6rem] font-black uppercase tracking-widest">{room.status}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-full border border-rose-100 shadow-xl shadow-rose-100/20 group-hover:scale-110 transition-transform">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    <span className="text-[0.6rem] font-black uppercase tracking-widest">{room.status}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <button 
                              onClick={() => onDelete(room.id)}
                              className="p-3 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {rooms.map((room, idx) => (
                    <motion.div 
                      key={room.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="bg-white p-6 rounded-[var(--radius-xl)] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all group relative overflow-hidden"
                    >
                       <div className={`absolute top-0 right-0 w-1 h-full ${room.status === 'Ready' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                       
                       <div className="flex items-start justify-between mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-white shadow-xl group-hover:bg-indigo-600 transition-colors">
                             <span className="text-[1.2rem] font-black tracking-tighter">#{room.number}</span>
                          </div>
                          <button 
                             onClick={() => onDelete(room.id)}
                             className="p-2 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                       
                       <div className="space-y-4">
                          <div>
                             <div className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mb-1">Classification</div>
                             <div className="text-xs font-black text-slate-900 uppercase tracking-tighter italic">{room.type}</div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                             <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-slate-300" />
                                <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">LVL {room.floor}</span>
                             </div>
                             <div className={`px-3 py-1 rounded-full text-[0.55rem] font-black uppercase tracking-widest ${
                                room.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                             }`}>
                                {room.status}
                             </div>
                          </div>
                       </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )
          )}
        </div>
      </div>

      {/* LUXURY FOOTER LEGEND */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4 pt-8 border-t border-slate-100">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" />
               <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">Optimized / Market Ready</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-200" />
               <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">Active / Maintenance Required</span>
            </div>
         </div>
         <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[0.55rem] font-black uppercase tracking-widest italic">Platinum Control Suite</span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            <span className="text-[0.55rem] font-bold uppercase tracking-widest">Archival Integrity Verified</span>
         </div>
      </div>
    </div>
  );
}
