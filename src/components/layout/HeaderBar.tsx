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
    <header className="shrink-0 px-4 md:px-8 py-3.5 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-30 border-b border-slate-200/60 dark:border-slate-800/60 transition-all duration-300">
      {/* User Greeting & Level */}
      <div className="flex items-center gap-3">
        <div className="relative group cursor-pointer">
          <img
            src={progress.avatar}
            alt={progress.name}
            className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover ring-2 ring-blue-500/40 shadow-sm transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md border border-white dark:border-slate-900">
            L{progress.level}
          </span>
        </div>
        <div>
          <h2 className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-400 font-bold">Welcome!</h2>
          <p className="text-sm md:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <span>{progress.name}</span>
            <span className="inline-block animate-bounce">👋</span>
          </p>
        </div>
      </div>

      {/* Badges: Streak, XP, Add Word & Settings */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-extrabold shadow-sm hover:scale-105 transition-transform">
          <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
          <span>{progress.streak}d</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-extrabold shadow-sm hover:scale-105 transition-transform">
          <Zap className="w-4 h-4 text-blue-500 fill-blue-500" />
          <span>{progress.xp} <span className="hidden sm:inline">XP</span></span>
        </div>


        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 active:scale-95"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
