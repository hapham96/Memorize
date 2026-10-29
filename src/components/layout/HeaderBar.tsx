'use client';

import React from 'react';
import { Flame, Zap, Settings } from 'lucide-react';
import { UserProgress } from '@/types';

interface HeaderBarProps {
  progress: UserProgress;
  onOpenSettings: () => void;
  onOpenAddWord?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ progress, onOpenSettings }) => {
  return (
    <header className="shrink-0 px-4 md:px-8 py-3.5 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-30 border-b border-slate-200/70 dark:border-slate-800/70 transition-all duration-200">
      {/* User Greeting & Level */}
      <div className="flex items-center gap-3">
        <div className="relative group cursor-pointer">
          <img
            src={progress.avatar}
            alt={progress.name}
            className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover ring-2 ring-indigo-500/20 dark:ring-indigo-400/30 transition-transform duration-200 group-hover:scale-105"
          />
          <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900">
            L{progress.level}
          </span>
        </div>
        <div>
          <h2 className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
            Xin chào!
          </h2>
          <p className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>{progress.name}</span>
            <span className="inline-block hover:rotate-12 transition-transform origin-bottom-right">👋</span>
          </p>
        </div>
      </div>

      {/* Badges: Streak, XP & Settings */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition-transform hover:scale-105">
          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>{progress.streak}d</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-transform hover:scale-105">
          <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-500" />
          <span>{progress.xp} <span className="hidden sm:inline font-medium">XP</span></span>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all border border-slate-200/70 dark:border-slate-700/70 cursor-pointer active:scale-95 shadow-sm"
          aria-label="Cài đặt"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
