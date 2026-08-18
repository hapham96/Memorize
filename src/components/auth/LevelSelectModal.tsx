'use client';

import React, { useState } from 'react';
import { ArrowRight, Check, GraduationCap } from 'lucide-react';
import { CEFRLevel } from '@/types';
import { CEFR_LEVELS } from '@/data/cefrLevels';
import { ModalPortal } from '@/components/layout/ModalPortal';

interface LevelSelectModalProps {
  /** Preselected band, e.g. when the modal is reopened after a first answer. */
  initialLevel?: CEFRLevel | null;
  onConfirm: (level: CEFRLevel) => void;
  /** Leaves the level unset; the question can be answered later in settings. */
  onSkip: () => void;
}

/**
 * Asked once, right after a successful sign-up: which CEFR band is the learner
 * at. There is deliberately no close button — the two ways out are answering or
 * "Để sau", so the choice is never dismissed by an accidental tap outside.
 */
export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  initialLevel = null,
  onConfirm,
  onSkip,
}) => {
  const [selected, setSelected] = useState<CEFRLevel | null>(initialLevel);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
        <div className="w-full max-w-md sm:max-w-lg bg-white dark:bg-slate-800 rounded-[32px] p-6 md:p-8 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 space-y-5 animate-scaleUp max-h-[90dvh] overflow-y-auto overscroll-contain">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600 border-clay border-blue-400 flex items-center justify-center text-white shadow-clay-glow">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Trình độ tiếng Anh của bạn?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Chọn mức gần nhất theo khung CEFR để app gợi ý từ vựng phù hợp hơn.
              Bạn có thể đổi lại bất cứ lúc nào trong Settings.
            </p>
          </div>

          {/* The six CEFR bands */}
          <div className="space-y-2">
            {CEFR_LEVELS.map((level) => {
              const isSelected = selected === level.id;

              return (
                <button
                  key={level.id}
                  onClick={() => setSelected(level.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border-clay flex items-start gap-3 transition-all ease-clay ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-clay-sm'
                      : 'bg-slate-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <span className="text-xl leading-none mt-0.5" aria-hidden>
                    {level.emoji}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span
                        className={`text-sm font-extrabold ${
                          isSelected
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {level.id}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {level.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium truncate">
                        {level.tier}
                      </span>
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      {level.description}
                    </span>
                  </span>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => selected && onConfirm(selected)}
              disabled={!selected}
              className="w-full py-3.5 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white font-semibold text-sm shadow-clay flex items-center justify-center gap-2 transition-all"
            >
              <span>Bắt đầu học</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onSkip}
              className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Để sau
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
