'use client';

import React from 'react';
import { Flame, BookOpen, Repeat, Calendar, CheckCircle2 } from 'lucide-react';
import { ActivityDay, LearningProgress, UserProgress } from '@/types';
import { StatsSummary } from '@/types/stats';
import { ActivityHeatmap } from './ActivityHeatmap';
import { LeaderboardCard } from './LeaderboardCard';

interface StatsDashboardProps {
  progress: UserProgress;
  learning: LearningProgress | null;
  activity: ActivityDay[] | null;
  /** The server's word counters, which win over the local ones; null until it answers. */
  summary: StatsSummary | null;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  progress,
  learning,
  activity,
  summary,
}) => {
  const masteredCount = summary?.masteredCount ?? progress.masteredCount;
  const wordsLearned = summary
    ? summary.learningCount + summary.masteredCount
    : progress.wordsLearned;
  const totalReviews = learning?.totalReviews ?? 0;
  const correctReviews = learning?.correctReviews ?? 0;
  const accuracy = Math.round((correctReviews / Math.max(1, totalReviews)) * 100);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5 pb-28">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Thống kê học tập</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mỗi ngày một chút, ô xanh sẽ đầy dần.
        </p>
      </div>

      <ActivityHeatmap activity={activity} />

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border-clay border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Từ đã học</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {wordsLearned}
          </p>
          <span className="text-[10px] text-emerald-500 font-semibold">
            {masteredCount} từ đã thành thạo
            {summary && ` · ${summary.totalWords} từ trong kho`}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border-clay border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Độ chính xác</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {totalReviews > 0 ? `${accuracy}%` : '—'}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold">
            {correctReviews} / {totalReviews} lượt đúng
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border-clay border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Chuỗi hiện tại</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {learning?.streak ?? '–'} ngày
          </p>
          <span className="text-[10px] text-orange-500 font-semibold">
            🔥 Kỷ lục: {learning?.bestStreak ?? '–'} ngày
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border-clay border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Repeat className="w-4 h-4 text-purple-500" />
            <span>Lượt đã ôn</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {totalReviews}
          </p>
          <span className="text-[10px] text-purple-500 font-semibold">
            {learning?.totalSessions ?? 0} phiên luyện tập
          </span>
        </div>
      </div>

      {/* Ranking — top learners across all accounts */}
      <LeaderboardCard currentUserId={progress.userId} currentUserName={progress.name} />
    </div>
  );
};
