'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Pencil,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { SRSState, Word } from '@/types';
import { ModalPortal } from '../layout/ModalPortal';
import { SRS_STATE_LABELS } from '@/lib/wordExcel';
import { getWordMeanings } from '@/lib/word';
import { ApiError } from '@/lib/api/client';
import {
  deleteUserWord,
  deleteWordDefinition,
  expandPos,
  updateWordDefinition,
} from '@/lib/api/word-client';
import { speakWord, soundFX } from '@/lib/audio';

interface WordDetailModalProps {
  word: Word;
  /** SRS status, only when the list row reported the account's progress. */
  state?: SRSState;
  /** Next review date, only when the row reported it. */
  dueAt?: string;
  isFavorite?: boolean;
  /** Where this word sits in the list it was opened from (0-based index). */
  position?: { index: number; total: number };
  /** Opens the previous word of the list; absent on the first one. */
  onPrev?: () => void;
  /** Opens the next word of the list; absent on the last one. */
  onNext?: () => void;
  /**
   * A sense was edited or deleted — the word as it now stands. The parent owns
   * the copy this modal renders, so it re-renders with the new senses.
   */
  onWordUpdated?: (word: Word) => void;
  /** The whole word was deleted; the modal closes itself right after. */
  onWordDeleted?: (wordId: string) => void;
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

/** View, the edit form for the current sense, or the delete confirmation. */
type DetailMode = 'view' | 'edit' | 'delete';

const FIELD_CLASS =
  'w-full px-3 py-2 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-clay-inset text-slate-900 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60';

/** The prev/next word buttons: over the card's edge on a phone, beside it on md+. */
const WORD_ARROW_CLASS =
  'absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm hover:bg-blue-50 dark:hover:bg-slate-700 active:scale-95 transition-all ease-clay disabled:opacity-30 disabled:pointer-events-none';

const LABEL_CLASS =
  'block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-1';

/**
 * A word the backend has never answered for carries the optimistic `custom_…`
 * id `AddWordModal` gave it, so there is nothing on the server to address.
 */
function isSyncedWord(word: Word): boolean {
  return /^\d+$/.test(word.id);
}

/**
 * A rejection names its own reason; a network failure only carries the
 * browser's English "Failed to fetch", so that one gets the Vietnamese wording.
 */
function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && !err.isNetworkError && err.message) {
    return err.message;
  }
  return fallback;
}

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
 * Detail view for one word of the library, laid out like the flashcard it will
 * be reviewed on: the headword and its pronunciation on top, then the senses
 * paged one at a time below. Unlike the card there is nothing to flip and
 * nothing to rate — and every example of the current sense is listed, not just
 * the primary one.
 *
 * It is also where a word is maintained: the current sense can be rewritten
 * (`PATCH /words/:id/definitions/:definitionId`) or removed
 * (`DELETE` on the same path), and the whole word deleted (`DELETE /words/:id`).
 * Each of those needs the backend's definition id, which only a sense that came
 * from the backend carries — so a word still waiting to sync can be dropped from
 * this device but not edited.
 */
export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  state,
  dueAt,
  isFavorite,
  position,
  onPrev,
  onNext,
  onWordUpdated,
  onWordDeleted,
  onClose,
}) => {
  const [meaningIndex, setMeaningIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [wordDirection, setWordDirection] = useState(0);
  const [mode, setMode] = useState<DetailMode>('view');
  const [form, setForm] = useState({ definition: '', pos: '', example: '' });
  // True while a request is open — the panel stays up, its buttons locked, so a
  // second click cannot send the same deletion twice.
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  // Set when a touch starts over the senses, which page before the word does.
  const swipeInMeaningsRef = useRef(false);

  // Stepping to another word starts it on its first sense, in the plain view —
  // reset during render so the new word never paints with the old one's state.
  const [shownWordId, setShownWordId] = useState(word.id);
  if (shownWordId !== word.id) {
    setShownWordId(word.id);
    setMeaningIndex(0);
    setSlideDirection(1);
    setMode('view');
    setError(null);
  }

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

  const isSynced = isSyncedWord(word);
  const definitionId = currentMeaning?.definitionId;
  // Both sense-level actions address `/words/:id/definitions/:definitionId`.
  const canEditMeaning = isSynced && definitionId !== undefined;
  // The last sense is not deletable on its own: a word with no meaning left is
  // not a word, so that case is the whole-word delete instead.
  const canDeleteMeaning = canEditMeaning && hasManyMeanings;

  // Only the plain view moves to another word — a form or a confirmation
  // belongs to the word it was opened on.
  const canStepWord = mode === 'view' && !isBusy;

  const goToWord = (direction: 1 | -1) => {
    const step = direction > 0 ? onNext : onPrev;
    if (!canStepWord || !step) return;
    soundFX.playPop();
    setWordDirection(direction);
    step();
  };

  // Escape steps back out of a form or a confirmation before it closes the
  // modal, so it cannot discard an edit in one keystroke. The arrow keys page
  // between words, the same as the side buttons.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') return goToWord(-1);
      if (event.key === 'ArrowRight') return goToWord(1);
      if (event.key !== 'Escape') return;
      if (isBusy) return;
      if (mode === 'view') onClose();
      else {
        setMode('view');
        setError(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const goToMeaning = (nextIndex: number, direction: number) => {
    if (mode !== 'view') return;
    if (nextIndex < 0 || nextIndex >= meanings.length || nextIndex === safeMeaningIndex)
      return;
    soundFX.playPop();
    setSlideDirection(direction);
    setMeaningIndex(nextIndex);
  };

  const handleMeaningsTouchStart = () => {
    swipeInMeaningsRef.current = true;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  /**
   * A swipe over the senses pages them first; once there is no sense left in
   * that direction — or anywhere else on the card — it moves to the next word.
   */
  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = swipeStartXRef.current;
    const inMeanings = swipeInMeaningsRef.current;
    swipeStartXRef.current = null;
    swipeInMeaningsRef.current = false;
    if (startX === null || mode !== 'view') return;

    const deltaX = (e.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

    const direction = deltaX < 0 ? 1 : -1;
    const nextMeaning = safeMeaningIndex + direction;
    if (inMeanings && nextMeaning >= 0 && nextMeaning < meanings.length) {
      goToMeaning(nextMeaning, direction);
    } else {
      goToWord(direction);
    }
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

  /** Opens the form on the sense currently on screen, filled with its text. */
  const startEdit = () => {
    if (!canEditMeaning || !currentMeaning) return;
    soundFX.playPop();
    setForm({
      definition: currentMeaning.definition,
      pos: currentMeaning.pos,
      example: currentMeaning.example,
    });
    setError(null);
    setMode('edit');
  };

  const startDelete = () => {
    soundFX.playPop();
    setError(null);
    setMode('delete');
  };

  const backToView = () => {
    if (isBusy) return;
    soundFX.playPop();
    setError(null);
    setMode('view');
  };

  const handleSaveEdit = async () => {
    if (definitionId === undefined) return;

    const definition = form.definition.trim();
    if (!definition) {
      setError('Nghĩa của từ không được để trống.');
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const updated = await updateWordDefinition(word, definitionId, {
        definition,
        // Written back in the backend's own spelling, not the app's `n.`/`v.`.
        partOfSpeech: expandPos(form.pos),
        example: form.example.trim(),
      });
      soundFX.playCorrect();
      onWordUpdated?.(updated);
      setMode('view');
    } catch (err) {
      console.error('API updateWordDefinition error:', err);
      setError(
        describeError(err, 'Không lưu được thay đổi — kiểm tra kết nối rồi thử lại nhé.'),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteMeaning = async () => {
    if (definitionId === undefined) return;

    setIsBusy(true);
    setError(null);
    try {
      const updated = await deleteWordDefinition(word, definitionId);
      soundFX.playPop();
      onWordUpdated?.(updated);
      // The sense that took this one's place is the one to land on; deleting
      // the last sense steps back rather than paging past the end.
      setMeaningIndex(Math.min(safeMeaningIndex, meanings.length - 2));
      setMode('view');
    } catch (err) {
      console.error('API deleteWordDefinition error:', err);
      setError(
        describeError(err, 'Không xoá được nghĩa này — kiểm tra kết nối rồi thử lại nhé.'),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteWord = async () => {
    setIsBusy(true);
    setError(null);
    try {
      // A word that never reached the backend exists only on this device, so
      // there is nothing to ask it to delete.
      if (isSynced) await deleteUserWord(word.id);
      soundFX.playPop();
      onWordDeleted?.(word.id);
      onClose();
    } catch (err) {
      console.error('API deleteUserWord error:', err);
      setError(
        describeError(err, 'Không xoá được từ này — kiểm tra kết nối rồi thử lại nhé.'),
      );
      setIsBusy(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 md:p-4"
        // Only a plain reading session closes on the backdrop — a click outside
        // must not throw away a half-typed edit.
        onClick={mode === 'view' ? onClose : undefined}
      >
        <div
          className="relative w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {(onPrev || onNext) && (
            <>
              <button
                onClick={() => goToWord(-1)}
                disabled={!onPrev || !canStepWord}
                aria-label="Từ trước"
                className={`${WORD_ARROW_CLASS} -left-2 md:-left-16`}
              >
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              </button>
              <button
                onClick={() => goToWord(1)}
                disabled={!onNext || !canStepWord}
                aria-label="Từ tiếp theo"
                className={`${WORD_ARROW_CLASS} -right-2 md:-right-16`}
              >
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </button>
            </>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
            aria-label={`Chi tiết từ ${word.word}`}
            className="w-full bg-white dark:bg-slate-800 rounded-[32px] p-5 md:p-6 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 max-h-[92dvh] overflow-y-auto overflow-x-hidden overscroll-contain"
          >
            <motion.div
              key={word.id}
              initial={wordDirection === 0 ? false : { x: wordDirection * 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Header — status on the left, actions on the right */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-1.5 min-w-0">
                  {position && position.total > 1 && (
                    <span className="text-[11px] font-extrabold text-slate-400 whitespace-nowrap">
                      {position.index + 1}/{position.total}
                    </span>
                  )}
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
                    onClick={startEdit}
                    disabled={!canEditMeaning || isBusy || mode !== 'view'}
                    aria-label="Sửa nghĩa đang xem"
                    title={
                      canEditMeaning
                        ? 'Sửa nghĩa đang xem'
                        : 'Từ này chưa đồng bộ với máy chủ nên chưa sửa được'
                    }
                    className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 disabled:opacity-40 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={startDelete}
                    disabled={isBusy || mode !== 'view'}
                    aria-label="Xoá từ"
                    title="Xoá"
                    className="p-1.5 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 disabled:opacity-40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onClose}
                    disabled={isBusy}
                    aria-label="Đóng"
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-40"
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

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl px-3 py-2 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/25">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700 dark:text-red-300 leading-snug">
                    {error}
                  </p>
                </div>
              )}

              {mode === 'edit' ? (
                /* Edit — the sense on screen, field by field */
                <div className="pt-4 space-y-3">
                  <p className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                    Sửa nghĩa {safeMeaningIndex + 1}/{meanings.length}
                  </p>

                  <div>
                    <label className={LABEL_CLASS} htmlFor="word-definition">
                      Nghĩa *
                    </label>
                    <textarea
                      id="word-definition"
                      rows={2}
                      value={form.definition}
                      disabled={isBusy}
                      onChange={(e) => setForm((f) => ({ ...f, definition: e.target.value }))}
                      placeholder="Nghĩa của từ"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS} htmlFor="word-pos">
                      Loại từ
                    </label>
                    <input
                      id="word-pos"
                      type="text"
                      value={form.pos}
                      disabled={isBusy}
                      onChange={(e) => setForm((f) => ({ ...f, pos: e.target.value }))}
                      placeholder="n., v., adj.…"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS} htmlFor="word-example">
                      Ví dụ
                    </label>
                    <textarea
                      id="word-example"
                      rows={2}
                      value={form.example}
                      disabled={isBusy}
                      onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
                      placeholder="Câu ví dụ tiếng Anh"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSaveEdit}
                      disabled={isBusy}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-button bg-blue-600 text-white font-bold text-xs border-2 border-blue-400 shadow-clay-sm active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Lưu thay đổi
                    </button>
                    <button
                      onClick={backToView}
                      disabled={isBusy}
                      className="px-3 py-2.5 rounded-button bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs border-2 border-slate-200 dark:border-slate-600 transition-all disabled:opacity-40"
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              ) : mode === 'delete' ? (
                /* Delete — one sense, or the whole word */
                <div className="pt-4">
                  <div className="rounded-2xl border-clay border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 space-y-2.5">
                    <p className="text-xs font-extrabold text-red-700 dark:text-red-300">
                      Xoá “{word.word}”?
                    </p>
                    <p className="text-[11px] text-red-600 dark:text-red-300/80 leading-snug">
                      {canDeleteMeaning
                        ? 'Bạn có thể xoá riêng nghĩa đang xem, hoặc xoá cả từ cùng toàn bộ tiến độ ôn tập. Thao tác này không thể hoàn tác.'
                        : 'Cả từ và toàn bộ tiến độ ôn tập sẽ bị xoá. Thao tác này không thể hoàn tác.'}
                    </p>

                    <div className="space-y-2 pt-0.5">
                      {canDeleteMeaning && (
                        <button
                          onClick={handleDeleteMeaning}
                          disabled={isBusy}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-button bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 font-bold text-xs border-2 border-red-200 dark:border-red-500/30 active:scale-[0.98] transition-all disabled:opacity-60"
                        >
                          {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Chỉ xoá nghĩa {safeMeaningIndex + 1}
                        </button>
                      )}

                      <button
                        onClick={handleDeleteWord}
                        disabled={isBusy}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-button bg-red-600 text-white font-bold text-xs border-2 border-red-400 shadow-clay-sm active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Xoá cả từ
                      </button>

                      <button
                        onClick={backToView}
                        disabled={isBusy}
                        className="w-full px-3 py-2.5 rounded-button bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs border-2 border-slate-200 dark:border-slate-600 transition-all disabled:opacity-40"
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Meanings — the back of the flashcard, paged one sense at a time */
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

                  <div className="py-3" onTouchStart={handleMeaningsTouchStart}>
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
                              {currentMeaning?.definition || "—"}
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
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </ModalPortal>
  );
};
