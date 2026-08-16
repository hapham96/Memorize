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
    <nav className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm sm:max-w-md md:max-w-lg z-40">
      <div className="clay-nav rounded-full p-2 flex items-center justify-around transition-all duration-300">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-3 sm:px-4 rounded-full cursor-pointer transition-all duration-200 ease-clay active:scale-95 ${
                isActive
                  ? 'text-white bg-blue-600 font-extrabold shadow-clay border-2 border-blue-400 -translate-y-0.5'
                  : 'text-slate-500 dark:text-slate-400 border-2 border-transparent hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-2 -right-3 bg-clay-cta text-white text-[10px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-clay-sm animate-bounce">
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
