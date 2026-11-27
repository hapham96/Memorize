/** Wire shapes of the Argument Chain, "Chuỗi nhớ" (`/argument-chains`). */

export type ChainRole = 'cause' | 'middle' | 'result';

export interface ChainStep {
  userWordId: number;
  headword: string;
  ipaPronunciation: string | null;
  audioUrl: string | null;
  definition: string;
  partOfSpeech: string | null;
  example: string | null;
  role: ChainRole;
  /** How this step leads to the next; null on the last. */
  link: { en: string; vi: string } | null;
}

export interface LeftOutWord {
  userWordId: number;
  headword: string;
  reason: string;
}

export interface ArgumentChain {
  id: number;
  createdAt: string;
  /** In chain order. */
  steps: ChainStep[];
  leftOut: LeftOutWord[];
  passage: string;
  summaryVi: string;
}

export interface ChainSummary {
  id: number;
  createdAt: string;
  headwords: string[];
}

export interface WordSuggestion {
  source: 'owned' | 'new';
  userWordId: number | null;
  headword: string;
  ipaPronunciation: string | null;
  definition: string;
  partOfSpeech: string | null;
  example: string | null;
}

/** A word on its way into a chain. */
export interface ChainPick {
  userWordId: number;
  headword: string;
}

/** What the chain screen was opened for. */
export type ChainStart =
  | { kind: 'new'; words: ChainPick[] }
  | { kind: 'saved'; chainId: number };
