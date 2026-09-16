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
  Search,
  X,
} from 'lucide-react';
import { SRSData, SRSState, UserWordListItem, VocabularySet, Word } from '@/types';
import {
  WORDS_PAGE_SIZE,
  getUserWordLibrary,
  readCachedUserWordLibrary,
  searchUserWords,
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
  /** The account's `/vocabulary-sets` list; resolves each word's category name. */
  vocabularySets?: VocabularySet[];
  /**
   * A word was edited in the detail modal. The row here is updated on the spot;
   * this is what lets the copy `page.tsx` owns follow.
   */
  onWordUpdated?: (word: Word) => void;
  /** A word was deleted — it has already left this list and the cached library. */
  onWordDeleted?: (wordId: string) => void;
}

const STATE_STYLES: Record<SRSState, string> = {
  new: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
  learning: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  review: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  mastered: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
};

/** The status filter's options, in the order the SRS ladder runs. */
const STATUS_FILTERS: Array<{ value: SRSState | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'new', label: SRS_STATE_LABELS.new },
  { value: 'learning', label: SRS_STATE_LABELS.learning },
  { value: 'review', label: SRS_STATE_LABELS.review },
  { value: 'mastered', label: SRS_STATE_LABELS.mastered },
];

/** How long typing settles before the term is sent to `GET /words?search=`. */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * A row's status for filtering purposes.
 *
 * A word the backend has never scheduled — a local-only one, or a row that
 * reported no status — is new, not stateless: it has to land under some chip or
 * "Tất cả" would count more words than the four chips together.
 */
function filterState(item: UserWordListItem): SRSState {
  return item.state ?? 'new';
}

/**
 * Whether a locally stored word looks like a match for `term`.
 *
 * Only used for words the backend has never seen (see `withLocalOnly`) — the
 * server decides what matches for everything else, and this must not second-
 * guess it.
 */
function matchesLocally(word: Word, term: string): boolean {
  const needle = term.toLowerCase();
  return [word.word, word.definition, word.pos].some((field) =>
    field?.toLowerCase().includes(needle),
  );
}

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
  vocabularySets = [],
  onWordUpdated,
  onWordDeleted,
}) => {
  const [page, setPage] = useState(1);
  // What is typed in the box, updated on every keystroke.
  const [query, setQuery] = useState('');
  // The settled term — what `GET /words?search=` is actually asked for.
  const [activeQuery, setActiveQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SRSState | 'all'>('all');
  // The current result set — the whole library, or the whole match set for
  // `activeQuery`. Either way it is paged locally below.
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
  const localRef = useRef({ allWords, srsMap, vocabularySets });
  localRef.current = { allWords, srsMap, vocabularySets };

  /**
   * Loads the rows for `search` — the whole library when it is empty.
   *
   * A search always goes to the backend: it is the endpoint's own `search`
   * param that decides what matches, and the answer is not cached. Only the
   * unsearched library is read from localStorage.
   */
  const loadLibrary = useCallback(async (search: string, force: boolean) => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestRef.current === requestId;
    const { allWords: words, srsMap: srs, vocabularySets: sets } = localRef.current;

    if (search) {
      setIsLoading(true);
      try {
        const found = await searchUserWords(search, { fallbacks: words, vocabularySets: sets });
        if (!isCurrent()) return;
        // A word added while the backend was unreachable is only on this
        // device, so no server search can return it — matched here instead.
        const localMatches = words.filter((word) => matchesLocally(word, search));
        setItems(withLocalOnly(found, localMatches, srs));
        setFetchedAt(0);
        setIsFromCache(false);
        setIsOffline(false);
      } catch (err) {
        // Same contract as the library read: the screen still answers, from
        // whatever this device holds — matched locally, since the backend that
        // would have decided is the one that did not answer.
        console.warn('Could not search words on API, filtering local library:', err);
        if (!isCurrent()) return;
        const cached = readCachedUserWordLibrary();
        const base = cached
          ? withLocalOnly(cached.items, words, srs)
          : localRows(words, srs);
        setItems(base.filter((item) => matchesLocally(item.word, search)));
        setFetchedAt(0);
        setIsFromCache(false);
        setIsOffline(true);
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
      return;
    }

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
      const library = await getUserWordLibrary({ force, fallbacks: words, vocabularySets: sets });
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

  // Typing settles before it costs a request — one search per pause, not one
  // per keystroke.
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery === activeQuery) return;
    const timer = setTimeout(() => setActiveQuery(trimmedQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, activeQuery]);

  // Runs on mount, when the settled search term changes, and again when the
  // account's word count changes — i.e. after a word is added, which is also
  // when `addWord` drops the cache, so that run is the one that actually goes
  // to the network. Every other unsearched visit is a cache hit.
  useEffect(() => {
    void loadLibrary(activeQuery, false);
  }, [activeQuery, allWords.length, loadLibrary]);

  // A result set the reader did not ask for should not open on page 4.
  useEffect(() => {
    setPage(1);
  }, [activeQuery, statusFilter]);

  /** The rows actually listed — the result set narrowed by the status chip. */
  const filtered = useMemo(() => {
    const source = items ?? [];
    if (statusFilter === 'all') return source;
    return source.filter((item) => filterState(item) === statusFilter);
  }, [items, statusFilter]);

  /** How many rows each chip would leave, counted over the current result set. */
  const statusCounts = useMemo(() => {
    const counts: Record<SRSState, number> = { new: 0, learning: 0, review: 0, mastered: 0 };
    (items ?? []).forEach((item) => {
      counts[filterState(item)] += 1;
    });
    return counts;
  }, [items]);

  const isFiltering = activeQuery !== '' || statusFilter !== 'all';
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / WORDS_PAGE_SIZE));

  // A page can fall past the end after the library shrinks; step back rather
  // than showing an empty list under a "trang 4 / 2" label.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rows = useMemo(
    () => filtered.slice((page - 1) * WORDS_PAGE_SIZE, page * WORDS_PAGE_SIZE),
    [filtered, page],
  );
  const rangeStart = rows.length === 0 ? 0 : (page - 1) * WORDS_PAGE_SIZE + 1;
  const rangeEnd = rangeStart === 0 ? 0 : rangeStart + rows.length - 1;
  const cacheLabel = isFromCache ? formatFetchedAt(fetchedAt) : null;

  /**
   * Synchronous: the result set is already in state, so the export builds the
   * sheet from what is on screen instead of paging the endpoint again — which
   * also means an active search or status chip narrows the file to exactly the
   * rows the reader is looking at.
   */
  const handleExport = () => {
    soundFX.playPop();
    setExportError(null);
    try {
      const exportItems =
        items === null
          ? localRows(localRef.current.allWords, localRef.current.srsMap)
          : filtered;

      if (exportItems.length === 0) {
        setExportError(
          isFiltering ? 'Không có từ nào khớp bộ lọc để xuất.' : 'Chưa có từ nào để xuất.',
        );
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
    void loadLibrary(activeQuery, true);
  };

  /** Back to the whole library — clears the term and the status chip together. */
  const handleClearFilters = () => {
    soundFX.playPop();
    setQuery('');
    setActiveQuery('');
    setStatusFilter('all');
  };

  const handleClearQuery = () => {
    soundFX.playPop();
    setQuery('');
    setActiveQuery('');
  };

  const openDetail = (item: UserWordListItem) => {
    soundFX.playPop();
    setSelected(item);
  };

  /**
   * Folds an edited word back into the result set and into the open modal, so
   * neither shows the sense that was just rewritten. The cached library was
   * already patched by the client that sent the request — nothing is refetched.
   */
  const handleWordUpdated = (updated: Word) => {
    const targetId = String(updated.id);
    setItems((prev) =>
      prev === null
        ? prev
        : prev.map((item) =>
            String(item.word.id) === targetId ? { ...item, word: updated } : item,
          ),
    );
    setSelected((prev) => (prev ? { ...prev, word: updated } : prev));
    onWordUpdated?.(updated);
  };

  /** Drops a deleted word's row; the modal closes itself. */
  const handleWordDeleted = (wordId: string) => {
    const targetId = String(wordId);
    setItems((prev) =>
      prev === null ? prev : prev.filter((item) => String(item.word.id) !== targetId),
    );
    setSelected(null);
    onWordDeleted?.(targetId);
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
              ? activeQuery
                ? 'Đang tìm từ…'
                : 'Đang tải danh sách từ…'
              : rows.length === 0
                ? isFiltering
                  ? 'Không có từ nào khớp'
                  : 'Chưa có từ nào trong thư viện'
                : `${total} ${isFiltering ? 'kết quả' : 'từ'} · đang xem ${rangeStart}–${rangeEnd}`}
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

      {/* Search — the term goes to `GET /words?search=`, debounced. */}
      <div className="relative mb-2.5">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        {/* Not `type="search"`: WebKit draws its own clear button, which would
            sit next to the one below. */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Enter searches now instead of waiting out the debounce.
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setActiveQuery(query.trim());
            }
          }}
          placeholder="Tìm từ vựng…"
          aria-label="Tìm từ vựng"
          className="w-full pl-8 pr-8 py-2 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-clay-inset text-slate-900 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={handleClearQuery}
            aria-label="Xóa từ khóa tìm kiếm"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status filter — applied to the rows in hand, not a second request:
          `GET /words` has no status parameter. */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
        {STATUS_FILTERS.map((option) => {
          const isActive = statusFilter === option.value;
          const count =
            option.value === 'all' ? (items?.length ?? 0) : statusCounts[option.value];
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                soundFX.playPop();
                setStatusFilter(option.value);
              }}
              aria-pressed={isActive}
              className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border-2 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-400 shadow-clay-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
              }`}
            >
              <span>{option.label}</span>
              {items !== null && (
                <span className={isActive ? 'text-blue-200' : 'text-slate-400'}>{count}</span>
              )}
            </button>
          );
        })}
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
            {isFiltering ? 'Không tìm thấy từ nào' : 'Thư viện của bạn còn trống'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isFiltering
              ? 'Thử từ khóa khác hoặc chọn trạng thái khác.'
              : 'Thêm từ mới ở tab Học để chúng xuất hiện tại đây.'}
          </p>
          {isFiltering && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-3 px-3 py-1.5 rounded-button bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold text-[11px] border-2 border-blue-200 dark:border-slate-600 transition-all"
            >
              Xóa bộ lọc
            </button>
          )}
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
                    {item.word.definition || '—'}
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
          onWordUpdated={handleWordUpdated}
          onWordDeleted={handleWordDeleted}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};
