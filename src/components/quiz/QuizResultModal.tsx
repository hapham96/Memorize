'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Zap, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import { QuizType } from '@/types';
import { soundFX } from '@/lib/audio';
import { ModalPortal } from '@/components/layout/ModalPortal';

interface QuizResultModalProps {
  quizType: QuizType;
  totalQuestions: number;
  correctCount: number;
  xpEarned: number;
  mistakeCount: number;
  onContinue: () => void;
  onReviewMistakes: () => void;
}

export const QuizResultModal: React.FC<QuizResultModalProps> = ({
  quizType,
  totalQuestions,
  correctCount,
  xpEarned,
  mistakeCount,
  onContinue,
  onReviewMistakes,
}) => {
  const accuracy = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);

  useEffect(() => {
    soundFX.playLevelUp();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[28px] p-6 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 text-center animate-scaleUp space-y-5 max-h-[90dvh] overflow-y-auto overscroll-contain">
        {/* Header Badge */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400 border-clay border-amber-200 flex items-center justify-center shadow-clay-glow text-white">
          <Trophy className="w-10 h-10 text-white fill-white" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Great Job! 🎉
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            You completed the {quizType.replace('-', ' ')} session
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-card border-clay border-blue-200 dark:border-slate-800">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-medium">Accuracy</span>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{accuracy}%</p>
          </div>

          <div className="text-center border-x border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium">XP Gained</span>
            <p className="text-lg font-black text-blue-600 dark:text-blue-400 flex items-center justify-center gap-0.5">
              <Zap className="w-4 h-4 fill-blue-500 text-blue-500" />
              <span>+{xpEarned}</span>
            </p>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-medium">Correct</span>
            <p className="text-lg font-black text-slate-800 dark:text-slate-200">
              {correctCount}/{totalQuestions}
            </p>
          </div>
        </div>

        {/* Mistakes Alert if any */}
        {mistakeCount > 0 && (
          <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border-clay border-amber-300 flex items-center justify-between">
            <span>You missed {mistakeCount} word(s) in this session.</span>
            <button
              onClick={onReviewMistakes}
              className="text-[11px] font-bold underline text-amber-600 hover:text-amber-800"
            >
              Review
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={onContinue}
            className="w-full py-3.5 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset text-white font-bold text-sm shadow-clay flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {mistakeCount > 0 && (
            <button
              onClick={onReviewMistakes}
              className="w-full py-3 rounded-button bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Review Mistakes ({mistakeCount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
