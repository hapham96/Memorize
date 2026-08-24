'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Volume2, Heart, RotateCw, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Word } from '@/types';
import { ReviewQuality } from '@/types/word';
import { speakWord, soundFX } from '@/lib/audio';
import { getWordMeanings } from '@/lib/word';

interface FlashcardQuizProps {
  words: Word[];
  favorites: string[];
  onToggleFavorite: (wordId: string) => void;
  onRateWord: (word: Word, rating: ReviewQuality) => void;
  onClose: () => void;
}

/** How far a finger has to travel across the card back to count as a swipe. */
const SWIPE_THRESHOLD_PX = 40;

/** `direction` is +1 paging forward, -1 back, so a slide leaves the way it came. */
const meaningSlide = {
  enter: (direction: number) => ({ x: direction >= 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -48 : 48, opacity: 0 }),
};

export const FlashcardQuiz: React.FC<FlashcardQuizProps> = ({
  words,
  favorites,
  onToggleFavorite,
  onRateWord,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  // Which sense of the current word the card back is showing, and which way it
  // was paged — the slide has to leave towards the side it came from.
  const [meaningIndex, setMeaningIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const swipeStartXRef = useRef<number | null>(null);
  // A swipe ends in a `click` on the card, which would flip it. Set while the
  // gesture paged a meaning so that click can be swallowed instead.
  const swipedRef = useRef(false);

  const currentWord = words[currentIndex] || words[0];
  const isFavorite = favorites.includes(currentWord?.id);

  // A word can hold several senses, each with its own part of speech; the card
  // back pages through them rather than showing only the first.
  const meanings = useMemo(
    () => (currentWord ? getWordMeanings(currentWord) : []),
    [currentWord]
  );
  const hasManyMeanings = meanings.length > 1;
  // The list changes with the word, so an index from the previous card would
  // otherwise point past the end for a word with fewer senses.
  const safeMeaningIndex = Math.min(meaningIndex, Math.max(meanings.length - 1, 0));
  const currentMeaning = meanings[safeMeaningIndex];

  // Every new card starts on its primary sense.
  useEffect(() => {
    setMeaningIndex(0);
    setSlideDirection(1);
  }, [currentWord?.id]);

  if (!currentWord) return null;

  const handleFlip = () => {
    soundFX.playFlip();
    setIsFlipped(!isFlipped);
  };

  const goToMeaning = (nextIndex: number, direction: number) => {
    if (nextIndex < 0 || nextIndex >= meanings.length || nextIndex === safeMeaningIndex) return;
    soundFX.playPop();
    setSlideDirection(direction);
    setMeaningIndex(nextIndex);
  };

  const handleMeaningTouchStart = (e: React.TouchEvent) => {
    swipeStartXRef.current = e.touches[0]?.clientX ?? null;
    swipedRef.current = false;
  };

  const handleMeaningTouchEnd = (e: React.TouchEvent) => {
    const startX = swipeStartXRef.current;
    swipeStartXRef.current = null;
    if (startX === null || !hasManyMeanings) return;

    const deltaX = (e.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

    swipedRef.current = true;
    if (deltaX < 0) goToMeaning(safeMeaningIndex + 1, 1);
    else goToMeaning(safeMeaningIndex - 1, -1);
  };

  const handleRating = (rating: ReviewQuality) => {
    onRateWord(currentWord, rating);
    setIsFlipped(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakWord(currentWord.word);
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(currentWord.id);
  };

  const progressPercentage = Math.round(((currentIndex + 1) / words.length) * 100);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col justify-between px-4 md:px-8 py-5 pb-8 bg-slate-50 dark:bg-slate-900 animate-fadeIn">
      {/* Top Header & Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Word {currentIndex + 1} / {words.length}
          </span>

          <button
            onClick={handleFav}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-red-500"
          >
            <Heart
              className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-400"}`}
            />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-clay-inset border-2 border-slate-300 dark:border-slate-700">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Flashcard — same layout as the SRS review card */}
      <div className="my-auto py-3 perspective-1000">
        <div
          onClick={() => {
            // A swipe across the meanings ends as a click here; paging a
            // sense must not also flip the card back to the front.
            if (swipedRef.current) {
              swipedRef.current = false;
              return;
            }
            handleFlip();
          }}
          className={`w-full min-h-[300px] sm:min-h-[340px] rounded-[28px] p-6 bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-lg flex flex-col justify-between cursor-pointer transition-all duration-500 transform-style-3d relative ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT */}
          <div
            className={`flex-1 flex flex-col justify-between backface-hidden ${isFlipped ? "hidden" : "flex"}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-clay border-emerald-300 dark:border-emerald-800">
                Flashcard • {currentWord.category}
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" /> Tap card to flip
              </span>
            </div>

            <div className="text-center my-auto py-6">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {currentWord.word}
              </h2>
              <p className="text-sm font-mono text-slate-500 mt-2">
                {currentWord.ipa}
              </p>

              <button
                onClick={handleAudio}
                className="mt-4 px-4 py-2.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 inline-flex items-center gap-2 text-xs font-bold transition-colors"
              >
                <Volume2 className="w-4 h-4" /> Listen Audio
              </button>
            </div>

            <div className="text-center my-auto py-6">
              {hasManyMeanings && (
                <span className="inline-block mt-3 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border-2 border-purple-200 dark:border-purple-900">
                  {meanings.length} nghĩa cần ôn tập
                </span>
              )}
            </div>

            <div className="text-center text-xs text-slate-400 font-medium">
              💡 Hãy nhẩm nghĩa trước khi xem đáp án
            </div>
          </div>

          {/* BACK */}
          <div
            className={`flex-1 flex flex-col justify-between rotate-y-180 backface-hidden ${
              isFlipped ? "flex" : "hidden"
            }`}
          >
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-clay border-blue-300 dark:border-blue-800">
                Definition & Context
              </span>
              <div className="flex items-center gap-1">
                {hasManyMeanings && (
                  <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Nghĩa {safeMeaningIndex + 1}/{meanings.length}
                  </span>
                )}
                <button
                  onClick={handleAudio}
                  className="p-2 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Meanings slider — one sense at a time, swipe or arrows to page */}
            <div
              className="my-auto py-2"
              onTouchStart={handleMeaningTouchStart}
              onTouchEnd={handleMeaningTouchEnd}
            >
              <div className="min-h-[132px] flex items-center overflow-hidden">
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
                    className="w-full text-center space-y-2.5"
                  >
                    {currentMeaning?.pos && (
                      <span className="inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border-2 border-purple-200 dark:border-purple-900">
                        {currentMeaning.pos}
                      </span>
                    )}
                    <h3 className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {currentMeaning?.definition || currentWord.vietnamese}
                    </h3>
                    {currentMeaning?.example && (
                      <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border-blue-100">
                        <span className="font-bold">Example:</span>{" "}
                        <span className="italic">
                          "{currentMeaning.example}"
                        </span>
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {hasManyMeanings && (
                <div className="flex items-center justify-center gap-3 pt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToMeaning(safeMeaningIndex - 1, -1);
                    }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          goToMeaning(index, index > safeMeaningIndex ? 1 : -1);
                        }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      goToMeaning(safeMeaningIndex + 1, 1);
                    }}
                    disabled={safeMeaningIndex === meanings.length - 1}
                    aria-label="Nghĩa tiếp theo"
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}

              {currentWord.mnemonic && (
                <p className="text-xs text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 mt-3 rounded-lg border-clay border-amber-300">
                  💡 Mẹo nhớ: {currentWord.mnemonic}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Controls */}
      {!isFlipped ? (
        <div className="space-y-2 pt-2">
          <button
            onClick={handleFlip}
            className="w-full py-4 rounded-2xl bg-blue-600 border-clay border-blue-400 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-clay-lg active:scale-[0.97] active:shadow-clay-inset transition-all flex items-center justify-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span>Xem đáp án / Lật thẻ (Reveal Answer)</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-2">
          <div className="text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Đánh giá khả năng ghi nhớ để lên lịch ôn tiếp theo (Thang 0 - 5)
            {hasManyMeanings &&
              " — áp dụng cho cả " + meanings.length + " nghĩa"}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
            <button
              onClick={() => handleRating(0)}
              title="0: Complete blackout - Quên hoàn toàn không nhận ra"
              className="py-2.5 px-1 rounded-xl bg-slate-900/10 hover:bg-slate-900/20 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] border border-slate-400/30 active:scale-95 transition-all text-center leading-tight"
            >
              0 • Blackout 🖤
              <br />
              <span className="text-[9px] opacity-80 font-normal">
                Quên hẳn
              </span>
              <br />
              <span className="text-[9px] opacity-60 font-mono">1d</span>
            </button>
            <button
              onClick={() => handleRating(1)}
              title="1: Incorrect, remembered - Sai, nhưng nhớ lại khi xem đáp án"
              className="py-2.5 px-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-[11px] border border-red-500/20 active:scale-95 transition-all text-center leading-tight"
            >
              1 • Again 🔴
              <br />
              <span className="text-[9px] opacity-80 font-normal">
                Nhớ khi xem
              </span>
              <br />
              <span className="text-[9px] opacity-60 font-mono">1d</span>
            </button>
            <button
              onClick={() => handleRating(2)}
              title="2: Incorrect, familiar - Sai, nhưng cảm thấy quen thuộc"
              className="py-2.5 px-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-extrabold text-[11px] border border-orange-500/20 active:scale-95 transition-all text-center leading-tight"
            >
              2 • Familiar 🟠
              <br />
              <span className="text-[9px] opacity-80 font-normal">
                Thấy quen
              </span>
              <br />
              <span className="text-[9px] opacity-60 font-mono">1d</span>
            </button>
            <button
              onClick={() => handleRating(3)}
              title="3: Correct with difficulty - Đúng, nhưng phải nỗ lực mới nhớ"
              className="py-2.5 px-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] border border-amber-500/20 active:scale-95 transition-all text-center leading-tight"
            >
              3 • Hard 🟡
              <br />
              <span className="text-[9px] opacity-80 font-normal">
                Vật lộn nhớ
              </span>
              <br />
              <span className="text-[9px] opacity-60 font-mono">3d</span>
            </button>
            <button
              onClick={() => handleRating(4)}
              title="4: Correct with hesitation - Đúng, nhớ sau một chút ngập ngừng"
              className="py-2.5 px-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] border border-blue-500/20 active:scale-95 transition-all text-center leading-tight"
            >
              4 • Good 🔵
              <br />
              <span className="text-[9px] opacity-80 font-normal">
                Hơi đắn đo
              </span>
              <br />
              <span className="text-[9px] opacity-60 font-mono">7d</span>
            </button>
            <button
              onClick={() => handleRating(5)}
              title="5: Perfect recall - Nhớ chính xác hoàn hảo không do dự"
              className="py-2.5 px-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] border border-emerald-500/20 active:scale-95 transition-all text-center leading-tight"
            >
              5 • Easy 🟢
              <br />
              <span className="text-[9px] opacity-80 font-normal">
                Hoàn hảo
              </span>
              <br />
              <span className="text-[9px] opacity-60 font-mono">14d</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
