'use client';

import React from 'react';

interface MobileContainerProps {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex justify-center items-center font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 p-0 sm:p-4 md:p-6">
      <div className="w-full max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl min-h-screen sm:min-h-[90vh] sm:rounded-[32px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl sm:border border-slate-200/80 dark:border-slate-800/80 flex flex-col relative overflow-hidden transition-all duration-300">
        {children}
      </div>
    </div>
  );
};

