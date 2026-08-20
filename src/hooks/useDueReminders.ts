'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SRSData, UserWordListItem, Word, WordCategory } from '@/types';
import { AppSettings, loadReminderState, saveReminderState } from '@/lib/storage';
import {
  createPlaceholderWord,
  findWordById,
  getUserWordLibrary,
} from '@/lib/api/word-client';
import {
  DueReminderItem,
  EMPTY_REMINDER_STATE,
  NotificationPermissionState,
  ReminderState,
  canNotifyNow,
  collectDueFromLibrary,
  collectDueWords,
  getNotificationPermission,
  markNotified,
  requestNotificationPermission,
  showDueNotification,
} from '@/lib/notifications';

/**
 * Fallback poll, and the rate at which the due state is recomputed.
 * The exact timer below fires on a known due moment, so this only has to cover
 * what that timer cannot see: clocks that drifted and timers a background tab
 * throttled. Coarse on purpose — and cheap, since a tick reads the cached word
 * library rather than the network.
 */
const POLL_MS = 300_000;

/**
 * Returning to a tab fires `visibilitychange` and `focus` together, and neither
 * alone covers every case — `visibilitychange` misses a window that stayed
 * visible while unfocused, `focus` misses a background tab being reselected.
 * Both stay wired up; this window collapses the pair into one refresh.
 */
const EVENT_REFRESH_GAP_MS = 10_000;

/** `setTimeout` overflows past 2^31-1 ms; the poll covers anything longer. */
const MAX_TIMEOUT_MS = 2_000_000_000;

interface UseDueRemindersArgs {
  /** Full word list — also used to name words the backend reports as due. */
  allWords: Word[];
  /** Empty means "no filter"; mirrors the review tab's active pool. */
  focusCategories: WordCategory[];
  srsMap: Record<string, SRSData>;
  settings: AppSettings;
  /** Held false until localStorage is read, so nothing fires on half-loaded state. */
  isReady: boolean;
  /** Changes on sign-in/out — reminder bookkeeping is per account. */
  userId: number | null;
  /** Runs when the user accepts the reminder, from the banner or the notification. */
  onOpenReview: () => void;
}

export interface ActiveReminder {
  items: DueReminderItem[];
  raisedAt: number;
}

export interface UseDueRemindersResult {
  dueItems: DueReminderItem[];
  nextDueAt: Date | null;
  permission: NotificationPermissionState;
  requestPermission: () => Promise<NotificationPermissionState>;
  activeReminder: ActiveReminder | null;
  dismissReminder: () => void;
  /** Recomputes the due state — a cache read, not a request. */
  refreshDue: () => void;
}

/**
 * Watches for words whose due time has arrived and raises a reminder — an
 * in-app banner always, plus a browser notification when permission was
 * granted.
 *
 * The account's cached word library is the primary source: every row carries the
 * backend's own `dueAt`, so this needs no polling at all — `getUserWordLibrary`
 * answers from localStorage and only fetches when there is nothing cached (a new
 * device, or right after a word was added, which drops the cache). `/reviews/due`
 * is deliberately *not* used here; it is only worth a request where its
 * `userWordId` is needed, i.e. the review tab.
 *
 * The local SRS map is the second source, so a word reviewed on this device — or
 * added while the backend was unreachable — still counts. Where both know a word,
 * the later schedule wins.
 */
export function useDueReminders({
  allWords,
  focusCategories,
  srsMap,
  settings,
  isReady,
  userId,
  onOpenReview,
}: UseDueRemindersArgs): UseDueRemindersResult {
  // `null` until mounted: computing due state during SSR/first render would
  // produce server/client markup that disagrees.
  const [clock, setClock] = useState<number | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');
  const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);
  // The account's library, as last read. `null` means "not read yet", which is
  // different from an account with no words.
  const [libraryItems, setLibraryItems] = useState<UserWordListItem[] | null>(null);
  // Only re-runs the library read. `clock` also feeds the reminder throttle, so
  // bumping that from the outside could pop a notification nobody asked for.
  const [dueTick, setDueTick] = useState(0);

  const stateRef = useRef<ReminderState>(EMPTY_REMINDER_STATE);
  const stateLoadedRef = useRef(false);

  // Kept in refs so a new callback/object identity each render never restarts
  // a timer or re-triggers the library read.
  const onOpenReviewRef = useRef(onOpenReview);
  onOpenReviewRef.current = onOpenReview;
  const allWordsRef = useRef(allWords);
  allWordsRef.current = allWords;

  const isSignedIn = userId !== null;

  // Load per-account bookkeeping; re-runs when the signed-in account changes.
  useEffect(() => {
    if (!isReady) return;

    stateLoadedRef.current = false;
    setActiveReminder(null);
    setLibraryItems(null);
    setPermission(getNotificationPermission());
    stateRef.current = loadReminderState();
    stateLoadedRef.current = true;
    setClock(Date.now());
  }, [isReady, userId]);

  // Coarse poll + a re-check whenever the tab comes back to the foreground.
  useEffect(() => {
    if (!isReady) return;

    let lastEventRefresh = 0;

    const refresh = () => setClock(Date.now());
    // Debounced: the two foreground events overlap, and a user flicking between
    // windows should not re-tick the whole hook each time.
    const refreshFromEvent = () => {
      const now = Date.now();
      if (now - lastEventRefresh < EVENT_REFRESH_GAP_MS) return;
      lastEventRefresh = now;
      setClock(now);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshFromEvent();
    };

    const intervalId = setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshFromEvent);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshFromEvent);
    };
  }, [isReady]);

  // Read the library. Keyed on `clock`/`dueTick` so it runs once per tick rather
  // than once per render; a hit costs one localStorage read.
  useEffect(() => {
    if (!isReady || !isSignedIn || clock === null) return;

    let cancelled = false;

    getUserWordLibrary({ fallbacks: allWordsRef.current })
      .then((library) => {
        if (!cancelled) setLibraryItems(library.items);
      })
      .catch((err) => {
        // Backend is optional everywhere — the local SRS map still drives
        // reminders, and `libraryItems` keeps its last value rather than
        // dropping every backend-known word off the list.
        if (!cancelled) console.warn('Could not read the word library for reminders:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, isSignedIn, clock, dueTick]);

  const inFocus = useCallback(
    (word: Word) => focusCategories.length === 0 || focusCategories.includes(word.category),
    [focusCategories]
  );

  const libraryIds = useMemo(
    () => new Set((libraryItems ?? []).map((item) => String(item.word.id))),
    [libraryItems]
  );

  /**
   * Names an SRS key. Backend-synced words are keyed by numeric id and may have
   * no local copy — those still deserve a reminder, under a placeholder name.
   */
  const resolveWord = useCallback(
    (wordId: string): Word | null => {
      const match = findWordById(wordId, allWords);
      if (match) return inFocus(match) ? match : null;
      // The library is the account's whole vocabulary. Once it has been read, a
      // key it has never heard of names nothing the user can review — most often
      // a flashcard session's `userWordId` key — so it is dropped rather than
      // announced as "Word #123".
      if (libraryItems !== null && !libraryIds.has(String(wordId))) return null;
      // A placeholder has no real category, so a focus filter cannot judge it —
      // let it through rather than silently dropping a genuinely due word.
      return createPlaceholderWord(wordId);
    },
    [allWords, inFocus, libraryItems, libraryIds]
  );

  /**
   * Names a library row. Its own word is the best source — it reads correctly
   * even on a device that never added it — while the focus filter can only judge
   * a word this device knows, so a backend-only word is let through rather than
   * silently dropped.
   */
  const resolveLibraryWord = useCallback(
    (item: UserWordListItem): Word | null => {
      const local = findWordById(item.word.id, allWords);
      if (local && !inFocus(local)) return null;
      return item.word;
    },
    [allWords, inFocus]
  );

  const now = useMemo(() => new Date(clock ?? Date.now()), [clock]);

  const localSnapshot = useMemo(
    () => collectDueWords(srsMap, resolveWord, now),
    [srsMap, resolveWord, now]
  );

  const librarySnapshot = useMemo(
    () => collectDueFromLibrary(libraryItems ?? [], resolveLibraryWord, now),
    [libraryItems, resolveLibraryWord, now]
  );

  /**
   * The latest due moment known for each word, across both sources.
   *
   * This is what settles a disagreement: a review through the quiz flow moves
   * the local entry, a review on another device moves the library row, and
   * whichever is later is the schedule that actually stands.
   */
  const latestDueMs = useMemo(() => {
    const latest = new Map<string, number>();
    const consider = (wordId: string, iso?: string | null) => {
      if (!iso) return;
      const ms = Date.parse(iso);
      if (Number.isNaN(ms)) return;
      const current = latest.get(wordId);
      if (current === undefined || ms > current) latest.set(wordId, ms);
    };

    (libraryItems ?? []).forEach((item) => consider(String(item.word.id), item.dueAt));
    Object.entries(srsMap).forEach(([wordId, srs]) => consider(wordId, srs?.nextReviewDate));
    return latest;
  }, [libraryItems, srsMap]);

  const dueItems = useMemo(() => {
    const nowMs = now.getTime();
    const byWordId = new Map<string, DueReminderItem>();

    // The library first — its word carries the backend's definitions — then any
    // local-only word, so something reviewed offline is not dropped.
    librarySnapshot.items.forEach((item) => byWordId.set(item.word.id, item));
    localSnapshot.items.forEach((item) => {
      if (!byWordId.has(item.word.id)) byWordId.set(item.word.id, item);
    });

    // A later schedule from the other source means the word has been reviewed
    // since this item was written, so it is not due after all.
    return Array.from(byWordId.values()).filter((item) => {
      const latest = latestDueMs.get(item.word.id);
      return latest === undefined || latest <= nowMs;
    });
  }, [librarySnapshot, localSnapshot, latestDueMs, now]);

  // The earliest schedule still ahead of us, from either source.
  const nextDueMs = useMemo(() => {
    const nowMs = now.getTime();
    let next = Infinity;
    latestDueMs.forEach((ms) => {
      if (ms > nowMs && ms < next) next = ms;
    });
    return Number.isFinite(next) ? next : null;
  }, [latestDueMs, now]);

  // Wake exactly on the next due moment rather than waiting out the poll.
  useEffect(() => {
    if (!isReady || nextDueMs === null) return;

    const delay = nextDueMs - Date.now();
    if (delay <= 0) return;

    const id = setTimeout(() => setClock(Date.now()), Math.min(delay + 250, MAX_TIMEOUT_MS));
    return () => clearTimeout(id);
  }, [isReady, nextDueMs]);

  // Raise the reminder when something is due, is new, and the throttle allows.
  useEffect(() => {
    if (!isReady || clock === null || !stateLoadedRef.current) return;
    if (dueItems.length === 0) return;

    const raisedAt = new Date(clock);
    const state = stateRef.current;
    const keys = dueItems.map((item) => item.key);
    const known = new Set(state.notifiedKeys);

    if (keys.every((key) => known.has(key))) return;
    if (!canNotifyNow(settings, state, raisedAt)) return;

    // Every currently-due key is marked, not just the new ones, so the next
    // word falling due does not re-announce the whole backlog.
    const nextState = markNotified(state, keys, raisedAt);
    stateRef.current = nextState;
    saveReminderState(nextState);

    setActiveReminder({ items: dueItems, raisedAt: raisedAt.getTime() });
    showDueNotification(dueItems, () => onOpenReviewRef.current());
  }, [isReady, clock, dueItems, settings]);

  // Turning reminders off should also clear anything already on screen.
  useEffect(() => {
    if (!settings.notifications) setActiveReminder(null);
  }, [settings.notifications]);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const dismissReminder = useCallback(() => setActiveReminder(null), []);

  const refreshDue = useCallback(() => setDueTick((n) => n + 1), []);

  return {
    dueItems,
    nextDueAt: nextDueMs === null ? null : new Date(nextDueMs),
    permission,
    requestPermission,
    activeReminder,
    dismissReminder,
    refreshDue,
  };
}
