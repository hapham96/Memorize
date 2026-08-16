import { SRSData, Word } from '@/types';

/**
 * Review reminders driven by the SRS due time (`dueAt` on the backend,
 * `nextReviewDate` locally). Two channels, one decision:
 *
 * - a browser `Notification`, which reaches the user even when the tab is in
 *   the background — but only while the tab is still open, since there is no
 *   service worker / Web Push endpoint in this app
 * - an in-app banner, which always shows so the feature still works when the
 *   user never granted notification permission
 */

/** Shared tag collapses repeat reminders into one OS notification. */
export const REMINDER_TAG = 'memorize-due-reminder';

/** Cap on remembered keys, so localStorage does not grow without bound. */
const MAX_REMEMBERED_KEYS = 300;

export type NotificationPermissionState =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied';

/**
 * The slice of `AppSettings` this module reads. Declared locally rather than
 * imported so `storage` can depend on this file without a cycle — `AppSettings`
 * satisfies it structurally.
 */
export interface ReminderSettings {
  notifications: boolean;
  reminderIntervalMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}

export interface DueReminderItem {
  word: Word;
  srs: SRSData;
  /** Identity of one scheduled due moment — changes when the word is rescheduled. */
  key: string;
}

export interface DueSnapshot {
  items: DueReminderItem[];
  /** Earliest future due time, used to wake the timer exactly on time. */
  nextDueAt: Date | null;
}

export interface ReminderState {
  /** ISO timestamp of the last reminder, for the min-interval throttle. */
  lastNotifiedAt: string | null;
  /** Due moments already announced, so one schedule never notifies twice. */
  notifiedKeys: string[];
}

export const EMPTY_REMINDER_STATE: ReminderState = {
  lastNotifiedAt: null,
  notifiedKeys: [],
};

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Must be called from a user gesture (a click) — browsers reject the prompt
 * otherwise. `SettingsModal` is the only caller for that reason.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch (e) {
    console.warn('Notification permission request failed:', e);
    return Notification.permission;
  }
}

/**
 * Only words the user has actually started count as due for a reminder.
 * Untouched dataset words get a `nextReviewDate` of "now" from
 * `createInitialSRS`, so without this filter the very first reminder would
 * announce the entire vocabulary list.
 */
function isTracked(srs: SRSData): boolean {
  return srs.lastReviewed !== null || srs.userWordId !== undefined;
}

export function reminderKey(srs: SRSData): string {
  return `${srs.wordId}@${srs.nextReviewDate}`;
}

/**
 * Splits the SRS map at `now` into what is already due and when the next word
 * falls due. Entries with an unparsable due date are skipped rather than
 * treated as due forever.
 *
 * Iterates the SRS map, not the word list: a word synced from the backend is
 * keyed by its numeric id and may have no counterpart in the local dataset, so
 * walking `allWords` would silently skip exactly the entries that carry a real
 * `dueAt`. `resolveWord` maps a key to something displayable and returns null
 * for entries the caller wants excluded (e.g. outside the focus categories).
 */
export function collectDueWords(
  srsMap: Record<string, SRSData>,
  resolveWord: (wordId: string) => Word | null,
  now: Date = new Date()
): DueSnapshot {
  const items: DueReminderItem[] = [];
  let nextDueMs = Infinity;
  const nowMs = now.getTime();

  Object.entries(srsMap).forEach(([wordId, srs]) => {
    if (!srs || !isTracked(srs)) return;

    const dueMs = new Date(srs.nextReviewDate).getTime();
    if (Number.isNaN(dueMs)) return;

    if (dueMs > nowMs) {
      if (dueMs < nextDueMs) nextDueMs = dueMs;
      return;
    }

    const word = resolveWord(wordId);
    if (!word) return;

    items.push({ word, srs, key: reminderKey(srs) });
  });

  return {
    items,
    nextDueAt: Number.isFinite(nextDueMs) ? new Date(nextDueMs) : null,
  };
}

/** Handles ranges that wrap past midnight (e.g. 22:00 → 07:00). */
export function isWithinQuietHours(date: Date, settings: ReminderSettings): boolean {
  if (!settings.quietHoursEnabled) return false;

  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;
  if (start === end) return false;

  const hour = date.getHours() + date.getMinutes() / 60;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function canNotifyNow(
  settings: ReminderSettings,
  state: ReminderState,
  now: Date
): boolean {
  if (!settings.notifications) return false;
  if (isWithinQuietHours(now, settings)) return false;
  if (!state.lastNotifiedAt) return true;

  const elapsed = now.getTime() - new Date(state.lastNotifiedAt).getTime();
  const gap = Math.max(1, settings.reminderIntervalMinutes) * 60_000;
  // A clock that moved backwards (timezone change, manual set) must not lock
  // reminders out until it catches up again.
  return elapsed < 0 || elapsed >= gap;
}

export function markNotified(
  state: ReminderState,
  keys: string[],
  now: Date
): ReminderState {
  const known = new Set(state.notifiedKeys);
  const merged = [...state.notifiedKeys, ...keys.filter((key) => !known.has(key))];

  return {
    lastNotifiedAt: now.toISOString(),
    notifiedKeys: merged.slice(-MAX_REMEMBERED_KEYS),
  };
}

export function buildReminderMessage(items: DueReminderItem[]): {
  title: string;
  body: string;
} {
  const preview = items.slice(0, 3).map((item) => item.word.word);
  const rest = items.length - preview.length;

  return {
    title: 'Đến giờ ôn tập rồi! 📚',
    body:
      rest > 0
        ? `${items.length} từ đang chờ: ${preview.join(', ')} và ${rest} từ khác.`
        : `${items.length} từ đang chờ: ${preview.join(', ')}.`,
  };
}

/**
 * Returns false when nothing was shown (no permission, no items, or the
 * browser refused) — the in-app banner is the fallback in that case.
 */
export function showDueNotification(
  items: DueReminderItem[],
  onClick?: () => void
): boolean {
  if (items.length === 0) return false;
  if (getNotificationPermission() !== 'granted') return false;

  try {
    const { title, body } = buildReminderMessage(items);
    // `renotify` is not in every lib.dom NotificationOptions yet.
    const options = { body, tag: REMINDER_TAG, renotify: true } as NotificationOptions;
    const notification = new Notification(title, options);

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };

    return true;
  } catch (e) {
    console.warn('Could not show review reminder notification:', e);
    return false;
  }
}
