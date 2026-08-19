export type AddWordRequest = {
  userId: number;
  headword: string;
  ipaPronunciation: string;
  definitions: DefinitionRequest[];
};

export type AddBulkWordsRequest = {
  words: AddWordRequest[];
};

export type DefinitionRequest = {
  definition: string;
  partOfSpeech: string;
  examples: ExamplesRequest[];
};

export type ExampleLanguage = "en" | "vi";

export type ExamplesRequest = {
  example: string;
  language: ExampleLanguage;
};

export type BackendExample = {
  id?: number;
  example: string;
  language: ExampleLanguage;
};

export type BackendDefinition = {
  id?: number;
  definition: string;
  partOfSpeech: string | null;
  examples?: BackendExample[] | null;
};

export type BackendCategory = {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string | null;
};

export type BackendWord = {
  id: number;
  headword: string;
  ipaPronunciation: string | null;
  audioUrl: string | null;
  cefrLevel: string | null;
  createdAt: string;
  /** Only present on endpoints that embed the word's content. */
  definitions?: BackendDefinition[] | null;
  /** A word may belong to several categories; the card shows the newest one. */
  categories?: BackendCategory[] | null;
};

export type BackendUserWord = {
  id: number;
  userId: number;
  wordId: number;
  status: string;
  learningStep: number;
  easinessFactor: number;
  repetitions: number;
  interval: number;
  dueAt: string;
  isFavorite: boolean;
  createdAt: string;
};

/**
 * A `/reviews/due` row. The account comes from the bearer token, so the request
 * carries no `userId`. `word` is what lets a due item render on a device that
 * never added it locally — treated as optional so a backend that still answers
 * with the bare user-word keeps working (the UI falls back to the local copy).
 */
export type BackendDueReview = BackendUserWord & {
  word?: BackendWord | null;
};

export type AddWordResponse = {
  word: BackendWord;
  userWord: BackendUserWord;
};

export type BulkAddWordResult =
  | {
      headword: string;
      success: true;
      word: BackendWord;
      userWord: BackendUserWord;
    }
  | { headword: string; success: false; error: string };

export type BulkAddWordResponse = BulkAddWordResult[];

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export type ReviewWordRequest = {
  quality: ReviewQuality;
};

export type ReviewWordResponse = BackendUserWord;
