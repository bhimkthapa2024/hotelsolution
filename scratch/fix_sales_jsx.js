const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'sales', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '<div className="col-span-12 lg:col-span-4 space-y-6">';
const sectionStart = content.indexOf(startMarker);

const endMarker = '<SuccessModal';
const sectionEnd = content.indexOf(endMarker);

if (sectionStart === -1 || sectionEnd === -1) {
    console.error("Markers not found", { sectionStart, sectionEnd });
    process.exit(1);
}

const before = content.substring(0, sectionStart);
const after = content.substring(sectionEnd);

const replacement = `
         <div className="col-span-12 lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-[var(--radius-lg)] text-slate-900 border border-slate-200 shadow-[0_20px_50px_-15px_rgba(79,70,229,0.12)] relative overflow-hidden group">
               <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                     <div>
                        <h3 className="text-xl font-black tracking-tighter uppercase italic text-indigo-950">Fiscal Registry Summary</h3>
                        <p className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time consolidated revenue audit</p>
                     </div>
                     <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-[var(--radius-sm)] text-[0.5rem] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-200">Final Ledger Parity</div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="flex flex-col bg-slate-50/50 p-3 rounded-[var(--radius-md)] border border-slate-100">
                       <span className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest mb-1.5 ">Revenue Base</span>
                       <span className="text-[0.8rem] font-black text-slate-950 tracking-tighter">{form.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex flex-col bg-slate-50/50 p-3 rounded-[var(--radius-md)] border border-slate-100">
                       <span className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest mb-1.5 ">Service Levy (10%)</span>
                       <span className="text-[0.8rem] font-black text-slate-950 tracking-tighter">{form.sc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex flex-col bg-slate-50/50 p-3 rounded-[var(--radius-md)] border border-slate-100">
                       <span className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest mb-1.5 ">Fed. VAT (13%)</span>
                       <span className="text-[0.8rem] font-black text-slate-950 tracking-tighter">{form.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950 rounded-[var(--radius-md)] relative overflow-hidden group/total mb-8">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover/total:bg-white/10 transition-all duration-700 pointer-events-none" />
                     <p className="text-[0.55rem] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 text-center italic ">Net Consolidated Folio Total</p>
                     <div className="text-4xl font-black tracking-tighter text-center text-white italic leading-none flex items-baseline justify-center gap-2">
                        <span className="text-[0.6rem] text-slate-500 not-italic tracking-[0.2em] mb-1">Rs.</span>
                        {form.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </div>
                     <p className="text-[0.4rem] font-black text-indigo-400 uppercase tracking-[0.5em] mt-4 text-center border-t border-white/5 pt-3 mb-0">NPR Institutional Value Only</p>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between mb-2">
                        <label className="text-[0.45rem] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 ">Settlement Partition Table</label>
                        <button 
                          type="button"
                          onClick={addSettlement}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-[var(--radius-sm)] text-[0.45rem] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                           <Plus className="w-3 h-3" /> Insert Split
                        </button>
                     </div>

                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-hide">
                         {form.settlements.map((s, idx) => (
                            <div key={idx} className="bg-slate-50/50 border border-slate-100 p-3 rounded-[var(--radius-md)] space-y-2 relative group">
                              <div className="flex items-center justify-between">
                                 <span className="text-[0.4rem] font-black text-slate-300 uppercase tracking-widest">Entry #{idx + 1}</span>
                                 {form.settlements.length > 1 && (
                                   <button 
                                     type="button" 
                                     onClick={() => removeSettlement(idx)}
                                     className="p-1 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                   >
                                      <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                              </div>
                              <div className="grid grid-cols-5 gap-3">
                                 <div className="col-span-3 relative">
                                    <select 
                                       value={s.mode}
                                       onChange={(e) => updateSettlement(idx, 'mode', e.target.value)}
                                       className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-[var(--radius-sm)] font-black text-[0.6rem] uppercase text-indigo-900 outline-none focus:border-indigo-600 transition-all appearance-none cursor-pointer shadow-sm"
                                    >
                                       {config?.paymentModes?.map((mode) => {
                                          const l = typeof mode === 'string' ? mode : mode.label;
                                          return <option key={l} value={l}>{l.toUpperCase()}</option>
                                       })}
                                       <option value="Bill to Company">CITY LEDGER (B2C)</option>
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-3 w-3 h-3 text-slate-300 pointer-events-none" />
                                 </div>
                                 <div className="col-span-2">
                                    <input 
                                       type="number"
                                       value={s.amount || ''}
                                       onChange={(e) => updateSettlement(idx, 'amount', parseFloat(e.target.value) || 0)}
                                       className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-[var(--radius-sm)] font-black text-[0.7rem] text-slate-950 text-right tracking-tighter outline-none focus:border-indigo-600 transition-all shadow-sm"
                                       placeholder="0.00"
                                    />
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>

                      <div className="p-6 bg-indigo-900 border border-indigo-800 rounded-[var(--radius-lg)] flex items-center justify-between shadow-2xl group/parity relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover/parity:bg-white/10 transition-all duration-700" />
                          <div className="flex flex-col relative z-10">
                             <span className="text-[0.4rem] font-black text-indigo-300 uppercase tracking-[0.4em] leading-none mb-2 italic">Institutional Settlement Parity Monitor</span>
                             <span className="text-[0.65rem] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5" /> Variance Discrepancy: <span className={Math.abs(form.amount - form.settlements.reduce((sum, s) => sum + (s.amount || 0), 0)) > 0.01 ? 'text-rose-400 underline decoration-rose-300' : 'text-white'}>{ (form.amount - form.settlements.reduce((sum, s) => sum + (s.amount || 0), 0)).toLocaleString() }</span>
                             </span>
                          </div>
                          <div className="text-right relative z-10">
                             <span className="text-[1.1rem] font-black text-white tracking-tighter italic">Total. {form.settlements.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString()}</span>
                          </div>
                      </div>

                      <button 
                         type="submit" 
                         disabled={loading || form.amount <= 0.01 || Math.abs(form.amount - form.settlements.reduce((sum, s) => sum + (s.amount || 0), 0)) > 0.01}
                         className="w-full py-3.5 bg-slate-900 border border-slate-800 text-white font-black text-[0.8rem] uppercase tracking-[0.4em] rounded-[var(--radius-lg)] hover:bg-indigo-600 transition-all flex items-center justify-center gap-4 group/btn shadow-[0_15px_40px_-15px_rgba(30,41,59,0.5)] disabled:opacity-5 disabled:grayscale grayscale-0 hover:grayscale-0 relative overflow-hidden group/archive"
                       >
                          <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover/archive:translate-x-0 transition-transform duration-700 pointer-events-none" />
                          <div className="relative z-10 flex items-center gap-4">
                             {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Archive className="w-4 h-4 group-hover/archive:scale-110 transition-transform text-indigo-400" />}
                             <span className="italic">{loading ? 'SYNCHRONIZING...' : 'SAVE'}</span>
                          </div>
                       </button>
                  </div>
               </div>
            </section>
         </div>
      </form>
`;

fs.writeFileSync(filePath, before + replacement + after);
console.log("Success: Corrected structural errors.");
