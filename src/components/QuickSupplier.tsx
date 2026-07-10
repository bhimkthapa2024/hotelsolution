'use client';

import { useState, useEffect } from 'react';
import { Building2, User, Phone, Mail, MapPin, Hash, Save, X, Link } from 'lucide-react';
import { upsertSupplier, getAccounts } from '@/actions/hotel';
import { cn } from '@/lib/utils';
import Combobox from '@/components/Combobox';

interface QuickSupplierProps {
  onSuccess: () => void;
}

export default function QuickSupplier({ onSuccess }: QuickSupplierProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    pan: '',
    notes: '',
    accountId: ''
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await getAccounts();
        setAccounts(data || []);
      } catch (e) {
        console.error("QuickSupplier Accounts Load Error:", e);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    
    setLoading(true);
    try {
      const res = await upsertSupplier(form);
      if (res.success) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3 text-rose-500" /> Vendor Narrative Title
            </label>
            <input 
              required
              type="text" 
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value.toUpperCase()})}
              placeholder="ENTER CORPORATE LEGAL TITLE"
              className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-[var(--radius-sm)] outline-none focus:border-rose-600 focus:bg-white font-black text-slate-950 text-[0.7rem] uppercase transition-all shadow-inner"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3 text-slate-400" /> Liaison Officer
            </label>
            <input 
              type="text" 
              value={form.contactPerson}
              onChange={(e) => setForm({...form, contactPerson: e.target.value.toUpperCase()})}
              placeholder="CONTACT PERSON NAME"
              className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-[var(--radius-sm)] outline-none focus:border-rose-600 focus:bg-white font-black text-slate-950 text-[0.7rem] uppercase transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Phone className="w-3 h-3 text-slate-400" /> Primary PH
            </label>
            <input 
              type="text" 
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
              placeholder="+977"
              className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-[var(--radius-sm)] outline-none focus:border-rose-600 focus:bg-white font-black text-slate-950 text-[0.7rem] uppercase transition-all shadow-inner"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-3 h-3 text-slate-400" /> Digital Archive
            </label>
            <input 
              type="email" 
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value.toLowerCase()})}
              placeholder="VENDOR@OFFICIAL.COM"
              className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-[var(--radius-sm)] outline-none focus:border-rose-600 focus:bg-white font-black text-slate-950 text-[0.7rem] uppercase transition-all shadow-inner"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Hash className="w-3 h-3 text-rose-500" /> PAN / VAT ID
            </label>
            <input 
              type="text" 
              value={form.pan}
              onChange={(e) => setForm({...form, pan: e.target.value})}
              placeholder="TAX IDENTITY"
              className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-[var(--radius-sm)] outline-none focus:border-rose-600 focus:bg-white font-black text-slate-950 text-[0.7rem] uppercase transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3 text-slate-400" /> Geographical Vector
          </label>
          <input 
            type="text" 
            value={form.address}
            onChange={(e) => setForm({...form, address: e.target.value.toUpperCase()})}
            placeholder="STREET / CITY / COUNTRY"
            className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-[var(--radius-sm)] outline-none focus:border-rose-600 focus:bg-white font-black text-slate-950 text-[0.7rem] uppercase transition-all shadow-inner"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[0.45rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Link className="w-3 h-3 text-rose-500" /> Link Institutional Ledger Mapping (Financial Head)
          </label>
          <Combobox
             value={form.accountId}
             onChange={(val) => setForm({...form, accountId: val})}
             options={[
                { label: '-- NO_LEDGER_MAPPING --', value: '' },
                ...accounts.filter(a => a.type === 'LIABILITY').map(a => ({ label: `${a.code} - ${a.name}`, value: a.id }))
             ]}
             className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-[var(--radius-sm)] outline-none focus:border-rose-600 focus:bg-white font-black text-slate-950 text-[0.65rem] uppercase transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
         <button 
           type="submit" 
           disabled={loading || !form.name}
           className="px-6 h-10 bg-rose-600 hover:bg-slate-950 text-white font-black text-[0.6rem] uppercase tracking-[0.2em] rounded-[var(--radius-sm)] shadow-lg shadow-rose-900/10 transition-all flex items-center gap-2 disabled:opacity-30 active:scale-95"
         >
            <Save className="w-3.5 h-3.5" />
            {loading ? 'POSTING...' : 'ARCHIVE PROFILE'}
         </button>
      </div>
    </form>
  );
}
