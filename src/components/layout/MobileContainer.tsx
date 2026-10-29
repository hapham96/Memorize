'use client';

import React from 'react';

interface MobileContainerProps {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-100/90 dark:bg-[#070A12] flex justify-center items-center font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-300 p-0 sm:p-4 md:p-6 relative">
      {/* Ambient background glows for high-end depth */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl" />

      {/* Main App Frame */}
      <div className="w-full max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl h-full sm:rounded-3xl bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/5 dark:shadow-black/40 sm:border border-slate-200/80 dark:border-slate-800/80 flex flex-col relative overflow-hidden transition-all duration-300">
        {children}
      </div>
    </div>
  );
};
