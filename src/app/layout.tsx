import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ShortcutManager from "@/components/ShortcutManager";
import Spotlight from "@/components/Spotlight";
import ConditionalLayout from "@/components/ConditionalLayout";
import { getConfig } from "@/actions/hotel";
import { formatDate } from "@/lib/utils";
import UIThemeProvider from "@/components/UIThemeProvider";
import { validateRequest } from "@/lib/session";
import { redirect } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: 'Hotel PMS | Accounting Suite',
  description: 'Next Generation Full Stack PMS accounting suite',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [config, { user }] = await Promise.all([
    getConfig(),
    validateRequest()
  ]);
  
  const businessDate = config?.businessDate ? formatDate(config.businessDate) : 'Not Set';
  
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased text-[var(--text-main)]`}>
       <UIThemeProvider display={config?.display || {}} />
      <body suppressHydrationWarning={true} className="font-sans bg-[var(--bg-color)]">
        <ShortcutManager />
        <Spotlight />
        <ConditionalLayout config={config} businessDate={businessDate} user={user as any}>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  );
}




