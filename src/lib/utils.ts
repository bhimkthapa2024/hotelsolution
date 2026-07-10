import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined) {
  const value = amount || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value).replace('₹', 'Rs. ');
}

export function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date';
  }
}
 
export function serialize<T>(data: T): T {
  if (data === null || data === undefined) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => serialize(item)) as unknown as T;
  }
  
  if (typeof data === 'object') {
    // Check if it's a Firestore Timestamp (Admin SDK)
    if (typeof (data as any).toDate === 'function') {
      return (data as any).toDate().toISOString() as unknown as T;
    }

    // Check if it's a Firestore Timestamp (Plain object format often seen after some processing)
    if ('seconds' in data && 'nanoseconds' in data && Object.keys(data).length === 2) {
      return new Date((data as any).seconds * 1000).toISOString() as unknown as T;
    }
    
    if (data instanceof Date) {
      return data.toISOString() as unknown as T;
    }

    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = serialize((data as any)[key]);
      }
    }
    return result as T;
  }
  
  return data;
}

/**
 * Returns the current date in YYYY-MM-DD format, adjusted to the property's local timezone (Default: Nepal +05:45)
 */
export function getInstitutionalDate() {
  const now = new Date();
  // Nepal Offset is +5 hours 45 minutes = 345 minutes
  const offsetMinutes = 345; 
  const localTime = new Date(now.getTime() + offsetMinutes * 60000);
  return localTime.toISOString().split('T')[0];
}

/**
 * Returns a human-readable local timestamp for logging/audit purposes
 */
export function getInstitutionalTimestamp() {
  const now = new Date();
  const offsetMinutes = 345;
  const localTime = new Date(now.getTime() + offsetMinutes * 60000);
  return localTime.toISOString().replace('Z', '').replace('T', ' ').split('.')[0];
}

/**
 * Handles Enter key press to behave like Tab key for faster data entry
 */
export function handleEnterAsTab(e: any) {
  if (e.key === 'Enter') {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
      return;
    }
    e.preventDefault();

    const form = target.closest('form');
    if (!form) return;

    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      )
    ).filter(el => {
      return (el.offsetWidth > 0 || el.offsetHeight > 0) && el.tabIndex !== -1;
    });

    const index = focusable.indexOf(target);
    if (index > -1 && index < focusable.length - 1) {
      focusable[index + 1].focus();
    }
  }
}

