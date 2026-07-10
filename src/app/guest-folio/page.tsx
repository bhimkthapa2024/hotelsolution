'use client';

import { useEffect, useState } from 'react';
import { getGuestDatabase, getConfig } from '@/actions/hotel';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  History as HistoryIcon, 
  ChevronRight,
  CalendarCheck,
  Printer,
  Download,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageBanner from '@/components/PageBanner';
import { exportToCSV } from '@/lib/export';
import Link from 'next/link';

export default function GuestFolio() {
  const [guests, setGuests] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [showConsolidatedBill, setShowConsolidatedBill] = useState(false);

  const renderConsolidatedBill = () => {
    if (!selectedGuest) return null;

    let allItems: any[] = [];
    let totalDiscount = 0;
    let totalSC = 0;
    let totalTax = 0;
    let totalSubtotal = 0;
    let totalPaid = 0;
    let grandTotal = 0;
    let transactionsCount = 0;

    // Find the latest room number associated with this guest
    const roomNo = [...selectedGuest.history].sort((a,b) => b.date.localeCompare(a.date)).find(h => h.roomNumber)?.roomNumber;
    let combinedHistory = [...selectedGuest.history];

    if (roomNo) {
       // Search for any ghost profiles that match the room number exactly
       const targetNames = [roomNo.toUpperCase(), `ROOM ${roomNo.toUpperCase()}`, `RM ${roomNo.toUpperCase()}`];
       const ghostProfiles = guests.filter(g => targetNames.includes(g.name.toUpperCase()) && g.name.toUpperCase() !== selectedGuest.name.toUpperCase());
       
       // Merge any unpaid transactions from these ghost profiles into the current bill
       ghostProfiles.forEach(ghost => {
          const unpaidGhostTxns = ghost.history.filter((h: any) => h.status === 'Unpaid');
          // Add a note to the items so they know it was pulled from a ghost profile
          unpaidGhostTxns.forEach((txn: any) => {
             if (txn.items) {
                txn.items = txn.items.map((i: any) => ({ ...i, note: i.note ? `${i.note} [Merged from ${ghost.name}]` : `[Merged from ${ghost.name}]` }));
             }
          });
          combinedHistory.push(...unpaidGhostTxns);
       });
    }

    const sortedHistory = combinedHistory.sort((a,b) => a.date.localeCompare(b.date));

    sortedHistory.forEach((h: any) => {
      transactionsCount++;
      if (h.items) {
        h.items.forEach((item: any) => {
           allItems.push({ ...item, date: h.date, ref: h.id });
        });
      } else {
        // Fallback for older transactions without items attached
        allItems.push({ category: 'Historical Ledger Entry', amount: h.amount, qty: 1, date: h.date, ref: h.id, note: h.mode });
      }
      totalDiscount += (h.discount || 0);
      totalSC += (h.sc || 0);
      totalTax += (h.tax || 0);
      totalSubtotal += (h.subtotal || h.amount || 0);
      grandTotal += (h.amount || 0);
      
      if (h.status === 'Paid') {
         totalPaid += (h.amount || 0);
      } else {
         if (h.settlements && h.settlements.length > 0) {
            h.settlements.forEach((s: any) => {
               if (s.mode !== 'Bill to Company' && s.mode !== 'CITY LEDGER') {
                  totalPaid += (parseFloat(s.amount) || 0);
               }
            });
         }
      }
    });

    const balanceDue = grandTotal - totalPaid;

    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] overflow-y-auto print:bg-white print:p-0 print:m-0 print:absolute print:inset-0 animate-fadeIn">
         <div className="min-h-screen p-8 flex justify-center items-start print:p-0">
            <div className="bg-white w-full max-w-4xl rounded-[var(--radius-lg)] shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
               <div className="bg-white px-6 py-4 flex justify-between items-center no-print">
                  <h2 className="text-white font-black text-[0.6rem] uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Consolidated Checkout Bill
                  </h2>
                  <div className="flex gap-2">
                     <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[0.6rem] uppercase tracking-widest rounded transition-all active:scale-95 shadow-md flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5" /> Print Folio
                     </button>
                     <button onClick={() => setShowConsolidatedBill(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-black text-[0.6rem] uppercase tracking-widest rounded transition-all active:scale-95">
                        Close
                     </button>
                  </div>
               </div>

               <div className="p-10 print:p-0">
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                     <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">{config?.hotelName || 'Institutional Property'}</h1>
                        <p className="text-[0.6rem] font-bold uppercase tracking-widest mt-2 text-slate-500">{config?.address || 'Property Address Not Set'}</p>
                        <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-500">{config?.phone ? `TEL: ${config.phone}` : ''} {config?.pan ? `| PAN: ${config.pan}` : ''}</p>
                     </div>
                     <div className="text-right">
                        <h2 className="text-xl font-black uppercase tracking-widest text-indigo-600 leading-none">Guest Folio</h2>
                        <p className="text-[0.6rem] font-bold uppercase tracking-widest mt-2 text-slate-400">Generated: {formatDate(new Date().toISOString())}</p>
                        <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 mt-1">Folio Transactions: {transactionsCount}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-6 rounded-lg border border-slate-100 print:bg-white print:border-none print:p-0 print:mb-6">
                     <div>
                        <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mb-1">Bill To / Guest</p>
                        <p className="text-lg font-black uppercase text-slate-900 tracking-tight leading-none">{selectedGuest.name}</p>
                        {selectedGuest.address && selectedGuest.address !== 'N/A' && <p className="text-[0.6rem] font-bold text-slate-600 uppercase mt-2">{selectedGuest.address}</p>}
                        {selectedGuest.phone && selectedGuest.phone !== 'N/A' && <p className="text-[0.6rem] font-bold text-slate-600 uppercase mt-1">TEL: {selectedGuest.phone}</p>}
                     </div>
                     <div className="text-right">
                        <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mb-1">Folio Status</p>
                        <p className={`text-lg font-black uppercase tracking-tight leading-none ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                           {balanceDue > 0 ? 'Balance Due' : 'Settled'}
                        </p>
                        <p className="text-xs font-black text-slate-900 mt-2 tracking-tighter">Amount Due: {formatCurrency(balanceDue)}</p>
                     </div>
                  </div>

                  <div className="mb-8 overflow-x-auto">
                     <table className="w-full text-left classic-table min-w-[700px]">
                        <thead>
                           <tr className="border-b-2 border-slate-900">
                              <th className="py-2 text-[0.6rem] font-black text-slate-900 uppercase tracking-widest">Date</th>
                              <th className="py-2 text-[0.6rem] font-black text-slate-900 uppercase tracking-widest">Description</th>
                              <th className="py-2 text-[0.6rem] font-black text-slate-900 uppercase tracking-widest text-right">Qty</th>
                              <th className="py-2 text-[0.6rem] font-black text-slate-900 uppercase tracking-widest text-right">Rate</th>
                              <th className="py-2 text-[0.6rem] font-black text-slate-900 uppercase tracking-widest text-right">Amount</th>
                           </tr>
                        </thead>
                        <tbody>
                           {allItems.map((item, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                 <td className="py-3 pr-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest tabular-nums w-24 align-top">{formatDate(item.date).split(',')[0]}</td>
                                 <td className="py-3 pr-4 align-top">
                                    <p className="text-[0.6rem] font-black text-slate-900 uppercase tracking-tight">{item.category}</p>
                                    {(item.note || item.roomNumber) && (
                                       <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                          {item.note} {item.roomNumber ? `[RM ${item.roomNumber}]` : ''}
                                       </p>
                                    )}
                                 </td>
                                 <td className="py-3 pl-4 text-[0.6rem] font-black text-slate-700 tabular-nums text-right align-top">{item.qty || 1}</td>
                                 <td className="py-3 pl-4 text-[0.6rem] font-black text-slate-700 tabular-nums text-right align-top">{formatCurrency(item.rate || item.amount)}</td>
                                 <td className="py-3 pl-4 text-xs font-black text-slate-900 tabular-nums text-right align-top">{formatCurrency(item.amount)}</td>
                              </tr>
                           ))}
                           {allItems.length === 0 && (
                              <tr><td colSpan={5} className="py-8 text-center text-[0.6rem] font-bold uppercase text-slate-400">No Itemized Records Found</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>

                  <div className="flex justify-end">
                     <div className="w-full max-w-sm">
                        <div className="flex justify-between items-center py-1.5">
                           <span className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Subtotal</span>
                           <span className="text-xs font-black text-slate-900 tabular-nums">{formatCurrency(totalSubtotal || grandTotal - totalSC - totalTax + totalDiscount)}</span>
                        </div>
                        {totalDiscount > 0 && (
                           <div className="flex justify-between items-center py-1.5">
                              <span className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Discount</span>
                              <span className="text-xs font-black text-rose-600 tabular-nums">-{formatCurrency(totalDiscount)}</span>
                           </div>
                        )}
                        {totalSC > 0 && (
                           <div className="flex justify-between items-center py-1.5">
                              <span className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Service Charge</span>
                              <span className="text-xs font-black text-slate-700 tabular-nums">{formatCurrency(totalSC)}</span>
                           </div>
                        )}
                        {totalTax > 0 && (
                           <div className="flex justify-between items-center py-1.5">
                              <span className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Taxes</span>
                              <span className="text-xs font-black text-slate-700 tabular-nums">{formatCurrency(totalTax)}</span>
                           </div>
                        )}
                        <div className="flex justify-between items-center py-3 border-t-2 border-slate-900 mt-2 mb-2">
                           <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Grand Total</span>
                           <span className="text-xl font-black text-indigo-600 tabular-nums tracking-tighter">{formatCurrency(grandTotal)}</span>
                        </div>
                        {totalPaid > 0 && (
                           <div className="flex justify-between items-center py-1.5 border-b border-slate-100 mb-2 pb-3">
                              <span className="text-[0.6rem] font-black text-emerald-600 uppercase tracking-widest">Payments Applied</span>
                              <span className="text-xs font-black text-emerald-600 tabular-nums">-{formatCurrency(totalPaid)}</span>
                           </div>
                        )}
                        <div className="flex justify-between items-center py-2 bg-slate-50 px-4 rounded border border-slate-100 print:bg-transparent print:border-none print:px-0">
                           <span className={`text-xs font-black uppercase tracking-widest ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Balance Due</span>
                           <span className={`text-xl font-black tabular-nums tracking-tighter ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(Math.max(0, balanceDue))}</span>
                        </div>
                     </div>
                  </div>

                  <div className="mt-16 pt-8 border-t border-slate-200 text-center print:mt-12">
                     <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">Thank you for your stay. For billing inquiries, please contact the front desk.</p>
                     <p className="text-[0.55rem] font-bold text-slate-300 uppercase tracking-widest mt-2">Generated by Institutional OS</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  };

  useEffect(() => {
    async function load() {
      const [gData, cData] = await Promise.all([
        getGuestDatabase(),
        getConfig()
      ]);
      setGuests(gData || []);
      setConfig(cData);
      setLoading(false);
    }
    load();
  }, []);

  const handleExport = () => {
    const data = guests.map(g => ({
      Guest_Name: g.name,
      Phone: g.phone,
      Email: g.email || 'N/A',
      Address: g.address || 'N/A',
      Last_Visit: g.lastVisit,
      Total_Expenditure: g.totalTransacted,
      Visits_Count: g.history?.length || 0
    }));
    exportToCSV(data, 'Guest_Folio_Database');
  };

  const filtered = guests.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.phone.includes(search)
  ).sort((a,b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());

  if (loading && guests.length === 0) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-[var(--radius-md)] animate-spin" />
    </div>
  );

  return (
    <div className="p-6 mx-auto min-h-screen bg-white animate-fadeIn institutional-report-root printable-doc w-full">
      {/* COMPANY HEADER */}
      <div className="flex flex-col items-center justify-center mb-6 border-b border-slate-200 pb-4 relative mt-2 w-full max-w-[1450px] mx-auto">
         <h1 className="text-xl font-bold text-gray-900 tracking-wide uppercase">{config?.hotelName}</h1>
         {config?.address && <p className="text-[0.65rem] text-gray-600 mt-0.5">{config.address}</p>}
         <div className="flex items-center gap-4 mt-1 text-[0.55rem] text-gray-500">
            {config?.phone && <span>📱 {config.phone}</span>}
            {config?.email && <span>✉️ {config.email}</span>}
            {config?.website && <span>🌐 {config.website}</span>}
         </div>
      </div>

      <div className="flex flex-col items-center justify-center mb-6 w-full max-w-[1450px] mx-auto text-center">
         <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">GUEST FOLIO : INSTITUTIONAL OCCUPANCY REGISTRY</h2>
         <div className="flex items-center justify-center gap-6 text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest">
            <span>REPORT TYPE : GUEST LEDGER DATA STREAM</span>
            <span>DESCRIPTION : REAL-TIME OCCUPANCY MONITOR [V1.0.4]</span>
            <span>PAN : {config?.pan || '304412612'}</span>
            <span>PRINT DATE : {formatDate(new Date().toISOString()).split(',')[0]}</span>
         </div>
      </div>

      <div className="no-print mb-8 w-full max-w-[1450px] mx-auto">
         <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="search-bar relative group/search flex-1 max-w-[600px]">
               <input 
                  type="text" 
                  placeholder="SCAN GUEST IDENTITY, PHONE OR UID..."
                  className="w-full pl-4 pr-4 py-3 bg-white border border-slate-200 rounded outline-none focus:border-slate-400 transition-all font-black text-slate-900 text-[0.6rem] uppercase tracking-widest placeholder:text-slate-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
               />
            </div>
            <button 
               onClick={handleExport}
               className="px-6 py-3 bg-slate-900 text-white rounded font-black text-[0.6rem] hover:bg-slate-800 transition-all flex items-center gap-3 uppercase tracking-widest active:scale-95 whitespace-nowrap"
            >
               <Download className="w-4 h-4" /> COMMIT REGISTRY EXPORT
            </button>
         </div>
      </div>

      <div className="grid grid-cols-12 gap-6 w-full max-w-[1450px] mx-auto">
        {/* GUEST LIST */}
         <div className={`${selectedGuest ? 'col-span-12 lg:col-span-4' : 'col-span-12'} transition-all duration-700 no-print`}>
            <div className="bg-white rounded border border-slate-200 overflow-hidden">
               <div className="overflow-x-auto scrollbar-none">
                 <table className="w-full text-left border-collapse classic-table">
                    <thead>
                      <tr className="bg-white border-b border-white/5">
                        <th className="px-6 py-3 text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Identity Matrix</th>
                        <th className="px-6 py-3 text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Last Sync</th>
                        {!selectedGuest && <th className="px-6 py-3 text-[0.55rem] font-black text-slate-400 uppercase tracking-widest text-right">Yield Pulse</th>}
                        <th className="px-1 py-3 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((g: any) => (
                        <tr 
                          key={g.name} 
                          className={`border-b border-slate-50 hover:bg-slate-50 transition-all group cursor-pointer ${selectedGuest?.name === g.name ? 'bg-slate-50' : ''}`}
                          onClick={() => setSelectedGuest(g)}
                        >
                          <td className="px-6 py-1.5">
                            <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg text-[0.6rem] font-black flex items-center justify-center transition-all uppercase border shadow-sm ${selectedGuest?.name === g.name ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 group-hover:border-slate-400 group-hover:text-slate-600'}`}>
                                  {g.name.substring(0,2)}
                               </div>
                               <div>
                                  <div className={`text-[0.6rem] font-black uppercase tracking-tight leading-none ${selectedGuest?.name === g.name ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>{g.name}</div>
                                  <div className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1">{g.phone}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-1.5">
                             <div className="text-[0.6rem] font-black text-slate-500 flex items-center gap-1.5 uppercase"><CalendarCheck className="w-3 h-3 text-slate-400 opacity-60" /> {formatDate(g.lastVisit)}</div>
                          </td>
                          {!selectedGuest && (
                            <td className="px-6 py-1.5 text-right font-black text-[0.6rem] text-slate-950 tracking-tighter tabular-nums">
                               {formatCurrency(g.totalTransacted)}
                            </td>
                          )}
                          <td className="px-4 py-1.5 text-center">
                             <ChevronRight className={`w-3 h-3 transition-all transform ${selectedGuest?.name === g.name ? 'text-slate-900 translate-x-1' : 'text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1'}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
         </div>

        {/* DETAILS DRILLDOWN */}
        <AnimatePresence>
          {selectedGuest && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.995 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.995 }}
              className="col-span-12 lg:col-span-8 space-y-6"
            >
               <section className="bg-white rounded-md p-0 text-slate-900 border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="p-5 bg-white border-b border-slate-200 relative overflow-hidden group">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center text-lg font-black text-slate-600 shadow-sm overflow-hidden">
                             {selectedGuest.name.substring(0,2)}
                          </div>
                          <div>
                             <h2 className="text-lg font-black tracking-tighter uppercase leading-none text-slate-900">{selectedGuest.name}</h2>
                             <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 bg-slate-100 text-[0.4rem] font-black text-slate-600 uppercase tracking-widest rounded">Guest Profile</span>
                                <span className="px-2 py-0.5 bg-emerald-50 text-[0.4rem] font-black text-emerald-600 uppercase tracking-widest rounded border border-emerald-100">Status: Active</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-8">
                          <div className="flex flex-col items-end border-r border-slate-200 pr-8">
                             <span className="text-[0.4rem] font-black text-slate-400 uppercase tracking-widest mb-1">Total Lifecycle Yield</span>
                             <span className="text-lg font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(selectedGuest.totalTransacted)}</span>
                          </div>
                           <div className="flex items-center gap-2">
                             <button onClick={() => setShowConsolidatedBill(true)} className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-md shadow-sm hover:bg-slate-200 active:scale-95 transition-all flex items-center gap-2 font-black text-[0.6rem] uppercase tracking-widest"><FileText className="w-3.5 h-3.5" /> Consolidated Bill</button>
                             <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-slate-200 text-slate-950 rounded-md shadow-sm hover:bg-slate-50 active:scale-95 transition-all"><Printer className="w-3.5 h-3.5" /></button>
                             <button onClick={() => setSelectedGuest(null)} className="p-2 bg-white hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-500 border border-slate-200 transition-all"><X className="w-4 h-4" /></button>
                           </div>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-0 relative z-10 bg-white">
                     <div className="p-4 border-r border-slate-200 group/tile hover:bg-slate-50 transition-all cursor-default relative">
                        <div className="absolute top-0 right-0 p-3 text-slate-100 transition-colors pointer-events-none"><Phone className="w-8 h-8" /></div>
                        <p className="text-[0.4rem] font-black text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">Voice Line</p>
                        <p className="text-[0.65rem] font-black uppercase text-slate-900 tracking-wide relative z-10">{selectedGuest.phone}</p>
                     </div>
                     <div className="p-4 border-r border-slate-200 group/tile hover:bg-slate-50 transition-all cursor-default relative">
                        <div className="absolute top-0 right-0 p-3 text-slate-100 transition-colors pointer-events-none"><Mail className="w-8 h-8" /></div>
                        <p className="text-[0.4rem] font-black text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">Electronic Trace</p>
                        <p className="text-[0.65rem] font-black uppercase text-slate-900 tracking-wide relative z-10 truncate">{selectedGuest.email}</p>
                     </div>
                     <div className="p-4 col-span-2 group/tile hover:bg-slate-50 transition-all cursor-default relative">
                        <div className="absolute top-0 right-0 p-3 text-slate-100 transition-colors pointer-events-none"><MapPin className="w-8 h-8" /></div>
                        <p className="text-[0.4rem] font-black text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">Residence</p>
                        <p className="text-[0.65rem] font-bold text-slate-700 uppercase relative z-10 truncate">{selectedGuest.address}</p>
                     </div>
                  </div>
               </section>

               <section className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
                  <div className="px-8 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-1.5 rounded text-white shadow-sm"><HistoryIcon className="w-3.5 h-3.5" /></div>
                        <h4 className="text-[0.65rem] font-black text-slate-900 uppercase tracking-widest leading-none">Operational Audit Trail</h4>
                     </div>
                     <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Traces: {selectedGuest.history.length}</span>
                  </div>
                  <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full text-left border-collapse ledger-trace-table classic-table">
                      <thead>
                        <tr className="bg-white border-b border-slate-100">
                          <th className="px-8 py-2.5 text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Registry Identifier</th>
                          <th className="px-8 py-2.5 text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                          <th className="px-8 py-2.5 text-[0.55rem] font-black text-slate-400 uppercase tracking-widest text-right">Yield</th>
                          <th className="px-8 py-2.5 text-[0.55rem] font-black text-slate-400 uppercase tracking-widest text-center">Status Protocol</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGuest.history.map((h: any) => (
                          <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all group/row">
                             <td className="px-8 py-1.5">
                                <Link 
                                  href={`/sales-report?id=${h.id}`}
                                  className="font-black text-[0.6rem] text-slate-900 uppercase tracking-widest group-hover/row:text-slate-600 transition-colors inline-block underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                                >
                                  ID-{h.id}
                                </Link>
                             </td>
                             <td className="px-8 py-1.5 font-bold text-[0.6rem] text-slate-500 uppercase tracking-tighter tabular-nums italic opacity-80 leading-none">{formatDate(h.date)}</td>
                             <td className="px-8 py-1.5 text-right font-black text-xs text-slate-950 tracking-tighter tabular-nums leading-none">{formatCurrency(h.amount)}</td>
                             <td className="px-8 py-1.5 text-center">
                                <span className={`px-3 py-0.5 rounded-full text-[0.55rem] font-black uppercase tracking-widest border shadow-sm transition-all
                                  ${h.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover/row:bg-emerald-600 group-hover/row:text-white' : 'bg-rose-50 text-rose-600 border-rose-100 group-hover/row:bg-rose-600 group-hover/row:text-white'}`}>
                                  {h.status === 'Paid' ? 'Audited' : 'Variance'}
                                </span>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showConsolidatedBill && renderConsolidatedBill()}
    </div>
  );
}




