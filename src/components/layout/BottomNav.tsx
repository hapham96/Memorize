'use client';

import React from 'react';
import { Home, BookOpen, Brain, BarChart3, User } from 'lucide-react';
import { ActiveTab } from '@/types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'home' as ActiveTab, label: 'Trang chủ', icon: Home },
    { id: 'learn' as ActiveTab, label: 'Luyện tập', icon: BookOpen },
    { id: 'review' as ActiveTab, label: 'Ôn tập', icon: Brain },
    { id: 'stats' as ActiveTab, label: 'Thống kê', icon: BarChart3 },
    { id: 'profile' as ActiveTab, label: 'Cá nhân', icon: User },
  ];

  return (
    <nav className="absolute bottom-[max(0.85rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-1.75rem)] max-w-sm sm:max-w-md md:max-w-lg z-40">
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-full p-1.5 flex items-center justify-around shadow-xl shadow-slate-900/8 dark:shadow-black/50 transition-all duration-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-3 sm:px-4 rounded-xl sm:rounded-full cursor-pointer transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-white bg-indigo-600 font-semibold shadow-md shadow-indigo-600/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
              </div>
              <span className="text-[10px] md:text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
