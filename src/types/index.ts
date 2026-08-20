export type LevelDifficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

/**
 * The learner's own CEFR proficiency, asked once after sign-up and editable in
 * settings. Distinct from `LevelDifficulty`, which grades a *word* and stops at
 * C1 because that is all `GET /words` ever returns.
 */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

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

/**
 * One sense of a word: the backend keeps a `definitions[]` row per meaning, each
 * with its own part of speech and examples. The flat `definition`/`example`
 * fields on `Word` stay the primary sense so everything that reads them keeps
 * working; cards that can show more read this list instead.
 */
export interface WordMeaning {
  /** Part of speech in the app's short form (`n.`, `v.`); empty when unknown. */
  pos: string;
  definition: string;
  /** English example sentence, `''` when the meaning has none. */
  example: string;
  /** Vietnamese translation of `example`, `''` when the meaning has none. */
  translation: string;
  /**
   * Every English example the sense carries, `example` first. A card shows only
   * the primary one; the word detail view lists them. Absent on stored words
   * saved before it existed and on locally rebuilt senses.
   */
  examples?: string[];
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
  /** Every sense the word carries, primary first. Absent on older stored words. */
  meanings?: WordMeaning[];
  /**
   * Recorded pronunciation from the backend, preferred over speech synthesis
   * when present. Absent on locally added words until `/words` answers.
   */
  audioUrl?: string;
  level: LevelDifficulty;
  category: WordCategory;
  mnemonic?: string;
}

export type SRSState = 'new' | 'learning' | 'review' | 'mastered';

/**
 * One row of the account's word library, as `GET /words` reports it: the word
 * plus whatever progress the row carried. Lives here rather than beside the
 * client because the cache in `storage.ts` stores these verbatim, and
 * `storage.ts` cannot import from the API layer without a cycle.
 */
export interface UserWordListItem {
  word: Word;
  /** When the account added it, from the row's `createdAt`. */
  addedAt?: string;
  /** SRS status, only when the row reported the account's progress. */
  state?: SRSState;
  /** When the word is next due, when the row reported it. */
  dueAt?: string;
  /** Whether the account starred it, when the row reported it. */
  isFavorite?: boolean;
}

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

/**
 * One row of the "top learners" board on the stats screen. `rank` is assigned by
 * the app from the sorted order, not read off the wire.
 */
export interface LeaderboardEntry {
  userId: number;
  rank: number;
  name: string;
  wordsLearned: number;
  masteredCount?: number;
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
  mistakeCount: number;
}
