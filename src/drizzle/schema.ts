// Firestore Schema Interfaces (No longer using Drizzle ORM)

export interface Config {
  id: string; // Document ID (e.g. 'main')
  hotelName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  businessDate: string;
  paymentModes?: any | null; 
  display?: any | null; 
  taxInclusive?: boolean | null;
  applyServiceCharge?: boolean | null;
  applyVat?: boolean | null;
  vatRate?: number | null;
  serviceChargeRate?: number | null;
  stayPlans?: any | null; 
  spaMenuItems?: any | null; 
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string; 
  category?: string | null;
  normal: string; 
  balance: number;
  creditLimit?: number | null;
  parentId?: string | null;
  isActive: boolean;
}

export interface Room {
  id: string;
  number: string;
  type: string;
  floor?: string | null;
  status: string; 
  rate: number;
  lastIn?: string | null;
  lastOut?: string | null;
}

export interface Sale {
  id: string;
  date: string;
  guest?: string | null;
  phone?: string | null;
  email?: string | null;
  pan?: string | null;
  address?: string | null;
  amount: number;
  tax: number;
  sc: number;
  subtotal: number;
  status: string;
  paymentMode?: string | null;
  roomNumber?: string | null;
  items?: any | null; 
  settlements?: any | null; 
  pax?: string | null;
  nationality?: string | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  plan?: string | null; 
  passportNo?: string | null;
  passportIssue?: string | null;
  passportExpiry?: string | null;
  passportPlace?: string | null;
  isVoided?: boolean | null;
  voidReason?: string | null;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
}

export interface Expense {
  id: string;
  date: string;
  vendor?: string | null;
  amount: number;
  category?: string | null;
  payMode?: string | null;
  status?: string | null;
  items?: any | null;
  note?: string | null;
  isVoided?: boolean | null;
  voidReason?: string | null;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string; // Use string IDs in Firestore
  date: string;
  auditRevenue: number;
  totalSales: number;
  totalExpenses: number;
  timestamp: string;
  details?: any | null; 
}

export interface HousekeepingLog {
  id: string;
  date: string;
  roomNumber: string;
  prevStatus?: string | null;
  newStatus: string;
  actionedBy?: string | null;
  timestamp: string;
  note?: string | null;
}

export interface LedgerEntry {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  description: string;
  refId?: string | null; 
  debit: number;
  credit: number;
  balanceAfter: number;
  createdAt: string; 
}

export interface Notification {
  id: string;
  timestamp: string;
  type: string; 
  message: string;
  read: boolean;
}

export interface AccountCategory {
  id: string;
  name: string;
  type: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName?: string | null;
  email?: string | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  roles?: string[]; // Array of role IDs for Firestore (replaces userRoles)
}

export interface Role {
  id: string;
  name: string; 
  description?: string | null;
  permissions?: string[]; // Array of permission codes for Firestore (replaces rolePermissions)
}

export interface Permission {
  id: string;
  code: string; 
  description?: string | null;
}

export interface Debtor {
  id: string;
  name: string;
  type: string; 
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  pan?: string | null;
  creditLimit?: number | null;
  creditDays?: number | null;
  isActive: boolean;
  accountId?: string | null;
  contactPerson?: string | null;
  openingBalance?: number | null;
  notes?: string | null;
  createdAt?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  type: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  pan?: string | null;
  contactPerson?: string | null;
  openingBalance?: number | null;
  isActive: boolean;
  accountId?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

export interface Employee {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  commissionRate: number; 
  isActive: boolean;
  createdAt?: string | null;
}
