'use client';

import React from 'react';
import {
  Brain,
  ChevronRight,
  Flame,
  CheckCircle2,
  BookOpen,
  Award,
  TrendingUp,
} from 'lucide-react';
import { ActivityDay, LearningProgress, UserProgress } from '@/types';
import { StatsSummary } from '@/types/stats';
import { QueueCounts, RUN_SIZE } from '@/lib/api/review-queue-client';
import { totalReviewsIn, WEEKDAY_LABELS, weekdayColumn } from '@/lib/activity';
import { Plus } from 'lucide-react';
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
  // Remote counters when the summary landed, local ones until then.
  const learnedToday = summary?.learnedToday ?? 0;
  const masteredCount = summary?.masteredCount ?? progress.masteredCount;
  // The backend splits the library into learning + mastered; together they are
  // the same "words studied" the local SRS map derives.
  const wordsLearned = summary
    ? summary.learningCount + summary.masteredCount
    : progress.wordsLearned;

  const goalPercentage = Math.min(
    100,
    Math.round((learnedToday / progress.dailyGoal) * 100)
  );

  // SVG Ring Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPercentage / 100) * circumference;

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

  const hints: string[] = [];
  if (queue && dueCount) {
    const parts = [
      queue.fresh > 0 && `${queue.fresh} từ mới`,
      queue.again > 0 && `${queue.again} từ ôn lại`,
    ];
    hints.push(parts.filter(Boolean).join(' · '));
    if (dueCount > RUN_SIZE) hints.push(`Mỗi lượt ${RUN_SIZE} từ, phần còn lại học tiếp sau.`);
    if (queue.fresh > 0) hints.push('Từ mới cần gặp lại vài lần trong hôm nay.');
    if (learning?.totalReviews === 0) {
      hints.push('Học hôm nay, mai app nhắc lại đúng từ bạn sắp quên.');
    }
  } else if (isAllDone && !hasNoWords) {
    hints.push('Xong phần hôm nay rồi. Đến ngày, app sẽ nhắc bạn ôn lại.');
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 space-y-6 pb-28 animate-fadeIn">
      {/* The one main action (see `main`). */}
      <div className="space-y-2">
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
        {hints.map((hint) => (
          <p key={hint} className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center">
            {hint}
          </p>
        ))}
        {reviewError && (
          <p role="alert" className="text-xs font-bold text-red-500 text-center">
            {reviewError}
          </p>
        )}
      </div>

      {/* Top Banner: Daily Goal */}
      <div className="grid grid-cols-1 gap-4">
        {/* Daily Goal Progress Card */}
        <div className="bg-blue-600 border-clay border-blue-400 text-white rounded-[28px] p-6 shadow-clay-lg relative overflow-hidden flex items-center justify-between group hover:shadow-clay-xl transition-all duration-300">

          <div className="relative z-10">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
              🎯 Target Today
            </span>
            <h3 className="text-3xl md:text-4xl font-black mt-2 tracking-tight">
              {learnedToday}{' '}
              <span className="text-base font-normal text-blue-200">/ {progress.dailyGoal} words</span>
            </h3>
            <p className="text-xs md:text-sm text-blue-100 mt-2 font-medium flex items-center gap-1.5">
              {goalPercentage >= 100 ? (
                <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-400/30">
                  🎉 Hoàn thành mục tiêu ngày!
                </span>
              ) : (
                <span>Cần học thêm {Math.max(0, progress.dailyGoal - learnedToday)} từ nữa hôm nay</span>
              )}
            </p>
            {/* Memori's line lives in the text column: a bubble beside it
                collides with this text on narrow cards. */}
            <p className="hidden sm:inline-block mt-3 px-3 py-1 rounded-2xl rounded-bl-sm bg-white/15 border border-white/20 text-xs font-bold">
              {mascotLine}
            </p>
          </div>

          {/* Mascot & SVG Progress Ring */}
          <div className="flex items-center gap-3">
            <Mascot
              mood={mascotMood}
              size={80}
              className="hidden sm:inline-flex"
            />
            <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-blue-400/30"
                  strokeWidth="9"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-emerald-400 transition-all duration-700 ease-out"
                  strokeWidth="9"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-base md:text-lg font-black">{goalPercentage}%</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Secondary action */}
      <div className="grid grid-cols-1 gap-4">
        {/* Quick Add Custom Word Card */}
        <div
          onClick={onOpenAddWord}
          className="bg-blue-50 dark:bg-slate-800 rounded-[24px] p-5 border-clay border-blue-300 dark:border-slate-700 shadow-clay-sm hover:shadow-clay-lg hover:border-blue-500/50 cursor-pointer transition-all duration-300 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 border-clay border-blue-400 text-white flex items-center justify-center shadow-clay group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-full">
              AI Suggest
            </span>
          </div>

          <div className="mt-4">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Thêm từ mới
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Gõ từ bạn muốn học hoặc lấy một từ ngẫu nhiên
            </p>
          </div>

          <div className="mt-3 flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
            <span>Thêm từ ngay</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

      </div>

      {/* Quick Stats Summary Grid & Weekly Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2 font-bold">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>ĐỘ CHÍNH XÁC (ACCURACY)</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {learning && learning.totalReviews > 0
              ? `${Math.round((learning.correctReviews / learning.totalReviews) * 100)}%`
              : '—'}
          </p>
          <p className="text-xs text-slate-400 font-bold mt-2 flex items-center gap-1">
            <span>
              {learning?.correctReviews ?? 0}/{learning?.totalReviews ?? 0} lượt đúng
            </span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2 font-bold">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>TỪ ĐÃ HỌC (LEARNED)</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {wordsLearned}
          </p>
          <p className="text-xs text-slate-400 font-medium mt-2">
            {masteredCount} từ đã Master ✨
            {summary ? ` · ${summary.totalWords} từ trong bộ` : ''}
          </p>
        </div>

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
    </div>
  );
};
