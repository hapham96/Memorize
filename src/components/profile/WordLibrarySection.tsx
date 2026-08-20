'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { SRSData, SRSState, UserWordListItem, Word } from '@/types';
import {
  WORDS_PAGE_SIZE,
  getUserWordLibrary,
  readCachedUserWordLibrary,
} from '@/lib/api/word-client';
import { SRS_STATE_LABELS, exportWordsToExcel } from '@/lib/wordExcel';
import { soundFX } from '@/lib/audio';
import { WordDetailModal } from './WordDetailModal';

interface WordLibrarySectionProps {
  /**
   * The account's locally stored words. Three jobs: they fill the fields the
   * backend has no column for, they are the list shown when `GET /words` does
   * not answer, and their count is what tells this section a word was added.
   */
  allWords: Word[];
  /** Supplies status and due date for rows the backend did not report them for. */
  srsMap: Record<string, SRSData>;
}

const STATE_STYLES: Record<SRSState, string> = {
  new: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
  learning: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  review: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  mastered: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
};

/** Rows built from what this device holds, for when `GET /words` does not answer. */
function localRows(words: Word[], srsMap: Record<string, SRSData>): UserWordListItem[] {
  return words.map((word) => ({
    word,
    state: srsMap[word.id]?.state,
    dueAt: srsMap[word.id]?.nextReviewDate,
  }));
}

/**
 * Prepends any local word the fetched library does not list.
 *
 * A word added while the backend was unreachable is only on this device, so the
 * cached library has never heard of it — without this the row the user just
 * created would silently be missing. Newest first, since that is what a
 * just-added word is.
 */
function withLocalOnly(
  items: UserWordListItem[],
  words: Word[],
  srsMap: Record<string, SRSData>,
): UserWordListItem[] {
  const known = new Set(items.map((item) => String(item.word.id)));
  const missing = words.filter((word) => !known.has(String(word.id)));
  if (missing.length === 0) return items;
  return [...localRows(missing, srsMap), ...items];
}

/** `HH:MM` of the moment the cached copy was read. */
function formatFetchedAt(timestamp: number): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export const WordLibrarySection: React.FC<WordLibrarySectionProps> = ({
  allWords,
  srsMap,
}) => {
  const [page, setPage] = useState(1);
  // The whole library, paged locally below — one read covers every page.
  const [items, setItems] = useState<UserWordListItem[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [isFromCache, setIsFromCache] = useState(false);
  // True until the mount effect has read the cache, so the first paint is
  // skeleton rows rather than a flash of the empty-library state.
  const [isLoading, setIsLoading] = useState(true);
  // Set when `GET /words` did not answer, so the list below is the local copy.
  const [isOffline, setIsOffline] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // The row whose detail modal is open — a snapshot, so a background refresh
  // cannot swap the word under the reader.
  const [selected, setSelected] = useState<UserWordListItem | null>(null);
  // Only the newest read may write state; a refresh started while one is still
  // open would otherwise be overtaken by the slower answer.
  const requestRef = useRef(0);
  // Read through refs so a re-render with a new `allWords`/`srsMap` identity does
  // not re-run the load effect — the library is fetched once, not per render.
  const localRef = useRef({ allWords, srsMap });
  localRef.current = { allWords, srsMap };

  const loadLibrary = useCallback(async (force: boolean) => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestRef.current === requestId;
    const { allWords: words, srsMap: srs } = localRef.current;

    // A cache hit costs nothing, so it is applied straight away — no loading
    // state, no spinner flash on a tab that already has its data.
    if (!force) {
      const cached = readCachedUserWordLibrary();
      if (cached) {
        setItems(withLocalOnly(cached.items, words, srs));
        setFetchedAt(cached.fetchedAt);
        setIsFromCache(true);
        setIsOffline(false);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      const library = await getUserWordLibrary({ force, fallbacks: words });
      if (!isCurrent()) return;
      setItems(withLocalOnly(library.items, words, srs));
      setFetchedAt(library.fetchedAt);
      setIsFromCache(library.fromCache);
      setIsOffline(false);
    } catch (err) {
      // Same contract as every other read here: the screen still renders, from
      // whatever this device already holds.
      console.warn('Could not fetch words from API, using local library:', err);
      if (!isCurrent()) return;
      setItems(localRows(words, srs));
      setFetchedAt(0);
      setIsFromCache(false);
      setIsOffline(true);
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, []);

  // Runs on mount and again when the account's word count changes — i.e. after a
  // word is added, which is also when `addWord` drops the cache, so that run is
  // the one that actually goes to the network. Every other visit is a cache hit.
  useEffect(() => {
    void loadLibrary(false);
  }, [allWords.length, loadLibrary]);

  const total = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / WORDS_PAGE_SIZE));

  // A page can fall past the end after the library shrinks; step back rather
  // than showing an empty list under a "trang 4 / 2" label.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rows = useMemo(
    () => (items ?? []).slice((page - 1) * WORDS_PAGE_SIZE, page * WORDS_PAGE_SIZE),
    [items, page],
  );
  const rangeStart = rows.length === 0 ? 0 : (page - 1) * WORDS_PAGE_SIZE + 1;
  const rangeEnd = rangeStart === 0 ? 0 : rangeStart + rows.length - 1;
  const cacheLabel = isFromCache ? formatFetchedAt(fetchedAt) : null;

  /**
   * Synchronous: the whole library is already in state, so the export builds the
   * sheet from what is on screen instead of paging the endpoint again.
   */
  const handleExport = () => {
    soundFX.playPop();
    setExportError(null);
    try {
      const exportItems =
        items ?? localRows(localRef.current.allWords, localRef.current.srsMap);

      if (exportItems.length === 0) {
        setExportError('Chưa có từ nào để xuất.');
        return;
      }

      exportWordsToExcel(exportItems);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Không xuất được file Excel.');
    }
  };

  const handleRefresh = () => {
    if (isLoading) return;
    soundFX.playPop();
    void loadLibrary(true);
  };

  const openDetail = (item: UserWordListItem) => {
    soundFX.playPop();
    setSelected(item);
  };

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    soundFX.playPop();
    setPage(next);
  };

  const isFirstLoad = items === null && isLoading;
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-card p-5 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm">
      {/* Section header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-display font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">Từ vựng của bạn</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            {isLoading && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
            {isLoading
              ? 'Đang tải danh sách từ…'
              : rows.length === 0
                ? 'Chưa có từ nào trong thư viện'
                : `${total} từ · đang xem ${rangeStart}–${rangeEnd}`}
          </p>
          {/* Says out loud that nothing was requested, and offers the way to. */}
          {!isLoading && cacheLabel && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              Dữ liệu đã lưu · cập nhật {cacheLabel}
            </p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Tải lại danh sách từ"
            title="Tải lại từ máy chủ"
            className="p-2 rounded-button bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-button bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] border-2 border-emerald-500/25 transition-all disabled:opacity-60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isOffline && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/25">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
            Không kết nối được máy chủ — đang hiển thị dữ liệu lưu trên thiết bị này.
          </p>
        </div>
      )}

      {exportError && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl px-3 py-2 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/25">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 dark:text-red-300 leading-snug">{exportError}</p>
        </div>
      )}

      {/* Rows */}
      {isFirstLoad ? (
        <div className="clay-well px-4 py-10 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Đang tải từ vựng…
          </p>
        </div>
      ) : isEmpty ? (
        <div className="clay-well px-4 py-8 text-center">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Thư viện của bạn còn trống
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Thêm từ mới ở tab Học để chúng xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="relative" aria-busy={isLoading}>
          {/* A refresh keeps the previous rows in place, dimmed under a spinner,
              rather than emptying the section while it waits. */}
          <div
            className={`space-y-2 transition-opacity ${
              isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'
            }`}
          >
            {rows.map((item, index) => (
              <motion.button
                type="button"
                key={`${item.word.id}-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: index * 0.02 }}
                onClick={() => openDetail(item)}
                aria-label={`Xem chi tiết từ ${item.word.word}`}
                className="w-full text-left flex items-center gap-3 p-2.5 rounded-2xl border-clay border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:border-blue-300 dark:hover:border-blue-500/40 active:scale-[0.99] transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {item.word.word}
                    </span>
                    {item.word.pos && (
                      <span className="text-[10px] italic text-slate-400">{item.word.pos}</span>
                    )}
                    <span className="text-[10px] text-slate-400 truncate">{item.word.ipa}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                    {item.word.vietnamese || item.word.definition || '—'}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {item.word.level}
                  </span>
                  {item.state && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATE_STYLES[item.state]}`}
                    >
                      {SRS_STATE_LABELS[item.state]}
                    </span>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600" />
              </motion.button>
            ))}
          </div>

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                Đang tải…
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || isLoading}
            className="flex items-center gap-1 px-3 py-2 rounded-button bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] border-2 border-slate-200 dark:border-slate-600 transition-all disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Trước</span>
          </button>

          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
            Trang {page} / {totalPages}
          </span>

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="flex items-center gap-1 px-3 py-2 rounded-button bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] border-2 border-slate-200 dark:border-slate-600 transition-all disabled:opacity-40"
          >
            <span>Sau</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selected && (
        <WordDetailModal
          word={selected.word}
          state={selected.state}
          dueAt={selected.dueAt}
          isFavorite={selected.isFavorite}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};
