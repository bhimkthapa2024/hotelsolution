'use client';

import React from 'react';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded-[var(--radius-sm)] ${className}`} />
);

export const DashboardSkeleton = () => (
  <div className="p-4 max-w-[1550px] mx-auto min-h-screen bg-[var(--bg-color)] animate-fadeIn">
    {/* Banner Skeleton */}
    <div className="w-full h-16 bg-slate-100 rounded-[var(--radius-md)] mb-3 sm:mb-6 border border-slate-200" />
    
    {/* Stats Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-20 sm:h-24 bg-white rounded-[var(--radius-md)] border border-slate-200 p-4">
          <Skeleton className="w-1/3 h-2 mb-2" />
          <Skeleton className="w-2/3 h-4" />
        </div>
      ))}
    </div>

    {/* Content Skeleton */}
    <div className="grid grid-cols-12 gap-2 sm:gap-4">
      <div className="col-span-12 lg:col-span-8 h-64 bg-white rounded-[var(--radius-md)] border border-slate-200 p-4">
        <Skeleton className="w-1/4 h-3 mb-4" />
        <Skeleton className="w-full h-40" />
      </div>
      <div className="col-span-12 lg:col-span-4 h-64 bg-white rounded-[var(--radius-md)] border border-slate-200 p-4">
        <Skeleton className="w-1/3 h-3 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="w-full h-8" />)}
        </div>
      </div>
    </div>
  </div>
);

export const SalesSkeleton = () => (
  <div className="p-4 max-w-[1550px] mx-auto min-h-screen bg-[var(--bg-color)] animate-fadeIn">
    <div className="w-full h-16 bg-slate-100 rounded-[var(--radius-md)] mb-3 sm:mb-6 border border-slate-200" />
    <div className="grid grid-cols-12 gap-4">
       <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="h-96 bg-white rounded-[var(--radius-md)] border border-slate-200 p-6">
             <Skeleton className="w-1/2 h-3 mb-6" />
             <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="w-full h-10" />)}
             </div>
          </div>
       </div>
       <div className="col-span-12 lg:col-span-8">
          <div className="h-[500px] bg-white rounded-[var(--radius-md)] border border-slate-200 p-6">
             <Skeleton className="w-1/4 h-3 mb-6" />
             <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="w-full h-12" />)}
             </div>
          </div>
       </div>
    </div>
  </div>
);

export const TableSkeleton = () => (
  <div className="p-4 max-w-[1550px] mx-auto min-h-screen bg-[var(--bg-color)] animate-fadeIn">
    <div className="w-full h-16 bg-slate-100 rounded-[var(--radius-md)] mb-3 sm:mb-6 border border-slate-200" />
    <div className="bg-white rounded-[var(--radius-md)] border border-slate-200 p-6 space-y-4">
       <div className="flex justify-between mb-8">
          <Skeleton className="w-1/4 h-8" />
          <Skeleton className="w-1/6 h-8" />
       </div>
       {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <div key={i} className="flex gap-4 border-b border-slate-50 pb-4">
             <Skeleton className="w-12 h-4" />
             <Skeleton className="flex-1 h-4" />
             <Skeleton className="w-24 h-4" />
             <Skeleton className="w-24 h-4" />
          </div>
       ))}
    </div>
  </div>
);
