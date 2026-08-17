export type LevelDifficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

/**
 * The set is open: names come from `GET /categories`, so the app cannot close
 * it. The listed members are only the names the app ships copy and decoration
 * for (and `Custom`, the local bucket) — any other string is equally valid.
 */
export type WordCategory =
  | 'IELTS'
  | 'TOEIC'
  | 'TOEFL'
  | 'Daily Life'
  | 'Business'
  | 'Academic'
  | 'Travel'
  | 'Technology'
  | 'Emotions'
  | 'Idioms & Phrasal Verbs'
  | 'Custom'
  | (string & {});

/** A row of `GET /categories`, fetched once per sign-in and cached locally. */
export interface Category {
  id: number;
  name: string;
  /** Present only when the backend sends it; used to pick a word's newest category. */
  createdAt?: string;
}

export interface Word {
  id: string;
  word: string;
  ipa: string;
  pos: string; // Part of speech: n., v., adj., adv.
  definition?: string;
  vietnamese: string;
  example: string;
  translation: string;
  level: LevelDifficulty;
  category: WordCategory;
  mnemonic?: string;
}

export type SRSState = 'new' | 'learning' | 'review' | 'mastered';

export interface SRSData {
  userWordId?: number | string;
  wordId: string;
  interval: number; // in days
  easeFactor: number; // default 2.5
  repetitions: number;
  lastReviewed: string | null; // ISO string
  nextReviewDate: string; // ISO string
  state: SRSState;
}

export interface QuizHistoryItem {
  id: string;
  timestamp: string;
  quizType: string;
  totalQuestions: number;
  correctCount: number;
  xpEarned: number;
}

export interface UserProgress {
  name: string;
  /** Account email from the API session. */
  email: string;
  /** Numeric user id from the JWT `sub` claim; null if the token carried none. */
  userId: number | null;
  avatar: string;
  level: number;
  xp: number;
  streak: number;
  bestStreak: number;
  lastActiveDate: string;
  dailyGoal: number; // e.g. 20 words
  dailyGoalProgress: number; // e.g. 12 words today
  wordsLearned: number;
  masteredCount: number;
  totalCorrect: number;
  totalAttempted: number;
  favorites: string[]; // word IDs
  history: QuizHistoryItem[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export type ActiveTab = 'home' | 'learn' | 'review' | 'stats' | 'profile';

export type QuizType =
  | 'flashcards'
  | 'multiple-choice'
  | 'fill-blank'
  | 'type-word'
  | 'listening'
  | 'image';

export interface QuizSessionResult {
  quizType: QuizType;
  total: number;
  correct: number;
  xpEarned: number;
  mistakes: Word[];
}
