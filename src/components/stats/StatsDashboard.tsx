'use client';

import React from 'react';
import { Flame, BookOpen, Repeat, Calendar, CheckCircle2, Zap } from 'lucide-react';
import { UserProgress } from '@/types';
import { buildActivitySeries } from '@/lib/progress';

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
        return 'bg-emerald-600 dark:bg-emerald-400 shadow-sm';
      default:
        return 'bg-slate-200 dark:bg-slate-800';
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5 pb-28">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Learning Statistics</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Track your English growth, streak consistency, and quiz performance.
        </p>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border border-slate-200/80 dark:border-slate-700">
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

        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border border-slate-200/80 dark:border-slate-700">
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

        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border border-slate-200/80 dark:border-slate-700">
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

        <div className="bg-white dark:bg-slate-800 p-4 rounded-card border border-slate-200/80 dark:border-slate-700">
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

      {/* Heatmap Activity Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-card p-5 border border-slate-200/80 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Activity Heatmap
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Last 28 Days</span>
        </div>

        {/* 7x4 Grid */}
        <div className="grid grid-cols-7 gap-2 my-3">
          {activity.map((item) => {
            const date = new Date(item.date);
            return (
              <div
                key={item.date}
                className={`h-8 rounded-lg ${getHeatmapColor(
                  intensityOf(item.count)
                )} transition-all hover:scale-110 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 opacity-90 ${
                  item.isToday ? 'ring-2 ring-blue-500' : ''
                }`}
                title={`${date.toLocaleDateString()}: ${item.count} words reviewed`}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400 mt-2">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="w-2.5 h-2.5 rounded bg-emerald-200 dark:bg-emerald-950" />
          <div className="w-2.5 h-2.5 rounded bg-emerald-400 dark:bg-emerald-700" />
          <div className="w-2.5 h-2.5 rounded bg-emerald-600 dark:bg-emerald-400" />
          <span>More</span>
        </div>
      </div>

      {/* Quiz History Log */}
      <div className="bg-white dark:bg-slate-800 rounded-card p-5 border border-slate-200/80 dark:border-slate-700">
        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">Quiz History</h4>
        {progress.history.length === 0 && (
          <p className="text-xs text-slate-400 py-4 text-center">
            No quiz sessions yet. Finish a quiz to start tracking your progress.
          </p>
        )}
        <div className="space-y-2.5">
          {progress.history.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
            >
              <div>
                <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {item.quizType}
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {item.correctCount}/{item.totalQuestions}
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Zap className="w-3 h-3 fill-blue-500" />+{item.xpEarned}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
