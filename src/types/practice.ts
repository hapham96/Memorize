/** Wire shapes of Free Practice (`/practice`). The server owns every rule. */

/** Easy to hard. */
export type PracticeMode =
  | 'flashcard'
  | 'multiple_choice'
  | 'match'
  | 'listening'
  | 'fill_in_blank'
  | 'typing';

export interface PracticeMeaning {
  userWordDefinitionId: number;
  definition: string;
  partOfSpeech: string | null;
  example: string | null;
}

export interface PracticeQuestionWord {
  userWordId: number;
  headword: string;
  ipaPronunciation: string | null;
  audioUrl: string | null;
  /** Flashcard: every meaning. Otherwise the one asked, which is also the right option. */
  definitions: PracticeMeaning[];
  /** Fill in the blank only. */
  sentence?: string;
  /** The text to type: listening, typing and fill in the blank. */
  correctAnswer?: string;
}

export interface PracticeOption {
  userWordDefinitionId: number;
  definition: string;
}

export interface PracticeQuestion {
  id: number;
  mode: PracticeMode;
  /** One word, except a match board. */
  words: PracticeQuestionWord[];
  options: PracticeOption[];
}

export interface PracticeSummaryWord {
  userWordId: number;
  headword: string;
}

export interface PracticeSitting {
  id: string;
  /** null is "Tự động". */
  modes: PracticeMode[] | null;
  wordCount: number;
  droppedCount: number;
  round: { number: number; size: number; remaining: number };
  question: PracticeQuestion | null;
  /** Set once the round is finished. */
  summary: {
    remembered: PracticeSummaryWord[];
    weak: PracticeSummaryWord[];
    xpEarned: number;
  } | null;
  /** No words left: the sitting is over. */
  done: boolean;
}

export interface PracticeChoices {
  wordCount: number;
  favoriteCount: number;
  oftenMissedCount: number;
  /** Whether multiple choice and match can be offered. */
  canChoose: boolean;
}

export interface StartPracticeRequest {
  vocabularySetIds?: number[];
  userWordIds?: number[];
  excludedUserWordIds?: number[];
  favorites?: boolean;
  oftenMissed?: boolean;
  /** Left out for "Tự động". */
  modes?: PracticeMode[];
}

export interface PracticeAnswer {
  questionId: number;
  userWordId: number;
  /** Flashcard. */
  quality?: number;
  /** Multiple choice and match. */
  choiceId?: number;
  /** Listening, fill in the blank, typing. */
  answer?: string;
}
