'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, CheckCircle2, ChevronLeft, ChevronRight, Clock, Sparkles, Volume2, ArrowLeft, RotateCw, Plus, Filter, RefreshCw } from 'lucide-react';
import { VocabularySet, Word, SRSData, WordCategory } from '@/types';
import { StatsSummary } from '@/types/stats';
import { BackendDueReview, ReviewQuality } from '@/types/word';
import { calculateNextSRS } from '@/lib/srs';
import { speakWord, soundFX } from '@/lib/audio';
import { getWordMeanings } from '@/lib/word';
import { categoryNames } from '@/lib/api/category-client';
import {
  submitReviewWord,
  mapWordRatingToSRS,
  getDueReviews,
  mapBackendUserWordToSRS,
  resolveWordForUserWord,
  pickRepresentativeDefinition,
} from '@/lib/api/word-client';

interface ReviewDashboardProps {
  allWords: Word[];
  /** The account's `/vocabulary-sets` list; drives the filter chips. */
  vocabularySets?: VocabularySet[];
  srsMap: Record<string, SRSData>;
  /**
   * `GET /stats/summary`, or null while it has not answered. Its counters win
   * over the ones derived from `srsMap`, which only knows the words this device
   * has seen.
   */
  summary?: StatsSummary | null;
  onUpdateSRS: (wordId: string, updatedSRS: SRSData) => void;
  /** Folds a whole due list into the SRS map in one write. */
  onMergeSRS?: (entries: Record<string, SRSData>) => void;
  onOpenAddWord?: () => void;
  /** Fired after the backend due list is re-read, so reminders can follow. */
  onDueListChanged?: () => void;
}

interface DueReviewItem {
  userWordId: number | string;
  word: Word;
  userWord?: BackendDueReview;
}

/** How far a finger has to travel across the card back to count as a swipe. */
const SWIPE_THRESHOLD_PX = 40;

/** `direction` is +1 paging forward, -1 back, so a slide leaves the way it came. */
const meaningSlide = {
  enter: (direction: number) => ({ x: direction >= 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -48 : 48, opacity: 0 }),
};

const MS_PER_DAY = 86_400_000;

/**
 * How overdue a queued word is, in words. Whole calendar days apart, so a word
 * due last night reads as "hôm qua" rather than "16 giờ".
 */
function formatDueLabel(dueAt?: string | null, now: Date = new Date()): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((startOfToday - startOfDue) / MS_PER_DAY);

  if (days <= 0) return 'đến hạn hôm nay';
  if (days === 1) return 'quá hạn hôm qua';
  return `quá hạn ${days} ngày`;
}

export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({
  allWords,
  vocabularySets = [],
  srsMap,
  summary = null,
  onUpdateSRS,
  onMergeSRS,
  onOpenAddWord,
  onDueListChanged,
}) => {
  const [isReviewing, setIsReviewing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WordCategory | 'All'>('All');
  const [apiDueItems, setApiDueItems] = useState<DueReviewItem[] | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  // Which sense of the current word the card back is showing, and which way it
  // was paged — the slide has to leave towards the side it came from.
  const [meaningIndex, setMeaningIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const swipeStartXRef = useRef<number | null>(null);
  // A swipe ends in a `click` on the card, which would flip it. Set while the
  // gesture paged a meaning so that click can be swallowed instead.
  const swipedRef = useRef(false);

  // Read through refs so the mount-only effect below still sees the latest props
  // without becoming an effect that re-runs on every identity change — every one
  // of those re-runs used to be another `/reviews/due` request.
  const latestRef = useRef({ allWords, onUpdateSRS, onMergeSRS, onDueListChanged });
  latestRef.current = { allWords, onUpdateSRS, onMergeSRS, onDueListChanged };

  /**
   * This screen is the only caller of `/reviews/due` in the app: it is the only
   * place that needs `userWordId` to post a review with. Everything else — the
   * reminders, the due dates on this list — reads `dueAt` off the cached word
   * library instead.
   */
  const fetchDueFromApi = useCallback(async () => {
    const { allWords: words, onUpdateSRS: updateSRS, onMergeSRS: mergeSRS, onDueListChanged: notifyChanged } =
      latestRef.current;

    setIsLoadingApi(true);
    try {
      const data = await getDueReviews();
      if (Array.isArray(data)) {
        const items: DueReviewItem[] = data.map((userWord) => ({
          userWordId: userWord.userWordId,
          word: resolveWordForUserWord(userWord, words),
          userWord,
        }));
        setApiDueItems(items);

        // The backend's schedule for every row, folded in as one write rather
        // than one state update and one localStorage write per word.
        const entries: Record<string, SRSData> = {};
        items.forEach((item) => {
          const srs = item.userWord ? mapBackendUserWordToSRS(item.userWord) : undefined;
          if (srs) entries[String(item.word.id)] = srs;
        });

        if (mergeSRS) mergeSRS(entries);
        else Object.entries(entries).forEach(([wordId, srs]) => updateSRS(wordId, srs));

        // Reminders read the cached library, which `submitReview` patches; this
        // tells them to recompute now rather than at their next tick.
        notifyChanged?.();
      }
    } catch (err) {
      console.warn('Could not fetch due reviews from API, using local SRS data:', err);
    } finally {
      setIsLoadingApi(false);
    }
  }, []);

  // Once per visit to this tab — the component only exists while it is open.
  useEffect(() => {
    void fetchDueFromApi();
  }, [fetchDueFromApi]);

  // The backend owns what is due. A local guess would only ever disagree with
  // it — that disagreement is what put a badge of 2 next to a queue of 0 — so
  // until the first answer arrives the queue is *unknown*, not empty, and the
  // copy below says so rather than claiming the day is done.
  const hasLoadedDue = apiDueItems !== null;

  const dueItems: DueReviewItem[] = !hasLoadedDue
    ? []
    : selectedCategory === 'All'
      ? apiDueItems
      : apiDueItems.filter((item) => item.word.category === selectedCategory);

  const dueWords = dueItems.map((item) => item.word);

  // "Nothing due" and "no words at all" look the same in the numbers but need
  // different copy — a new account has an empty library by design.
  const isLibraryEmpty = hasLoadedDue && allWords.length === 0 && dueItems.length === 0;

  // `/stats/summary` counts the account; `srsMap` only counts what this device
  // has seen, so it is the fallback rather than the source. "Sắp tới" has no
  // remote counterpart, so it stays local.
  const learningCount =
    summary?.learningCount ?? Object.values(srsMap).filter((s) => s.state === 'learning').length;
  const masteredCount =
    summary?.masteredCount ?? Object.values(srsMap).filter((s) => s.state === 'mastered').length;
  const upcomingCount = Object.values(srsMap).filter((s) => s.state === 'review').length;
  const libraryCount = summary?.totalWords ?? allWords.length;

  const currentItem = dueItems[currentIndex];
  const currentWord = currentItem?.word;

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

  // A different filter is a different queue, so the cursor cannot carry over.
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory]);

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

  // The chips come from the account's `/vocabulary-sets` list, so a set the
  // backend added shows up without a release. A set nothing is filed under
  // would only ever filter to an empty queue, so it is left out.
  //
  // "Filed under" counts the queue as well as the local library: a due word this
  // device never added falls back to `FALLBACK_CATEGORY`, and without it in the
  // list that word could not be filtered for at all.
  const CATEGORIES: (WordCategory | 'All')[] = useMemo(() => {
    const used = new Set<WordCategory>(allWords.map((w) => w.category));
    (apiDueItems ?? []).forEach((item) => used.add(item.word.category));

    const known = categoryNames(vocabularySets).filter((name) => used.has(name));
    // A queue category the `/vocabulary-sets` list does not name would otherwise
    // be unreachable, so it is appended rather than dropped.
    const unnamed = Array.from(used).filter((name) => !known.includes(name)).sort();
    const listed = [...known, ...unnamed];
    // Whatever the current filter is must stay clickable, or it cannot be undone.
    const extra =
      selectedCategory !== 'All' && !listed.includes(selectedCategory) ? [selectedCategory] : [];
    return ['All', ...listed, ...extra];
  }, [allWords, apiDueItems, vocabularySets, selectedCategory]);

  const handleRating = async (rating: ReviewQuality) => {
    if (!currentItem || !currentWord) return;

    const userWordId = currentItem.userWordId;
    const wordId = String(currentWord.id);

    const currentSRS = srsMap[wordId] || {
      userWordId,
      wordId,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lastReviewed: null,
      nextReviewDate: new Date().toISOString(),
      state: 'new',
    };

    const updated = calculateNextSRS(currentSRS, rating);
    onUpdateSRS(wordId, updated);
    setIsFlipped(false);

    try {
      // Reviewing-phase Flashcard: applies to every due meaning bundled under
      // `userWordId` at once.
      const definitions = await submitReviewWord(userWordId, rating);
      const backendSRS = mapWordRatingToSRS(definitions);
      if (backendSRS) onUpdateSRS(wordId, backendSRS);
    } catch (err) {
      console.error('API submitReviewWord error:', err);
    }

    if (currentIndex < dueItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsReviewing(false);
      soundFX.playLevelUp();
      fetchDueFromApi();
    }
  };

  const handleStartReview = async () => {
    soundFX.playPop();
    await fetchDueFromApi();
    setCurrentIndex(0);
    setIsReviewing(true);
  };

  // If in active review mode (Screen 11)
  if (isReviewing && currentWord) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col justify-between px-4 md:px-8 py-5 pb-28 bg-slate-50 dark:bg-slate-900 animate-fadeIn">
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setIsReviewing(false)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-500">
              Review {currentIndex + 1} / {dueWords.length}
            </span>
            <button
              onClick={() => speakWord(currentWord.word)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-clay-inset border-2 border-slate-300 dark:border-slate-700">
            <div
              className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${((currentIndex + 1) / dueWords.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* SRS Card */}
        <div className="my-auto py-3 perspective-1000">
          <div
            onClick={() => {
              // A swipe across the meanings ends as a click here; paging a
              // sense must not also flip the card back to the front.
              if (swipedRef.current) {
                swipedRef.current = false;
                return;
              }
              soundFX.playFlip();
              setIsFlipped(!isFlipped);
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
                  SRS Review • {currentWord.category}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    speakWord(currentWord.word);
                  }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWord(currentWord.word);
                    }}
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
                      {currentMeaning?.translation && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {currentMeaning.translation}
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
                            goToMeaning(
                              index,
                              index > safeMeaningIndex ? 1 : -1,
                            );
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
          /* FRONT SIDE: Big Action Button to Reveal Answer & Proceed */
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                soundFX.playFlip();
                setIsFlipped(true);
              }}
              className="w-full py-4 rounded-2xl bg-blue-600 border-clay border-blue-400 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-clay-lg active:scale-[0.97] active:shadow-clay-inset transition-all flex items-center justify-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Xem đáp án / Lật thẻ (Reveal Answer)</span>
            </button>
          </div>
        ) : (
          /* BACK SIDE: SM-2 6 Ratings (0: Blackout, 1: Remembered, 2: Familiar, 3: Hard, 4: Hesitation, 5: Perfect) */
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
  }

  // Dashboard Overview (Screen 10)
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 space-y-5 pb-28 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Review Dashboard</h2>
        </div>

        {onOpenAddWord && (
          <button
            onClick={onOpenAddWord}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 border-clay border-blue-400 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-clay flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Thêm từ mới</span>
          </button>
        )}
      </div>

      {/* Primary Hero Review Banner */}
      <div className="bg-emerald-600 border-clay border-emerald-400 text-white rounded-[28px] p-6 shadow-clay-lg relative overflow-hidden group">

        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-100 bg-white/15 px-3 py-1 rounded-full border border-white/20">
              ⚡ Spaced Repetition SRS
            </span>
            <h3 className="text-3xl md:text-4xl font-black mt-2">
              {hasLoadedDue ? dueWords.length : '—'}{' '}
              <span className="text-base font-normal text-emerald-100">từ đến lịch ôn tập</span>
            </h3>
            <p className="text-xs md:text-sm text-emerald-100 mt-2 font-medium">
              {!hasLoadedDue
                ? 'Đang tải hàng đợi ôn tập…'
                : dueWords.length > 0
                  ? 'Sẵn sàng cho phiên ôn luyện duy trì trí nhớ hôm nay!'
                  : isLibraryEmpty
                    ? 'Kho từ của bạn đang trống. Thêm từ đầu tiên để bắt đầu ôn tập.'
                    : '🎉 Bạn đã hoàn thành tất cả từ hôm nay! Hãy quay lại vào ngày mai.'}
            </p>
          </div>

          <Brain className="w-16 h-16 text-white/20 flex-shrink-0 hidden sm:block" />
        </div>

        {dueWords.length > 0 && (
          <button
            onClick={handleStartReview}
            disabled={isLoadingApi}
            className="w-full mt-5 py-3.5 rounded-2xl bg-white text-emerald-800 font-extrabold text-sm shadow-clay hover:bg-emerald-50 active:scale-[0.97] active:shadow-clay-inset transition-all flex items-center justify-center gap-2"
          >
            {isLoadingApi && <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />}
            <span>Bắt đầu ôn tập ngay ({dueWords.length} từ)</span>
          </button>
        )}
      </div>

      {/* SRS Category Breakdown Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-[20px] border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Đang học</span>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {learningCount}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-[20px] border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Mastered</span>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {masteredCount}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-[20px] border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Sắp tới</span>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {upcomingCount}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-[20px] border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Tổng kho từ</span>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {libraryCount}
            </p>
          </div>
        </div>
      </div>

      {/* Words Queue Preview */}
      <div className="bg-white dark:bg-slate-800 rounded-card p-5 border-clay border-blue-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Review Queue Preview
          </h4>
          {/* The queue is read once when this tab opens, so this is the way to
              re-ask without leaving and coming back. */}
          <button
            onClick={() => {
              soundFX.playPop();
              void fetchDueFromApi();
            }}
            disabled={isLoadingApi}
            aria-label="Tải lại hàng đợi ôn tập"
            title="Tải lại hàng đợi ôn tập"
            className="shrink-0 p-2 rounded-button bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApi ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* One chip per category the library actually uses — hidden while there
            is only "All" to choose from. */}
        {CATEGORIES.length > 1 && (
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  soundFX.playPop();
                  setSelectedCategory(cat);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap transition-all active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-clay-sm'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'All' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>
        )}

        {!hasLoadedDue ? (
          <div className="text-center py-6">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Đang tải hàng đợi ôn tập…</p>
          </div>
        ) : isLibraryEmpty ? (
          <div className="text-center py-6">
            <span className="text-3xl">📚</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2">
              Chưa có từ nào trong kho
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Toàn bộ kho từ là do bạn tự thêm — hãy thêm từ đầu tiên để bắt đầu.
            </p>
            {onOpenAddWord && (
              <button
                onClick={onOpenAddWord}
                className="mt-4 px-4 py-2.5 rounded-2xl bg-blue-600 border-clay border-blue-400 text-white font-extrabold text-xs shadow-clay inline-flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Thêm từ mới</span>
              </button>
            )}
          </div>
        ) : dueWords.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-3xl">{selectedCategory === 'All' ? '🎉' : '🔍'}</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2">
              {selectedCategory === 'All'
                ? "You're all caught up!"
                : `Không có từ nào đến hạn trong bộ "${selectedCategory}"`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedCategory === 'All'
                ? 'Come back tomorrow for your next SRS review.'
                : 'Chọn "Tất cả" để xem toàn bộ hàng đợi ôn tập.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {dueItems.map((item) => {
              const dueLabel = formatDueLabel(
                pickRepresentativeDefinition(item.userWord?.definitions ?? [])?.dueAt
              );
              return (
                <div
                  key={item.word.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-clay border-blue-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {item.word.word}
                      </h5>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {item.word.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{item.word.vietnamese}</p>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.word.level}
                    </span>
                    {dueLabel && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {dueLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
