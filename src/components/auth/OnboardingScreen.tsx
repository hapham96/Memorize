'use client';

import React, { useState } from 'react';
import { Sparkles, Brain, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingScreenProps {
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
      title: 'Học từ vựng nhanh & nhớ sâu',
      subtitle: 'Làm chủ hàng nghìn từ vựng Tiếng Anh qua flashcards 3D trực quan, phiên âm IPA chuẩn và giọng phát âm bản ngữ.',
      icon: Sparkles,
      color: 'bg-indigo-500',
    },
    {
      title: 'Khoa học lặp lại ngắt quãng (SRS)',
      subtitle: 'Dựa trên thuật toán SuperMemo SM-2 chuẩn xác. Hệ thống tính toán thời điểm vàng để bạn ôn tập trước khi quên.',
      icon: Brain,
      color: 'bg-emerald-500',
    },
    {
      title: 'Duy trì thói quen học mỗi ngày',
      subtitle: 'Theo dõi chuỗi ngày liên tục (streak), tích lũy XP kinh nghiệm và chinh phục mục tiêu chỉ 5 phút mỗi ngày.',
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
      onGetStarted();
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col justify-between p-6 bg-slate-50 dark:bg-slate-950 animate-fadeIn">
      {/* Top Header */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
            M
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight">
            Memorize
          </span>
        </div>
        <button
          onClick={onSignIn}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
        >
          Bỏ qua
        </button>
      </div>

      {/* Hero Illustration & Content */}
      <div className="my-auto py-8 flex flex-col items-center text-center">
        <div className="relative mb-8">
          <div className={`w-28 h-28 rounded-2xl ${current.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm`}>
            <Icon className="w-14 h-14 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-md">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 px-4">
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
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentPage
                  ? 'w-7 bg-indigo-600 dark:bg-indigo-400'
                  : 'w-2 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <span>{currentPage === slides.length - 1 ? 'Bắt đầu ngay' : 'Tiếp tục'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onSignIn}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-all"
          >
            Đã có tài khoản? <span className="font-bold text-indigo-600 dark:text-indigo-400">Đăng nhập</span>
          </button>
        </div>
      </div>
    </div>
  );
};
