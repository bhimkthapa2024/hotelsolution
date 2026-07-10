'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface PageBannerProps {
  prefix: string;
  subtitle: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

 export default function PageBanner({ 
   prefix, 
   subtitle, 
   title, 
   description, 
   icon, 
   children 
 }: PageBannerProps) {
   const [config, setConfig] = React.useState<any>(null);
   const [mounted, setMounted] = React.useState(false);

   React.useEffect(() => {
     setMounted(true);
     import('@/actions/hotel').then(m => m.getConfig().then(c => setConfig(c)));
   }, []);

   const hotelName = config?.hotelName || "HOTEL NAME NOT CONFIGURED";
   const address = config?.address || "";
   const phone = config?.phone || "";
   const email = config?.email || "";
   const website = config?.website || "";
   const pan = config?.pan || "";
   const shortName = hotelName.includes(" ") ? hotelName.split(" ")[0] + " 16" : "CLUB 16";

   return (
     <div className="w-full mb-6 bg-white printable-doc" style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>
        
         {/* COMPANY HEADER */}
         <div className="flex flex-col items-center justify-center mb-6 border-b border-gray-300 pb-4 relative">
            <h1 className="text-xl font-bold text-gray-900 tracking-wide uppercase">{hotelName}</h1>
            <p className="text-[0.65rem] text-gray-600 mt-0.5">{address}</p>
            <div className="flex items-center gap-4 mt-1 text-[0.55rem] text-gray-500">
               {phone && <span>📱 {phone}</span>}
               {email && <span>✉️ {email}</span>}
               {website && <span>🌐 {website}</span>}
            </div>
         </div>

         {/* METADATA SUB-HEADER */}
         <div className="flex flex-col items-center justify-center mb-8 text-center border-b border-gray-100 pb-6">
            <div className="text-[0.65rem] text-indigo-700 mb-2 font-black tracking-widest uppercase">{title} : {prefix}</div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[0.55rem] font-bold text-gray-700 uppercase">
               <div><span className="text-gray-500">REPORT TYPE :</span> {subtitle}</div>
               <div><span className="text-gray-500">DESCRIPTION :</span> {description}</div>
               <div><span className="text-gray-500">PAN :</span> {pan}</div>
               <div><span className="text-gray-500">PRINT DATE :</span> {mounted ? new Date().toLocaleDateString('en-GB') : ''}</div>
            </div>
         </div>

        {/* INTERACTIVE CONTROLS (TABS/SEARCH/BUTTONS) */}
        {children && (
          <div className="mt-4 no-print flex flex-wrap items-center gap-2">
            {children}
          </div>
        )}
     </div>
   );
 }
