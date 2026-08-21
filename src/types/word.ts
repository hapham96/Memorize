export type WordDefinitionRequest = {
  definition: string;
  partOfSpeech?: string;
  example?: string;
};

export type AddWordRequest = {
  headword: string;
  /** Omit to use (or lazily create) the caller's default vocabulary set. */
  vocabularySetId?: number;
  ipaPronunciation: string;
  audioUrl: string;
  cefrLevel: string;
  definitions: WordDefinitionRequest[];
};

export type AddBulkWordsRequest = {
  words: AddWordRequest[];
};

/**
 * One (user, word, sense) row — `UserWordDefinitionResponseDto`. SRS state lives
 * here, not on the word, since the backend schedules each sense independently.
 */
export type BackendWordDefinition = {
  id: number;
  /** The parent word row this definition belongs to. */
  userWordId: number;
  definition: string;
  partOfSpeech: string | null;
  example: string | null;
  status: string;
  learningStep: number;
  easinessFactor: number;
  repetitions: number;
  /** Days, meaningful once status is reviewing/mastered. */
  interval: number;
  dueAt: string;
  graduatedAt: string | null;
  createdAt: string;
};

/** A word row — `UserWordResponseDto`. No SRS fields; those live per-definition. */
export type BackendUserWord = {
  id: number;
  userId: number;
  headword: string;
  ipaPronunciation: string | null;
  audioUrl: string | null;
  cefrLevel: string | null;
  vocabularySetId: number;
  isFavorite: boolean;
  createdAt: string;
};

/**
 * A `/reviews/due` row — `DueReviewResponseDto`. Flat: one definition, plus the
 * word columns needed to render it without a second lookup. The account comes
 * from the bearer token, so the request carries no `userId`.
 */
export type BackendDueReview = BackendWordDefinition & {
  headword: string;
  ipaPronunciation: string | null;
  audioUrl: string | null;
  cefrLevel: string | null;
};

export type AddWordResponse = {
  word: BackendUserWord;
  definitions: BackendWordDefinition[];
};

/**
 * A `/words/bulk` result. `word`/`definitions` are absent when `success` is
 * false (e.g. a duplicate headword), so a partial import never blocks the
 * words that did land.
 */
export type BulkAddWordResult = {
  word?: BackendUserWord;
  definitions?: BackendWordDefinition[];
  headword: string;
  success: boolean;
  error?: string;
};

export type BulkAddWordResponse = BulkAddWordResult[];

/**
 * A `GET /words` row — `WordListItemDto`. Per-word SRS status is gone; each
 * entry in `definitions` carries its own.
 */
export type BackendWordListItem = {
  id: number;
  headword: string;
  ipaPronunciation: string | null;
  audioUrl: string | null;
  cefrLevel: string | null;
  vocabularySetId: number;
  isFavorite: boolean;
  definitions: BackendWordDefinition[];
};

/** `GET /words` — `GetWordsResponseDto`. A fixed shape, not an envelope to guess at. */
export type BackendWordListResponse = {
  items: BackendWordListItem[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export type ReviewWordRequest = {
  quality: ReviewQuality;
};

export type ReviewWordResponse = BackendWordDefinition;
