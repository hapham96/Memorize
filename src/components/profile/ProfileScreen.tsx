'use client';

import React from 'react';
import { Pencil, LogOut } from 'lucide-react';
import { SRSData, UserProgress, VocabularySet, Word } from '@/types';
import { WordLibrarySection } from './WordLibrarySection';

interface ProfileScreenProps {
  progress: UserProgress;
  allWords: Word[];
  srsMap: Record<string, SRSData>;
  vocabularySets?: VocabularySet[];
  onWordUpdated?: (word: Word) => void;
  onWordDeleted?: (wordId: string) => void;
  onEditProfile: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  progress,
  allWords,
  srsMap,
  vocabularySets,
  onWordUpdated,
  onWordDeleted,
  onEditProfile,
  onLogout,
}) => {
  const xpForNextLevel = progress.level * 300;
  const currentLevelProgress = Math.min(
    100,
    Math.round(((progress.xp % 300) / 300) * 100)
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 pb-28 animate-fadeIn">
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm text-center relative">
        <button
          onClick={onEditProfile}
          aria-label="Chỉnh sửa tài khoản"
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>

        <div className="relative inline-block mb-3">
          <img
            src={progress.avatar}
            alt={progress.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-500/20 mx-auto"
          />
          <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white font-bold text-xs px-2 py-0.5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900">
            L{progress.level}
          </span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{progress.name}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {progress.email || 'Chưa đăng nhập — tiến độ lưu trên thiết bị'}
        </p>

        {/* Level XP Progress Bar */}
        <div className="mt-4 max-w-xs mx-auto space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-indigo-600 dark:text-indigo-400">Cấp độ {progress.level}</span>
            <span className="text-slate-400">{progress.xp} / {xpForNextLevel} XP</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/70 dark:border-slate-700/70">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${currentLevelProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Every word the account has added, paged straight off `GET /words` */}
      <WordLibrarySection
        allWords={allWords}
        srsMap={srsMap}
        vocabularySets={vocabularySets}
        onWordUpdated={onWordUpdated}
        onWordDeleted={onWordDeleted}
      />

      {/* Logout Action Button */}
      <button
        onClick={onLogout}
        className="mt-auto shrink-0 w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 font-semibold text-xs border border-red-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
      >
        <LogOut className="w-4 h-4" />
        <span>Đăng xuất tài khoản</span>
      </button>
    </div>
  );
};
