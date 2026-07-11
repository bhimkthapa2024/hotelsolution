'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  BookOpen,
  BookCheck,
  FilePlus,
  ShoppingBasket,
  Receipt,
  BarChart3,
  FileText,
  Settings,
  ShieldAlert,
  Package,
  ArrowRightLeft,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  separator?: never;
  permission?: string;
  subItems?: { label: string; href: string }[];
}

interface SeparatorItem {
  separator: string;
  label?: never;
  href?: never;
  icon?: never;
  permission?: never;
}

type SidebarItem = NavItem | SeparatorItem;

const navItems: SidebarItem[] = [
  { separator: 'ANALYSIS' },
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Day Book', href: '/day-book', icon: BookOpen, permission: 'dashboard.view' },
  { label: 'General Ledger', href: '/ledger', icon: BookCheck, permission: 'admin.root' },
  { separator: 'OPERATIONS' },
  { label: 'Sales Entry', href: '/sales', icon: FilePlus, permission: 'sales.post' },
  { label: 'Purchase Entry', href: '/purchase', icon: ShoppingBasket, permission: 'setup.manage' },
  { label: 'Finance Entry', href: '/finance', icon: ArrowRightLeft, permission: 'setup.manage' },
  { label: 'Guest Folio', href: '/guest-folio', icon: Receipt, permission: 'housekeeping.view' },
  { separator: 'FINANCIAL REPORTS' },
  { label: 'Fin. Reports', href: '/reports', icon: BarChart3, permission: 'reports.view', subItems: [
      { label: 'Trial Balance', href: '/reports?tab=TRIAL_BALANCE' },
      { label: 'Profit & Loss', href: '/reports?tab=P_L' },
      { label: 'Balance Sheet', href: '/reports?tab=BALANCE_SHEET' },
      { label: 'Cash Flow', href: '/reports?tab=CASH_FLOW' },
      { label: 'Staff Commissions', href: '/reports?tab=EMPLOYEE_COMMISSIONS' },
      { label: 'Spa Treatment Sales', href: '/reports?tab=SPA_ANALYTICS' },
      { label: 'Sundry Debtors', href: '/reports?tab=SUNDRY_DEBTORS' },
      { label: 'Sundry Creditors', href: '/reports?tab=SUNDRY_CREDITORS' },
      { label: 'Folio & Room Analytics', href: '/reports?tab=SALES_CONTRIBUTION' },
  ] },
  { label: 'Sales Report', href: '/sales-report', icon: FileText, permission: 'reports.view' },
  { label: 'Purchase Report', href: '/purchase-report', icon: FileText, permission: 'reports.view' },
  { separator: 'MASTER SETUP' },
  { label: 'Master Setup', href: '/setup', icon: Settings, permission: 'setup.manage' },
  { separator: 'SYSTEM CONTROL' },
  { label: 'Admin Panel', href: '/admin', icon: ShieldAlert, permission: 'admin.audit' },
];

interface SidebarProps {
  onClose?: () => void;
  permissions?: string[];
  config?: any;
}

export default function Sidebar({ onClose, permissions = [], config }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Auto-expand menu if current path matches sub-item
    const newExpanded = { ...expandedItems };
    navItems.forEach(item => {
      if ('subItems' in item && item.subItems) {
         if (pathname.startsWith(item.href)) {
            newExpanded[item.label] = true;
         }
      }
    });
    setExpandedItems(newExpanded);
  }, [pathname]);

  const toggleExpand = (label: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedItems(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const hasPerm = (p?: string) => {
    if (!p) return true;
    if (permissions.includes('admin.root')) return true;
    return permissions.includes(p);
  };

  const filteredNav: SidebarItem[] = [];
  let currentSeparator: SeparatorItem | null = null;
  let itemsUnderSeparator = 0;

  for (const item of navItems) {
    if ('separator' in item && item.separator !== undefined) {
      currentSeparator = item as SeparatorItem;
      itemsUnderSeparator = 0;
    } else {
      if (hasPerm(item.permission)) {
        if (currentSeparator && itemsUnderSeparator === 0) {
          filteredNav.push(currentSeparator);
        }
        filteredNav.push(item);
        itemsUnderSeparator++;
      }
    }
  }

  return (
    <div className="w-[var(--sidebar-width)] bg-[var(--sidebar-bg)] text-[var(--text-muted)] flex flex-col h-full border-r border-[var(--border-color)] shadow-sm transition-all overflow-hidden">
      {/* Brand Section */}
      <div className="p-3 mb-1">

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--primary-color)] text-white rounded-[var(--radius-md)] flex items-center justify-center shadow-md">
            <Package className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[0.75rem] font-black text-[var(--primary-color)] tracking-tighter leading-none uppercase italic">{config?.hotelName || "Luxury Vantage"}</h1>
            <span className="text-[0.5rem] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">{config?.tagline || "Property Systems"}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin">
        {filteredNav.map((item, idx) => {
          if ('separator' in item) {
            return (
              <div key={`sep-${idx}`} className="flex items-center gap-2 mt-5 mb-1 px-3">
                <span className="text-[0.45rem] font-black text-slate-900 uppercase tracking-[0.3em] whitespace-nowrap">
                  {item.separator}
                </span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = pathname === item.href || (item.subItems && pathname.startsWith(item.href));
          const isExpanded = expandedItems[item.label];

          return (
            <div key={item.href} className="flex flex-col">
              <Link
                href={item.subItems ? '#' : item.href}
                onClick={(e) => {
                   if (item.subItems) {
                      toggleExpand(item.label, e);
                   } else {
                      onClose && onClose();
                   }
                }}
                prefetch={!item.subItems}
                className={cn(
                  "group flex items-center justify-between px-3 py-1 rounded-[var(--radius-sm)] font-bold text-[0.7rem] transition-all active:scale-[0.98] touch-manipulation tracking-wide",
                  isActive && !item.subItems
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : "text-slate-900 hover:bg-slate-100/50 hover:text-indigo-600"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-1 rounded-[var(--radius-sm)] transition-colors",
                    isActive && !item.subItems ? "text-white" : isActive ? "text-indigo-600" : "text-slate-900 group-hover:text-indigo-600"
                  )}>
                    {Icon && <Icon className="w-4 h-4" />}
                  </div>
                  <span className={isActive && !item.subItems ? "text-white" : isActive ? "text-indigo-600" : ""}>{item.label}</span>
                </div>
                {item.subItems && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", isExpanded ? "rotate-90 text-indigo-600" : "text-slate-900 group-hover:text-indigo-600")}>
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                )}
              </Link>
              
              {item.subItems && isExpanded && (
                <div className="flex flex-col mt-1 mb-2 ml-4 pl-3 border-l-2 border-slate-100 space-y-1">
                  {item.subItems.map((sub, sidx) => {
                     // Parse tab parameter correctly to handle active state
                     const isSubActive = typeof window !== 'undefined' 
                        ? window.location.search.includes(sub.href.split('?')[1] || '') && pathname === item.href
                        : false;
                     return (
                       <Link
                         key={`sub-${sidx}`}
                         href={sub.href}
                         onClick={onClose}
                         className={cn(
                           "py-1.5 px-3 text-[0.65rem] font-bold rounded transition-all tracking-wide",
                           isSubActive 
                             ? "bg-indigo-50 text-indigo-700" 
                             : "text-slate-900 hover:text-indigo-600 hover:bg-slate-50"
                         )}
                       >
                         {sub.label}
                       </Link>
                     );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

    </div>
  );
}
