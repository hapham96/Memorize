'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
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
      // The first thing a new user sees: a greeting, not Memori with its nose in a book.
      mascotMood: 'wave' as MascotMood,
      color: 'bg-blue-500',
    },
    {
      title: 'Ôn tập khoa học với Spaced Repetition',
      subtitle: 'Thuật toán lặp lại ngắt quãng SM-2 nhắc bạn ôn đúng thời điểm vàng trước khi quên, nhớ lâu gấp 10 lần.',
      mascotMood: 'think' as MascotMood,
      color: 'bg-emerald-500',
    },
    {
      title: 'Xây dựng thói quen & Nhận thưởng',
      subtitle: 'Duy trì chuỗi ngày streak rực rỡ, tích lũy XP, thăng hạng và đạt mục tiêu chỉ với 5 phút mỗi ngày.',
      mascotMood: 'cheer' as MascotMood,
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
        {/* Memori stands free on a soft glow with a contact shadow, rather than
            boxed in a card — it should read as a character, not a sticker. */}
        <div className="relative mb-6 flex items-end justify-center w-60 h-60">
          <div className="absolute inset-4 rounded-full bg-gradient-to-b from-blue-200/70 to-transparent dark:from-blue-500/15" />
          <div className="absolute bottom-3 w-32 h-4 rounded-[50%] bg-slate-900/10 dark:bg-black/40 blur-[3px]" />
          <Mascot mood={current.mascotMood} size={208} className="relative" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-3 px-4">
              {current.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
              {current.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
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
