import {
  Category,
  CEFRLevel,
  UserProgress,
  SRSData,
  UserWordListItem,
  Word,
  WordCategory,
} from '@/types';
import { AuthSession } from '@/types/auth';
import { generateAvatar } from '@/lib/avatar';
import { EMPTY_REMINDER_STATE, ReminderState } from '@/lib/notifications';

const STORAGE_KEYS = {
  PROGRESS: 'memorize_user_progress',
  SRS: 'memorize_srs_data',
  SETTINGS: 'memorize_settings',
  CUSTOM_WORDS: 'memorize_custom_words',
  AUTH: 'memorize_auth',
  REMINDERS: 'memorize_reminder_state',
  CATEGORIES: 'memorize_categories',
  WORD_LIBRARY: 'memorize_word_library',
};

/** Keys holding per-account data — scoped by user id, unlike AUTH and SETTINGS. */
const SCOPED_KEYS = [
  STORAGE_KEYS.PROGRESS,
  STORAGE_KEYS.SRS,
  STORAGE_KEYS.CUSTOM_WORDS,
  STORAGE_KEYS.REMINDERS,
  // `/categories` is authenticated, so the list may well be the account's own —
  // scoping costs one duplicated copy and rules out showing another user's.
  STORAGE_KEYS.CATEGORIES,
  STORAGE_KEYS.WORD_LIBRARY,
];

/**
 * Active account for reads/writes. Progress, SRS and custom words belong to one
 * account — without this every account would inherit whatever the previously
 * signed-in user left in localStorage.
 */
let activeUserId: number | null = null;

export function setStorageScope(userId: number | null): void {
  activeUserId = userId;
}

export function getStorageScope(): number | null {
  return activeUserId;
}

/**
 * Falls back to the unsuffixed key when the scope is unknown — a session whose
 * JWT carried no numeric `sub` still needs somewhere to store its data.
 */
function scopedKey(key: string): string {
  if (!SCOPED_KEYS.includes(key) || activeUserId === null) return key;
  return `${key}__u${activeUserId}`;
}

function readScoped(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(scopedKey(key));
}

function writeScoped(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(scopedKey(key), value);
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  /**
   * The learner's self-declared CEFR level, asked right after sign-up and
   * changeable in settings. `null` means the question has not been answered —
   * the app never guesses a level on the user's behalf.
   */
  cefrLevel: CEFRLevel | null;
  dailyGoal: number; // 5, 10, 20, 30
  /** Master switch for due-review reminders (in-app banner + browser notification). */
  notifications: boolean;
  /** Minimum gap between two reminders, so a large due batch cannot spam. */
  reminderIntervalMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: number; // hour of day, 0–23
  quietHoursEnd: number; // hour of day, 0–23; may wrap past midnight
  focusCategories: WordCategory[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  soundEnabled: true,
  cefrLevel: null,
  dailyGoal: 20,
  notifications: true,
  reminderIntervalMinutes: 60,
  quietHoursEnabled: true,
  quietHoursStart: 22,
  quietHoursEnd: 7,
  focusCategories: [],
};

/**
 * Every account starts empty — every number the UI shows must come from
 * something the user actually did.
 */
export function createEmptyUserProgress(
  userId: number | null,
  email: string,
  name: string
): UserProgress {
  return {
    name,
    email,
    userId,
    avatar: generateAvatar(name || email),
    level: 1,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastActiveDate: new Date().toISOString(),
    dailyGoal: DEFAULT_SETTINGS.dailyGoal,
    dailyGoalProgress: 0,
    wordsLearned: 0,
    masteredCount: 0,
    totalCorrect: 0,
    totalAttempted: 0,
    favorites: [],
    history: [],
  };
}

/**
 * Placeholder profile for the moment before an account's own data is read.
 * Nothing signed-in is ever rendered from it — it only keeps React state typed
 * and non-null until `loadAccountState` runs.
 */
export const DEFAULT_USER_PROGRESS: UserProgress = createEmptyUserProgress(null, '', '');

/**
 * Ids of the vocabulary set that used to ship with the app (`w1`, `w2`, …).
 * Custom words are keyed `custom_…` and backend words numerically, so this
 * shape can only have come from the removed dataset.
 */
const LEGACY_DATASET_ID = /^w\d+$/;

/** Fills in fields added after a profile was first written. */
function normalizeProgress(progress: UserProgress): UserProgress {
  return {
    ...progress,
    email: progress.email ?? '',
    userId: progress.userId ?? null,
    bestStreak: progress.bestStreak ?? progress.streak ?? 0,
    // Favourites pointing at the removed dataset can never resolve to a word.
    favorites: (progress.favorites ?? []).filter((id) => !LEGACY_DATASET_ID.test(id)),
    history: progress.history ?? [],
  };
}

export function loadUserProgress(): UserProgress {
  if (typeof window === 'undefined') return DEFAULT_USER_PROGRESS;
  try {
    const data = readScoped(STORAGE_KEYS.PROGRESS);
    // An account with no local history starts from zero.
    if (!data) return createEmptyUserProgress(activeUserId, '', '');
    return normalizeProgress(JSON.parse(data));
  } catch {
    return createEmptyUserProgress(activeUserId, '', '');
  }
}

export function saveUserProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    writeScoped(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save user progress', e);
  }
}

/**
 * Drops SRS entries left over from the bundled dataset. Without this, an
 * account that ran an older build keeps counting words it no longer has —
 * inflating "mastered"/"learning" totals and raising reminders for words the
 * review screen cannot show.
 */
function pruneLegacyDatasetEntries(
  srsMap: Record<string, SRSData>
): { map: Record<string, SRSData>; pruned: boolean } {
  const entries = Object.entries(srsMap);
  const kept = entries.filter(([wordId]) => !LEGACY_DATASET_ID.test(wordId));
  if (kept.length === entries.length) return { map: srsMap, pruned: false };
  return { map: Object.fromEntries(kept), pruned: true };
}

export function loadSRSData(): Record<string, SRSData> {
  if (typeof window === 'undefined') return {};
  try {
    const data = readScoped(STORAGE_KEYS.SRS);
    // No seeding: an account only has SRS entries for words it actually added.
    if (!data) return {};

    const { map, pruned } = pruneLegacyDatasetEntries(JSON.parse(data));
    if (pruned) saveSRSData(map);
    return map;
  } catch {
    return {};
  }
}

export function saveSRSData(srsMap: Record<string, SRSData>): void {
  if (typeof window === 'undefined') return;
  try {
    writeScoped(STORAGE_KEYS.SRS, JSON.stringify(srsMap));
  } catch (e) {
    console.error('Failed to save SRS data', e);
  }
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    // Settings stored before a field existed must still come back complete —
    // an undefined `reminderIntervalMinutes` would make the throttle NaN.
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadCustomWords(): Word[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = readScoped(STORAGE_KEYS.CUSTOM_WORDS);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveCustomWords(customWords: Word[]): void {
  if (typeof window === 'undefined') return;
  try {
    writeScoped(STORAGE_KEYS.CUSTOM_WORDS, JSON.stringify(customWords));
  } catch (e) {
    console.error('Failed to save custom words', e);
  }
}

/**
 * The category list from `GET /categories`. Fetched once per sign-in and read
 * from here on every later render, so a category chip never waits on the
 * network — and an offline session still filters and labels words.
 */
export function loadCategories(): Category[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = readScoped(STORAGE_KEYS.CATEGORIES);
    if (!data) return [];

    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCategories(categories: Category[]): void {
  if (typeof window === 'undefined') return;
  try {
    writeScoped(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories', e);
  }
}

/**
 * Bumped whenever a cached row's shape changes. An older payload is dropped
 * rather than read with missing fields.
 */
const WORD_LIBRARY_CACHE_VERSION = 1;

export interface WordLibraryCache {
  version: number;
  /** When the pages were read, for the "cập nhật lúc …" hint and nothing else. */
  fetchedAt: number;
  items: UserWordListItem[];
}

/**
 * The account's whole word library, as last read from `GET /words`.
 *
 * The library only changes when the account adds words, so it is read once and
 * kept — `addWord`/`addWordsBulk` drop it, and nothing else does. Returns null
 * when there is no usable copy, which is the signal to fetch.
 */
export function loadWordLibraryCache(): WordLibraryCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = readScoped(STORAGE_KEYS.WORD_LIBRARY);
    if (!data) return null;

    const parsed = JSON.parse(data) as WordLibraryCache;
    if (parsed?.version !== WORD_LIBRARY_CACHE_VERSION) return null;
    if (!Array.isArray(parsed.items)) return null;

    return { ...parsed, fetchedAt: parsed.fetchedAt ?? 0 };
  } catch {
    return null;
  }
}

/**
 * `fetchedAt` is passed through when an existing copy is only being patched, so
 * a row rewrite does not pose as a fresh read of the library.
 */
export function saveWordLibraryCache(items: UserWordListItem[], fetchedAt?: number): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: WordLibraryCache = {
      version: WORD_LIBRARY_CACHE_VERSION,
      fetchedAt: fetchedAt ?? Date.now(),
      items,
    };
    writeScoped(STORAGE_KEYS.WORD_LIBRARY, JSON.stringify(payload));
  } catch (e) {
    // A large library can exceed the localStorage quota; the screen still works
    // from the fetched list, it just has to fetch again next time.
    console.warn('Failed to cache word library', e);
  }
}

export function clearWordLibraryCache(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(scopedKey(STORAGE_KEYS.WORD_LIBRARY));
  } catch (e) {
    console.error('Failed to clear word library cache', e);
  }
}

/**
 * Which due moments have already been announced, per account. Kept out of
 * `AppSettings` because it is bookkeeping, not a user preference.
 */
export function loadReminderState(): ReminderState {
  if (typeof window === 'undefined') return EMPTY_REMINDER_STATE;
  try {
    const data = readScoped(STORAGE_KEYS.REMINDERS);
    if (!data) return EMPTY_REMINDER_STATE;
    return { ...EMPTY_REMINDER_STATE, ...JSON.parse(data) };
  } catch {
    return EMPTY_REMINDER_STATE;
  }
}

export function saveReminderState(state: ReminderState): void {
  if (typeof window === 'undefined') return;
  try {
    writeScoped(STORAGE_KEYS.REMINDERS, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save reminder state', e);
  }
}

/** Wipes only the active account's data, leaving other accounts and the session intact. */
export function clearScopedData(): void {
  if (typeof window === 'undefined') return;
  try {
    SCOPED_KEYS.forEach((key) => localStorage.removeItem(scopedKey(key)));
  } catch (e) {
    console.error('Failed to clear account data', e);
  }
}

/**
 * The whole library is the account's own words — there is no bundled dataset,
 * so a new account legitimately starts with nothing.
 */
export function loadAllWords(): Word[] {
  return loadCustomWords();
}

/**
 * Returns the stored session, or null when there is none / it has expired.
 * An expired session is dropped so the app falls back to unauthenticated calls
 * instead of sending a token the backend will reject.
 */
export function loadAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!data) return null;

    const session = JSON.parse(data) as AuthSession;
    if (!session?.accessToken) return null;

    if (session.expiresAt && session.expiresAt <= Date.now()) {
      clearAuthSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save auth session', e);
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  } catch (e) {
    console.error('Failed to clear auth session', e);
  }
}

