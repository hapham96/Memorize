'use client';

import React from 'react';
import {
  Brain,
  ChevronRight,
  BookOpen,
  Plus,
} from 'lucide-react';
import { ActivityDay, LearningProgress, UserProgress } from '@/types';
import { StatsSummary } from '@/types/stats';
import { QueueCounts, RUN_SIZE } from '@/lib/api/review-queue-client';
import { totalReviewsIn, WEEKDAY_LABELS, weekdayColumn } from '@/lib/activity';
import { Mascot, MascotMood } from '@/components/mascot/Mascot';
import { MascotMoment, greetingMoment, useMascotLine } from '@/components/mascot/mascotLines';

interface HomeDashboardProps {
  progress: UserProgress;
  /**
   * `GET /stats/summary` for this account, or null while it has not answered.
   * Every counter it carries wins over the locally derived one — it counts the
   * whole account, not just what this device has seen.
   */
  summary?: StatsSummary | null;
  learning: LearningProgress | null;
  /** Reviews per day, oldest first; null until the server answers. */
  activity: ActivityDay[] | null;
  /** The words due now; null until the server answers. */
  queue: QueueCounts | null;
  isStartingReview?: boolean;
  reviewError?: string | null;
  onStartReview: () => void;
  onOpenAddWord: () => void;
  /** Where the button leads once nothing is due. */
  onOpenPractice: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  progress,
  summary = null,
  learning,
  activity,
  queue,
  isStartingReview = false,
  reviewError = null,
  onStartReview,
  onOpenAddWord,
  onOpenPractice,
}) => {
  const learnedToday = summary?.learnedToday ?? 0;
  const wordsLearned = summary
    ? summary.learningCount + summary.masteredCount
    : progress.wordsLearned;

  const goalPercentage = Math.min(
    100,
    Math.round((learnedToday / progress.dailyGoal) * 100)
  );

  // The last seven days of the account's review history.
  const weeklyActivity = (activity ?? []).slice(-7).map((day, i, week) => ({
    date: day.date,
    count: day.count,
    dayLabel: WEEKDAY_LABELS[weekdayColumn(day.date)],
    isToday: i === week.length - 1,
  }));
  const weeklyTotal = totalReviewsIn(weeklyActivity);
  const weeklyMax = Math.max(...weeklyActivity.map((item) => item.count), 1);

  // Memori says the most urgent thing first. A streak is at risk while the
  // server has seen nothing from this account today.
  const streak = learning?.streak ?? 0;
  const streakAtRisk = streak > 0 && !learning?.activeToday;
  const dueCount = queue ? queue.fresh + queue.again : null;
  const [mascotMood, mascotMoment, mascotCount]: [MascotMood, MascotMoment, number?] = streakAtRisk
    ? ['worried', 'streakAtRisk', streak]
    : goalPercentage >= 100
    ? ['cheer', 'goalDone']
    : dueCount !== null && dueCount > 0
    ? ['think', 'dueReview', dueCount]
    : ['wave', greetingMoment()];
  const mascotLine = useMascotLine(mascotMoment, mascotCount);

  // One button: study what is due, else add a first word, else practise freely.
  const isAllDone = dueCount === 0;
  const hasNoWords = isAllDone && summary !== null && wordsLearned === 0;
  const main = !isAllDone
    ? {
        label:
          dueCount === null
            ? 'Học hôm nay'
            : dueCount > RUN_SIZE
            ? `Học ${RUN_SIZE} từ`
            : `Học ${dueCount} từ hôm nay`,
        Icon: Brain,
        onClick: onStartReview,
      }
    : hasNoWords
    ? { label: 'Thêm từ mới', Icon: Plus, onClick: onOpenAddWord }
    : { label: 'Luyện thêm', Icon: BookOpen, onClick: onOpenPractice };

  // One line under Memo's: what the button holds.
  const detail = !isAllDone
    ? [
        queue?.fresh ? `${queue.fresh} từ mới` : null,
        queue?.again ? `${queue.again} từ ôn lại` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : hasNoWords
    ? 'Thêm vài từ để bắt đầu'
    : 'Xong phần hôm nay rồi. Đến ngày, app sẽ nhắc bạn ôn lại.';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 space-y-4 pb-28 animate-fadeIn">
      {/* Today: Memo's line, the one main action (see `main`) and the daily goal. */}
      <section className="bg-white dark:bg-slate-800 rounded-[28px] p-5 border-clay border-blue-200 dark:border-slate-700 shadow-clay space-y-4">
        <div className="flex items-center gap-3">
          <Mascot mood={mascotMood} size={64} className="shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-slate-100">
              {mascotLine}
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{detail}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={main.onClick}
          disabled={isStartingReview}
          className="w-full py-5 rounded-[24px] bg-emerald-600 hover:bg-emerald-700 border-clay border-emerald-400 text-white font-black text-lg md:text-xl shadow-clay-lg flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          <main.Icon className="w-6 h-6" />
          <span>{isStartingReview ? 'Đang tải…' : main.label}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
        {!isAllDone && learning?.totalReviews === 0 && (
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center">
            Học hôm nay, mai app nhắc lại đúng từ bạn sắp quên.
          </p>
        )}
        {reviewError && (
          <p role="alert" className="text-xs font-bold text-red-500 text-center">
            {reviewError}
          </p>
        )}

        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Mục tiêu hôm nay:{' '}
            <span className="text-slate-900 dark:text-slate-100">
              {learnedToday}/{progress.dailyGoal} từ
            </span>
            {goalPercentage >= 100 && ' 🎉'}
          </p>
          <div
            role="progressbar"
            aria-label="Mục tiêu hôm nay"
            aria-valuenow={goalPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-clay-inset"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${goalPercentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* The main button already adds a word while there are none. */}
      {!hasNoWords && (
        <button
          type="button"
          onClick={onOpenAddWord}
          className="w-full flex items-center gap-3 p-4 rounded-[24px] bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm text-left active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Thêm từ mới</span>
          <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
        </button>
      )}

      {/* Weekly Activity Bar Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Hoạt động tuần</h4>
            <p className="text-[11px] text-slate-400">Số lượt ôn theo ngày</p>
          </div>
          <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
            {weeklyTotal} lượt
          </span>
        </div>

        <div className="flex items-end justify-between h-20 gap-1.5 pt-2">
          {weeklyActivity.map((item, idx) => {
            const height = (item.count / weeklyMax) * 100;
            const isToday = item.isToday;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-lg h-full flex items-end overflow-hidden">
                  <div
                    style={{ height: `${height}%` }}
                    className={`w-full rounded-lg transition-all duration-500 ${
                      isToday ? 'bg-blue-600' : 'bg-blue-400/40 dark:bg-blue-400/25'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                  }`}
                >
                  {item.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
