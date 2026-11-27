'use client';

import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { StarterWord } from '@/lib/api/review-queue-client';
import { ModalPortal } from '@/components/layout/ModalPortal';

interface StarterWordsModalProps {
  words: StarterWord[];
  onConfirm: (headwords: string[]) => void;
}

/**
 * The second question of a new account: its Starter Words, all ticked, so the
 * ones already known can be left out. At least one has to stay.
 */
export const StarterWordsModal: React.FC<StarterWordsModalProps> = ({
  words,
  onConfirm,
}) => {
  const [picked, setPicked] = useState(() => new Set(words.map((w) => w.headword)));

  const toggle = (headword: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(headword)) next.add(headword);
      return next;
    });
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 animate-scaleUp max-h-[90dvh] flex flex-col gap-4">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Chọn từ để bắt đầu
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bỏ chọn những từ bạn đã biết.
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2">
            {words.map((word) => {
              const isPicked = picked.has(word.headword);
              return (
                <button
                  key={word.headword}
                  type="button"
                  role="checkbox"
                  aria-checked={isPicked}
                  aria-label={word.headword}
                  onClick={() => toggle(word.headword)}
                  className={`w-full text-left p-3 rounded-2xl border-clay flex items-start gap-3 transition-all ${
                    isPicked
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500'
                      : 'bg-slate-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {word.headword}{' '}
                      <span className="text-[10px] font-medium text-slate-400">
                        {word.partOfSpeech}
                      </span>
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {word.definition}
                    </span>
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isPicked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    {isPicked && <Check className="w-3 h-3 text-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onConfirm(Array.from(picked))}
            disabled={picked.size === 0}
            className="w-full py-3.5 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-clay flex items-center justify-center gap-2 transition-all"
          >
            <span>Học {picked.size} từ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};
