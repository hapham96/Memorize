'use client';

import React from 'react';
import { Flame, BookOpen, Repeat, CheckCircle2 } from 'lucide-react';
import { UserProgress } from '@/types';
import { LeaderboardCard } from './LeaderboardCard';

interface StatsDashboardProps {
  progress: UserProgress;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ progress }) => {
  const accuracy = Math.round((progress.totalCorrect / Math.max(1, progress.totalAttempted)) * 100);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5 pb-28 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thống kê học tập</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Theo dõi hành trình trau dồi và tiến bộ vốn từ vựng của bạn.
        </p>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-semibold">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Từ đã học</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 my-1">
            {progress.wordsLearned}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {progress.masteredCount} từ đã Master ✨
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Độ chính xác</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 my-1">
            {progress.totalAttempted > 0 ? `${accuracy}%` : '—'}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {progress.totalCorrect} / {progress.totalAttempted} câu đúng
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-semibold">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Chuỗi ngày (Streak)</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 my-1">
            {progress.streak} ngày
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
            🔥 Kỷ lục: {progress.bestStreak} ngày
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-semibold">
            <Repeat className="w-4 h-4 text-purple-500" />
            <span>Tổng lượt ôn</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 my-1">
            {progress.totalAttempted}
          </p>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
            {progress.history.length} phiên học
          </span>
        </div>
      </div>

      {/* Ranking — top learners across all accounts */}
      <LeaderboardCard currentUserId={progress.userId} currentUserName={progress.name} />
    </div>
  );
};
