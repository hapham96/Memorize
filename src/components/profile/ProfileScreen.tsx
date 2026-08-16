'use client';

import React from 'react';
import {
  Award,
  Zap,
  Flame,
  Settings,
  Footprints,
  BookOpen,
  Trophy,
  Target,
  CheckCircle2,
  Lock,
  LogOut,
} from 'lucide-react';
import { UserProgress, Achievement } from '@/types';

interface ProfileScreenProps {
  progress: UserProgress;
  achievements: Achievement[];
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  progress,
  achievements,
  onOpenSettings,
  onLogout,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Footprints':
        return Footprints;
      case 'Flame':
        return Flame;
      case 'Zap':
        return Zap;
      case 'BookOpen':
        return BookOpen;
      case 'Trophy':
        return Trophy;
      case 'Target':
        return Target;
      default:
        return Award;
    }
  };

  const xpForNextLevel = progress.level * 300;
  const currentLevelProgress = Math.min(
    100,
    Math.round(((progress.xp % 300) / 300) * 100)
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5 pb-28">
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-800 rounded-card p-6 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm text-center relative">
        <button
          onClick={onOpenSettings}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="relative inline-block mb-3">
          <img
            src={progress.avatar}
            alt={progress.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-500/20 mx-auto"
          />
          <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white font-extrabold text-xs px-2 py-0.5 rounded-full shadow">
            L{progress.level}
          </span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{progress.name}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {progress.email || 'Not signed in — progress stays on this device'}
        </p>

        {/* Level XP Progress Bar */}
        <div className="mt-4 max-w-xs mx-auto space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-blue-600 dark:text-blue-400">Level {progress.level}</span>
            <span className="text-slate-400">{progress.xp} / {xpForNextLevel} XP</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden shadow-clay-inset border-2 border-slate-300 dark:border-slate-600">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${currentLevelProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="bg-white dark:bg-slate-800 rounded-card p-5 border-clay border-blue-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Achievements</h4>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {achievements.filter((a) => a.unlocked).length} / {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {achievements.map((item) => {
            const Icon = getIcon(item.iconName);
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  item.unlocked
                    ? 'bg-amber-500/10 border-amber-500/30 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      item.unlocked
                        ? 'bg-amber-500 text-white shadow-clay'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div>
                    <h5 className="font-bold text-xs">{item.title}</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.unlocked ? (
                  <CheckCircle2 className="w-5 h-5 text-amber-500" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Logout Action Button */}
      <button
        onClick={onLogout}
        className="w-full py-3.5 rounded-button bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs border border-red-500/20 flex items-center justify-center gap-2 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out Account</span>
      </button>
    </div>
  );
};
