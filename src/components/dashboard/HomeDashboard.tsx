'use client';

import React from 'react';
import {
  Sparkles,
  Brain,
  ChevronRight,
  BookOpen,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { UserProgress, QuizType, WordCategory } from '@/types';
import { StatsSummary } from '@/types/stats';
import { buildActivitySeries } from '@/lib/progress';
import { buildRemoteActivitySeries } from '@/lib/api/stats-client';

interface HomeDashboardProps {
  progress: UserProgress;
  summary?: StatsSummary | null;
  focusCategories?: WordCategory[];
  onStartQuiz: (quizType: QuizType) => void;
  onStartReview: () => void;
  onOpenAddWord: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  progress,
  summary = null,
  focusCategories = [],
  onStartQuiz,
  onStartReview,
  onOpenAddWord,
}) => {
  const learnedToday = summary?.learnedToday ?? progress.dailyGoalProgress;
  const masteredCount = summary?.masteredCount ?? progress.masteredCount;
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

  const weeklyActivity = summary
    ? buildRemoteActivitySeries(summary, 7)
    : buildActivitySeries(progress, 7);
  const weeklyTotal = weeklyActivity.reduce((sum, item) => sum + item.count, 0);
  const weeklyMax = Math.max(...weeklyActivity.map((item) => item.count), 1);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 space-y-6 pb-28 animate-fadeIn">
      {/* Top Banner: Daily Goal & Focus Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Goal Progress Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-700 text-white rounded-2xl p-6 shadow-lg shadow-indigo-600/15 relative overflow-hidden flex items-center justify-between group transition-all duration-300">
          {/* Subtle Ambient Decorative Circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="pointer-events-none absolute -left-8 -bottom-8 w-32 h-32 bg-indigo-400/20 rounded-full blur-xl" />

          <div className="relative z-10">
            <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-100 bg-white/15 px-2.5 py-1 rounded-full border border-white/20 backdrop-blur-sm">
              🎯 Mục tiêu hôm nay
            </span>
            <h3 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight">
              {learnedToday}{' '}
              <span className="text-base font-normal text-indigo-100">/ {progress.dailyGoal} từ</span>
            </h3>
            <p className="text-xs md:text-sm text-indigo-100 mt-2 font-medium flex items-center gap-1.5">
              {goalPercentage >= 100 ? (
                <span className="bg-emerald-500/25 text-emerald-200 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  🎉 Hoàn thành mục tiêu ngày!
                </span>
              ) : (
                <span>Cần học thêm {Math.max(0, progress.dailyGoal - learnedToday)} từ nữa để đạt chỉ tiêu</span>
              )}
            </p>
          </div>

          {/* SVG Progress Ring */}
          <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center flex-shrink-0 z-10">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-white/20"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-emerald-400 transition-all duration-700 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-base md:text-lg font-extrabold">{goalPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Focus Category Active Indicator Card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-indigo-400/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Bộ từ trọng tâm
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          <div className="my-2">
            {focusCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {focusCategories.map((c) => (
                  <span
                    key={c}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Tất cả bộ từ (All)</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Đang luyện tập trên toàn bộ từ vựng</p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400">Tùy chỉnh trong phần Cài đặt ⚙️</p>
        </div>
      </div>

      {/* Main Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Add Custom Word Card */}
        <div
          onClick={onOpenAddWord}
          className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-indigo-500/40 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              AI Suggest
            </span>
          </div>

          <div className="mt-4">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Thêm từ mới
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Tạo bộ từ riêng + Gợi ý từ vựng thông minh 1 chạm
            </p>
          </div>

          <div className="mt-3 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
            <span>Thêm từ ngay</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Continue Learning */}
        <div
          onClick={() => onStartQuiz('flashcards')}
          className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-indigo-500/40 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              Flashcards
            </span>
          </div>

          <div className="mt-4">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Tiếp tục học
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Thẻ lật 3D tương tác & phiên âm bản ngữ
            </p>
          </div>

          <div className="mt-3 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
            <span>Vào học ngay</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Review Today */}
        <div
          onClick={onStartReview}
          className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-emerald-500/50 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Brain className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              SRS Spaced
            </span>
          </div>

          <div className="mt-4">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Ôn tập hôm nay
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ghi nhớ ngắt quãng theo thuật toán SRS
            </p>
          </div>

          <div className="mt-3 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
            <span>Ôn tập ngay</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>

      {/* Quick Stats Summary Grid & Weekly Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Accuracy Card */}
        <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2 font-semibold">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>ĐỘ CHÍNH XÁC (ACCURACY)</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {progress.totalAttempted > 0
              ? `${Math.round((progress.totalCorrect / progress.totalAttempted) * 100)}%`
              : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 flex items-center gap-1">
            <span>{progress.totalCorrect}/{progress.totalAttempted} câu đúng</span>
          </p>
        </div>

        {/* Learned Words Card */}
        <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2 font-semibold">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>TỪ ĐÃ HỌC (LEARNED)</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {wordsLearned}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">
            {masteredCount} từ đã Master ✨
            {summary ? ` · ${summary.totalWords} từ trong bộ` : ''}
          </p>
        </div>

        {/* Weekly Activity Bar Chart */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Hoạt động tuần</h4>
              <p className="text-[11px] text-slate-400">Số từ ôn luyện theo ngày</p>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
              {weeklyTotal} Từ
            </span>
          </div>

          <div className="flex items-end justify-between h-20 gap-2 pt-2">
            {weeklyActivity.map((item, idx) => {
              const height = (item.count / weeklyMax) * 100;
              const isToday = item.isToday;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full bg-slate-100 dark:bg-slate-700/40 rounded-md h-full flex items-end overflow-hidden p-0.5">
                    <div
                      style={{ height: `${Math.max(8, height)}%` }}
                      className={`w-full rounded-sm transition-all duration-500 ${
                        isToday
                          ? 'bg-indigo-600 shadow-sm'
                          : 'bg-indigo-400/40 dark:bg-indigo-400/30 hover:bg-indigo-400/60'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold ${
                      isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
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
