'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ALT + Key logic
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            router.push('/sales');
            break;
          case 'p':
            e.preventDefault();
            router.push('/purchase');
            break;
          case 'd':
            e.preventDefault();
            router.push('/day-book');
            break;
          case 'r':
            e.preventDefault();
            router.push('/reports');
            break;
          case 'm':
            e.preventDefault();
            router.push('/setup');
            break;
          case 'a':
            e.preventDefault();
            router.push('/admin');
            break;
          case 'home':
            e.preventDefault();
            router.push('/');
            break;
        }
      }

      // Quick Escape
      if (e.key === 'Escape') {
        // This could close modals if handled locally, 
        // but here we just ensure global awareness
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);
}
