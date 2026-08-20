'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Heart,
  Volume2,
  X,
} from 'lucide-react';
import { SRSState, Word } from '@/types';
import { ModalPortal } from '../layout/ModalPortal';
import { SRS_STATE_LABELS } from '@/lib/wordExcel';
import { getWordMeanings } from '@/lib/word';
import { speakWord, soundFX } from '@/lib/audio';

interface WordDetailModalProps {
  word: Word;
  /** SRS status, only when the list row reported the account's progress. */
  state?: SRSState;
  /** Next review date, only when the row reported it. */
  dueAt?: string;
  isFavorite?: boolean;
  onClose: () => void;
}

/** How far a finger has to travel across the meanings to count as a swipe. */
const SWIPE_THRESHOLD_PX = 40;

/** `direction` is +1 paging forward, -1 back, so a slide leaves the way it came. */
const meaningSlide = {
  enter: (direction: number) => ({ x: direction >= 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -48 : 48, opacity: 0 }),
};

const STATE_STYLES: Record<SRSState, string> = {
  new: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
  learning: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  review: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  mastered: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
};

/** `DD/MM/YYYY`, or null when the row carried no usable date. */
function formatDueDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Read-only detail view for one word of the library, laid out like the flashcard
 * it will be reviewed on: the headword and its pronunciation on top, then the
 * senses paged one at a time below. Unlike the card there is nothing to flip and
 * nothing to rate — and every example of the current sense is listed, not just
 * the primary one.
 */
export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  state,
  dueAt,
  isFavorite,
  onClose,
}) => {
  const [meaningIndex, setMeaningIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const swipeStartXRef = useRef<number | null>(null);

  const meanings = useMemo(() => getWordMeanings(word), [word]);
  const hasManyMeanings = meanings.length > 1;
  const safeMeaningIndex = Math.min(meaningIndex, Math.max(meanings.length - 1, 0));
  const currentMeaning = meanings[safeMeaningIndex];
  // `examples` only exists on words mapped from a backend response; a sense
  // rebuilt from the flat fields still has its single example.
  const examples =
    currentMeaning?.examples ??
    (currentMeaning?.example ? [currentMeaning.example] : []);
  const dueLabel = formatDueDate(dueAt);

  // Escape closes, matching every other modal in the app.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const goToMeaning = (nextIndex: number, direction: number) => {
    if (nextIndex < 0 || nextIndex >= meanings.length || nextIndex === safeMeaningIndex)
      return;
    soundFX.playPop();
    setSlideDirection(direction);
    setMeaningIndex(nextIndex);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = swipeStartXRef.current;
    swipeStartXRef.current = null;
    if (startX === null || !hasManyMeanings) return;

    const deltaX = (e.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

    if (deltaX < 0) goToMeaning(safeMeaningIndex + 1, 1);
    else goToMeaning(safeMeaningIndex - 1, -1);
  };

  /** Plays the backend recording when there is one, else speech synthesis. */
  const handleAudio = () => {
    if (word.audioUrl) {
      const audio = new Audio(word.audioUrl);
      audio.play().catch(() => speakWord(word.word));
      return;
    }
    speakWord(word.word);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 md:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết từ ${word.word}`}
          className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[32px] p-5 md:p-6 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 max-h-[92dvh] overflow-y-auto overscroll-contain"
        >
          {/* Header — status on the left, close on the right */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-1.5 min-w-0">
              {state && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATE_STYLES[state]}`}
                >
                  {SRS_STATE_LABELS[state]}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isFavorite && (
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              )}
              <button
                onClick={onClose}
                aria-label="Đóng"
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Headword — the front of the flashcard */}
          <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight break-words">
              {word.word}
            </h2>
            <p className="text-sm font-mono text-slate-500 mt-2">{word.ipa}</p>

            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={handleAudio}
                className="px-4 py-2.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 inline-flex items-center gap-2 text-xs font-bold transition-colors"
              >
                <Volume2 className="w-4 h-4" /> Nghe phát âm
              </button>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {word.level}
              </span>
            </div>
          </div>

          {/* Meanings — the back of the flashcard, paged one sense at a time */}
          <div className="pt-4">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-clay border-emerald-300 dark:border-emerald-800 truncate">
                {word.category}
              </span>
              {hasManyMeanings && (
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Nghĩa {safeMeaningIndex + 1}/{meanings.length}
                </span>
              )}
            </div>

            <div
              className="py-3"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="min-h-[150px] flex items-start overflow-hidden">
                <AnimatePresence
                  mode="wait"
                  custom={slideDirection}
                  initial={false}
                >
                  <motion.div
                    key={safeMeaningIndex}
                    custom={slideDirection}
                    variants={meaningSlide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="w-full space-y-2.5"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {currentMeaning?.definition || word.vietnamese || "—"}
                      </h3>
                      {currentMeaning?.pos && (
                        <span className="inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border-2 border-purple-200 dark:border-purple-900">
                          {currentMeaning.pos}
                        </span>
                      )}
                    </div>

                    {currentMeaning?.translation && (
                      <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                        {currentMeaning.translation}
                      </p>
                    )}

                    {examples.length > 0 && (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto overscroll-contain pr-0.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                          Ví dụ ({examples.length})
                        </p>
                        {examples.map((example, index) => (
                          <p
                            key={`${index}-${example.slice(0, 16)}`}
                            className="text-xs italic text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-2 rounded-lg"
                          >
                            “{example}”
                          </p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {hasManyMeanings && (
                <div className="flex items-center justify-center gap-3 pt-3">
                  <button
                    onClick={() => goToMeaning(safeMeaningIndex - 1, -1)}
                    disabled={safeMeaningIndex === 0}
                    aria-label="Nghĩa trước"
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[3]" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {meanings.map((meaning, index) => (
                      <button
                        key={`${meaning.pos}-${index}`}
                        onClick={() =>
                          goToMeaning(index, index > safeMeaningIndex ? 1 : -1)
                        }
                        aria-label={`Nghĩa ${index + 1}`}
                        className={`h-2 rounded-full transition-all ${
                          index === safeMeaningIndex
                            ? "w-5 bg-emerald-500"
                            : "w-2 bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => goToMeaning(safeMeaningIndex + 1, 1)}
                    disabled={safeMeaningIndex === meanings.length - 1}
                    aria-label="Nghĩa tiếp theo"
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}
            </div>

            {word.mnemonic && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border-clay border-amber-300">
                💡 Mẹo nhớ: {word.mnemonic}
              </p>
            )}

            {dueLabel && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Bạn cần ôn lại vào: {dueLabel}
                <CalendarClock className="w-3 h-3" />
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </ModalPortal>
  );
};
