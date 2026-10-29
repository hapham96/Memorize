'use client';

import React, { useState } from 'react';
import { Sparkles, Brain, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Mascot, MascotMood } from '@/components/mascot/Mascot';

interface OnboardingScreenProps {
  /** Both exits lead to the auth screen — the app cannot be used signed out. */
  onGetStarted: () => void;
  onSignIn: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onGetStarted,
  onSignIn,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const slides = [
    {
      title: 'Học từ vựng siêu tốc cùng Memo',
      subtitle: 'Nắm vững hàng ngàn từ vựng tiếng Anh qua flashcard 3D sinh động, phát âm chuẩn và hình ảnh trực quan.',
      mascotMood: 'studying' as MascotMood,
      color: 'bg-blue-500',
    },
    {
      title: 'Ôn tập khoa học với Spaced Repetition',
      subtitle: 'Thuật toán lặp lại ngắt quãng SM-2 nhắc bạn ôn đúng thời điểm vàng trước khi quên, nhớ lâu gấp 10 lần.',
      mascotMood: 'waving' as MascotMood,
      color: 'bg-emerald-500',
    },
    {
      title: 'Xây dựng thói quen & Nhận thưởng',
      subtitle: 'Duy trì chuỗi ngày streak rực rỡ, tích lũy XP, thăng hạng và đạt mục tiêu chỉ với 5 phút mỗi ngày.',
      mascotMood: 'celebrating' as MascotMood,
      color: 'bg-amber-500',
    },
  ];

  const current = slides[currentPage];

  const handleNext = () => {
    if (currentPage < slides.length - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      onGetStarted();
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col justify-between p-6 bg-blue-50 dark:bg-slate-900">
      {/* Top Header */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2.5">
          <Mascot mood="icon" size="sm" interactive={false} />
          <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight font-display">
            Memorize
          </span>
        </div>
        <button
          onClick={onSignIn}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Hero Illustration & Content */}
      <div className="my-auto py-8 flex flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="w-36 h-36 rounded-[32px] bg-white dark:bg-slate-800/80 border-clay border-blue-200 dark:border-slate-700 flex items-center justify-center shadow-clay-lg p-2 overflow-visible">
            <Mascot
              mood={current.mascotMood}
              size={130}
              interactive={true}
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-clay-lg">
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
            className="w-full py-4 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset active:scale-[0.97] active:shadow-clay-inset text-white font-semibold text-base shadow-clay flex items-center justify-center gap-2 transition-all"
          >
            <span>{currentPage === slides.length - 1 ? 'Create Account' : 'Continue'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={onSignIn}
            className="w-full py-3 rounded-button bg-slate-200 dark:bg-slate-800 hover:bg-slate-300/60 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-sm transition-all"
          >
            Already have an account? <span className="font-bold text-blue-600 dark:text-blue-400">Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
