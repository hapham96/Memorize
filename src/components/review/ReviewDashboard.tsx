'use client';

import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle2, Clock, Sparkles, Volume2, ArrowLeft, RotateCw, Plus, Filter, RefreshCw } from 'lucide-react';
import { Word, SRSData, WordCategory } from '@/types';
import { BackendUserWord, ReviewQuality } from '@/types/word';
import { calculateNextSRS } from '@/lib/srs';
import { speakWord, soundFX } from '@/lib/audio';
import {
  submitReview,
  mapReviewResponseToSRS,
  getDueReviews,
  mapBackendUserWordToSRS,
  resolveWordForUserWord,
} from '@/lib/api/word-client';

interface ReviewDashboardProps {
  allWords: Word[];
  srsMap: Record<string, SRSData>;
  onUpdateSRS: (wordId: string, updatedSRS: SRSData) => void;
  onOpenAddWord?: () => void;
}

interface DueReviewItem {
  userWordId: number | string;
  word: Word;
  userWord?: BackendUserWord;
}

export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({
  allWords,
  srsMap,
  onUpdateSRS,
  onOpenAddWord,
}) => {
  const [isReviewing, setIsReviewing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WordCategory | 'All'>('All');
  const [apiDueItems, setApiDueItems] = useState<DueReviewItem[] | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  const fetchDueFromApi = async () => {
    setIsLoadingApi(true);
    try {
      const data = await getDueReviews();
      if (Array.isArray(data)) {
        const items: DueReviewItem[] = data.map((userWord) => ({
          userWordId: userWord.id,
          word: resolveWordForUserWord(userWord, allWords),
          userWord,
        }));
        setApiDueItems(items);

        // Update local SRS map from backend response
        items.forEach((item) => {
          if (item.userWord) {
            onUpdateSRS(String(item.word.id), mapBackendUserWordToSRS(item.userWord));
          }
        });
      }
    } catch (err) {
      console.warn('Could not fetch due reviews from API, using local SRS data:', err);
    } finally {
      setIsLoadingApi(false);
    }
  };

  useEffect(() => {
    fetchDueFromApi();
  }, [allWords]);

  // Compute effective due list
  const now = new Date();
  const filteredWords = selectedCategory === 'All'
    ? allWords
    : allWords.filter((w) => w.category === selectedCategory);

  const localDueWords = filteredWords.filter((w) => {
    const srs = srsMap[w.id];
    if (!srs) return true;
    return new Date(srs.nextReviewDate) <= now || srs.state === 'learning';
  });

  const dueItems: DueReviewItem[] = apiDueItems !== null
    ? (selectedCategory === 'All'
      ? apiDueItems
      : apiDueItems.filter((item) => item.word.category === selectedCategory))
    : localDueWords.map((w) => ({
      userWordId: srsMap[w.id]?.userWordId || w.id,
      word: w,
    }));

  const dueWords = dueItems.map((item) => item.word);

  const learningCount = Object.values(srsMap).filter((s) => s.state === 'learning').length;
  const masteredCount = Object.values(srsMap).filter((s) => s.state === 'mastered').length;
  const upcomingCount = Object.values(srsMap).filter((s) => s.state === 'review').length;

  const currentItem = dueItems[currentIndex];
  const currentWord = currentItem?.word;

  const CATEGORIES: (WordCategory | 'All')[] = [
    'All',
    'IELTS',
    'TOEIC',
    'Custom',
    'Daily Life',
    'Business',
    'Academic',
    'Travel',
    'Technology',
    'Emotions',
  ];

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
      const reviewResp = await submitReview(userWordId, rating);
      if (reviewResp) {
        const backendSRS = mapReviewResponseToSRS(reviewResp);
        onUpdateSRS(wordId, backendSRS);
      }
    } catch (err) {
      console.error('API submitReview error:', err);
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
              style={{ width: `${((currentIndex + 1) / dueWords.length) * 100}%` }}
            />
          </div>
        </div>

        {/* SRS Card */}
        <div className="my-auto py-3 perspective-1000">
          <div
            onClick={() => {
              soundFX.playFlip();
              setIsFlipped(!isFlipped);
            }}
            className={`w-full min-h-[300px] sm:min-h-[340px] rounded-[28px] p-6 bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-lg flex flex-col justify-between cursor-pointer transition-all duration-500 transform-style-3d relative ${isFlipped ? 'rotate-y-180' : ''
              }`}
          >
            {/* FRONT */}
            <div className={`flex-1 flex flex-col justify-between backface-hidden ${isFlipped ? 'hidden' : 'flex'}`}>
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
                <p className="text-sm font-mono text-slate-500 mt-2">{currentWord.ipa}</p>

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

              <div className="text-center text-xs text-slate-400 font-medium">
                💡 Hãy nhẩm nghĩa Tiếng Việt trước khi xem đáp án
              </div>
            </div>

            {/* BACK */}
            <div
              className={`flex-1 flex flex-col justify-between rotate-y-180 backface-hidden ${isFlipped ? 'flex' : 'hidden'
                }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-clay border-blue-300 dark:border-blue-800">
                  Definition & Context
                </span>
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

              <div className="my-auto py-4 text-center space-y-3">
                <h3 className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {currentWord.vietnamese}
                </h3>
                {currentWord.definition && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border-clay border-blue-300">
                    📖 <span className="font-bold">Definition:</span> <span className="italic">{currentWord.definition}</span>
                  </p>
                )}
                <p className="text-xs md:text-sm italic text-slate-600 dark:text-slate-300">
                  "{currentWord.example}"
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">👉 {currentWord.translation}</p>
                {currentWord.mnemonic && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border-clay border-amber-300">
                    💡 Mẹo nhớ: {currentWord.mnemonic}
                  </p>
                )}
              </div>

              <div className="text-center text-xs text-slate-400 font-medium">
                Đánh giá mức độ nhớ để lên lịch ôn tiếp theo
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
              Đánh giá khả năng ghi nhớ (Thang 0 - 5)
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
              <button
                onClick={() => handleRating(0)}
                title="0: Complete blackout - Quên hoàn toàn không nhận ra"
                className="py-2.5 px-1 rounded-xl bg-slate-900/10 hover:bg-slate-900/20 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] border border-slate-400/30 active:scale-95 transition-all text-center leading-tight"
              >
                0 • Blackout 🖤<br />
                <span className="text-[9px] opacity-80 font-normal">Quên hẳn</span><br />
                <span className="text-[9px] opacity-60 font-mono">1d</span>
              </button>

              <button
                onClick={() => handleRating(1)}
                title="1: Incorrect, remembered - Sai, nhưng nhớ lại khi xem đáp án"
                className="py-2.5 px-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-[11px] border border-red-500/20 active:scale-95 transition-all text-center leading-tight"
              >
                1 • Again 🔴<br />
                <span className="text-[9px] opacity-80 font-normal">Nhớ khi xem</span><br />
                <span className="text-[9px] opacity-60 font-mono">1d</span>
              </button>

              <button
                onClick={() => handleRating(2)}
                title="2: Incorrect, familiar - Sai, nhưng cảm thấy quen thuộc"
                className="py-2.5 px-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-extrabold text-[11px] border border-orange-500/20 active:scale-95 transition-all text-center leading-tight"
              >
                2 • Familiar 🟠<br />
                <span className="text-[9px] opacity-80 font-normal">Thấy quen</span><br />
                <span className="text-[9px] opacity-60 font-mono">1d</span>
              </button>

              <button
                onClick={() => handleRating(3)}
                title="3: Correct with difficulty - Đúng, nhưng phải nỗ lực mới nhớ"
                className="py-2.5 px-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] border border-amber-500/20 active:scale-95 transition-all text-center leading-tight"
              >
                3 • Hard 🟡<br />
                <span className="text-[9px] opacity-80 font-normal">Vật lộn nhớ</span><br />
                <span className="text-[9px] opacity-60 font-mono">3d</span>
              </button>

              <button
                onClick={() => handleRating(4)}
                title="4: Correct with hesitation - Đúng, nhớ sau một chút ngập ngừng"
                className="py-2.5 px-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] border border-blue-500/20 active:scale-95 transition-all text-center leading-tight"
              >
                4 • Good 🔵<br />
                <span className="text-[9px] opacity-80 font-normal">Hơi đắn đo</span><br />
                <span className="text-[9px] opacity-60 font-mono">7d</span>
              </button>

              <button
                onClick={() => handleRating(5)}
                title="5: Perfect recall - Nhớ chính xác hoàn hảo không do dự"
                className="py-2.5 px-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] border border-emerald-500/20 active:scale-95 transition-all text-center leading-tight"
              >
                5 • Easy 🟢<br />
                <span className="text-[9px] opacity-80 font-normal">Hoàn hảo</span><br />
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
              {dueWords.length}{' '}
              <span className="text-base font-normal text-emerald-100">từ đến lịch ôn tập</span>
            </h3>
            <p className="text-xs md:text-sm text-emerald-100 mt-2 font-medium">
              {dueWords.length > 0
                ? 'Sẵn sàng cho phiên ôn luyện duy trì trí nhớ hôm nay!'
                : "🎉 Bạn đã hoàn thành tất cả từ hôm nay! Hãy quay lại vào ngày mai."}
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
              {allWords.length}
            </p>
          </div>
        </div>
      </div>

      {/* Words Queue Preview */}
      <div className="bg-white dark:bg-slate-800 rounded-card p-5 border-clay border-blue-200 dark:border-slate-700">
        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
          Review Queue Preview
        </h4>

        {dueWords.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-3xl">🎉</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2">
              You're all caught up!
            </p>
            <p className="text-xs text-slate-400 mt-1">Come back tomorrow for your next SRS review.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {dueWords.map((word) => (
              <div
                key={word.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-clay border-blue-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {word.word}
                    </h5>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {word.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{word.vietnamese}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {word.level}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
