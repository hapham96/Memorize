'use client';

import React from 'react';
import { Flame, Zap, Settings, Plus } from 'lucide-react';
import { UserProgress } from '@/types';

interface HeaderBarProps {
  progress: UserProgress;
  onOpenSettings: () => void;
  onOpenAddWord?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ progress, onOpenSettings, onOpenAddWord }) => {
  return (
    <header className="shrink-0 px-4 md:px-8 py-3.5 flex items-center justify-between bg-blue-50 dark:bg-slate-900 z-30 border-b-clay border-blue-200 dark:border-slate-800 transition-all duration-300">
      {/* User Greeting & Level */}
      <div className="flex items-center gap-3">
        <div className="relative group cursor-pointer">
          <img
            src={progress.avatar}
            alt={progress.name}
            className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border-clay border-blue-300 dark:border-blue-500 shadow-clay-sm transition-transform duration-300 ease-clay group-hover:scale-105"
          />
          <span className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-clay-sm border-2 border-white dark:border-slate-900">
            L{progress.level}
          </span>
        </div>
        <div>
          <h2 className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-300 font-bold">Welcome!</h2>
          <p className="text-sm md:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <span>{progress.name}</span>
            <span className="inline-block animate-bounce">👋</span>
          </p>
        </div>
      </div>

      {/* Badges: Streak, XP, Add Word & Settings */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-clay-butter dark:bg-amber-500/25 border-2 border-amber-300 dark:border-amber-500/50 text-amber-700 dark:text-amber-300 text-xs font-extrabold shadow-clay-sm hover:scale-105 transition-transform duration-200 ease-clay">
          <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
          <span>{progress.streak}d</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-clay-lilac dark:bg-blue-500/25 border-2 border-blue-300 dark:border-blue-500/50 text-blue-700 dark:text-blue-200 text-xs font-extrabold shadow-clay-sm hover:scale-105 transition-transform duration-200 ease-clay">
          <Zap className="w-4 h-4 text-blue-600 fill-blue-500" />
          <span>{progress.xp} <span className="hidden sm:inline">XP</span></span>
        </div>


        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-700 shadow-clay-sm hover:-translate-y-0.5 hover:shadow-clay transition-all duration-200 ease-clay text-slate-600 dark:text-slate-300 cursor-pointer active:scale-95 active:shadow-clay-inset"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
