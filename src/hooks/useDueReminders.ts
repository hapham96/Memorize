'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SRSData, Word, WordCategory } from '@/types';
import { AppSettings, loadReminderState, saveReminderState } from '@/lib/storage';
import {
  createPlaceholderWord,
  findWordById,
  getDueReviews,
  mapBackendUserWordToSRS,
} from '@/lib/api/word-client';
import {
  DueReminderItem,
  EMPTY_REMINDER_STATE,
  NotificationPermissionState,
  ReminderState,
  canNotifyNow,
  collectDueWords,
  getNotificationPermission,
  markNotified,
  reminderKey,
  requestNotificationPermission,
  showDueNotification,
} from '@/lib/notifications';

/**
 * Fallback poll, and the rate at which the backend is asked for due reviews.
 * The exact timer below fires on a locally-known due moment, so this only has
 * to cover what that timer cannot see: clocks that drifted, timers a background
 * tab throttled, and due times only the backend knows about. Coarse on purpose.
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
  /** Empty means "no filter"; mirrors the review badge's active pool. */
  focusCategories: WordCategory[];
  srsMap: Record<string, SRSData>;
  settings: AppSettings;
  /** Held false until localStorage is read, so nothing fires on half-loaded state. */
  isReady: boolean;
  /** Changes on sign-in/out — reminder bookkeeping is per account. */
  userId: number | null;
  /** Runs when the user accepts the reminder, from the banner or the notification. */
  onOpenReview: () => void;
  /** Folds a backend due time back into the app's SRS map. */
  onSyncSRS?: (wordId: string, srs: SRSData) => void;
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
}

/**
 * Watches for words whose due time has arrived and raises a reminder — an
 * in-app banner always, plus a browser notification when permission was
 * granted.
 *
 * Two sources, because neither alone is complete: the backend owns `dueAt` for
 * synced words but `/reviews/due` only ever returns what is *already* due, so
 * the local SRS map is what makes it possible to wake up exactly on time.
 */
export function useDueReminders({
  allWords,
  focusCategories,
  srsMap,
  settings,
  isReady,
  userId,
  onOpenReview,
  onSyncSRS,
}: UseDueRemindersArgs): UseDueRemindersResult {
  // `null` until mounted: computing due state during SSR/first render would
  // produce server/client markup that disagrees.
  const [clock, setClock] = useState<number | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');
  const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);
  const [apiItems, setApiItems] = useState<DueReminderItem[] | null>(null);

  const stateRef = useRef<ReminderState>(EMPTY_REMINDER_STATE);
  const stateLoadedRef = useRef(false);

  // Kept in refs so a new callback/object identity each render never restarts
  // a timer or re-triggers the backend poll.
  const onOpenReviewRef = useRef(onOpenReview);
  onOpenReviewRef.current = onOpenReview;
  const onSyncSRSRef = useRef(onSyncSRS);
  onSyncSRSRef.current = onSyncSRS;
  const srsMapRef = useRef(srsMap);
  srsMapRef.current = srsMap;

  const isSignedIn = userId !== null;

  // Load per-account bookkeeping; re-runs when the signed-in account changes.
  useEffect(() => {
    if (!isReady) return;

    stateLoadedRef.current = false;
    setActiveReminder(null);
    setApiItems(null);
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

  const inFocus = useCallback(
    (word: Word) => focusCategories.length === 0 || focusCategories.includes(word.category),
    [focusCategories]
  );

  /**
   * Names an SRS key. Backend-synced words are keyed by numeric id and may have
   * no local copy — those still deserve a reminder, under a placeholder name.
   */
  const resolveWord = useCallback(
    (wordId: string): Word | null => {
      const match = findWordById(wordId, allWords);
      if (match) return inFocus(match) ? match : null;
      // A placeholder has no real category, so a focus filter cannot judge it —
      // let it through rather than silently dropping a genuinely due word.
      return createPlaceholderWord(wordId);
    },
    [allWords, inFocus]
  );

  const localSnapshot = useMemo(
    () => collectDueWords(srsMap, resolveWord, new Date(clock ?? Date.now())),
    [srsMap, resolveWord, clock]
  );

  // Ask the backend what is due. Keyed on `clock`, so it runs once per tick
  // rather than once per render.
  useEffect(() => {
    if (!isReady || !isSignedIn || clock === null) return;

    let cancelled = false;

    getDueReviews()
      .then((userWords) => {
        if (cancelled || !Array.isArray(userWords)) return;

        const items: DueReminderItem[] = [];
        userWords.forEach((userWord) => {
          const srs = mapBackendUserWordToSRS(userWord);
          const word = resolveWord(srs.wordId);
          if (!word) return;

          items.push({ word, srs, key: reminderKey(srs) });

          // Keep the badge and review tab agreeing with what the reminder says,
          // but only write when something actually moved.
          const existing = srsMapRef.current[word.id];
          if (
            !existing ||
            existing.nextReviewDate !== srs.nextReviewDate ||
            existing.state !== srs.state ||
            existing.repetitions !== srs.repetitions
          ) {
            onSyncSRSRef.current?.(word.id, srs);
          }
        });

        setApiItems(items);
      })
      .catch((err) => {
        // Backend is optional everywhere — the local SRS map still drives reminders.
        if (!cancelled) console.warn('Could not poll due reviews for reminders:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, isSignedIn, clock, resolveWord]);

  // Backend entries win on conflict; local-only words still count, so words
  // reviewed offline are not dropped from reminders.
  const dueItems = useMemo(() => {
    if (!apiItems) return localSnapshot.items;

    const byWordId = new Map(localSnapshot.items.map((item) => [item.word.id, item]));
    apiItems.forEach((item) => byWordId.set(item.word.id, item));
    return Array.from(byWordId.values());
  }, [apiItems, localSnapshot]);

  const nextDueMs = localSnapshot.nextDueAt ? localSnapshot.nextDueAt.getTime() : null;

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

    const now = new Date(clock);
    const state = stateRef.current;
    const keys = dueItems.map((item) => item.key);
    const known = new Set(state.notifiedKeys);

    if (keys.every((key) => known.has(key))) return;
    if (!canNotifyNow(settings, state, now)) return;

    // Every currently-due key is marked, not just the new ones, so the next
    // word falling due does not re-announce the whole backlog.
    const nextState = markNotified(state, keys, now);
    stateRef.current = nextState;
    saveReminderState(nextState);

    setActiveReminder({ items: dueItems, raisedAt: now.getTime() });
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

  return {
    dueItems,
    nextDueAt: localSnapshot.nextDueAt,
    permission,
    requestPermission,
    activeReminder,
    dismissReminder,
  };
}
