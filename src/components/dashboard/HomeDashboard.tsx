'use client';

import React from 'react';
import {
  Sparkles,
  Brain,
  ChevronRight,
  Flame,
  CheckCircle2,
  BookOpen,
  Award,
  TrendingUp,
} from 'lucide-react';
import { UserProgress, QuizType, WordCategory } from '@/types';
import { buildActivitySeries } from '@/lib/progress';
import { Plus } from 'lucide-react';

interface HomeDashboardProps {
  progress: UserProgress;
  reviewDueCount: number;
  focusCategories?: WordCategory[];
  onStartQuiz: (quizType: QuizType) => void;
  onStartReview: () => void;
  onOpenAddWord: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  progress,
  reviewDueCount,
  focusCategories = [],
  onStartQuiz,
  onStartReview,
  onOpenAddWord,
}) => {
  const goalPercentage = Math.min(
    100,
    Math.round((progress.dailyGoalProgress / progress.dailyGoal) * 100)
  );

  // SVG Ring Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPercentage / 100) * circumference;

  // Weekly activity from the user's real quiz history (last 7 days)
  const weeklyActivity = buildActivitySeries(progress, 7);
  const weeklyTotal = weeklyActivity.reduce((sum, item) => sum + item.count, 0);
  const weeklyMax = Math.max(...weeklyActivity.map((item) => item.count), 1);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 space-y-6 pb-28 animate-fadeIn">
      {/* Top Banner: Daily Goal & Focus Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Goal Progress Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white rounded-[28px] p-6 shadow-xl shadow-blue-500/15 relative overflow-hidden flex items-center justify-between group hover:shadow-2xl transition-all duration-300">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />

          <div className="relative z-10">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
              🎯 Target Today
            </span>
            <h3 className="text-3xl md:text-4xl font-black mt-2 tracking-tight">
              {progress.dailyGoalProgress}{' '}
              <span className="text-base font-normal text-blue-200">/ {progress.dailyGoal} words</span>
            </h3>
            <p className="text-xs md:text-sm text-blue-100 mt-2 font-medium flex items-center gap-1.5">
              {goalPercentage >= 100 ? (
                <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-400/30">
                  🎉 Hoàn thành mục tiêu ngày!
                </span>
              ) : (
                <span>Cần học thêm {progress.dailyGoal - progress.dailyGoalProgress} từ nữa hôm nay</span>
              )}
            </p>
          </div>

          {/* SVG Progress Ring */}
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

        {/* Focus Category Active Indicator Card */}
        <div className="bg-white dark:bg-slate-800/90 rounded-[28px] p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">
              Focus Categories
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="my-2">
            {focusCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {focusCategories.map((c) => (
                  <span
                    key={c}
                    className="text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Tất cả bộ từ (All)</p>
                <p className="text-xs text-slate-400">Đang luyện tập trên toàn bộ từ vựng</p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400">Tùy chỉnh bộ từ muốn học trong phần Setting ⚙️</p>
        </div>
      </div>

      {/* Main Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Add Custom Word Card */}
        <div
          onClick={onOpenAddWord}
          className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-[24px] p-5 border border-blue-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-500/50 cursor-pointer transition-all duration-300 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
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
              Tự tạo bộ từ Custom + Gợi ý từ thông minh 1-click
            </p>
          </div>

          <div className="mt-3 flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
            <span>Thêm từ ngay</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Continue Learning */}
        <div
          onClick={() => onStartQuiz('flashcards')}
          className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-500/50 cursor-pointer transition-all duration-300 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-2.5 py-1 rounded-full">
              Flashcards
            </span>
          </div>

          <div className="mt-4">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Tiếp tục học
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Thẻ lật 3D tương tác & phiên âm chuẩn
            </p>
          </div>

          <div className="mt-3 flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
            <span>Vào học ngay</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Review Today */}
        <div
          onClick={onStartReview}
          className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm hover:shadow-lg hover:border-emerald-500 cursor-pointer transition-all duration-300 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full">
              SRS Spaced
            </span>
          </div>

          <div className="mt-4">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Ôn tập hôm nay
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {reviewDueCount} từ đến lịch ghi nhớ ngắt quãng
            </p>
          </div>

          <div className="mt-3 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
            <span>Ôn tập ngay ({reviewDueCount})</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>

      {/* Quick Stats Summary Grid & Weekly Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-[24px] border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2 font-bold">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>ĐỘ CHÍNH XÁC (ACCURACY)</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {progress.totalAttempted > 0
              ? `${Math.round((progress.totalCorrect / progress.totalAttempted) * 100)}%`
              : '—'}
          </p>
          <p className="text-xs text-slate-400 font-bold mt-2 flex items-center gap-1">
            <span>{progress.totalCorrect}/{progress.totalAttempted} câu đúng</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-5 rounded-[24px] border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2 font-bold">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>TỪ ĐÃ HỌC (LEARNED)</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {progress.wordsLearned}
          </p>
          <p className="text-xs text-slate-400 font-medium mt-2">{progress.masteredCount} từ đã Master ✨</p>
        </div>

        {/* Weekly Activity Bar Chart */}
        <div className="bg-white dark:bg-slate-800/90 rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Hoạt động tuần</h4>
              <p className="text-[11px] text-slate-400">Số từ ôn luyện theo ngày</p>
            </div>
            <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
              {weeklyTotal} Từ
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
                        isToday ? 'bg-gradient-to-t from-blue-600 to-indigo-500' : 'bg-blue-400/40 dark:bg-blue-400/25'
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
