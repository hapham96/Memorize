'use client';

import React from 'react';

interface MobileContainerProps {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-clay-lilac dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex justify-center items-center font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 p-0 sm:p-4 md:p-6">
      <div className="w-full max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl h-full sm:rounded-[36px] bg-white dark:bg-slate-900 shadow-clay-xl sm:border-clay border-blue-200 dark:border-slate-800 flex flex-col relative overflow-hidden transition-all duration-300">
        {children}
      </div>
    </div>
  );
};

