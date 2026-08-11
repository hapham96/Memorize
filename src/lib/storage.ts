import { UserProgress, SRSData, Achievement, Word, WordCategory } from '@/types';
import { VOCABULARY_DATASET } from '@/data/vocabulary';
import { INITIAL_ACHIEVEMENTS } from '@/data/achievements';
import { createInitialSRS } from '@/lib/srs';

const STORAGE_KEYS = {
  PROGRESS: 'memorize_user_progress',
  SRS: 'memorize_srs_data',
  ACHIEVEMENTS: 'memorize_achievements',
  SETTINGS: 'memorize_settings',
  CUSTOM_WORDS: 'memorize_custom_words',
};

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  dailyGoal: number; // 5, 10, 20, 30
  notifications: boolean;
  focusCategories: WordCategory[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  soundEnabled: true,
  dailyGoal: 20,
  notifications: true,
  focusCategories: [],
};

export const DEFAULT_USER_PROGRESS: UserProgress = {
  name: 'Hao',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  level: 12,
  xp: 2840,
  streak: 28,
  lastActiveDate: new Date().toISOString(),
  dailyGoal: 20,
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

export function loadUserProgress(): UserProgress {
  if (typeof window === 'undefined') return DEFAULT_USER_PROGRESS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (!data) {
      saveUserProgress(DEFAULT_USER_PROGRESS);
      return DEFAULT_USER_PROGRESS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_USER_PROGRESS;
  }
}

export function saveUserProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save user progress', e);
  }
}

export function loadSRSData(): Record<string, SRSData> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SRS);
    if (!data) {
      // Initialize SRS map for all default words
      const initialMap: Record<string, SRSData> = {};
      VOCABULARY_DATASET.forEach((word, index) => {
        const srs = createInitialSRS(word.id);
        if (index < 5) {
          srs.state = 'mastered';
          srs.repetitions = 5;
          srs.interval = 30;
        } else if (index < 12) {
          srs.state = 'learning';
          srs.repetitions = 2;
          srs.interval = 3;
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
    localStorage.setItem(STORAGE_KEYS.SRS, JSON.stringify(srsMap));
  } catch (e) {
    console.error('Failed to save SRS data', e);
  }
}

export function loadAchievements(): Achievement[] {
  if (typeof window === 'undefined') return INITIAL_ACHIEVEMENTS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!data) {
      saveAchievements(INITIAL_ACHIEVEMENTS);
      return INITIAL_ACHIEVEMENTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_ACHIEVEMENTS;
  }
}

export function saveAchievements(achievements: Achievement[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  } catch (e) {
    console.error('Failed to save achievements', e);
  }
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    return JSON.parse(data);
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
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_WORDS);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveCustomWords(customWords: Word[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_WORDS, JSON.stringify(customWords));
  } catch (e) {
    console.error('Failed to save custom words', e);
  }
}

export function loadAllWords(): Word[] {
  const customWords = loadCustomWords();
  return [...VOCABULARY_DATASET, ...customWords];
}

