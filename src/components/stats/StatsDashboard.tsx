'use client';

import React from 'react';
import { Flame, BookOpen, Repeat, Calendar, CheckCircle2 } from 'lucide-react';
import { UserProgress } from '@/types';
import { buildActivitySeries } from '@/lib/progress';
import { LeaderboardCard } from './LeaderboardCard';

interface StatsDashboardProps {
  progress: UserProgress;
}

/** Buckets a day's reviewed-word count into one of five heatmap intensities. */
function intensityOf(count: number): number {
  if (count <= 0) return 0;
  if (count < 5) return 1;
  if (count < 10) return 2;
  if (count < 20) return 3;
  return 4;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ progress }) => {
  const accuracy = Math.round((progress.totalCorrect / Math.max(1, progress.totalAttempted)) * 100);

  // 28-day heatmap built from the user's real quiz history
  const activity = buildActivitySeries(progress, 28);

  const getHeatmapColor = (level: number) => {
    switch (level) {
      case 0:
        return 'bg-slate-200 dark:bg-slate-800';
      case 1:
        return 'bg-emerald-200 dark:bg-emerald-950';
      case 2:
        return 'bg-emerald-400 dark:bg-emerald-700';
      case 3:
        return 'bg-emerald-500 dark:bg-emerald-600';
      case 4:
        return 'bg-emerald-600 dark:bg-emerald-400 shadow-clay-sm';
      default:
        return 'bg-slate-200 dark:bg-slate-800';
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5 pb-28">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Learning Statistics</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Track your English growth.
        </p>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border-clay border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Words Learned</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {progress.wordsLearned}
          </p>
          <span className="text-[10px] text-emerald-500 font-semibold">
            {progress.masteredCount} Mastered
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border-clay border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Accuracy</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {progress.totalAttempted > 0 ? `${accuracy}%` : '—'}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold">
            {progress.totalCorrect} / {progress.totalAttempted} correct
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border-clay border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Current Streak</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {progress.streak} days
          </p>
          <span className="text-[10px] text-orange-500 font-semibold">
            🔥 Best: {progress.bestStreak} days
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border-clay border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Repeat className="w-4 h-4 text-purple-500" />
            <span>Reviews Done</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {progress.totalAttempted}
          </p>
          <span className="text-[10px] text-purple-500 font-semibold">
            {progress.history.length} sessions
          </span>
        </div>
      </div>

      {/* Ranking — top learners across all accounts */}
      <LeaderboardCard currentUserId={progress.userId} currentUserName={progress.name} />
    </div>
  );
};
