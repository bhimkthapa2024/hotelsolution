'use client';

import { usePathname } from 'next/navigation';
import MainLayout from './MainLayout';

// Routes that should render WITHOUT the sidebar/header shell
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'];

export default function ConditionalLayout({
  children,
  config,
  businessDate,
  user,
}: {
  children: React.ReactNode;
  config: any;
  businessDate: string;
  user: any;
}) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

  if (isAuthRoute) {
    // Render full-screen without sidebar or header
    return <>{children}</>;
  }

  return (
    <MainLayout config={config} businessDate={businessDate} user={user}>
      {children}
    </MainLayout>
  );
}
