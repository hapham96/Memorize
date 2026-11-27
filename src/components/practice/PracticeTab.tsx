'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Heart,
  Info,
  Link2,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Swords,
} from 'lucide-react';
import { UserWordListItem, VocabularySet, Word } from '@/types';
import { PracticeChoices, PracticeMode, PracticeSitting } from '@/types/practice';
import { fetchPracticeChoices, fetchPracticeSitting, startPractice } from '@/lib/api/practice-client';
import { getUserWordLibrary } from '@/lib/api/word-client';
import { ApiError } from '@/lib/api/client';
import { soundFX } from '@/lib/audio';
import { trackEvent } from '@/lib/analytics';
import { SavedChains } from '@/components/chain/SavedChains';
import { MAX_CHAIN_WORDS, chainErrorText, suggestChainWords } from '@/lib/api/chain-client';
import { XuPrices } from '@/lib/api/wallet-client';
import { ChainStart } from '@/types/chain';
import { EMPTY_SELECTION, WordPicker, WordSelection, isWordChosen } from './WordPicker';

export type PracticeSection = 'words' | 'chains' | 'battle';

const SECTIONS: { id: PracticeSection; label: string }[] = [
  { id: 'words', label: 'Bộ từ' },
  { id: 'chains', label: 'Chuỗi nhớ' },
  { id: 'battle', label: 'Battle' },
];

interface PracticeTabProps {
  /** Held by the page, so closing a chain comes back to the same section. */
  section: PracticeSection;
  onChangeSection: (section: PracticeSection) => void;
  allWords: Word[];
  vocabularySets: VocabularySet[];
  favorites: string[];
  onOpenSitting: (sitting: PracticeSitting) => void;
  onOpenBattle: () => void;
  onOpenAddWord: () => void;
  onOpenChain: (start: ChainStart) => void;
  /** Null while xu is switched off. */
  prices: XuPrices | null;
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

const mainButtonClass =
  'w-full py-4 rounded-2xl bg-blue-600 border-clay border-blue-400 text-white font-extrabold shadow-clay-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 transition-all';
const secondButtonClass =
  'w-full py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all';

const chipClass = (isActive: boolean) =>
  `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all disabled:opacity-40 ${
    isActive
      ? 'bg-blue-600 text-white border-blue-400 shadow-clay-sm'
      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
  }`;

export const PracticeTab: React.FC<PracticeTabProps> = ({
  section,
  onChangeSection,
  allWords,
  vocabularySets,
  favorites,
  onOpenSitting,
  onOpenBattle,
  onOpenAddWord,
  onStartReview,
  onOpenChain,
  prices,
}) => {
  const [items, setItems] = useState<UserWordListItem[] | null>(null);
  const [choices, setChoices] = useState<PracticeChoices | null>(null);
  const [areChoicesSettled, setChoicesSettled] = useState(false);
  const [unfinished, setUnfinished] = useState<PracticeSitting | null>(null);
  const [selection, setSelection] = useState<WordSelection>(EMPTY_SELECTION);
  /** null is "Tự động". */
  const [modes, setModes] = useState<PracticeMode[] | null>(null);
  const [showModes, setShowModes] = useState(false);
  const [showMissedHelp, setShowMissedHelp] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
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
  const chosen = practisable.filter((item) => isWordChosen(selection, item, shortcuts));
  const chosenCount = chosen.length;
  const canStart = chosenCount > 0 && (modes === null || modes.length > 0) && !isStarting;

  /**
   * A chain without picking: one weak word (often missed, else still being
   * learnt, else any), and the AI finds what links to it.
   */
  const suggestChain = async () => {
    const missed = practisable.filter((item) =>
      shortcuts.oftenMissedIds.includes(Number(item.word.id)),
    );
    const learning = practisable.filter((item) => item.state === 'learning');
    const pool = missed.length ? missed : learning.length ? learning : practisable;
    const seed = pool[Math.floor(Math.random() * pool.length)];
    if (!seed) return;

    soundFX.playPop();
    setError(null);
    setIsSuggesting(true);
    const word = { userWordId: Number(seed.word.id), headword: seed.word.word };
    try {
      const suggested = await suggestChainWords([word.userWordId]);
      onOpenChain({ kind: 'new', words: [word], suggested });
    } catch (err) {
      console.warn('Could not suggest a chain:', err);
      setError(chainErrorText(err));
      setIsSuggesting(false);
    }
  };

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

  const hasNoWords = items?.length === 0;
  const hasActionBar = section === 'words' && items !== null && items.length > 0;

  const emptyLibrary = (
    <div className={`${sectionClass} flex flex-col items-center`}>
      <p className={titleClass}>Chưa có từ nào để luyện</p>
      <button type="button" onClick={onOpenAddWord} className={chipClass(true)}>
        <Plus className="w-3.5 h-3.5" /> Thêm từ mới
      </button>
    </div>
  );

  const errorLine = error && (
    <p role="alert" className="text-xs font-bold text-amber-600 dark:text-amber-400 text-center">
      {error}
    </p>
  );

  const wordsSection = (
    <>
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

      {hasNoWords ? (
        emptyLibrary
      ) : (
        <>
          <section className={sectionClass}>
            <h3 className={titleClass}>Chọn từ muốn luyện</h3>
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
              {Boolean(choices?.oftenMissedCount) && (
                <button
                  type="button"
                  aria-label="Từ hay sai là gì?"
                  aria-expanded={showMissedHelp}
                  onClick={() => setShowMissedHelp(!showMissedHelp)}
                  className={chipClass(false)}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Said out loud: a right answer does not take a word off the list. */}
            {showMissedHelp && (
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
            <button
              type="button"
              aria-expanded={showModes}
              onClick={() => setShowModes(!showModes)}
              className="w-full flex items-center gap-2 text-left"
            >
              <span className={titleClass}>Cách luyện</span>
              <span className="ml-auto text-xs font-bold text-slate-500 dark:text-slate-400">
                {modes ? `${modes.length} kiểu` : 'Tự động (dễ → khó)'}
              </span>
              {showModes ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {showModes && (
              <>
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
              </>
            )}
          </section>
        </>
      )}
    </>
  );

  const chainsSection = hasNoWords ? (
    emptyLibrary
  ) : (
    <>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
        Chuỗi nhớ nối vài từ thành một câu chuyện nguyên nhân → kết quả.
      </p>
      <button
        type="button"
        disabled={isSuggesting || !areChoicesSettled || !practisable.length}
        onClick={() => void suggestChain()}
        className={mainButtonClass}
      >
        {isSuggesting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
        {isSuggesting ? 'Đang tìm từ hợp…' : 'Gợi ý chuỗi cho tôi'}
        {!isSuggesting && prices?.chainWords ? ` (${prices.chainWords} xu)` : ''}
      </button>
      <button type="button" onClick={() => onChangeSection('words')} className={secondButtonClass}>
        Tự chọn từ
      </button>
      <SavedChains onOpen={(chainId) => onOpenChain({ kind: 'saved', chainId })} />
    </>
  );

  const battleSection = (
    <div className={`${sectionClass} flex flex-col items-center text-center`}>
      <span className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center">
        <Swords className="w-7 h-7" />
      </span>
      <p className={titleClass}>Đấu từ vựng trực tiếp với 1–3 bạn bè</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Tạo phòng, vào bằng mã phòng và xem các trận gần đây.
      </p>
      <button type="button" onClick={onOpenBattle} className={mainButtonClass}>
        Vào Battle
      </button>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col animate-fadeIn">
      <div className="shrink-0 px-4 md:px-8 pt-4">
        <h2 className="sr-only">Luyện tập</h2>
        <div className="flex gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-700">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={section === id}
              onClick={() => onChangeSection(id)}
              className={`flex-1 py-2 rounded-full text-sm font-extrabold transition-all ${
                section === id
                  ? 'bg-blue-600 text-white shadow-clay-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-4 space-y-4 ${
          hasActionBar ? '' : 'pb-28'
        }`}
      >
        {section === 'words' ? wordsSection : section === 'chains' ? chainsSection : battleSection}
        {!hasActionBar && errorLine}
      </div>

      {/* One bar for what was chosen; padded to clear the bottom nav. */}
      {hasActionBar && (
        <div className="shrink-0 px-4 md:px-8 pt-2 pb-28 space-y-2 border-t-2 border-blue-200 dark:border-slate-700">
          {errorLine}
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
          ) : chosenCount === 0 ? (
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center">
              Chọn ít nhất 1 từ hoặc 1 bộ để bắt đầu
            </p>
          ) : (
            <>
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={!canStart}
              className={mainButtonClass}
            >
              {isStarting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-white" />
              )}
              Luyện ngay · {chosenCount} từ
            </button>

              {chosenCount <= MAX_CHAIN_WORDS ? (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    onOpenChain({
                      kind: 'new',
                      words: chosen.map((item) => ({
                        userWordId: Number(item.word.id),
                        headword: item.word.word,
                      })),
                    });
                  }}
                  className={secondButtonClass}
                >
                  <Link2 className="w-4 h-4" /> Tạo chuỗi nhớ từ {chosenCount} từ này
                </button>
              ) : (
                <p className="text-xs text-slate-400 text-center">
                  Chuỗi nhớ dùng tối đa {MAX_CHAIN_WORDS} từ.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
