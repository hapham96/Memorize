'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Heart, Loader2, Play, Plus, RotateCcw, Swords } from 'lucide-react';
import { UserWordListItem, VocabularySet, Word } from '@/types';
import { PracticeChoices, PracticeMode, PracticeSitting } from '@/types/practice';
import { fetchPracticeChoices, fetchPracticeSitting, startPractice } from '@/lib/api/practice-client';
import { getUserWordLibrary } from '@/lib/api/word-client';
import { ApiError } from '@/lib/api/client';
import { soundFX } from '@/lib/audio';
import { trackEvent } from '@/lib/analytics';
import { EMPTY_SELECTION, WordPicker, WordSelection, isWordChosen } from './WordPicker';

interface PracticeTabProps {
  allWords: Word[];
  vocabularySets: VocabularySet[];
  favorites: string[];
  onOpenSitting: (sitting: PracticeSitting) => void;
  onOpenBattle: () => void;
  onOpenAddWord: () => void;
  /** The home screen's review run. */
  onStartReview: () => void;
}

const MODES: { id: PracticeMode; label: string; needsChoices?: boolean }[] = [
  { id: 'flashcard', label: 'Flashcard' },
  { id: 'multiple_choice', label: 'Trắc nghiệm nghĩa', needsChoices: true },
  { id: 'match', label: 'Nối cặp', needsChoices: true },
  { id: 'listening', label: 'Nghe' },
  { id: 'fill_in_blank', label: 'Điền chỗ trống' },
  { id: 'typing', label: 'Gõ từ theo nghĩa' },
];

const sectionClass =
  'rounded-card p-4 bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm space-y-3';
const titleClass = 'text-sm font-extrabold text-slate-900 dark:text-slate-100';

const chipClass = (isActive: boolean) =>
  `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all disabled:opacity-40 ${
    isActive
      ? 'bg-blue-600 text-white border-blue-400 shadow-clay-sm'
      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
  }`;

export const PracticeTab: React.FC<PracticeTabProps> = ({
  allWords,
  vocabularySets,
  favorites,
  onOpenSitting,
  onOpenBattle,
  onOpenAddWord,
  onStartReview,
}) => {
  const [items, setItems] = useState<UserWordListItem[] | null>(null);
  const [choices, setChoices] = useState<PracticeChoices | null>(null);
  const [areChoicesSettled, setChoicesSettled] = useState(false);
  const [unfinished, setUnfinished] = useState<PracticeSitting | null>(null);
  const [selection, setSelection] = useState<WordSelection>(EMPTY_SELECTION);
  /** null is "Tự động". */
  const [modes, setModes] = useState<PracticeMode[] | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read through a ref so a new array identity does not reload the screen.
  const latestRef = useRef({ allWords, vocabularySets });
  latestRef.current = { allWords, vocabularySets };

  useEffect(() => {
    let isCurrent = true;
    const { allWords: words, vocabularySets: sets } = latestRef.current;

    getUserWordLibrary({ fallbacks: words, vocabularySets: sets })
      .then((library) => {
        if (isCurrent) setItems(library.items.filter((item) => /^\d+$/.test(String(item.word.id))));
      })
      .catch((err) => {
        console.warn('Could not load words for practice:', err);
        if (isCurrent) setError('Không tải được kho từ, kiểm tra kết nối rồi mở lại tab này.');
      });
    fetchPracticeChoices()
      .then((next) => isCurrent && setChoices(next))
      .catch((err) => console.warn('Could not load practice choices:', err))
      .finally(() => isCurrent && setChoicesSettled(true));
    fetchPracticeSitting()
      .then((sitting) => isCurrent && setUnfinished(sitting))
      .catch((err) => {
        console.warn('Could not restore the practice sitting:', err);
        if (isCurrent) {
          setError('Không khôi phục được buổi luyện tập trước. Bạn có thể bắt đầu buổi mới.');
        }
      });

    return () => {
      isCurrent = false;
    };
    // `allWords.length`: a word added while the tab is open belongs in the list.
  }, [allWords.length]);

  const shortcuts = { favorites, oftenMissedIds: choices?.oftenMissedIds ?? [] };
  // Words waiting for review are not listed: their meaning would be read just
  // before it is asked for.
  const reviewDue = new Set(choices?.reviewDueIds ?? []);
  const practisable = (items ?? []).filter((item) => !reviewDue.has(Number(item.word.id)));
  const chosenCount = practisable.filter((item) =>
    isWordChosen(selection, item, shortcuts),
  ).length;
  const canStart = chosenCount > 0 && (modes === null || modes.length > 0) && !isStarting;

  const resume = () => {
    if (!unfinished) return;
    soundFX.playPop();
    onOpenSitting(unfinished);
  };

  const begin = async () => {
    setError(null);
    setIsStarting(true);
    try {
      const sitting = await startPractice({
        vocabularySetIds: Array.from(selection.setIds),
        userWordIds: Array.from(selection.wordIds),
        excludedUserWordIds: Array.from(selection.excludedIds),
        favorites: selection.favorites,
        oftenMissed: selection.oftenMissed,
        ...(modes ? { modes } : {}),
      });
      trackEvent('practice_start', {
        mode_choice: modes ? 'manual' : 'auto',
        item_count: sitting.wordCount,
      });
      onOpenSitting(sitting);
    } catch (err) {
      console.error('API startPractice error:', err);
      setError(
        err instanceof ApiError && err.status === 422
          ? 'Không từ nào đã chọn luyện được với các chế độ này. Chọn thêm từ hoặc chế độ khác nhé.'
          : 'Không bắt đầu được, kiểm tra kết nối rồi thử lại nhé.',
      );
      setIsStarting(false);
    }
  };

  /** Asks first when there is a sitting to carry on, maybe from another device. */
  const handleStart = async () => {
    soundFX.playPop();
    setIsStarting(true);
    const current = await fetchPracticeSitting().catch(() => null);
    setUnfinished(current);
    if (current) {
      setIsAsking(true);
      setIsStarting(false);
      return;
    }
    await begin();
  };

  const toggleMode = (mode: PracticeMode) =>
    setModes((prev) => {
      const next = prev?.includes(mode) ? prev.filter((m) => m !== mode) : [...(prev ?? []), mode];
      // Nothing ticked is "Tự động".
      return next.length ? next : null;
    });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 space-y-4 pb-28 animate-fadeIn">
      <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Luyện tập</h2>

      {unfinished && (
        <button
          type="button"
          onClick={resume}
          className="w-full flex items-center gap-3 p-4 rounded-card bg-emerald-600 border-clay border-emerald-400 text-white shadow-clay-lg text-left active:scale-[0.98] transition-all"
        >
          <RotateCcw className="w-6 h-6 shrink-0" />
          <span>
            <span className="block font-extrabold">Làm tiếp buổi đang dở</span>
            <span className="block text-xs text-emerald-100">
              {unfinished.wordCount} từ · vòng {unfinished.round.number}
            </span>
          </span>
        </button>
      )}

      {reviewDue.size > 0 && (
        <button
          type="button"
          onClick={onStartReview}
          className="w-full flex items-center justify-between gap-2 p-4 rounded-card bg-amber-50 dark:bg-amber-500/10 border-clay border-amber-300 text-left text-sm font-extrabold text-amber-800 dark:text-amber-300 active:scale-[0.98] transition-all"
        >
          <span>{reviewDue.size} từ đang chờ ôn</span>
          <span>Ôn ngay →</span>
        </button>
      )}

      {items?.length === 0 ? (
        <div className={`${sectionClass} flex flex-col items-center`}>
          <p className={titleClass}>Chưa có từ nào để luyện</p>
          <button type="button" onClick={onOpenAddWord} className={chipClass(true)}>
            <Plus className="w-3.5 h-3.5" /> Thêm từ mới
          </button>
        </div>
      ) : (
        <>
          <section className={sectionClass}>
            <h3 className={titleClass}>1. Chọn từ</h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={selection.favorites}
                onClick={() => {
                  // Ticking the chip brings back favorites unticked earlier.
                  const excludedIds = new Set(selection.excludedIds);
                  if (!selection.favorites) favorites.forEach((id) => excludedIds.delete(Number(id)));
                  setSelection({ ...selection, excludedIds, favorites: !selection.favorites });
                }}
                className={chipClass(selection.favorites)}
              >
                <Heart className="w-3.5 h-3.5" /> Yêu thích
                {choices && <span className="opacity-70">{choices.favoriteCount}</span>}
              </button>
              <button
                type="button"
                aria-pressed={selection.oftenMissed}
                disabled={!choices?.oftenMissedCount && !selection.oftenMissed}
                onClick={() => {
                  const excludedIds = new Set(selection.excludedIds);
                  if (!selection.oftenMissed) {
                    shortcuts.oftenMissedIds.forEach((id) => excludedIds.delete(id));
                  }
                  setSelection({ ...selection, excludedIds, oftenMissed: !selection.oftenMissed });
                }}
                className={chipClass(selection.oftenMissed)}
              >
                Từ hay sai
                {choices && <span className="opacity-70">{choices.oftenMissedCount}</span>}
              </button>
            </div>
            {/* Said out loud: a right answer does not take a word off the list. */}
            {Boolean(choices?.oftenMissedCount) && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Từ hay sai là từ bạn quên từ 2 lần trở lên trong 30 ngày qua. Trả lời đúng chưa làm
                nó mất ngay: nó tự rời danh sách khi 30 ngày gần nhất còn dưới 2 lần quên.
              </p>
            )}
            {items === null || !areChoicesSettled ? (
              !error && <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto" />
            ) : (
              <WordPicker
                items={practisable}
                vocabularySets={vocabularySets}
                shortcuts={shortcuts}
                selection={selection}
                onChange={setSelection}
              />
            )}
          </section>

          <section className={sectionClass}>
            <h3 className={titleClass}>2. Chế độ</h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={modes === null}
                onClick={() => setModes(null)}
                className={chipClass(modes === null)}
              >
                Tự động (dễ → khó)
              </button>
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={modes?.includes(mode.id) ?? false}
                  disabled={mode.needsChoices && choices !== null && !choices.canChoose}
                  onClick={() => toggleMode(mode.id)}
                  className={chipClass(modes?.includes(mode.id) ?? false)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {choices && !choices.canChoose && (
              <p className="text-xs text-slate-400">Trắc nghiệm và nối cặp cần ít nhất 4 từ khác nhau.</p>
            )}
          </section>

          {isAsking ? (
            <div className={`${sectionClass} flex flex-col items-center text-center`}>
              <p className={titleClass}>Bạn còn một buổi đang dở. Làm tiếp hay bắt đầu buổi mới?</p>
              <div className="flex gap-2">
                <button type="button" onClick={resume} className={chipClass(true)}>
                  Làm tiếp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAsking(false);
                    void begin();
                  }}
                  className={chipClass(false)}
                >
                  Buổi mới
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={!canStart}
              className="w-full py-4 rounded-2xl bg-blue-600 border-clay border-blue-400 text-white font-extrabold shadow-clay-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 transition-all"
            >
              {isStarting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-white" />
              )}
              Bắt đầu
              {chosenCount > 0 && ` (${chosenCount} từ)`}
            </button>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-xs font-bold text-amber-600 dark:text-amber-400 text-center">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onOpenBattle}
        className="w-full flex items-center gap-3 p-4 rounded-card bg-white dark:bg-slate-800 border-clay border-rose-300 dark:border-rose-900 shadow-clay-sm text-left active:scale-[0.98] transition-all"
      >
        <span className="w-12 h-12 shrink-0 rounded-2xl bg-rose-500 text-white flex items-center justify-center">
          <Swords className="w-6 h-6" />
        </span>
        <span>
          <span className={`block ${titleClass}`}>Battle Game</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            Đấu từ vựng trực tiếp với 1–3 bạn bè.
          </span>
        </span>
      </button>
    </div>
  );
};
