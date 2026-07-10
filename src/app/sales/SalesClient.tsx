'use client';

import { useEffect, useState, useMemo } from 'react';
import { getRooms, getConfig, getAccounts, postSale, getGuestProfiles, getDebtors, upsertDebtor, getEmployees, getUnpaidBillToRoomSales } from '@/actions/hotel';
import { formatCurrency, cn, handleEnterAsTab, formatDate } from '@/lib/utils';
import { 
  Plus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Building2, 
  User, 
  BedDouble, 
  FileText,
  Save,
  Calculator,
  Zap,
  CheckCircle2,
  Printer,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Hash,
  Layers,
  Search,
  ShieldCheck,
  RefreshCcw,
  Globe,
  Phone,
  Mail, Calendar, Archive, History as HistoryIcon, Briefcase, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BillPreview from '@/components/BillPreview';
import { useRouter } from 'next/navigation';
import SuccessModal from '@/components/SuccessModal';
import PageBanner from '@/components/PageBanner';
import { SalesSkeleton } from '@/components/Skeleton';
import Combobox from '@/components/Combobox';

const NATIONALITIES = [
  "NEPALESE", "INDIAN", "CHINESE", "AMERICAN", "BRITISH", "AUSTRALIAN", 
  "CANADIAN", "FRENCH", "GERMAN", "JAPANESE", "SOUTH KOREAN", 
  "SPANISH", "ITALIAN", "DUTCH", "SWISS", "BANGLADESHI", "SRI LANKAN",
  "PAKISTANI", "BHUTANESE", "MALDIVIAN", "THAI", "MALAYSIAN", "SINGAPOREAN",
  "SAUDI ARABIAN", "EMIRATI", "QATARI", "KUWAITI", "OMANI", "BAHRAINI",
  "EGYPTIAN", "TURKISH", "SOUTH AFRICAN", "BRAZILIAN", "ARGENTINE", 
  "MEXICAN", "RUSSIAN", "OTHER"
];
const SORTED_NATIONALITIES = ["NEPALESE", "INDIAN", "CHINESE", ...NATIONALITIES.filter(n => n !== "NEPALESE" && n !== "INDIAN" && n !== "CHINESE").sort()].map(n => ({ label: n, value: n }));

export default function SalesClient({
  initialRooms,
  initialAccounts,
  initialGuestProfiles,
  initialDebtors,
  initialEmployees,
  initialConfig
}: {
  initialRooms: any[];
  initialAccounts: any[];
  initialGuestProfiles: any[];
  initialDebtors: any[];
  initialEmployees: any[];
  initialConfig: any;
}) {
  const [showQuickDebtor, setShowQuickDebtor] = useState(false);
  const [newQuickDebtor, setNewQuickDebtor] = useState<any>({ name: '', type: 'CORPORATE', phone: '', email: '', address: '', pan: '', creditLimit: 0, creditDays: 30, accountId: '', contactPerson: '', openingBalance: 0, notes: '' });
  const [activeSettlementIdx, setActiveSettlementIdx] = useState<number | null>(null);
  const [activeRoomSelectIdx, setActiveRoomSelectIdx] = useState<number | null>(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [showPostConfirm, setShowPostConfirm] = useState(false);

  useEffect(() => {
    setRoomSearchQuery('');
  }, [activeRoomSelectIdx]);

  const handleQuickSaveDebtor = async () => {
    if (!newQuickDebtor.name) return;
    const res = await upsertDebtor(newQuickDebtor);
    const updatedDebtors = await getDebtors();
    setDebtors(updatedDebtors);
    
    // Auto-select in the active settlement
    if (activeSettlementIdx !== null) {
      const d = updatedDebtors.find(deb => deb.name === newQuickDebtor.name);
      if (d) {
        const newSettlements = [...form.settlements];
        newSettlements[activeSettlementIdx] = { 
           ...newSettlements[activeSettlementIdx], 
           debtorId: d.id,
           debtorName: d.name,
           debtorAccountId: d.accountId || 'Accounts Receivable'
        };
        setForm((prev: any) => ({ ...prev, settlements: newSettlements }));
      }
    }
    
    setShowQuickDebtor(false);
    setNewQuickDebtor({ name: '', type: 'CORPORATE', phone: '', email: '', address: '', pan: '', creditLimit: 0, creditDays: 30, accountId: '', contactPerson: '', openingBalance: 0, notes: '' });
  };
  const handleGuestSelect = (profile: any) => {
    setForm((prev: any) => ({
      ...prev,
      guest: profile.guest.toUpperCase(),
      phone: profile.phone || prev.phone,
      email: profile.email || prev.email,
      pan: profile.pan || prev.pan,
      address: profile.address || prev.address,
      nationality: profile.nationality || prev.nationality,
      passportNo: profile.passportNo || prev.passportNo,
      passportPlace: profile.passportPlace || prev.passportPlace
    }));
    setShowGuestSuggestions(false);
  };

  const [rooms, setRooms] = useState<any[]>(initialRooms);
  const [accounts, setAccounts] = useState<any[]>(initialAccounts);
  const [guestProfiles, setGuestProfiles] = useState<any[]>(initialGuestProfiles);
  const [debtors, setDebtors] = useState<any[]>(initialDebtors);
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const [config, setConfig] = useState<any>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [liveBillToRoomSales, setLiveBillToRoomSales] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const openImportModal = async () => {
     setImportSearch('');
     setShowImportModal(true);
     setImportLoading(true);
     try {
        const bills = await getUnpaidBillToRoomSales();
        setLiveBillToRoomSales(bills);
     } catch (e) {
        console.error('Failed to load Bill to Room sales:', e);
        setLiveBillToRoomSales([]);
     } finally {
        setImportLoading(false);
     }
  };

  // Scans ALL guest profiles for any sale settled as "Bill to Room" that is still Unpaid
  const getAllUnpaidBillToRoomCharges = () => {
     return liveBillToRoomSales.map(s => {
        const roomSt = s.settlements?.find((st: any) => st.mode === 'Bill to Room');
        return { ...s, billedToRoom: roomSt?.roomNumber || roomSt?.roomId || 'Unknown', guestName: s.guest };
     });
  };

  const handleImportBill = (bill: any) => {
     const newItems = [...form.items];
     if (newItems.length === 1 && !newItems[0].category && newItems[0].amount === 0) {
        newItems.pop();
     }
     
     if (bill.items && bill.items.length > 0) {
        bill.items.forEach((i: any) => {
           newItems.push({
              ...i,
              isImported: true,
              originalSaleId: bill.id,
              note: i.note ? `${i.note} [Imported]` : '[Imported from previous]'
           });
        });
     } else {
        newItems.push({
           category: 'Imported Room Charge',
           rate: bill.amount,
           qty: 1,
           amount: bill.amount,
           note: `[Imported from ${bill.id}]`,
           isImported: true,
           originalSaleId: bill.id
        });
     }
     
     setForm({ ...form, items: newItems });
     calculateTotals(newItems, form.applySC, form.applyVat, form.discount);
     setShowImportModal(false);
     setImportSearch('');
  };

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [entryMode, setEntryMode] = useState<'standard' | 'quick'>('standard');
  const canProceedToStep2 = () => {
    return !!form.guest;
  };

  const canProceedToStep3 = () => {
    if (form.items.length === 0) return false;
    const hasZeroOrEmptyAmount = form.items.some((item: any) => !item.amount || parseFloat(item.amount) <= 0);
    return !hasZeroOrEmptyAmount;
  };

  const canProceedToStep4 = () => {
    const diff = Math.abs(form.amount - settlementTotal);
    return diff < 0.01;
  };

  const router = useRouter();

  const [form, setForm] = useState<any>({
    guest: '',
    phone: '',
    email: '',
    pan: '',
    address: '',
    roomNumber: '',
    amount: 0,
    tax: 0,
    sc: 0,
    subtotal: 0,
    status: 'Paid',
    paymentMode: 'Cash',
    items: [{ category: '', rate: 0, qty: 1, amount: 0, note: '', roomNumber: '' }],
    settlements: [{ mode: 'Cash', amount: 0, status: 'Paid' }],
    pax: '1',
    nationality: 'NEPALESE',
    arrivalDate: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
    departureDate: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
    plan: '',
    passportNo: '',
    passportIssue: '',
    passportExpiry: '',
    passportPlace: '',
    date: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
    applySC: true,
    applyVat: true,
    discount: 0,
  });

  const isRoomCategory = (categoryName: string) => {
    if (!categoryName) return false;
    const nameUpper = categoryName.toUpperCase();
    if (nameUpper.includes('ACCOMMODATION') || nameUpper.includes('ROOM')) return true;
    const acc = accounts.find(a => a.name?.toUpperCase() === nameUpper);
    if (acc) {
      if (acc.parentId === 'ACC-4100' || acc.parentId === 'ACC-Accommodation Revenue') return true;
      if (acc.code?.startsWith('4100')) return true;
    }
    return false;
  };

  const isSpaOrMassageCategory = (categoryName: string) => {
    if (!categoryName) return false;
    const nameUpper = categoryName.toUpperCase();
    if (nameUpper.includes('SPA') || nameUpper.includes('MASSAGE') || nameUpper.includes('THERAPY') || nameUpper.includes('WELLNESS')) return true;
    
    const acc = accounts.find((a: any) => a.name?.toUpperCase() === nameUpper);
    if (acc && acc.parentId) {
      const parent = accounts.find((a: any) => a.id === acc.parentId);
      if (parent) {
        const pName = parent.name?.toUpperCase() || '';
        return pName.includes('SPA') || pName.includes('MASSAGE') || pName.includes('THERAPY') || pName.includes('WELLNESS');
      }
    }
    return false;
  };

  const isTicketCategory = (categoryName: string) => {
    if (!categoryName) return false;
    const nameUpper = categoryName.toUpperCase();
    return nameUpper.includes('TICKET');
  };

  // Derive spa treatments from ledger: children of any SPA SALES parent account
  const spaChildAccounts = useMemo(() => {
    const spaParent = accounts.find((a: any) => isSpaOrMassageCategory(a.name) && !a.parentId);
    if (!spaParent) {
      // Fallback: look for any account whose parentId points to a spa-like parent
      return accounts.filter((a: any) => {
        if (!a.parentId) return false;
        const parent = accounts.find((p: any) => p.id === a.parentId);
        return parent && isSpaOrMassageCategory(parent.name);
      });
    }
    return accounts.filter((a: any) => a.parentId === spaParent.id);
  }, [accounts]);

  const postableAccounts = useMemo(() => {
    const parentIds = new Set(accounts.filter((a: any) => a.parentId).map((a: any) => a.parentId));
    // Find the spa parent account
    const spaParent = accounts.find((a: any) => isSpaOrMassageCategory(a.name) && !a.parentId);
    const spaParentId = spaParent?.id;

    const list = accounts.filter((a: any) => {
      if (a.type !== 'REVENUE') return false;
      // Removed the restriction so users CAN post to classification heads if desired
      return true;
    });



    // Ensure SPA SALES always exists in the list
    const hasSpa = list.some(a => isSpaOrMassageCategory(a.name));
    if (!hasSpa) {
      list.push({
        id: 'ACC-4300',
        code: '4300',
        name: 'SPA SALES',
        type: 'REVENUE',
        category: 'OPERATING INCOME'
      });
    }
    return list;
  }, [accounts, accounts.length]);

  const postableAccountOptions = useMemo(() => {
    return postableAccounts.map((a: any) => {
      const parent = accounts.find((p: any) => p.id === a.parentId);
      const parentStr = parent ? `${parent.name.toUpperCase()} › ` : '';
      return {
          label: `${parentStr}${a.name.toUpperCase()}`,
          value: a.name
      };
    });
  }, [postableAccounts, accounts]);

  const getHeaderLabels = () => {
    const firstCategory = form.items[0]?.category || '';
    if (isRoomCategory(firstCategory)) {
      return {
        qty: 'Number of nights',
        rate: 'Room Rate (Rs.)'
      };
    }
    if (isSpaOrMassageCategory(firstCategory)) {
      return {
        qty: 'No. of Packages',
        rate: 'Package Rate (Rs.)'
      };
    }
    if (isTicketCategory(firstCategory)) {
      return {
        qty: 'No. of Tickets',
        rate: 'Ticket Rate (Rs.)'
      };
    }
    return {
      qty: 'Quantity',
      rate: 'Rate (Rs.)'
    };
  };

  const settlementTotal = form.settlements.reduce((sum: number, s: any) => sum + (parseFloat(s.amount as any) || 0), 0);

  useEffect(() => {
      const configData = config;
      if (configData?.businessDate && configData.businessDate !== '1970-01-01') {
        setForm((prev: any) => ({ ...prev, date: configData.businessDate }));
      }
      
      if (configData?.paymentModes?.length > 0) {
        const firstMode = configData.paymentModes[0];
        const first = typeof firstMode === 'string' ? firstMode : (firstMode?.label || 'Cash');
        
        // Dynamically compute default postable room sales category
        const parentIds = new Set(accounts.filter((acc: any) => acc.parentId).map((acc: any) => acc.parentId));
        const postables = accounts.filter((acc: any) => acc.type === 'REVENUE' && !parentIds.has(acc.id));
        const defaultPostable = postables.find((acc: any) => acc.name.toUpperCase().includes('ROOM') || acc.name.toUpperCase().includes('ACCOMMODATION')) || postables[0];
        const defaultCategory = defaultPostable?.name || 'ROOM SALES';

        setForm((prev: any) => ({
          ...prev, 
          paymentMode: first, 
          settlements: [{ ...prev.settlements[0], mode: first }],
          applySC: configData.applyServiceCharge ?? true,
          applyVat: configData.applyVat ?? true,
          plan: configData.stayPlans?.[0]?.id || '',
          items: prev.items.map((item: any, i: number) => i === 0 ? { ...item, category: '' } : item)
        }));
      }

      // Check for edit source (Deferred Correction)
      const editSource = sessionStorage.getItem('edit_source');
      if (editSource) {
         try {
            const data = JSON.parse(editSource);
            setForm((prev: any) => ({ 
               ...prev, 
               ...data, 
               id: undefined, 
               isVoided: false, 
               voidReason: undefined, 
               voidedAt: undefined,
               originalId: data.originalId,
               date: configData?.businessDate || data.date 
            }));
            sessionStorage.removeItem('edit_source');
         } catch(e) {
            console.error("EDIT_HYDRATION_ERROR:", e);
         }
      } else {
         const draftSource = localStorage.getItem('hotelmgmt_sales_draft');
         if (draftSource) {
            try {
               const draft = JSON.parse(draftSource);
               if (draft.form) setForm(draft.form);
               if (draft.currentStep) setCurrentStep(draft.currentStep);
            } catch(e) {
               console.error("DRAFT_HYDRATION_ERROR:", e);
            }
         }
      }
  }, []);

  useEffect(() => {
    if (form.originalId) return; // Don't auto-save if we're editing an existing transaction
    if (form.guest || form.amount > 0 || currentStep > 1) {
       localStorage.setItem('hotelmgmt_sales_draft', JSON.stringify({ form, currentStep }));
    }
  }, [form, currentStep]);

  const calculateTotals = (items: any[], applySC = form.applySC, applyVat = form.applyVat, discount = form.discount || 0) => {
    const scRate = (config?.applyServiceCharge && applySC) ? (config?.serviceChargeRate || 10) / 100 : 0;
    const vatRate = (config?.applyVat && applyVat) ? (config?.vatRate || 13) / 100 : 0;
    const isInclusive = !!config?.taxInclusive;

    const rawSubtotal = items.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
    
    let subtotal = rawSubtotal;
    let serviceCharge = 0;
    let tax = 0;
    let total = rawSubtotal;

    if (isInclusive) {
      // Reverse Calculate
      const discountedTotal = Math.max(0, rawSubtotal - discount);
      const factor = (1 + scRate) * (1 + vatRate);
      subtotal = discountedTotal / factor;
      serviceCharge = subtotal * scRate;
      tax = (subtotal + serviceCharge) * vatRate;
      total = discountedTotal;
    } else {
      const discountedSubtotal = Math.max(0, rawSubtotal - discount);
      subtotal = discountedSubtotal;
      serviceCharge = discountedSubtotal * scRate;
      tax = (discountedSubtotal + serviceCharge) * vatRate;
      total = discountedSubtotal + serviceCharge + tax;
    }
    
    // Compile Logic with Decimal Parity
    const cSubtotal = parseFloat(subtotal.toFixed(2));
    const cSC = parseFloat(serviceCharge.toFixed(2));
    const cTax = parseFloat(tax.toFixed(2));
    const cTotal = parseFloat(total.toFixed(2));

    setForm((prev: any) => ({ 
      ...prev, 
      items, 
      applySC,
      applyVat,
      discount,
      subtotal: cSubtotal, 
      sc: cSC, 
      tax: cTax, 
      amount: cTotal,
      settlements: prev.settlements.length === 1 
        ? [{ ...prev.settlements[0], amount: cTotal }]
        : prev.settlements
    }));
  };

  const addItem = () => {
    const hasZeroOrEmptyAmount = form.items.some((item: any) => !item.amount || parseFloat(item.amount) <= 0);
    if (hasZeroOrEmptyAmount) {
      alert("PLEASE ENTER THE AMOUNT FOR the CURRENT SERVICE CLASSIFICATION BEFORE ADDING A NEW ROW.");
      return;
    }

    const newItems = [...form.items, { category: '', rate: 0, qty: 1, amount: 0, note: '', roomNumber: '' }];
    calculateTotals(newItems, form.applySC, form.applyVat, form.discount);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...form.items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'category') {
      const selectedAcc = accounts.find((a: any) => a.name === value);
      const itemRate = selectedAcc ? (selectedAcc.creditLimit || 0) : 0;
      
      const rateToUse = itemRate > 0 ? itemRate : (parseFloat(item.rate) || 0);
      const qtyToUse = parseFloat(item.qty) || 1;

      if (isSpaOrMassageCategory(value)) {
        item.rate = rateToUse;
        item.amount = rateToUse * qtyToUse;
      } else {
        delete item.employeeId;
        delete item.employeeName;
        delete item.commissionRate;
        item.rate = rateToUse;
        item.amount = rateToUse * qtyToUse;
      }
    }

    if (field === 'roomNumber') {
      if (isRoomCategory(item.category)) {
         const selectedRoomNums = value ? value.split(',').map((r: string) => r.trim()).filter(Boolean) : [];
         const totalRate = rooms
           .filter(r => selectedRoomNums.includes(r.number?.toString()))
           .reduce((sum, r) => sum + (r.rate || 0), 0);
         item.rate = totalRate;
      }
    }

    if (field === 'rate' || field === 'qty' || field === 'roomNumber') {
      const rate = parseFloat(item.rate) || 0;
      const qty = parseFloat(item.qty) || 0;
      item.amount = parseFloat((rate * qty).toFixed(2));
    }

    newItems[index] = item;

    const roomsList = newItems
      .filter(it => isRoomCategory(it.category))
      .map(it => it.roomNumber || '')
      .flatMap(rn => rn.split(',').map((r: string) => r.trim()))
      .filter(Boolean);

    setForm((prev: any) => ({ ...prev, roomNumber: Array.from(new Set(roomsList)).join(', ') }));

    calculateTotals(newItems, form.applySC, form.applyVat, form.discount);
  };

  const removeItem = (index: number) => {
    const newItems = form.items.filter((_: any, i: number) => i !== index);
    calculateTotals(newItems, form.applySC, form.applyVat, form.discount);
  };

  const addSettlement = () => {
    const firstMode = config?.paymentModes?.[0];
    const defaultMode = typeof firstMode === 'string' ? firstMode : (firstMode?.label || 'Cash');
    setForm((prev: any) => ({
      ...prev,
      settlements: [...prev.settlements, { mode: defaultMode, amount: 0, status: 'Paid' }]
    }));
  };

  const updateSettlement = (index: number, field: string, value: any) => {
    const newSettlements = [...form.settlements];
    let updated = { ...newSettlements[index], [field]: value };
    // Clear stale fields when switching mode
    if (field === 'mode') {
      if (value === 'Bill to Room') {
        // Clear debtor info
        updated = { ...updated, debtorId: '', debtorName: '', debtorAccountId: '' };
      } else if (newSettlements[index].mode === 'Bill to Room') {
        // Switching away from Bill to Room — clear room info
        updated = { ...updated, roomId: '', roomNumber: '' };
      } else if (value !== 'Bill to Company') {
        // Switching to a cash/card mode — clear both
        updated = { ...updated, debtorId: '', debtorName: '', debtorAccountId: '', roomId: '', roomNumber: '' };
      }
    }
    newSettlements[index] = updated;
    setForm((prev: any) => ({ ...prev, settlements: newSettlements }));
  };

  const removeSettlement = (index: number) => {
    if (form.settlements.length <= 1) return;
    setForm((prev: any) => ({
      ...prev,
      settlements: prev.settlements.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleRoomSelect = (number: string) => {
    if (!number) {
        setForm((prev: any) => ({ ...prev, roomNumber: '' }));
        return;
    }

    const currentRooms = form.roomNumber ? form.roomNumber.split(',').map((r: string) => r.trim()) : [];
    const isSelected = currentRooms.includes(number);
    let newRoomsArr = [];

    if (isSelected) {
      newRoomsArr = currentRooms.filter((r: string) => r !== number);
    } else {
      newRoomsArr = [...currentRooms, number];
    }

    const newRooms = newRoomsArr.join(', ');
    const totalRate = rooms
      .filter(r => newRoomsArr.includes(r.number?.toString()))
      .reduce((sum, r) => sum + (r.rate || 0), 0);

    const newItems = [...form.items];
    if (newRoomsArr.length > 0 && newItems[0].category === 'Accommodation Revenue') {
       newItems[0] = { ...newItems[0], amount: totalRate };
    }

    setForm((prev: any) => ({ ...prev, roomNumber: newRooms, items: newItems }));
    calculateTotals(newItems, form.applySC, form.applyVat, form.discount);
  };

  const confirmAndPostSale = async () => {
    setShowPostConfirm(false);
    setLoading(true);
    try {
      const postingForm = {
        ...form,
        items: form.items.map((item: any) => {
          return item;
        })
      };
      const res = await postSale(postingForm);
      if (res.success) {
        localStorage.removeItem('hotelmgmt_sales_draft');
        const finalSale = { ...form, id: res.id || '', date: form.date || new Date().toISOString() };
        setLastSale(finalSale);
        setIsSuccessModalOpen(true);
      } else {
        alert("Failed to post sale: " + (res.error || "Unknown error"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Error posting sale: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) return;
    setShowPostConfirm(true);
  };

  const resetForm = () => {
    localStorage.removeItem('hotelmgmt_sales_draft');
    setIsSuccessModalOpen(false);
    setCurrentStep(entryMode === 'quick' ? 2 : 1);
    
    const parentIds = new Set(accounts.filter((a: any) => a.parentId).map((a: any) => a.parentId));
    const postables = accounts.filter((a: any) => a.type === 'REVENUE' && !parentIds.has(a.id));
    const defaultPostable = postables.find((acc: any) => acc.name.toUpperCase().includes('ROOM') || acc.name.toUpperCase().includes('ACCOMMODATION')) || postables[0];
    const defaultCategory = defaultPostable?.name || 'ROOM SALES';

    const firstMode = config?.paymentModes?.[0];
    const defaultMode = typeof firstMode === 'string' ? firstMode : (firstMode?.label || 'Cash');

    setForm({
      guest: entryMode === 'quick' ? 'WALK-IN GUEST' : '', phone: '', email: '', pan: '', address: '', roomNumber: '',
      amount: 0, tax: 0, sc: 0, subtotal: 0, status: 'Paid', paymentMode: defaultMode,
      items: [{ category: defaultCategory, rate: 0, qty: 1, amount: 0, note: '', roomNumber: '' }],
      settlements: [{ mode: defaultMode, amount: 0, status: 'Paid' }],
      pax: '1', nationality: 'NEPALESE', plan: config?.stayPlans?.[0]?.id || '',
      arrivalDate: new Date().toISOString().split('T')[0],
      departureDate: new Date().toISOString().split('T')[0],
      passportNo: '', passportIssue: '', passportExpiry: '', passportPlace: '',
      date: config?.businessDate || '',
      applySC: config?.applyServiceCharge ?? true,
      applyVat: config?.applyVat ?? true,
      discount: 0
    });
  };

  if (loading && !rooms.length) return <SalesSkeleton />;

  return (
    <div className="p-4 max-w-[1450px] mx-auto min-h-screen bg-slate-50">
      <BillPreview 
        isOpen={showBill} 
        onClose={() => setShowBill(false)} 
        sale={lastSale} 
        config={config} 
      />


      <AnimatePresence>
         {showImportModal && (() => {
            const allBills = getAllUnpaidBillToRoomCharges();
            const filtered = importSearch
               ? allBills.filter(b =>
                    (b.billedToRoom || '').toLowerCase().includes(importSearch.toLowerCase()) ||
                    (b.guestName || '').toLowerCase().includes(importSearch.toLowerCase()) ||
                    (b.guest || '').toLowerCase().includes(importSearch.toLowerCase()) ||
                    (b.date || '').includes(importSearch) ||
                    (b.id || '').toLowerCase().includes(importSearch.toLowerCase())
                 )
               : allBills;
            return (
               <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[var(--radius-md)] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
                     <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                           <Download className="w-4 h-4 text-indigo-400" />
                           <div>
                              <h3 className="text-[0.8rem] font-black uppercase tracking-widest">Import Room Charges</h3>
                              <p className="text-[0.45rem] text-white/50 uppercase tracking-widest mt-0.5">All unpaid Bill-to-Room bills across hotel</p>
                           </div>
                        </div>
                        <button onClick={() => { setShowImportModal(false); setImportSearch(''); }} className="text-white/50 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                     </div>
                     {/* Search bar */}
                     <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[var(--radius-sm)] px-3 h-9">
                           <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                           <input
                              autoFocus
                              type="text"
                              value={importSearch}
                              onChange={e => setImportSearch(e.target.value)}
                              placeholder="SEARCH BY ROOM, GUEST NAME, DATE..."
                              className="flex-1 bg-transparent outline-none font-bold text-slate-950 text-[0.6rem] uppercase placeholder:opacity-40"
                           />
                           {importSearch && <button onClick={() => setImportSearch('')} className="text-slate-300 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
                        </div>
                        <p className="text-[0.45rem] font-bold text-slate-400 uppercase tracking-widest mt-2">
                           {filtered.length} unpaid bill{filtered.length !== 1 ? 's' : ''} found
                        </p>
                     </div>
                     <div className="p-4 max-h-[55vh] overflow-y-auto space-y-2">
                        {importLoading ? (
                           <div className="text-center py-10">
                              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                              <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">Loading unpaid charges...</p>
                           </div>
                        ) : filtered.length > 0 ? (
                           filtered.map((bill, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-[var(--radius-sm)] bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                       {/* Room badge */}
                                       <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[0.5rem] font-black uppercase rounded tracking-widest">
                                          RM #{bill.billedToRoom}
                                       </span>
                                       <span className="text-[0.6rem] font-black text-slate-900 uppercase">{bill.guestName || bill.guest}</span>
                                       <span className="text-[0.5rem] font-bold text-slate-400 uppercase">{bill.date}</span>
                                       <span className="text-[0.45rem] font-bold text-slate-400 uppercase">ID: {bill.id}</span>
                                    </div>
                                    <div className="text-[0.5rem] font-bold text-slate-500 uppercase mt-1 truncate">
                                       {bill.items ? bill.items.map((i: any) => i.category).join(', ') : 'Room Charge'}
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3 ml-3 shrink-0">
                                    <span className="text-[0.8rem] font-black text-rose-600 tabular-nums">
                                       {(bill.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    <button
                                       type="button"
                                       onClick={() => handleImportBill(bill)}
                                       className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.55rem] font-black uppercase tracking-widest rounded-[var(--radius-xs)] shadow-sm transition-all active:scale-95"
                                    >
                                       Import
                                    </button>
                                 </div>
                              </div>
                           ))
                        ) : (
                           <div className="text-center py-10">
                              <BedDouble className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                              <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">
                                 {importSearch ? `No results matching "${importSearch}"` : 'No unpaid Bill-to-Room charges found'}
                              </p>
                              <p className="text-[0.5rem] font-bold text-slate-300 uppercase tracking-widest mt-1">All room charges are settled</p>
                           </div>
                        )}
                     </div>
                  </motion.div>
               </div>
            );
         })()}
      </AnimatePresence>


      <form 
        onSubmit={handleSubmit} 
        onKeyDown={handleEnterAsTab}
        className="w-full"
      >
      <div className="mb-4 flex flex-wrap justify-between items-center gap-4 no-print">
         {/* Visual Stepper Tracker Toggles */}
         <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => {
                 setEntryMode('standard');
                 if (currentStep === 2 && form.guest === 'WALK-IN GUEST') {
                    setCurrentStep(1);
                    setForm((prev: any) => ({ ...prev, guest: '' }));
                 }
              }}
              className={cn("px-4 py-1.5 text-[0.6rem] font-black uppercase tracking-widest rounded transition-all", entryMode === 'standard' ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200")}
            >
               Standard Folio
            </button>
            <button 
              type="button" 
              onClick={() => {
                 setEntryMode('quick');
                 setForm((prev: any) => ({ ...prev, guest: 'WALK-IN GUEST' }));
                 if (currentStep === 1) setCurrentStep(2);
              }}
              className={cn("px-4 py-1.5 text-[0.6rem] font-black uppercase tracking-widest rounded transition-all", entryMode === 'quick' ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200")}
            >
               Quick POS
            </button>
         </div>

         {/* Action Buttons */}
         <div className="flex items-center gap-2">
            {lastSale && (
              <button 
                type="button"
                onClick={() => setShowBill(true)}
                className="h-8 px-3 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded hover:bg-slate-50 transition-colors uppercase flex items-center gap-2"
              >
                <Printer className="w-3.5 h-3.5" /> Bill Reprint
              </button>
            )}
            <button 
              type="button"
              onClick={() => router.push('/sales-report')}
              className="h-8 px-3 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded hover:bg-slate-50 transition-colors uppercase flex items-center gap-2"
            >
               <HistoryIcon className="w-3.5 h-3.5" /> Archive
            </button>
            <button 
              type="button"
              onClick={() => resetForm()}
              className="w-8 h-8 bg-rose-50 border border-rose-200 rounded flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
         </div>
      </div>

         <div className="mb-6 bg-white p-4 rounded-[var(--radius-md)] border border-slate-300 shadow-xl flex flex-wrap md:flex-nowrap justify-between items-center gap-4 relative overflow-hidden no-print">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 pointer-events-none" />
            {[
               { step: 1, label: 'Guest Profile', desc: 'Identity Details', hide: entryMode === 'quick' },
               { step: 2, label: 'Revenue Charges', desc: 'Items & Catalog' },
               { step: 3, label: 'Settlement & Partition', desc: 'Taxes & Splits' },
               { step: 4, label: 'Review & Post', desc: 'Audit Reconcile' }
            ].filter(s => !s.hide).map((s, idx, arr) => {
               const isCompleted = currentStep > s.step;
               const isActive = currentStep === s.step;
               return (
                  <div key={s.step} className="flex items-center flex-1 last:flex-initial relative z-10">
                     <div className="flex items-center gap-3">
                        <div className={cn(
                           "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all border shadow-md",
                           isActive ? "bg-indigo-600 border-indigo-600 text-white scale-105" :
                           isCompleted ? "bg-emerald-600 border-emerald-600 text-white" :
                           "bg-slate-50 border-slate-200 text-slate-400"
                        )}>
                           {isCompleted ? '✓' : `0${s.step}`}
                        </div>
                        <div className="flex flex-col text-left">
                           <span className={cn("text-[0.55rem] font-black uppercase tracking-widest leading-tight", isActive ? "text-indigo-600" : "text-slate-500")}>{s.label}</span>
                           <span className="text-[0.45rem] font-bold text-slate-400 uppercase tracking-tight leading-none mt-0.5">{s.desc}</span>
                        </div>
                     </div>
                     {idx < arr.length - 1 && (
                        <div className="flex-1 mx-4 h-0.5 bg-slate-200 hidden md:block">
                           <div className={cn("h-full transition-all duration-300", isCompleted ? "w-full bg-emerald-600" : "w-0")} />
                        </div>
                     )}
                  </div>
               );
            })}
         </div>

         {/* STEP 1: GUEST REGISTRY */}
         {currentStep === 1 && (
            <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">
               <section className="bg-white rounded border border-slate-200 relative overflow-hidden group">
                  <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="px-4 pb-4 space-y-4 bg-white">
                      <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 lg:col-span-8">
                             <label className="text-xs text-slate-600 mb-1 block">Guest Full Name</label>
                             <div className="relative">
                                <input 
                                   required
                                   type="text" 
                                   value={form.guest}
                                   onFocus={() => setShowGuestSuggestions(true)}
                                   onChange={(e) => setForm({...form, guest: e.target.value.toUpperCase()})}
                                   placeholder="FULL NAME OF GUEST OR CLIENT ENTITY"
                                   className="w-full h-10 px-3 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors"
                                />
                                <AnimatePresence>
                                   {showGuestSuggestions && form.guest.length > 2 && (
                                      <motion.div key="guest-suggestions" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-b shadow-lg z-50 max-h-[150px] overflow-y-auto">
                                         {guestProfiles.filter(p => (p.guest || '').toLowerCase().includes(form.guest.toLowerCase())).map((p, idx) => (
                                            <button key={idx} type="button" onClick={() => handleGuestSelect(p)} className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b border-slate-50 flex items-center justify-between group/gitem">
                                               <div className="flex flex-col">
                                                  <span className="text-sm font-medium text-slate-900 uppercase">{p.guest}</span>
                                                  <span className="text-xs text-slate-500">{p.phone} | {p.pan}</span>
                                               </div>
                                               <ArrowRight className="w-3 h-3 text-slate-200 group-hover/gitem:text-indigo-600" />
                                            </button>
                                         ))}
                                      </motion.div>
                                   )}
                                </AnimatePresence>
                             </div>
                          </div>
                          <div className="col-span-12 lg:col-span-4">
                             <label className="text-xs text-slate-600 mb-1 block">PAN / VAT</label>
                             <input type="text" value={form.pan} onChange={(e) => setForm({...form, pan: e.target.value})} placeholder="TAX ID" className="w-full h-10 px-3 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Phone</label>
                             <input type="text" value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} placeholder="+977" className="w-full h-10 px-3 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Email</label>
                             <input type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value.toLowerCase()})} placeholder="guest@services.com" className="w-full h-10 px-3 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Location</label>
                             <input type="text" value={form.address} onChange={(e)=>setForm({...form, address: e.target.value.toUpperCase()})} placeholder="CITY / COUNTRY" className="w-full h-10 px-3 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Nationality</label>
                             <div className="h-10 border border-slate-200 rounded bg-white flex items-center px-2">
                                <Combobox
                                   value={form.nationality}
                                   onChange={(val) => setForm({ ...form, nationality: val })}
                                   options={SORTED_NATIONALITIES}
                                   className="bg-transparent text-sm text-slate-900 uppercase w-full"
                                />
                             </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Arrival</label>
                             <div className="relative w-full h-10 bg-white border border-slate-200 rounded flex items-center justify-between px-3">
                                <span className="text-sm text-slate-900 pointer-events-none whitespace-nowrap">
                                   {form.arrivalDate ? formatDate(form.arrivalDate) : ''}
                                </span>
                                <Calendar className="w-4 h-4 text-slate-400 pointer-events-none" />
                                <input type="date" value={form.arrivalDate} onChange={(e)=>setForm({...form, arrivalDate: e.target.value})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }} />
                             </div>
                          </div>
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Departure</label>
                             <div className="relative w-full h-10 bg-white border border-slate-200 rounded flex items-center justify-between px-3">
                                <span className="text-sm text-slate-900 pointer-events-none whitespace-nowrap">
                                   {form.departureDate ? formatDate(form.departureDate) : ''}
                                </span>
                                <Calendar className="w-4 h-4 text-slate-400 pointer-events-none" />
                                <input type="date" value={form.departureDate} onChange={(e)=>setForm({...form, departureDate: e.target.value})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }} />
                             </div>
                          </div>
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">PAX / PKG</label>
                             <input type="text" value={form.pax} onChange={(e)=>setForm({...form, pax: e.target.value})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded text-sm text-slate-900 text-center outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Stay Plan</label>
                             <div className="h-10 border border-slate-200 rounded bg-white flex items-center px-2">
                                <Combobox
                                   value={form.plan}
                                   onChange={(val) => setForm({ ...form, plan: val })}
                                   options={config?.stayPlans?.map((p: any) => ({ label: p.label, value: p.id })) || []}
                                   placeholder="-- SELECT --"
                                   className="bg-transparent text-sm text-slate-900 uppercase w-full"
                                />
                             </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Business Date</label>
                             <div className="relative w-full h-10 bg-white border border-indigo-200 rounded flex items-center justify-between px-3">
                                <span className="text-sm text-indigo-700 pointer-events-none whitespace-nowrap">
                                   {form.date ? formatDate(form.date) : ''}
                                </span>
                                <Calendar className="w-4 h-4 text-indigo-400 pointer-events-none" />
                                <input type="date" value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onClick={(e) => { try { (e.target as any).showPicker() } catch(err){} }} />
                             </div>
                          </div>
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Passport / ID</label>
                             <input type="text" value={form.passportNo} onChange={(e)=>setForm({...form, passportNo: e.target.value.toUpperCase()})} placeholder="ID-VAL" className="w-full h-10 px-3 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                          <div>
                             <label className="text-xs text-slate-600 mb-1 block">Issue Place</label>
                             <input type="text" value={form.passportPlace} onChange={(e)=>setForm({...form, passportPlace: e.target.value.toUpperCase()})} placeholder="PLACE" className="w-full h-10 px-3 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                      </div>
                  </div>
               </section>
            </div>
         )}

         {/* STEP 2: REVENUE ITEMIZATION STACK */}
         {currentStep === 2 && (
            <div className="w-full space-y-4 animate-fadeIn">
               <section className="bg-white border border-slate-200 rounded flex flex-col overflow-visible">
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-indigo-400" />
                     </div>
                     <button type="button" onClick={openImportModal} className="text-[0.6rem] font-bold text-indigo-600 hover:text-indigo-800 transition-all uppercase flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded">
                        <Download className="w-3 h-3" /> Import Room Charges
                     </button>
                  </div>

                  <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse min-w-full">
                         <thead className="bg-white border-b border-slate-200 shadow-sm z-10 relative">
                            <tr>
                               <th className="px-1 sm:px-4 py-2 text-[0.55rem] sm:text-xs font-medium text-slate-500 w-6 sm:w-10 text-center">#</th>
                               <th className="px-1 sm:px-4 py-2 text-[0.55rem] sm:text-xs font-medium text-slate-500">Service Classification</th>
                               <th className="px-1 sm:px-4 py-2 text-[0.55rem] sm:text-xs font-medium text-slate-500 w-[40px] sm:w-[100px] text-center">{getHeaderLabels().qty}</th>
                               <th className="px-1 sm:px-4 py-2 text-[0.55rem] sm:text-xs font-medium text-slate-500 w-[60px] sm:w-[120px] text-right">{getHeaderLabels().rate}</th>
                               <th className="px-1 sm:px-4 py-2 text-[0.55rem] sm:text-xs font-medium text-slate-500 w-[70px] sm:w-[140px] text-right">Amount (Rs.)</th>
                               <th className="w-6 sm:w-10"></th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {form.items.map((item: any, idx: number) => {
                               const selectedRooms = item.roomNumber ? item.roomNumber.split(',').map((rn: string) => rn.trim()).filter(Boolean) : [];
                               const isLastRow = idx === form.items.length - 1;
                               return (
                                  <tr key={idx} className="group hover:bg-slate-50/50 transition-all">
                                  <td className="px-4 py-1.5 text-center">
                                     <span className="text-[0.5rem] font-black text-slate-300 group-hover:text-indigo-600">0{idx + 1}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                      <div 
                                         className="relative flex flex-wrap xl:flex-nowrap items-center gap-2 w-full py-1"
                                         style={{ zIndex: 100 - idx }}
                                      >
                                      {(() => {
                                         const options = postableAccountOptions;

                                         return (
                                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-1 sm:px-2 h-8 sm:h-9 rounded shrink-0 transition-all flex-1 min-w-[120px] sm:min-w-[200px]">
                                               <Search className="hidden sm:block w-3.5 h-3.5 text-slate-400 shrink-0" />
                                               <Combobox 
                                                  value={item.category} 
                                                  onChange={(val) => updateItem(idx, 'category', val)}
                                                  options={options}
                                                  placeholder="SEARCH SERVICE..."
                                                  className="bg-transparent border-none outline-none font-medium text-slate-900 text-[0.65rem] uppercase tracking-tight w-full"
                                                  dropdownClassName="w-[300px]"
                                                  autoFocus={idx === form.items.length - 1}
                                               />
                                            </div>
                                         );
                                      })()}
                                      
                                      {isRoomCategory(item.category) ? (
                                            <div className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 px-1 sm:px-3 py-1 sm:py-1.5 rounded-[var(--radius-sm)] shrink-0 transition-all flex-1 min-w-[120px] sm:min-w-[200px]">
                                               <BedDouble className="hidden sm:block w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                <Combobox 
                                                   value={item.roomNumber || ''} 
                                                   onChange={(val) => updateItem(idx, 'roomNumber', val)}
                                                   options={rooms.map((r: any) => ({ label: `RM #${r.number} - ${r.status.toUpperCase()}`, value: r.number.toString() }))}
                                                   placeholder="SELECT ROOM..."
                                                   className="bg-transparent border-none outline-none font-black text-rose-700 text-[0.6rem] uppercase tracking-tight w-full"
                                                   dropdownClassName="w-[250px]"
                                                />
                                            </div>
                                         ) : (
                                            <div className="flex items-center gap-2 flex-1">
                                               {isSpaOrMassageCategory(item.category) ? (
                                                  <>
                                                     <div className="flex items-center gap-2">
                                                         <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 px-1 sm:px-3 py-1 sm:py-1.5 rounded-[var(--radius-sm)] shrink-0 transition-all min-w-[100px] sm:w-[200px]">
                                                            <Search className="hidden sm:block w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <Combobox
                                                               value={item.employeeId || ''}
                                                               onChange={(empId) => {
                                                                  const emp = employees.find(x => x.id === empId);
                                                                  const updatedItems = [...form.items];
                                                                  updatedItems[idx] = {
                                                                     ...updatedItems[idx],
                                                                     employeeId: empId,
                                                                     employeeName: emp ? emp.name : '',
                                                                     commissionRate: emp ? (updatedItems[idx].isOvertime ? (emp.overtimeCommRate || 20) : (emp.commissionRate || 10)) : 0
                                                                  };
                                                                  setForm((prev: any) => ({ ...prev, items: updatedItems }));
                                                               }}
                                                               options={employees.filter(x => x.isActive !== false).map((x: any) => ({ label: x.name, value: x.id }))}
                                                               placeholder="ASSIGN STAFF..."
                                                               className="bg-transparent border-none outline-none font-black text-slate-950 text-[0.6rem] uppercase tracking-tight w-full"
                                                               dropdownClassName="w-[200px]"
                                                            />
                                                         </div>
                                                        {item.employeeId && (
                                                           <label className="flex items-center gap-1 cursor-pointer bg-slate-100 px-1.5 py-1 rounded border border-slate-200 hover:bg-slate-200 transition-colors">
                                                              <input 
                                                                 type="checkbox" 
                                                                 checked={!!item.isOvertime} 
                                                                 onChange={(e) => {
                                                                    const isOT = e.target.checked;
                                                                    const emp = employees.find(x => x.id === item.employeeId);
                                                                    const rate = emp ? (isOT ? (emp.overtimeCommRate || 20) : (emp.commissionRate || 10)) : 0;
                                                                    const updatedItems = [...form.items];
                                                                    updatedItems[idx] = {
                                                                       ...updatedItems[idx],
                                                                       isOvertime: isOT,
                                                                       commissionRate: rate
                                                                    };
                                                                    setForm((prev: any) => ({ ...prev, items: updatedItems }));
                                                                 }} 
                                                                 className="w-3 h-3 text-indigo-600 rounded cursor-pointer" 
                                                              />
                                                              <span className="text-[0.45rem] font-bold text-slate-500 uppercase tracking-widest mt-0.5">OT</span>
                                                           </label>
                                                        )}
                                                     </div>
                                                 </>
                                              ) : (
                                                 <input 
                                                    type="text" 
                                                    value={item.note || ''} 
                                                    onChange={(e) => updateItem(idx, 'note', e.target.value.toUpperCase())} 
                                                    placeholder="MEMO..." 
                                                    className="flex-1 bg-transparent border border-dashed border-slate-200 focus:border-slate-400 rounded px-1 outline-none font-bold text-slate-500 text-[0.5rem] uppercase h-8" 
                                                 />
                                              )}
                                           </div>
                                        )}
                                        </div>
                                  </td>
                                  <td className="px-1 sm:px-4 py-2 text-center">
                                     <input 
                                        type="number" 
                                        value={item.qty === 0 ? '' : (item.qty || '')} 
                                        onChange={(e) => updateItem(idx, 'qty', e.target.value)} 
                                        className="w-full min-w-[30px] h-8 sm:h-9 bg-white border border-slate-200 rounded px-1 sm:px-2 text-[0.65rem] sm:text-sm text-slate-900 text-center outline-none focus:border-indigo-500" 
                                        placeholder="1"
                                     />
                                  </td>
                                  <td className="px-1 sm:px-4 py-2 text-right">
                                     <input 
                                        type="number" 
                                        value={item.rate === 0 ? '' : (item.rate || '')} 
                                        onChange={(e) => updateItem(idx, 'rate', e.target.value)} 
                                        className="w-full min-w-[45px] h-8 sm:h-9 bg-white border border-slate-200 rounded px-1 sm:px-2 font-mono text-[0.65rem] sm:text-sm text-slate-900 text-right outline-none focus:border-indigo-500" 
                                        placeholder="0.00" 
                                     />
                                  </td>
                                  <td className="px-4 py-2 bg-slate-50 text-right">
                                     <input 
                                        type="number" 
                                        value={item.amount || ''} 
                                        readOnly
                                        className="w-full bg-transparent border-none outline-none font-medium text-sm text-slate-900 text-right cursor-not-allowed" 
                                        placeholder="0.00" 
                                     />
                                  </td>
                                  <td className="px-2 text-center">
                                     <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 rounded-[var(--radius-sm)]"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </td>
                               </tr>
                               );
                            })}
                         </tbody>
                         <tfoot className="bg-slate-50 border-t border-slate-200 shadow-inner">
                            <tr>
                               <td colSpan={4} className="px-4 py-3">
                                  <button 
                                      type="button" 
                                      onClick={addItem} 
                                      className="h-10 px-4 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-100 flex items-center gap-2"
                                   >
                                      <Plus className="w-4 h-4" /> Add Row
                                   </button>
                               </td>
                               <td className="px-4 py-4 text-right">
                                  <div className="flex flex-col">
                                      <span className="text-xs text-slate-500 font-medium">Sub-Total</span>
                                      <span className="text-base font-bold text-slate-900">{formatCurrency(form.subtotal)}</span>
                                   </div>
                               </td>
                               <td></td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </section>
            </div>
         )}

         {/* STEP 3: FINANCIAL SETTLEMENT & SPLITS */}
         {currentStep === 3 && (
            <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">
               <section className="bg-white p-4 rounded border border-slate-200 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                     <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-400" />
                     </div>
                     <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" checked={!!form.applySC} onChange={() => calculateTotals(form.items, !form.applySC, form.applyVat, form.discount)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                           <span className="text-sm font-medium text-slate-700">Service Charge (10%)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" checked={!!form.applyVat} onChange={() => calculateTotals(form.items, form.applySC, !form.applyVat, form.discount)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                           <span className="text-sm font-medium text-slate-700">VAT (13%)</span>
                        </label>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="flex flex-col bg-white p-3 rounded border border-slate-200">
                         <span className="text-xs text-slate-500 mb-1">Tax / VAT ({config?.vatRate || 13}%)</span>
                         <span className={`text-lg font-medium ${form.applyVat ? 'text-slate-900' : 'text-slate-300 line-through'}`}>{formatCurrency(form.tax)}</span>
                      </div>
                      <div className="flex flex-col bg-white p-3 rounded border border-slate-200 focus-within:border-indigo-500 transition-colors">
                         <span className="text-xs text-slate-500 mb-1">Discount Amount</span>
                         <input 
                            type="number" 
                            value={form.discount || ''} 
                            onChange={(e) => {
                               const val = Math.max(0, parseFloat(e.target.value) || 0);
                               calculateTotals(form.items, form.applySC, form.applyVat, val);
                            }} 
                            className="w-full bg-transparent border-none outline-none font-medium text-lg text-slate-900 p-0 leading-none" 
                            placeholder="0.00" 
                            min="0"
                         />
                      </div>
                      <div className="flex flex-col bg-slate-50 p-3 rounded border border-slate-200">
                         <span className="text-xs font-medium text-slate-600 mb-1">Total Invoice NPR</span>
                         <span className="text-xl font-bold text-slate-900 leading-none">{form.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                  </div>

                  <div className="space-y-3">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-2 sm:gap-0">
                        <span className="text-[0.65rem] sm:text-sm font-bold sm:font-medium text-slate-700 uppercase sm:normal-case tracking-widest sm:tracking-normal">Partition Split Registry</span>
                        <div className="flex gap-2">
                           <button 
                              type="button" 
                              onClick={() => {
                                 const diff = form.amount - settlementTotal;
                                 if (diff <= 0) return;
                                 const newSettlements = [...form.settlements];
                                 const lastIdx = newSettlements.length - 1;
                                 newSettlements[lastIdx] = { 
                                    ...newSettlements[lastIdx], 
                                    amount: parseFloat((newSettlements[lastIdx].amount + diff).toFixed(2)) 
                                 };
                                 setForm((prev: any) => ({ ...prev, settlements: newSettlements }));
                              }} 
                              className="h-7 sm:h-8 px-2 sm:px-3 bg-white border border-slate-300 rounded text-[0.6rem] sm:text-sm text-slate-700 hover:bg-slate-50 transition-all font-bold uppercase sm:normal-case tracking-wider sm:tracking-normal"
                           >
                              Reconcile Remaining
                           </button>
                           <button type="button" onClick={addSettlement} className="h-7 sm:h-8 px-2 sm:px-3 bg-white border border-slate-300 rounded text-[0.6rem] sm:text-sm text-slate-700 hover:bg-slate-50 transition-all font-bold uppercase sm:normal-case tracking-wider sm:tracking-normal">Split Payment</button>
                        </div>
                     </div>
                     
                     <div className="space-y-2">
                        {form.settlements.map((s: any, idx: number) => (
                           <div key={idx} className="bg-slate-50 p-3 border border-slate-200 rounded space-y-2 group/s">
                              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3">
                                 <div className="flex-1 min-w-[150px] h-9 sm:h-10 bg-white border border-slate-200 rounded flex items-center px-1 sm:px-2">
                                     <select
                                        value={typeof s.mode === 'object' ? s.mode.label : s.mode}
                                        onChange={(e) => updateSettlement(idx, 'mode', e.target.value)}
                                        className="bg-transparent border-none outline-none font-bold sm:font-medium text-slate-900 text-[0.65rem] sm:text-sm w-full uppercase sm:normal-case"
                                     >
                                        <option value="">Select Mode...</option>
                                        <option value="Bill to Company">Deferred / Credit (City Ledger)</option>
                                        <option value="Bill to Room">Bill to Room (In-House)</option>
                                        {(initialConfig?.paymentModes || []).map((pm: any) => (
                                           <option key={pm.label} value={pm.label}>{pm.label}</option>
                                        ))}
                                     </select>
                                  </div>
                                 <input type="number" value={s.amount || ''} onChange={(e) => updateSettlement(idx, 'amount', parseFloat(e.target.value) || 0)} className="w-[100px] sm:w-32 h-9 sm:h-10 px-2 sm:px-3 bg-white border border-slate-200 rounded font-bold sm:font-medium text-[0.7rem] sm:text-sm text-slate-900 text-right outline-none focus:border-indigo-500" placeholder="0.00" />
                                 {form.settlements.length > 1 && (
                                    <button type="button" onClick={() => removeSettlement(idx)} className="p-1 sm:p-2 text-slate-400 hover:text-rose-500 transition-all hover:bg-rose-50 rounded shrink-0"><X className="w-4 h-4" /></button>
                                 )}
                              </div>
                              {s.mode === 'Bill to Room' && (
                                 <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-8 bg-indigo-50 border border-indigo-200 rounded-[var(--radius-xs)] flex items-center px-2">
                                       <Combobox 
                                          value={s.roomId || ''} 
                                          onChange={(val) => {
                                             const r = rooms.find(room => room.id === val);
                                             const newSettlements = [...form.settlements];
                                             newSettlements[idx] = { 
                                                ...newSettlements[idx], 
                                                roomId: val,
                                                roomNumber: r?.number || '',
                                             };
                                             setForm((prev: any) => ({ 
                                                ...prev, 
                                                settlements: newSettlements,
                                                guest: r ? `ROOM ${r.number}` : prev.guest,
                                                status: 'Unpaid'
                                             }));
                                          }}
                                          options={rooms.map(r => ({ label: `RM #${r.number}`, value: r.id }))}
                                          placeholder="SELECT ROOM..."
                                          className="bg-transparent border-none outline-none font-black text-indigo-950 text-[0.5rem] uppercase w-full"
                                          dropdownClassName="w-[200px]"
                                       />
                                    </div>
                                 </div>
                              )}
                              {s.mode === 'Bill to Company' && (
                                 <div className="flex items-center gap-2">
                                    <div className="flex-1 h-8 bg-indigo-50 border border-indigo-100 rounded-[var(--radius-xs)] flex items-center px-2">
                                       <Combobox
                                          value={s.debtorId || ''}
                                          onChange={(val) => {
                                             const d = debtors.find(deb => deb.id === val);
                                             const newSettlements = [...form.settlements];
                                             newSettlements[idx] = { 
                                                ...newSettlements[idx], 
                                                debtorId: val, 
                                                debtorName: d?.name || '',
                                                debtorAccountId: d?.accountId || 'Accounts Receivable'
                                             };
                                             setForm((prev: any) => ({ ...prev, settlements: newSettlements, status: 'Unpaid' }));
                                          }}
                                          options={debtors.map(deb => ({ label: deb.name, value: deb.id }))}
                                          placeholder="SEARCH CLIENT..."
                                          className="bg-transparent border-none outline-none font-black text-indigo-950 text-[0.5rem] uppercase w-full"
                                          dropdownClassName="w-[200px]"
                                       />
                                    </div>
                                    <button type="button" onClick={() => { setActiveSettlementIdx(idx); setShowQuickDebtor(true); }} className="w-8 h-8 bg-indigo-600 text-white rounded-[var(--radius-xs)] flex items-center justify-center hover:bg-black transition-all shadow-lg shadow-indigo-100"><Plus className="w-4 h-4" /></button>
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>

                     <div className="space-y-1.5 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                           <span className="text-[0.5rem] font-black text-slate-500 uppercase tracking-widest">Net Amount</span>
                           <span className="text-[0.8rem] font-black text-slate-950 tracking-tighter">{formatCurrency(form.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-[0.5rem] font-black text-slate-500 uppercase tracking-widest">Total Partitioned</span>
                           <span className="text-[0.8rem] font-black text-slate-950 tracking-tighter">{formatCurrency(settlementTotal)}</span>
                        </div>
                        
                        <div className={cn(
                           "mt-3 p-3 rounded-[var(--radius-sm)] flex items-center justify-between transition-all",
                           (Math.abs(form.amount - settlementTotal) < 0.01) ? "bg-emerald-50 border border-emerald-100 animate-fadeIn" : "bg-rose-50 border border-rose-100 animate-fadeIn"
                        )}>
                           <div className="flex flex-col">
                              <span className={cn("text-[0.35rem] font-black uppercase tracking-widest", (Math.abs(form.amount - settlementTotal) < 0.01) ? "text-emerald-600" : "text-rose-600")}>
                                 { (Math.abs(form.amount - settlementTotal) < 0.01) ? "Reconciliation Balanced" : "Difference Overage" }
                              </span>
                              <span className={cn("text-[0.9rem] font-black tracking-tighter", (Math.abs(form.amount - settlementTotal) < 0.01) ? "text-emerald-700" : "text-rose-700")}>
                                 {formatCurrency(form.amount - settlementTotal)}
                              </span>
                           </div>
                           <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center shadow-inner", (Math.abs(form.amount - settlementTotal) < 0.01) ? "bg-white border-emerald-200" : "bg-white border-rose-200")}>
                              <ShieldCheck className={cn("w-4 h-4", (Math.abs(form.amount - settlementTotal) < 0.01) ? "text-emerald-500" : "text-rose-400 animate-pulse")} />
                           </div>
                        </div>
                     </div>
                  </div>
               </section>
            </div>
         )}

         {/* STEP 4: HIGH-FIDELITY TRANSACTION REVIEW */}
         {currentStep === 4 && (
            <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">
               <section className="bg-white rounded border border-slate-200 relative overflow-hidden p-4">
                  {/* Aura element */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-20 translate-x-20 pointer-events-none" />
                  
                  {/* Property Header */}
                  <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-start flex-wrap gap-4">
                     <div>
                        <span className="text-[0.5rem] font-black text-indigo-600 uppercase tracking-widest block mb-1">POS Transaction Summary</span>
                        <h3 className="text-[0.8rem] font-black text-slate-950 uppercase tracking-tighter">{config?.hotelName || 'HOTEL MIDDLE PATH PVT LTD'}</h3>
                        <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1">{config?.address || 'Pokhara-6, Lakeside Central Point'}</p>
                     </div>
                     <div className="text-right">
                        <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Business Date</span>
                        <span className="text-[0.6rem] font-black text-slate-900 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded border border-slate-200">{form.date}</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                     {/* Guest Card */}
                     <div className="space-y-2 border border-slate-200 rounded p-4 bg-slate-50 text-left">
                        <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest block mb-3 border-b border-slate-200 pb-2">Guest Account Profile</span>
                        <div className="flex flex-col gap-2 text-[0.6rem] font-bold text-slate-950 uppercase tracking-tight">
                           <div className="flex justify-between">
                              <span className="text-slate-500">Guest/Client:</span>
                              <span className="font-black">{form.guest}</span>
                           </div>
                           {form.phone && (
                              <div className="flex justify-between">
                                 <span className="text-slate-500">Phone:</span>
                                 <span className="font-black">{form.phone}</span>
                              </div>
                           )}
                           {form.pan && (
                              <div className="flex justify-between">
                                 <span className="text-slate-500">PAN/VAT:</span>
                                 <span className="font-black">#{form.pan}</span>
                              </div>
                           )}
                           {form.nationality && (
                              <div className="flex justify-between">
                                 <span className="text-slate-500">Nationality:</span>
                                 <span className="font-black">{form.nationality}</span>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Stay Schedule Card */}
                     <div className="space-y-2 border border-slate-200 rounded p-4 bg-slate-50 text-left">
                        <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest block mb-3 border-b border-slate-200 pb-2">Stay Schedule Plan</span>
                        <div className="flex flex-col gap-2 text-[0.6rem] font-bold text-slate-950 uppercase tracking-tight">
                           <div className="flex justify-between">
                              <span className="text-slate-500">Stay Plan:</span>
                              <span className="font-black">{form.plan || 'None'}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500">Timeline:</span>
                              <span className="font-black">{form.arrivalDate} to {form.departureDate}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500">Guests:</span>
                              <span className="font-black">{form.pax}</span>
                           </div>
                           {form.roomNumber && (
                              <div className="flex justify-between">
                                 <span className="text-slate-500">Assigned Rooms:</span>
                                 <span className="font-black">#{form.roomNumber}</span>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Revenue Stack table */}
                  <div className="space-y-3 mb-6 text-left">
                     <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest block mb-2">Revenue Itemized Statement</span>
                     <div className="border border-slate-200 rounded overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[0.6rem] uppercase tracking-tight min-w-[600px]">
                           <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[0.55rem] font-black text-slate-500 tracking-widest">
                                 <th className="px-4 py-3 border-r border-slate-100">Item Classification Details</th>
                                 <th className="px-4 py-3 border-r border-slate-100 text-center w-24">Quantity</th>
                                 <th className="px-4 py-3 border-r border-slate-100 text-right w-28">Rate (Rs.)</th>
                                 <th className="px-4 py-3 text-right w-32">Total (Rs.)</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 font-bold text-slate-950">
                              {form.items.map((item: any, idx: number) => (
                                 <tr key={idx} className="bg-white hover:bg-slate-50/50">
                                    <td className="px-4 py-3 border-r border-slate-50 flex flex-col">
                                       <span className="text-slate-950 font-black">{item.category}</span>
                                       {item.spaItemName && (
                                          <span className="text-[0.55rem] text-emerald-600 mt-0.5 tracking-widest">
                                             Treatment: {item.spaItemName} {item.employeeName && `by ${item.employeeName} (${item.commissionRate}%)`}
                                          </span>
                                       )}
                                       {item.note && !item.spaItemName && (
                                          <span className="text-[0.55rem] text-slate-500 mt-0.5 tracking-widest font-black">Note: {item.note}</span>
                                       )}
                                    </td>
                                    <td className="px-4 py-3 border-r border-slate-50 text-center text-slate-900">{item.qty}</td>
                                    <td className="px-4 py-3 border-r border-slate-50 text-right text-slate-700 font-mono">{formatCurrency(item.rate)}</td>
                                    <td className="px-4 py-3 text-right text-emerald-600 font-mono font-black italic">{formatCurrency(item.amount)}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  {/* Financial & split splits */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 text-left">
                     <div className="md:col-span-6 space-y-3">
                        <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest block mb-2 border-b border-slate-200 pb-2">Payment Allocation</span>
                        <div className="space-y-2">
                           {form.settlements.map((s: any, idx: number) => {
                              const modeLabel = typeof s.mode === 'object' ? (s.mode.label || 'Cash') : s.mode;
                              return (
                              <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-200 text-[0.6rem] font-bold text-slate-950 uppercase tracking-tight">
                                 <span>
                                    {modeLabel}
                                    {s.mode === 'Bill to Room' && s.roomNumber && ` (Room ${s.roomNumber})`}
                                    {s.mode === 'Bill to Company' && s.debtorName && ` (${s.debtorName})`}
                                 </span>
                                 <span className="font-black">{formatCurrency(s.amount)}</span>
                              </div>
                              );
                           })}
                        </div>
                     </div>

                     <div className="md:col-span-6 flex flex-col justify-end text-[0.6rem] font-bold text-slate-950 uppercase tracking-tight space-y-3">
                        <div className="flex justify-between border-b border-slate-200 pb-2">
                           <span className="text-slate-500">Sub-Total:</span>
                           <span className="font-black">{formatCurrency(form.subtotal)}</span>
                        </div>
                        {form.discount > 0 && (
                           <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-900">
                              <span className="text-slate-500">Discount:</span>
                              <span className="font-black">-{formatCurrency(form.discount)}</span>
                           </div>
                        )}
                        {form.applySC && (
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                              <span className="text-slate-500">Service Charge (10%):</span>
                              <span className="font-black">{formatCurrency(form.sc)}</span>
                           </div>
                        )}
                        {form.applyVat && (
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                              <span className="text-slate-500">VAT (13%):</span>
                              <span className="font-black">{formatCurrency(form.tax)}</span>
                           </div>
                        )}
                        <div className="flex justify-between pt-2 text-[0.8rem] font-black text-slate-900 tracking-tighter">
                           <span className="text-slate-700">Grand Total:</span>
                           <span>{formatCurrency(form.amount)}</span>
                        </div>
                     </div>
                  </div>
               </section>
            </div>
         )}

         {/* Navigation Controls */}
         <div className="col-span-12 flex justify-between items-center pt-6 border-t border-slate-200 mt-6 no-print">
            {currentStep > 1 ? (
               <button
                  type="button"
                  onClick={() => {
                     if (entryMode === 'quick' && currentStep === 2) return;
                     setCurrentStep((prev: any) => (prev - 1) as any);
                  }}
                  className={cn("h-10 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[0.55rem] rounded-[var(--radius-sm)] uppercase tracking-widest items-center gap-2 active:scale-95 transition-all shadow-sm border border-slate-200", (entryMode === 'quick' && currentStep === 2) ? "hidden" : "flex")}
               >
                  ← Back to Step 0{currentStep - 1}
               </button>
            ) : (
               <div />
            )}

            {currentStep === 4 && (
               <button
                  type="button"
                  onClick={() => {
                     setLastSale(form);
                     setShowBill(true);
                  }}
                  className="h-10 px-6 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[0.55rem] rounded-[var(--radius-sm)] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-sm border border-indigo-200"
               >
                  🔍 Review Bill Preview
               </button>
            )}

            {currentStep < 4 ? (
               <button
                  type="button"
                  onClick={() => {
                     if (currentStep === 1 && !canProceedToStep2()) {
                        alert("PLEASE COMPLETE GUEST IDENTIFICATION PROFILE (GUEST NAME IS REQUIRED) BEFORE PROCEEDING.");
                        return;
                     }
                     if (currentStep === 2 && !canProceedToStep3()) {
                        alert("PLEASE COMPLETE ALL REVENUE CHARGES. ALL ACTIVE ROWS MUST HAVE VALID AMOUNTS GREATER THAN ZERO.");
                        return;
                     }
                     if (currentStep === 3 && !canProceedToStep4()) {
                        alert(`SETTLEMENT IMBALANCE: Please reconcile all payment splits so the remaining balance is exactly Rs. 0.00.`);
                        return;
                     }
                     setCurrentStep((prev: any) => (prev + 1) as any);
                  }}
                  className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[0.55rem] rounded-[var(--radius-sm)] uppercase tracking-[0.2em] flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-indigo-100/50"
               >
                  Proceed to Step 0{currentStep + 1} →
               </button>
            ) : (
               <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPostConfirm(true)}
                  className={cn(
                     "h-10 px-10 font-black text-[0.6rem] rounded-[var(--radius-sm)] uppercase tracking-[0.25em] flex items-center gap-2 active:scale-95 transition-all shadow-2xl disabled:opacity-50",
                     form.originalId ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100" : "bg-slate-950 hover:bg-indigo-600 text-white shadow-indigo-100"
                  )}
               >
                  {loading ? 'SAVING...' : (form.originalId ? '✓ Update & Save' : '✓ Save')}
               </button>
            )}
         </div>
      </form>

      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={resetForm}
        title="Transaction Saved"
        subtitle="The sales ledger has been updated successfully"
        id={lastSale?.id}
        amount={lastSale?.amount}
        onPrint={() => { setShowBill(true); setIsSuccessModalOpen(false); }}
        onSecondary={resetForm}
        secondaryLabel="New Transaction"
      />

      <AnimatePresence>
         {activeRoomSelectIdx !== null && (() => {
            const activeItem = form.items[activeRoomSelectIdx];
            if (!activeItem) return null;
            const selectedRooms = activeItem.roomNumber 
               ? activeItem.roomNumber.split(',').map((rn: string) => rn.trim()).filter(Boolean) 
               : [];
            
            return (
               <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 no-print animate-fadeIn">
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
                  >
                     {/* Modal Header */}
                     <div className="px-6 py-4 bg-slate-950 flex items-center justify-between text-white border-b border-white/5">
                        <div className="flex items-center gap-2">
                           <BedDouble className="w-5 h-5 text-indigo-400" />
                           <div className="text-left">
                              <h3 className="text-sm font-bold uppercase tracking-wide">Property Room Selector</h3>
                              <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                 Allocating rooms for: {activeItem.category}
                              </p>
                           </div>
                        </div>
                        <button 
                           onClick={() => {
                              setActiveRoomSelectIdx(null);
                              setRoomSearchQuery('');
                           }}
                           className="p-1 hover:bg-white/10 rounded-full transition-all"
                        >
                           <X className="w-4 h-4 text-white" />
                        </button>
                     </div>

                     {/* Search Input */}
                     <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input 
                              type="text"
                              value={roomSearchQuery}
                              onChange={(e) => setRoomSearchQuery(e.target.value)}
                              placeholder="SEARCH ROOMS BY NUMBER, FLOOR, STATUS, RATE..."
                              className="w-full h-10 pl-10 pr-8 bg-white border border-slate-200 rounded-[var(--radius-md)] outline-none focus:border-indigo-600 font-bold text-[0.65rem] uppercase tracking-wider transition-all shadow-inner placeholder:text-slate-400"
                           />
                           {roomSearchQuery && (
                              <button 
                                 onClick={() => setRoomSearchQuery('')}
                                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                 <X className="w-4 h-4" />
                              </button>
                           )}
                        </div>
                     </div>

                     {/* Rooms Grid */}
                     <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                           {rooms
                              .filter((r: any) => {
                                 if (!roomSearchQuery) return true;
                                 const query = roomSearchQuery.toLowerCase();
                                 return (
                                    (r.number || '').toString().toLowerCase().includes(query) ||
                                    (r.floor || '').toString().toLowerCase().includes(query) ||
                                    (r.status || '').toString().toLowerCase().includes(query) ||
                                    (r.rate || '').toString().toLowerCase().includes(query)
                                 );
                              })
                              .map((r: any) => {
                                 const isSelected = selectedRooms.includes(r.number?.toString());
                                 return (
                                    <div 
                                       key={r.id}
                                       onClick={() => {
                                          let newRooms = [];
                                          if (isSelected) {
                                             newRooms = selectedRooms.filter((rn: string) => rn !== r.number?.toString());
                                          } else {
                                             newRooms = [...selectedRooms, r.number?.toString()];
                                          }
                                          updateItem(activeRoomSelectIdx, 'roomNumber', newRooms.join(', '));
                                       }}
                                       className={cn(
                                          "border p-4 rounded-[var(--radius-md)] cursor-pointer transition-all duration-200 select-none relative overflow-hidden flex flex-col justify-between h-[100px] text-left",
                                          isSelected 
                                             ? "bg-indigo-50/70 border-indigo-500 shadow-md text-indigo-900 ring-2 ring-indigo-500/20" 
                                             : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm text-slate-600"
                                       )}
                                    >
                                       {isSelected && (
                                          <div className="absolute right-2.5 top-2.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                             <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                                          </div>
                                       )}
                                       <div className="flex flex-col">
                                          <span className={cn(
                                             "text-xs font-black tracking-tight",
                                             isSelected ? "text-indigo-950" : "text-slate-900"
                                          )}>
                                             Room #{r.number}
                                          </span>
                                          <span className="text-[0.45rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                             Floor {r.floor || '1'}
                                          </span>
                                       </div>
                                       
                                       <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                          <span className="text-[0.55rem] font-black text-slate-900">
                                             Rs. {r.rate}
                                          </span>
                                          <span className={cn(
                                             "px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[0.4rem] font-black uppercase tracking-wider",
                                             r.status === 'Ready' 
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                                : "bg-amber-50 text-amber-700 border border-amber-100"
                                          )}>
                                             {r.status}
                                          </span>
                                       </div>
                                    </div>
                                 );
                              })}
                        </div>
                        {rooms.length === 0 && (
                           <div className="text-center py-12 text-slate-400 font-bold uppercase text-[0.6rem] tracking-widest italic bg-white border border-slate-200 rounded-[var(--radius-md)]">
                              No rooms found matching selection query
                           </div>
                        )}
                     </div>

                     {/* Modal Footer */}
                     <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center no-print">
                        <div className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">
                           {selectedRooms.length > 0 
                              ? `${selectedRooms.length} Room(s) Selected` 
                              : 'No Rooms Selected'
                           }
                        </div>
                        <div className="flex gap-2">
                           <button 
                              type="button"
                              onClick={() => {
                                 updateItem(activeRoomSelectIdx, 'roomNumber', '');
                              }}
                              className="h-8 px-4 border border-slate-300 text-slate-700 hover:bg-slate-100 font-black text-[0.5rem] rounded-[var(--radius-sm)] uppercase tracking-widest transition-all"
                           >
                              Clear
                           </button>
                           <button 
                              type="button"
                              onClick={() => {
                                 setActiveRoomSelectIdx(null);
                                 setRoomSearchQuery('');
                              }}
                              className="h-8 px-4 bg-slate-950 text-white hover:bg-indigo-600 font-black text-[0.5rem] rounded-[var(--radius-sm)] uppercase tracking-widest shadow-md transition-all active:scale-95"
                           >
                              Confirm Setup
                           </button>
                        </div>
                     </div>
                  </motion.div>
               </div>
            );
         })()}
      </AnimatePresence>

      <AnimatePresence>
         {showPostConfirm && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 no-print animate-fadeIn">
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[var(--radius-lg)] border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 text-center"
               >
                  <div className="mx-auto w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4 animate-pulse">
                     <ShieldCheck className="w-6 h-6" />
                  </div>

                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider mb-2">
                     Confirm Ledger Posting
                  </h3>
                  
                  <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6">
                     {form.originalId 
                        ? "Are you sure you want to update and re-post this sale transaction? This will synchronize all ledger balances immediately."
                        : "Are you sure you want to commit and securely post this transaction? This will securely archive the guest folio and sync general ledgers immediately."
                     }
                  </p>

                  <div className="flex gap-3 justify-center w-full">
                     <button
                        type="button"
                        onClick={() => setShowPostConfirm(false)}
                        className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[0.55rem] rounded-[var(--radius-sm)] uppercase tracking-widest transition-all active:scale-95 border border-slate-200"
                     >
                        Cancel
                     </button>
                     <button
                        type="button"
                        onClick={confirmAndPostSale}
                        className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[0.55rem] rounded-[var(--radius-sm)] uppercase tracking-widest shadow-md transition-all active:scale-95 shadow-indigo-100"
                     >
                        Confirm & Post
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickDebtor && (
           <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="bg-white rounded-[var(--radius-md)] w-full max-w-[800px] overflow-hidden shadow-2xl">
                 <div className="px-4 py-1.5 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="text-[0.6rem] font-normal uppercase flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-emerald-400" /> Add New Customer
                    </h3>
                    <button onClick={()=>setShowQuickDebtor(false)} className="p-1 hover:bg-rose-600 rounded transition-all text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
                 </div>
                 
                 <div className="p-6 space-y-4">
                    <div className="grid grid-cols-12 gap-3">
                       <div className="col-span-9 space-y-1">
                          <label className="text-[0.55rem] font-black text-slate-600 uppercase ml-0.5">Entity Narrative</label>
                          <input type="text" autoFocus value={newQuickDebtor.name} onChange={(e)=>setNewQuickDebtor({...newQuickDebtor, name: e.target.value.toUpperCase()})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] font-black text-slate-950 text-[0.6rem] uppercase outline-none focus:border-indigo-600 shadow-inner" placeholder="COMPANY OR CLIENT NAME" />
                       </div>
                       <div className="col-span-3 space-y-1">
                          <label className="text-[0.55rem] font-black text-slate-600 uppercase ml-0.5">Classification</label>
                          <Combobox
                             value={newQuickDebtor.type}
                             onChange={(val)=>setNewQuickDebtor({...newQuickDebtor, type: val})}
                             options={[
                                { label: 'CORPORATE', value: 'CORPORATE' },
                                { label: 'AGENT', value: 'AGENT' },
                                { label: 'INDIVIDUAL', value: 'INDIVIDUAL' }
                             ]}
                             className="w-full h-9 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] font-black text-[0.6rem] uppercase outline-none shadow-inner px-2"
                             dropdownClassName="w-full"
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                       <div className="space-y-1">
                          <label className="text-[0.55rem] font-black text-slate-600 uppercase ml-0.5">PAN / VAT</label>
                          <input type="text" value={newQuickDebtor.pan} onChange={(e)=>setNewQuickDebtor({...newQuickDebtor, pan: e.target.value.toUpperCase()})} className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] font-black text-slate-900 text-[0.65rem] uppercase outline-none shadow-inner" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[0.55rem] font-black text-slate-600 uppercase ml-0.5">Phone</label>
                          <input type="text" value={newQuickDebtor.phone} onChange={(e)=>setNewQuickDebtor({...newQuickDebtor, phone: e.target.value})} className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] font-black text-slate-900 text-[0.65rem] outline-none shadow-inner" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[0.55rem] font-black text-slate-600 uppercase ml-0.5">Location</label>
                          <input type="text" value={newQuickDebtor.address} onChange={(e)=>setNewQuickDebtor({...newQuickDebtor, address: e.target.value.toUpperCase()})} className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-sm)] font-black text-slate-900 text-[0.65rem] uppercase outline-none shadow-inner" />
                       </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] border-dashed">
                      <div className="col-span-12 lg:col-span-3 space-y-1">
                          <label className="text-[0.45rem] font-black text-indigo-600 uppercase tracking-widest leading-none">Limit</label>
                          <input 
                            type="number" 
                            value={newQuickDebtor.creditLimit || 0}
                            onChange={(e)=>setNewQuickDebtor({...newQuickDebtor, creditLimit: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-[var(--radius-xs)] outline-none font-black text-[0.8rem] text-indigo-600 shadow-sm"
                          />
                      </div>
                      <div className="col-span-12 lg:col-span-2 space-y-1">
                          <label className="text-[0.45rem] font-black text-rose-600 uppercase tracking-widest leading-none">Days</label>
                          <input 
                            type="number" 
                            value={newQuickDebtor.creditDays || 0}
                            onChange={(e)=>setNewQuickDebtor({...newQuickDebtor, creditDays: parseInt(e.target.value) || 0})}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-[var(--radius-xs)] outline-none font-black text-[0.8rem] text-rose-600 shadow-sm"
                          />
                      </div>
                      <div className="col-span-12 lg:col-span-3 space-y-1">
                          <label className="text-[0.45rem] font-black text-emerald-600 uppercase tracking-widest leading-none">Opening</label>
                          <input 
                            type="number" 
                            value={newQuickDebtor.openingBalance || 0}
                            onChange={(e)=>setNewQuickDebtor({...newQuickDebtor, openingBalance: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-1.5 bg-white border border-emerald-100 rounded-[var(--radius-xs)] outline-none font-black text-[0.8rem] text-emerald-700 shadow-sm"
                          />
                      </div>
                      <div className="col-span-12 lg:col-span-4 space-y-1">
                          <label className="text-[0.55rem] font-black text-slate-600 uppercase tracking-widest">AR Ledger</label>
                          <Combobox
                             value={newQuickDebtor.accountId || ''}
                             onChange={(val) => setNewQuickDebtor({...newQuickDebtor, accountId: val})}
                             options={[
                                { label: 'DEFAULT AR', value: '' },
                                ...accounts.filter(a => a.type === 'ASSET').map(a => ({ label: `${a.code} - ${a.name}`, value: a.id }))
                             ]}
                             className="w-full h-8 px-2 bg-white border border-slate-200 rounded-[var(--radius-xs)] outline-none font-black text-[0.6rem] uppercase text-indigo-700 shadow-sm"
                             dropdownClassName="w-full"
                          />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                       <button type="button" onClick={()=>setShowQuickDebtor(false)} className="py-3 font-black text-[0.6rem] uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all">Cancel</button>
                       <button type="button" onClick={handleQuickSaveDebtor} className="py-3 bg-slate-950 text-white font-black text-[0.65rem] uppercase tracking-widest rounded-[var(--radius-xs)] hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100">Establish Profile</button>
                    </div>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}




