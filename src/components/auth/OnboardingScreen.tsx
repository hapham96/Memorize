'use client';

import React, { useState } from 'react';
import { Sparkles, Brain, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
  onGoToAuth: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  onGoToAuth,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const slides = [
    {
      title: 'Learn Vocabulary Faster',
      subtitle: 'Master thousands of English words with Apple-inspired visual flashcards and crisp native pronunciations.',
      icon: Sparkles,
      color: 'bg-blue-500',
    },
    {
      title: 'Scientifically Optimized Review',
      subtitle: 'Based on SuperMemo SM-2 Spaced Repetition algorithms. Learn words right before you forget them.',
      icon: Brain,
      color: 'bg-emerald-500',
    },
    {
      title: 'Build Your English Habit',
      subtitle: 'Track daily streaks, earn XP, unlock achievements, and reach your goals in just 5 minutes a day.',
      icon: Flame,
      color: 'bg-amber-500',
    },
  ];

  const current = slides[currentPage];
  const Icon = current.icon;

  const handleNext = () => {
    if (currentPage < slides.length - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col justify-between p-6 bg-gradient-to-b from-blue-50/50 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      {/* Top Header */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-apple-glow">
            M
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight">
            Memorize
          </span>
        </div>
        <button
          onClick={onComplete}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Hero Illustration & Content */}
      <div className="my-auto py-8 flex flex-col items-center text-center">
        <div className="relative mb-8">
          <div className={`w-32 h-32 rounded-3xl ${current.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center border border-white/50 shadow-apple-card`}>
            <Icon className={`w-16 h-16 text-blue-600 dark:text-blue-400 animate-pulse`} />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-3 px-4">
          {current.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
          {current.subtitle}
        </p>
      </div>

      {/* Pagination Dots & Navigation Buttons */}
      <div className="space-y-6 pb-4">
        <div className="flex justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentPage
                  ? 'w-8 bg-blue-600 dark:bg-blue-400'
                  : 'w-2 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-button bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-base shadow-apple-card flex items-center justify-center gap-2 transition-all"
          >
            <span>{currentPage === slides.length - 1 ? 'Get Started' : 'Continue'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={onGoToAuth}
            className="w-full py-3 rounded-button bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300/60 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-sm transition-all"
          >
            Already have an account? <span className="font-bold text-blue-600 dark:text-blue-400">Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
