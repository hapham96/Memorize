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
  Swords,
} from 'lucide-react';
import { QuizType } from '@/types';

/** Battle Game is not a quiz — it opens its own online screen — so it is not a `QuizType`. */
type PracticeId = QuizType | 'battle';

interface QuizSelectionProps {
  onSelectQuiz: (type: QuizType) => void;
  onOpenBattle: () => void;
  loadingQuizType?: QuizType | null;
  errorMessage?: string | null;
}

export const QuizSelection: React.FC<QuizSelectionProps> = ({
  onSelectQuiz,
  onOpenBattle,
  loadingQuizType = null,
  errorMessage = null,
}) => {
  const handleSelect = (id: PracticeId) => {
    if (id === 'battle') onOpenBattle();
    else onSelectQuiz(id);
  };

  const modes: {
    id: PracticeId;
    title: string;
    badge: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badgeStyle: string;
    active: boolean;
  }[] = [
    {
      id: 'flashcards' as QuizType,
      title: 'Flashcards',
      badge: 'Ghi nhớ cốt lõi',
      description: 'Lật thẻ 3D tương tác với phiên âm IPA, nghĩa phong phú và chu kỳ giãn cách SRS.',
      icon: Sparkles,
      color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
      active: true,
    },
    {
      id: 'multiple-choice' as QuizType,
      title: 'Multiple Choice',
      badge: 'Nhận diện phản xạ',
      description: 'Kiểm tra độ nhạy bén từ vựng với 4 phương án trắc nghiệm và chấm điểm tức thì.',
      icon: CheckSquare,
      color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
      active: true,
    },
    {
      id: 'fill-blank' as QuizType,
      title: 'Fill in the Blank',
      badge: 'Ứng dụng ngữ cảnh',
      description: 'Điền từ còn thiếu vào câu ví dụ thực tế dựa vào ngữ cảnh và gợi ý nghĩa.',
      icon: FileText,
      color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
      badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
      active: true,
    },
    {
      id: 'type-word' as QuizType,
      title: 'Type Missing Word',
      badge: 'Luyện gõ từ vựng',
      description: 'Chọn và gõ chính xác từ vựng cần thiết để hoàn chỉnh câu hoàn chỉnh.',
      icon: Keyboard,
      color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
      active: true,
    },
    {
      id: 'listening' as QuizType,
      title: 'Listening Quiz',
      badge: 'Luyện thính giác',
      description: 'Nghe phát âm chuẩn giọng bản xứ và điền lại từ vựng khớp chính xác.',
      icon: Headphones,
      color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      badgeStyle: 'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
      active: true,
    },
    {
      id: 'battle',
      title: 'Battle Game',
      badge: 'Đấu trực tuyến',
      description: 'Tranh tài từ vựng real-time cùng bạn bè 1–3 người qua phòng đấu trực tiếp.',
      icon: Swords,
      color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
      active: true,
    },
    {
      id: 'image' as QuizType,
      title: 'Image Quiz',
      badge: 'Sắp ra mắt',
      description: 'Ghi nhớ từ vựng qua hình ảnh trực quan sinh động.',
      icon: ImageIcon,
      color: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
      badgeStyle: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      active: false,
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 space-y-5 pb-28 animate-fadeIn">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Luyện tập từ vựng</h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Chọn phương pháp rèn luyện phù hợp nhất để kích hoạt khả năng phản xạ và ghi nhớ.
        </p>
      </div>

      {errorMessage && (
        <div className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-300 dark:border-amber-800">
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
              onClick={() => mode.active && !isLoading && handleSelect(mode.id)}
              className={`bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                mode.active
                  ? 'cursor-pointer hover:border-indigo-500/40 hover:shadow-md hover:-translate-y-0.5 group'
                  : 'opacity-65 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${mode.color} flex items-center justify-center transition-transform group-hover:scale-105`}
                  >
                    <Icon className="w-6 h-6 stroke-[2]" />
                  </div>

                  {mode.active ? (
                    <button
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
                      aria-label={`Bắt đầu ${mode.title}`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </button>
                  ) : (
                    <span className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block border ${mode.badgeStyle}`}
                  >
                    {mode.badge}
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {mode.title}
                  </h3>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2.5">
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
