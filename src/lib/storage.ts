import { UserProgress, SRSData, Word, WordCategory } from '@/types';
import { AuthSession } from '@/types/auth';
import { VOCABULARY_DATASET } from '@/data/vocabulary';
import { createInitialSRS } from '@/lib/srs';
import { generateAvatar } from '@/lib/avatar';
import { EMPTY_REMINDER_STATE, ReminderState } from '@/lib/notifications';

const STORAGE_KEYS = {
  PROGRESS: 'memorize_user_progress',
  SRS: 'memorize_srs_data',
  ACHIEVEMENTS: 'memorize_achievements',
  SETTINGS: 'memorize_settings',
  CUSTOM_WORDS: 'memorize_custom_words',
  AUTH: 'memorize_auth',
  REMINDERS: 'memorize_reminder_state',
};

/** Keys holding per-account data — scoped by user id, unlike AUTH and SETTINGS. */
const SCOPED_KEYS = [
  STORAGE_KEYS.PROGRESS,
  STORAGE_KEYS.SRS,
  STORAGE_KEYS.ACHIEVEMENTS,
  STORAGE_KEYS.CUSTOM_WORDS,
  STORAGE_KEYS.REMINDERS,
];

/**
 * Active account for reads/writes. Progress, SRS, custom words and achievements
 * belong to one account — without this every account would inherit whatever the
 * previously signed-in user left in localStorage.
 */
let activeUserId: number | null = null;

export function setStorageScope(userId: number | null): void {
  activeUserId = userId;
}

export function getStorageScope(): number | null {
  return activeUserId;
}

/** Signed-out demo data keeps the original unsuffixed keys. */
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

/** True while no account is signed in — the only state that gets demo seeding. */
function isDemoScope(): boolean {
  return activeUserId === null;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
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
  dailyGoal: 20,
  notifications: true,
  reminderIntervalMinutes: 60,
  quietHoursEnabled: true,
  quietHoursStart: 22,
  quietHoursEnd: 7,
  focusCategories: [],
};

/** Demo profile shown only when signed out — deliberately pre-filled. */
export const DEFAULT_USER_PROGRESS: UserProgress = {
  name: 'User Name',
  email: '',
  userId: null,
  avatar: generateAvatar('User Name'),
  level: 12,
  xp: 2840,
  streak: 28,
  bestStreak: 28,
  lastActiveDate: new Date().toISOString(),
  dailyGoal: 10,
  dailyGoalProgress: 12,
  wordsLearned: 20,
  masteredCount: 14,
  totalCorrect: 184,
  totalAttempted: 200,
  favorites: ['w1', 'w3', 'w7'],
  history: [
    {
      id: 'h1',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      quizType: 'Flashcards',
      totalQuestions: 10,
      correctCount: 9,
      xpEarned: 45,
    },
    {
      id: 'h2',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      quizType: 'Multiple Choice',
      totalQuestions: 10,
      correctCount: 10,
      xpEarned: 50,
    },
  ],
};

/**
 * A real account starts empty — every number it shows must come from something
 * the user actually did.
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

/** Fills in fields added after a profile was first written. */
function normalizeProgress(progress: UserProgress): UserProgress {
  return {
    ...progress,
    email: progress.email ?? '',
    userId: progress.userId ?? null,
    bestStreak: progress.bestStreak ?? progress.streak ?? 0,
    favorites: progress.favorites ?? [],
    history: progress.history ?? [],
  };
}

export function loadUserProgress(): UserProgress {
  if (typeof window === 'undefined') return DEFAULT_USER_PROGRESS;
  try {
    const data = readScoped(STORAGE_KEYS.PROGRESS);
    if (!data) {
      if (isDemoScope()) {
        saveUserProgress(DEFAULT_USER_PROGRESS);
        return DEFAULT_USER_PROGRESS;
      }
      // A signed-in account with no local history starts from zero, not demo data.
      return createEmptyUserProgress(activeUserId, '', '');
    }
    return normalizeProgress(JSON.parse(data));
  } catch {
    return isDemoScope()
      ? DEFAULT_USER_PROGRESS
      : createEmptyUserProgress(activeUserId, '', '');
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

export function loadSRSData(): Record<string, SRSData> {
  if (typeof window === 'undefined') return {};
  try {
    const data = readScoped(STORAGE_KEYS.SRS);
    if (!data) {
      const initialMap: Record<string, SRSData> = {};
      VOCABULARY_DATASET.forEach((word, index) => {
        const srs = createInitialSRS(word.id);
        // Pre-studied words are demo dressing; a real account starts all-new.
        if (isDemoScope()) {
          if (index < 5) {
            srs.state = 'mastered';
            srs.repetitions = 5;
            srs.interval = 30;
          } else if (index < 12) {
            srs.state = 'learning';
            srs.repetitions = 2;
            srs.interval = 3;
          }
        }
        initialMap[word.id] = srs;
      });
      saveSRSData(initialMap);
      return initialMap;
    }
    return JSON.parse(data);
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

export function loadAllWords(): Word[] {
  const customWords = loadCustomWords();
  return [...VOCABULARY_DATASET, ...customWords];
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

