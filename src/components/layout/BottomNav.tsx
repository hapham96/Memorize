'use client';

import React from 'react';
import { Home, BookOpen, Brain, BarChart3, User } from 'lucide-react';
import { ActiveTab } from '@/types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  reviewDueCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  reviewDueCount,
}) => {
  const tabs = [
    { id: 'home' as ActiveTab, label: 'Trang chủ', icon: Home },
    { id: 'learn' as ActiveTab, label: 'Luyện tập', icon: BookOpen },
    {
      id: 'review' as ActiveTab,
      label: 'Ôn tập',
      icon: Brain,
      badge: reviewDueCount > 0 ? reviewDueCount : undefined,
    },
    { id: 'stats' as ActiveTab, label: 'Thống kê', icon: BarChart3 },
    { id: 'profile' as ActiveTab, label: 'Cá nhân', icon: User },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm sm:max-w-md md:max-w-lg z-40">
      <div className="bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl rounded-full p-2 flex items-center justify-around shadow-2xl border border-white/40 dark:border-slate-800/80 transition-all duration-300">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-3 sm:px-4 rounded-full transition-all duration-300 active:scale-95 ${
                isActive
                  ? 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 font-extrabold shadow-md shadow-blue-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md animate-bounce">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] md:text-xs mt-0.5 font-bold tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
