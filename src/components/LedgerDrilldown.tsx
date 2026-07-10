'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Printer,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { getLedgerEntries, getPurchases } from '@/actions/hotel';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getCurrentUser } from '@/actions/auth';

interface LedgerDrilldownProps {
  account: any;
  config: any;
  onClose: () => void;
  descriptionFilter?: string;
  openingBalance?: number;
}

export default function LedgerDrilldown({ account, config, onClose, descriptionFilter, openingBalance = 0 }: LedgerDrilldownProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'statement' | 'invoices'>('statement');
  const [partyPurchases, setPartyPurchases] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetch() {
      if (!account) return;
      setLoading(true);
      const res = await getLedgerEntries(account.id);
      const mapped = (res || []).map((e: any) => ({
         ...e,
         Dr: e.debit !== undefined ? e.debit : (e.Dr || 0),
         Cr: e.credit !== undefined ? e.credit : (e.Cr || 0)
      }));
      setEntries(mapped);

      try {
         const user = await getCurrentUser();
         setCurrentUser(user);
      } catch (e) {
         console.error("Failed to load current user:", e);
      }

      if (descriptionFilter) {
         try {
            const allPurchases = await getPurchases();
            const matched = allPurchases.filter((p: any) => p.vendor?.toUpperCase() === descriptionFilter?.toUpperCase());
            setPartyPurchases(matched);
         } catch (e) {
            console.error("Failed to load party purchases:", e);
         }
      }
      setLoading(false);
    }
    fetch();
  }, [account, descriptionFilter]);

  const filteredEntries = (() => {
    let sortedEntries = [...entries];
    // Ensure chronological sort including createdAt if available
    sortedEntries.sort((a, b) => {
       const dateDiff = a.date.localeCompare(b.date);
       if (dateDiff !== 0) return dateDiff;
       const timeA = a.createdAt?.seconds || a.createdAt?._seconds || 0;
       const timeB = b.createdAt?.seconds || b.createdAt?._seconds || 0;
       return timeA - timeB;
    });

    let runningBal = openingBalance;
    const isDebitNormal = account.normal === 'Dr' || account.normal === 'Debit' || account.normal === 'Debit Balance' || account.normal === 'Debit';

    return sortedEntries
      .filter(e => {
         if (!descriptionFilter) return true;
         return e.description?.toUpperCase().includes(descriptionFilter.toUpperCase());
      })
      .map(e => {
        const flux = isDebitNormal ? ((e.Dr || 0) - (e.Cr || 0)) : ((e.Cr || 0) - (e.Dr || 0));
        runningBal += flux;
        return {
          ...e,
          balanceAfter: runningBal
        };
      });
  })();

  const isDebitNormal = account.normal === 'Dr' || account.normal === 'Debit' || account.normal === 'Debit Balance' || account.normal === 'Debit';
  const totalDebit = filteredEntries.reduce((acc, e) => acc + (e.Dr || 0), 0);
  const totalCredit = filteredEntries.reduce((acc, e) => acc + (e.Cr || 0), 0);
  const closingBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].balanceAfter : openingBalance;

  const formatBal = (amt: number, alwaysShowSuffix = true) => {
     if (amt === 0) return `0.00`;
     const isPositive = amt >= 0;
     let suffix = '';
     if (isDebitNormal) {
        suffix = isPositive ? ' DR' : ' CR';
     } else {
        suffix = isPositive ? ' CR' : ' DR';
     }
     return `${formatCurrency(Math.abs(amt))}${alwaysShowSuffix ? suffix : ''}`;
  };

  const getFromDate = () => filteredEntries.length > 0 ? formatDate(filteredEntries[0].date) : '-';
  const getToDate = () => filteredEntries.length > 0 ? formatDate(filteredEntries[filteredEntries.length - 1].date) : '-';

  if (!account) return null;

  return (
    <div className="relative w-full print:p-0 print:bg-white print:block">
      
      {/* Action Bar (No Print) */}
      <div className="absolute top-0 right-0 flex items-center gap-2 z-[10] no-print p-2 sm:p-4 bg-white/80 backdrop-blur-sm sm:bg-transparent rounded-bl-lg">
         {descriptionFilter && (
            <div className="flex bg-white rounded shadow-sm border border-slate-200 overflow-hidden mr-1 sm:mr-4">
               <button onClick={() => setActiveTab('statement')} className={`px-2 sm:px-4 py-1.5 text-[0.65rem] sm:text-xs font-bold ${activeTab === 'statement' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Statement</button>
               <button onClick={() => setActiveTab('invoices')} className={`px-2 sm:px-4 py-1.5 text-[0.65rem] sm:text-xs font-bold ${activeTab === 'invoices' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Invoices</button>
            </div>
         )}
         <button onClick={() => window.print()} className="w-7 h-7 sm:w-8 sm:h-8 bg-white border border-slate-300 rounded flex items-center justify-center text-slate-700 hover:bg-slate-100 shadow-sm transition-colors">
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
         </button>
         <button className="w-7 h-7 sm:w-8 sm:h-8 bg-white border border-slate-300 rounded flex items-center justify-center text-slate-700 hover:bg-slate-100 shadow-sm transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
         </button>
         <button onClick={onClose} className="w-7 h-7 sm:w-8 sm:h-8 bg-rose-600 border border-rose-700 rounded flex items-center justify-center text-white hover:bg-rose-700 shadow-sm transition-colors ml-1 sm:ml-2">
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
         </button>
      </div>

      <motion.div 
         initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:20}}
         className="w-full bg-white min-h-full md:min-h-0 shadow-2xl print:shadow-none printable-doc"
         style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}
      >
         
         <div className="p-4 sm:p-8 pt-14 sm:pt-8 print:p-0">
            {/* LOGO & COMPANY HEADER */}
            <div className="flex flex-col items-center justify-center mb-6 border-b border-gray-300 pb-4 relative">
               {/* Logo removed per request */}
               
               <h1 className="text-xl font-bold text-gray-900 tracking-wide uppercase">{config?.hotelName || 'HOTEL NAME NOT CONFIGURED'}</h1>
               {config?.address && <p className="text-[0.75rem] text-gray-600 mt-0.5">{config.address}</p>}
               <div className="flex items-center gap-4 mt-1 text-[0.65rem] text-gray-500">
                  {config?.phone && <span>📱 {config.phone}</span>}
                  {config?.email && <span>✉️ {config.email}</span>}
                  {config?.website && <span>🌐 {config.website}</span>}
               </div>
            </div>

            {loading ? (
               <div className="flex justify-center py-20 text-gray-500 text-sm font-medium">Loading ledger data...</div>
            ) : activeTab === 'statement' ? (
               <>
                  {/* METADATA SUB-HEADER */}
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-4">
                     <div className="text-[0.65rem] leading-snug font-bold text-gray-700 uppercase w-full lg:w-auto">
                        <div className="text-xs text-indigo-700 mb-2">LEDGER BALANCE REPORT : {account.category?.toUpperCase() || account.type}</div>
                        <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-0.5">
                           <span className="text-gray-500">FISCAL YEAR :</span> <span>{config?.fiscalYear || '2023-2024'}</span>
                           <span className="text-gray-500">FROM DATE :</span> <span>{getFromDate()}</span>
                           <span className="text-gray-500">TO DATE :</span> <span>{getToDate()}</span>
                           <span className="text-gray-500">NAME :</span> <span className="break-words">{descriptionFilter || account.name}</span>
                           <span className="text-gray-500">PAN :</span> <span>{config?.pan || ''}</span>
                           <span className="text-gray-500">PHONE :</span> <span>{descriptionFilter ? (partyPurchases[0]?.supplierPhone || '') : ''}</span>
                           <span className="text-gray-500">ADDRESS :</span> <span className="break-words">{descriptionFilter ? (partyPurchases[0]?.supplierAddress || '') : ''}</span>
                        </div>
                     </div>
                     
                     {/* SUMMARY TABLE */}
                     <table className="w-full lg:w-[350px] border border-gray-300 text-[0.7rem] font-bold text-gray-800">
                        <tbody>
                           <tr className="border-b border-gray-300">
                              <td className="px-3 py-1.5 bg-gray-50 text-gray-600 w-1/3">Opening</td>
                              <td className="px-3 py-1.5 text-right">{formatBal(openingBalance)}</td>
                           </tr>
                           <tr className="border-b border-gray-300">
                              <td className="px-3 py-1.5 bg-gray-50 text-gray-600">Debit</td>
                              <td className="px-3 py-1.5 text-right">{formatCurrency(totalDebit)}</td>
                           </tr>
                           <tr className="border-b border-gray-300">
                              <td className="px-3 py-1.5 bg-gray-50 text-gray-600">Credit</td>
                              <td className="px-3 py-1.5 text-right">{formatCurrency(totalCredit)}</td>
                           </tr>
                           <tr>
                              <td className="px-3 py-1.5 bg-gray-50 text-gray-600">Closing</td>
                              <td className="px-3 py-1.5 text-right">{formatBal(closingBalance)}</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>

                  {/* MAIN TABLE */}
                  <div className="overflow-x-auto w-full">
                     <table className="w-full border border-gray-300 text-[0.7rem] text-gray-800 min-w-[700px]">
                        <thead>
                           <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase">
                              <th className="border-r border-gray-300 px-3 py-2 text-left w-[12%]">Transaction Date</th>
                              <th className="border-r border-gray-300 px-3 py-2 text-left w-[15%]">Voucher Number</th>
                              <th className="border-r border-gray-300 px-3 py-2 text-left">Description</th>
                              <th className="border-r border-gray-300 px-3 py-2 text-right w-[12%]">Debit</th>
                              <th className="border-r border-gray-300 px-3 py-2 text-right w-[12%]">Credit</th>
                              <th className="px-3 py-2 text-right w-[15%]">Balance</th>
                           </tr>
                        </thead>
                        <tbody>
                           {/* OPENING BALANCE ROW */}
                           <tr className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="border-r border-gray-200 px-3 py-2 text-gray-600">{getFromDate()}</td>
                              <td className="border-r border-gray-200 px-3 py-2"></td>
                              <td className="border-r border-gray-200 px-3 py-2 font-bold text-gray-900">Opening Balance</td>
                              <td className="border-r border-gray-200 px-3 py-2 text-right">
                                 {(!isDebitNormal && openingBalance < 0) || (isDebitNormal && openingBalance > 0) ? formatCurrency(Math.abs(openingBalance)) : '0.00'}
                              </td>
                              <td className="border-r border-gray-200 px-3 py-2 text-right">
                                 {(!isDebitNormal && openingBalance > 0) || (isDebitNormal && openingBalance < 0) ? formatCurrency(Math.abs(openingBalance)) : '0.00'}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">{formatBal(openingBalance)}</td>
                           </tr>

                           {/* ENTRIES */}
                           {filteredEntries.map((e, idx) => (
                              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                 <td className="border-r border-gray-200 px-3 py-2 text-gray-600 align-top">{formatDate(e.date)}</td>
                                 <td className="border-r border-gray-200 px-3 py-2 text-gray-700 align-top">{e.refId}</td>
                                 <td className="border-r border-gray-200 px-3 py-2 align-top">
                                    <div className="font-bold text-gray-900 mb-0.5">{descriptionFilter ? `${account.category?.toUpperCase() || account.type}; #${descriptionFilter};` : `${e.accountName};`}</div>
                                    <div className="text-gray-500 italic text-[0.65rem]">{e.description}</div>
                                 </td>
                                 <td className="border-r border-gray-200 px-3 py-2 text-right align-top">{e.Dr > 0 ? formatCurrency(e.Dr) : '0.00'}</td>
                                 <td className="border-r border-gray-200 px-3 py-2 text-right align-top">{e.Cr > 0 ? formatCurrency(e.Cr) : '0.00'}</td>
                                 <td className="px-3 py-2 text-right align-top font-medium">{formatBal(e.balanceAfter)}</td>
                              </tr>
                           ))}

                           {filteredEntries.length === 0 && (
                              <tr>
                                 <td colSpan={6} className="px-3 py-8 text-center text-gray-400 italic font-medium uppercase">No transactions found in this period.</td>
                              </tr>
                           )}
                        </tbody>
                        <tfoot>
                           <tr className="border-t border-gray-300 bg-gray-50 font-bold">
                              <td colSpan={3} className="border-r border-gray-300 px-3 py-2 text-right">Total</td>
                              <td className="border-r border-gray-300 px-3 py-2 text-right">{formatCurrency(totalDebit + ((!isDebitNormal && openingBalance < 0) || (isDebitNormal && openingBalance > 0) ? Math.abs(openingBalance) : 0))}</td>
                              <td className="border-r border-gray-300 px-3 py-2 text-right">{formatCurrency(totalCredit + ((!isDebitNormal && openingBalance > 0) || (isDebitNormal && openingBalance < 0) ? Math.abs(openingBalance) : 0))}</td>
                              <td className="px-3 py-2 text-right">{formatBal(closingBalance)}</td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </>
            ) : (
               <div className="text-center py-20 text-gray-500">
                  Invoice list tab content...
               </div>
            )}

            {/* FOOTER */}
            <div className="mt-8 flex justify-between items-end text-[0.65rem] font-bold text-gray-700">
               <div>
                  <div>Generated By: {currentUser?.name || 'ADMIN'}</div>
                  <div>Generated On: {mounted ? new Date().toLocaleString('en-GB') : ''}</div>
               </div>
               <div className="text-right">
               </div>
            </div>

         </div>
      </motion.div>
    </div>
  );
}
