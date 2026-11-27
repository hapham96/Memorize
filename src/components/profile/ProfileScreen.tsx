'use client';

import React from 'react';
import { Pencil, LogOut } from 'lucide-react';
import { SRSData, UserProgress, LearningProgress, VocabularySet, Word } from '@/types';
import { WordLibrarySection } from './WordLibrarySection';

interface ProfileScreenProps {
  progress: UserProgress;
  learning: LearningProgress | null;
  /** Local library, used as the fallback for the word list below. */
  allWords: Word[];
  srsMap: Record<string, SRSData>;
  /** The account's `/vocabulary-sets` list; resolves each word's category name. */
  vocabularySets?: VocabularySet[];
  /** A word was edited in the library below — the local copy must follow. */
  onWordUpdated?: (word: Word) => void;
  /** A word was deleted in the library below. */
  onWordDeleted?: (wordId: string) => void;
  favorites: string[];
  onToggleFavorite: (wordId: string) => void;
  /** Sets or their words changed in the library below. */
  onSetsChanged: () => Promise<void>;
  /** Opens the name/password editor. Settings live in the header bar instead. */
  onEditProfile: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  progress,
  learning,
  allWords,
  srsMap,
  vocabularySets,
  onWordUpdated,
  onWordDeleted,
  favorites,
  onToggleFavorite,
  onSetsChanged,
  onEditProfile,
  onLogout,
}) => {
  const levelPercent = learning
    ? Math.round((learning.xpIntoLevel / learning.xpPerLevel) * 100)
    : 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto overscroll-contain px-5 py-4 pb-28">
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-800 rounded-card p-6 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm text-center relative">
        <button
          onClick={onEditProfile}
          aria-label="Chỉnh sửa tài khoản"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
        >
          <Pencil className="w-5 h-5" />
        </button>

        <div className="relative inline-block mb-3">
          <img
            src={progress.avatar}
            alt={progress.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-500/20 mx-auto"
          />
          <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white font-extrabold text-xs px-2 py-0.5 rounded-full shadow">
            L{learning?.level ?? '–'}
          </span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{progress.name}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {progress.email || 'Not signed in — progress stays on this device'}
        </p>

        {/* Level XP Progress Bar */}
        <div className="mt-4 max-w-xs mx-auto space-y-1.5">
          <div className="flex justify-between text-xs font-semibold tabular-nums">
            <span className="text-blue-600 dark:text-blue-400">Cấp {learning?.level ?? '–'}</span>
            <span className="text-slate-400">
              {learning ? `${learning.xpIntoLevel} / ${learning.xpPerLevel} XP` : '– XP'}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Tiến độ cấp"
            aria-valuenow={levelPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden shadow-clay-inset border-2 border-slate-300 dark:border-slate-600"
          >
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${levelPercent}%` }}
            />
          </div>
          {learning && (
            <p className="text-[11px] text-slate-400 font-medium">
              Còn {learning.xpPerLevel - learning.xpIntoLevel} XP nữa lên cấp {learning.level + 1}
            </p>
          )}
        </div>
      </div>

      {/* Every word the account has added, paged straight off `GET /words` */}
      <WordLibrarySection
        allWords={allWords}
        srsMap={srsMap}
        vocabularySets={vocabularySets}
        onWordUpdated={onWordUpdated}
        onWordDeleted={onWordDeleted}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        onSetsChanged={onSetsChanged}
      />

      {/* Logout Action Button — pinned to the bottom of the scroll area */}
      <button
        onClick={onLogout}
        className="mt-auto shrink-0 w-full py-3.5 rounded-button bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs border border-red-500/20 flex items-center justify-center gap-2 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span>Đăng xuất</span>
      </button>
    </div>
  );
};
