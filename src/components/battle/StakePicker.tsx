'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Check, Dices, Gem, ListFilter, Loader2, Lock, Search, X } from 'lucide-react';
import { ModalPortal } from '@/components/layout/ModalPortal';
import { BattleRequestError } from '@/hooks/useBattle';
import { getUserWordLibrary } from '@/lib/api/word-client';
import { getWordMeanings } from '@/lib/word';
import type { StakePick } from '@/types/battle';
import type { WordMeaning } from '@/types';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, ErrorLine, INPUT, TimeBar } from './BattleChrome';

/** A library word that can be staked: it exists on the backend, with at least one addressable sense. */
interface StakeableWord {
  userWordId: number;
  headword: string;
  ipa: string;
  category: string;
  meanings: (WordMeaning & { definitionId: number })[];
}

interface StakePickerProps {
  /** How many Stakes the Host asked each player for. */
  stakeCount: number;
  /** The picks already locked, to start from when changing them. */
  initial: StakePick[];
  onClose: () => void;
  onLock: (picks: StakePick[]) => Promise<void>;
}

/**
 * Choosing Stakes for a Word Heist: tick words from your own library and, for
 * a word with several meanings, the one definition to play. Reads the cached
 * word library — a word still holding its optimistic `custom_…` id, or a sense
 * with no backend id, has nothing the backend could look up, so it is left out.
 */
export function StakePicker({ stakeCount, initial, onClose, onLock }: StakePickerProps) {
  const [words, setWords] = useState<StakeableWord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // userWordId -> the chosen userWordDefinitionId.
  const [picked, setPicked] = useState<Map<number, number>>(
    () => new Map(initial.map((p) => [p.userWordId, p.userWordDefinitionId])),
  );
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  // Narrows the list to the chosen words, e.g. to check which meaning each one plays.
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUserWordLibrary()
      .then(({ items }) => {
        if (cancelled) return;
        const stakeable: StakeableWord[] = [];
        items.forEach(({ word }) => {
          const userWordId = Number(word.id);
          if (!Number.isInteger(userWordId)) return;
          const meanings = getWordMeanings(word).filter(
            (m): m is WordMeaning & { definitionId: number } => m.definitionId != null,
          );
          if (meanings.length === 0) return;
          stakeable.push({ userWordId, headword: word.word, ipa: word.ipa, category: word.category, meanings });
        });
        setWords(stakeable.sort((a, b) => a.headword.localeCompare(b.headword)));
      })
      .catch(() => !cancelled && setLoadError('Không tải được thư viện từ của bạn.'));
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => Array.from(new Set((words ?? []).map((w) => w.category))).sort(), [words]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (words ?? []).filter(
      (w) =>
        (!onlyPicked || picked.has(w.userWordId)) &&
        (category === 'all' || w.category === category) &&
        (!needle || w.headword.toLowerCase().includes(needle)),
    );
  }, [words, category, search, onlyPicked, picked]);
  const chosenWords = useMemo(() => (words ?? []).filter((w) => picked.has(w.userWordId)), [words, picked]);

  const count = picked.size;
  const full = count >= stakeCount;
  const tooFew = words !== null && words.length < stakeCount;

  function toggle(word: StakeableWord) {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(word.userWordId)) next.delete(word.userWordId);
      else if (next.size < stakeCount) next.set(word.userWordId, word.meanings[0].definitionId);
      return next;
    });
  }

  /** Tops the selection up with random words from the ones currently listed. */
  function fillRandomly() {
    setPicked((prev) => {
      const next = new Map(prev);
      const pool = shown.filter((w) => !next.has(w.userWordId));
      while (next.size < stakeCount && pool.length > 0) {
        const [word] = pool.splice(Math.floor(Math.random() * pool.length), 1);
        next.set(word.userWordId, word.meanings[0].definitionId);
      }
      return next;
    });
  }

  async function lock() {
    setLocking(true);
    setError(null);
    try {
      await onLock([...picked].map(([userWordId, userWordDefinitionId]) => ({ userWordId, userWordDefinitionId })));
      onClose();
    } catch (err) {
      setError(err instanceof BattleRequestError ? err.message : 'Không khoá được từ cược.');
    } finally {
      setLocking(false);
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden bg-white dark:bg-slate-800 rounded-[32px] shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 animate-scaleUp">
          <div className="px-5 pt-5 pb-4 border-b-2 border-blue-100 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-slate-900 dark:text-slate-100">
                <Gem className="w-5 h-5 text-blue-600" aria-hidden />
                Chọn từ cược
              </h3>
              <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chọn {stakeCount} từ trong thư viện, mỗi từ một nghĩa. Mọi người trong phòng sẽ thấy chúng ở giai đoạn ôn tập.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <TimeBar fraction={Math.min(count, stakeCount) / stakeCount} />
              </div>
              <span
                aria-live="polite"
                className={clsx('shrink-0 font-display text-lg font-extrabold tabular-nums', full ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100')}
              >
                {count}/{stakeCount}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 px-5 py-3 border-b-2 border-blue-100 dark:border-slate-700">
            <div className="relative min-w-40 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm từ của bạn"
                aria-label="Tìm từ của bạn"
                className={`${INPUT} pl-9 py-2 text-sm`}
              />
            </div>
            {categories.length > 1 && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Bộ từ vựng"
                className={`${INPUT} w-auto py-2 text-sm`}
              >
                <option value="all">Tất cả bộ từ</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className={`${BTN_SECONDARY} px-3 py-2`} onClick={fillRandomly} disabled={full || shown.length === 0}>
              <Dices className="w-4 h-4" aria-hidden />
              Chọn ngẫu nhiên
            </button>
          </div>

          {chosenWords.length > 0 && (
            <div className="space-y-2 px-5 py-3 border-b-2 border-blue-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Đã chọn</p>
                <button
                  type="button"
                  aria-pressed={onlyPicked}
                  onClick={() => setOnlyPicked((on) => !on)}
                  className={clsx(
                    'inline-flex h-8 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-bold',
                    onlyPicked
                      ? 'border-blue-400 bg-blue-600 text-white'
                      : 'border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500',
                  )}
                >
                  <ListFilter className="w-3.5 h-3.5" aria-hidden />
                  Chỉ hiện các từ này
                </button>
                <button type="button" onClick={() => setPicked(new Map())} className="h-8 px-2.5 text-xs font-bold text-slate-400 hover:text-red-500">
                  Bỏ chọn hết
                </button>
              </div>
              <ul className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto" aria-label="Từ cược đã chọn">
                {chosenWords.map((word) => (
                  <li key={word.userWordId}>
                    <button
                      type="button"
                      onClick={() => toggle(word)}
                      aria-label={`Bỏ ${word.headword}`}
                      className="group inline-flex max-w-full items-center gap-1 rounded-full border-2 border-blue-400 bg-blue-50 dark:bg-blue-950/40 py-1 pl-3 pr-2 text-sm font-bold text-slate-800 dark:text-slate-100 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <span className="truncate">{word.headword}</span>
                      <X className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-red-500" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="min-h-40 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
            {loadError ? (
              <ErrorLine className="py-6">{loadError}</ErrorLine>
            ) : words === null ? (
              <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Đang tải thư viện từ…
              </p>
            ) : tooFew ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Thư viện của bạn có {words.length} từ đã đồng bộ. Word Heist cần ít nhất {stakeCount} — hãy thêm từ, hoặc nhờ chủ
                phòng đổi chế độ khác.
              </p>
            ) : shown.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Không có từ nào khớp.</p>
            ) : (
              <ul className="space-y-2">
                {shown.map((word) => {
                  const chosen = picked.get(word.userWordId);
                  const on = chosen !== undefined;
                  const blocked = !on && full;
                  const shownMeaning = word.meanings.find((m) => m.definitionId === chosen) ?? word.meanings[0];
                  return (
                    <li
                      key={word.userWordId}
                      className={clsx(
                        'rounded-2xl border-2 transition-colors',
                        on ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40' : 'border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800',
                        blocked && 'opacity-50',
                      )}
                    >
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={blocked}
                        onClick={() => toggle(word)}
                        className="flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left disabled:cursor-default"
                      >
                        <span
                          aria-hidden
                          className={clsx(
                            'mt-0.5 w-6 h-6 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors',
                            on ? 'border-blue-400 bg-blue-600 text-white' : 'border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800',
                          )}
                        >
                          {on && <Check className="w-4 h-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="break-words font-display text-base font-extrabold text-slate-900 dark:text-slate-100">{word.headword}</span>
                            {word.ipa && <span className="text-xs font-mono text-slate-400">{word.ipa}</span>}
                            {word.meanings.length > 1 && (
                              <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-300">
                                {word.meanings.length} nghĩa
                              </span>
                            )}
                          </span>
                          {(!on || word.meanings.length === 1) && (
                            <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{shownMeaning.definition}</span>
                          )}
                        </span>
                      </button>
                      {on && word.meanings.length > 1 && (
                        <fieldset className="space-y-1.5 px-3 pb-3 pl-12">
                          <legend className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Chọn nghĩa nào?</legend>
                          {word.meanings.map((m) => (
                            <label
                              key={m.definitionId}
                              className={clsx(
                                'flex cursor-pointer items-start gap-2 rounded-xl border-2 px-2.5 py-2 text-sm',
                                m.definitionId === chosen
                                  ? 'border-blue-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800',
                              )}
                            >
                              <input
                                type="radio"
                                name={`stake-${word.userWordId}`}
                                checked={m.definitionId === chosen}
                                onChange={() => setPicked((prev) => new Map(prev).set(word.userWordId, m.definitionId))}
                                className="mt-1 accent-blue-600"
                              />
                              <span className="min-w-0">
                                {m.pos && <span className="mr-1.5 text-xs font-bold text-slate-400">{m.pos}</span>}
                                {m.definition}
                              </span>
                            </label>
                          ))}
                        </fieldset>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 px-5 py-3 border-t-2 border-blue-100 dark:border-slate-700">
            {error && <ErrorLine className="mr-auto">{error}</ErrorLine>}
            <button type="button" className={BTN_GHOST} onClick={onClose}>
              Huỷ
            </button>
            <button type="button" className={`${BTN_PRIMARY} px-5 py-2.5`} disabled={count !== stakeCount || locking} onClick={() => void lock()}>
              {locking ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Lock className="w-4 h-4" aria-hidden />}
              {count === stakeCount ? 'Khoá từ cược' : `Chọn thêm ${stakeCount - count} từ`}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
