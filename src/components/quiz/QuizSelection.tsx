'use client';

import React from 'react';
import {
  Sparkles,
  CheckSquare,
  FileText,
  Keyboard,
  Headphones,
  Image as ImageIcon,
  Play,
  Lock,
  Loader2,
} from 'lucide-react';
import { QuizType } from '@/types';

interface QuizSelectionProps {
  onSelectQuiz: (type: QuizType) => void;
  loadingQuizType?: QuizType | null;
  errorMessage?: string | null;
}

export const QuizSelection: React.FC<QuizSelectionProps> = ({
  onSelectQuiz,
  loadingQuizType = null,
  errorMessage = null,
}) => {
  const modes = [
    {
      id: 'flashcards' as QuizType,
      title: 'Flashcards',
      badge: 'Best for learning',
      description: 'Interactive 3D card flip with IPA pronunciation, meanings, and SRS scheduling.',
      icon: Sparkles,
      color: 'bg-blue-500 border-blue-300',
      badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      active: false,
    },
    {
      id: 'multiple-choice' as QuizType,
      title: 'Multiple Choice',
      badge: 'Improve recognition',
      description: 'Test your vocabulary recognition with 4 choices and immediate feedback.',
      icon: CheckSquare,
      color: 'bg-emerald-500 border-emerald-300',
      badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      active: true,
    },
    {
      id: 'fill-blank' as QuizType,
      title: 'Fill in the Blank',
      badge: 'Practice recall',
      description: 'Type the missing word to complete a real example sentence, guided by its meaning.',
      icon: FileText,
      color: 'bg-purple-500 border-purple-300',
      badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
      active: true,
    },
    {
      id: 'type-word' as QuizType,
      title: 'Type Missing Word',
      badge: 'Sentence context',
      description: 'Pick the word that correctly completes the sentence from 4 options.',
      icon: Keyboard,
      color: 'bg-amber-500 border-amber-300',
      badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
      active: true,
    },
    {
      id: 'listening' as QuizType,
      title: 'Listening Quiz',
      badge: 'Train your ears',
      description: 'Listen to native audio pronunciations and type the matching word.',
      icon: Headphones,
      color: 'bg-cyan-500 border-cyan-300',
      badgeBg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
      active: true,
    },
    {
      id: 'image' as QuizType,
      title: 'Image Quiz',
      badge: 'Coming Soon',
      description: 'Visual association quizzes matching images to English vocabulary.',
      icon: ImageIcon,
      color: 'bg-slate-400 border-slate-300',
      badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      active: false,
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 space-y-5 pb-28 animate-fadeIn">
      <div className="mb-2">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Lựa chọn chế độ học (Quiz Modes)</h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          Chọn phương pháp luyện tập phù hợp nhất để ghi nhớ vốn từ vựng Tiếng Anh.
        </p>
      </div>

      {errorMessage && (
        <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border-clay border-amber-300">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isLoading = loadingQuizType === mode.id;
          return (
            <div
              key={mode.id}
              onClick={() => mode.active && !isLoading && onSelectQuiz(mode.id)}
              className={`bg-white dark:bg-slate-800 rounded-[28px] p-6 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${mode.active
                ? 'cursor-pointer hover:border-blue-500/50 hover:shadow-clay-lg hover:-translate-y-0.5 active:scale-[0.99] group'
                : 'opacity-70 cursor-not-allowed'
                }`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-14 h-14 rounded-2xl border-clay ${mode.color} text-white flex items-center justify-center shadow-clay group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200 ease-clay`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>

                  {mode.active ? (
                    <button className="p-3 rounded-full bg-blue-600 border-clay border-blue-400 text-white shadow-clay group-hover:scale-105 transition-transform">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-white" />
                      )}
                    </button>
                  ) : (
                    <span className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block ${mode.badgeBg}`}
                  >
                    {mode.badge}
                  </span>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {mode.title}
                  </h3>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-3">
                  {mode.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
