import {
  AddWordRequest,
  AddWordResponse,
  BackendDueReview,
  BackendUserWord,
  BackendWord,
  ReviewQuality,
  ReviewWordResponse,
} from "@/types/word";
import { Word, SRSData, SRSState, LevelDifficulty } from "@/types";
import { getAsync, postAsync } from "./client";
import { getCurrentUserId } from "./auth-client";

export async function addWord(word: AddWordRequest): Promise<AddWordResponse> {
  const response = await postAsync<AddWordResponse>("/words", word, { auth: true });
  invalidateDueReviews();
  return response;
}

export async function submitReview(
  userWordId: number | string,
  quality: ReviewQuality
): Promise<ReviewWordResponse> {
  const response = await postAsync<ReviewWordResponse>(
    `/reviews/${userWordId}`,
    { quality },
    { auth: true }
  );
  invalidateDueReviews();
  return response;
}

/**
 * How long a due list is reused. Long enough to collapse the burst that mount,
 * a tab switch and the reminder poll produce together; short enough that a word
 * falling due is picked up on the next poll rather than a stale one.
 */
const DUE_CACHE_TTL_MS = 30_000;

interface DueCacheEntry {
  fetchedAt: number;
  data: BackendDueReview[];
}

const dueCache = new Map<string, DueCacheEntry>();
const dueInFlight = new Map<string, Promise<BackendDueReview[]>>();

/**
 * Drops every cached due list so the next read goes to the backend. Called
 * after anything that changes what is due, and on account changes.
 */
export function invalidateDueReviews(): void {
  dueCache.clear();
  dueInFlight.clear();
}

/**
 * Three independent callers ask for this — mount hydration, the review tab and
 * the reminder poll — so results are shared for `DUE_CACHE_TTL_MS` and
 * concurrent asks collapse into a single request. Pass `force` when the answer
 * must be fresh; failures are never cached.
 *
 * The backend reads the account off the bearer token, so no id is sent. The id
 * is still read locally for two reasons: a signed-out client has nothing to ask
 * for, and the cache stays keyed per account so a new sign-in can never be
 * answered out of the previous user's entry.
 */
export async function getDueReviews(
  options: { force?: boolean } = {}
): Promise<BackendDueReview[]> {
  const userId = getCurrentUserId();
  if (userId === null) return [];

  const key = String(userId);

  if (!options.force) {
    const cached = dueCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < DUE_CACHE_TTL_MS) return cached.data;

    const pending = dueInFlight.get(key);
    if (pending) return pending;
  }

  const request: Promise<BackendDueReview[]> = getAsync<BackendDueReview[]>(
    '/reviews/due',
    { auth: true }
  )
    .then((data) => {
      dueCache.set(key, { fetchedAt: Date.now(), data });
      return data;
    })
    .finally(() => {
      // Only clear the slot this request owns — a later `force` call may have
      // already replaced it.
      if (dueInFlight.get(key) === request) dueInFlight.delete(key);
    });

  dueInFlight.set(key, request);
  return request;
}

/** Long-form parts of speech the backend may hold, in the form the UI renders. */
const POS_ABBREVIATIONS: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  pronoun: 'pron.',
  preposition: 'prep.',
  conjunction: 'conj.',
  interjection: 'interj.',
};

const LEVELS: LevelDifficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

function normalizePos(partOfSpeech?: string | null): string | undefined {
  const raw = partOfSpeech?.trim();
  if (!raw) return undefined;
  return POS_ABBREVIATIONS[raw.toLowerCase()] ?? raw;
}

/** The backend column is a free string; anything outside the app's ramp is dropped. */
function normalizeLevel(cefrLevel?: string | null): LevelDifficulty | undefined {
  const raw = cefrLevel?.trim().toUpperCase() as LevelDifficulty | undefined;
  return raw && LEVELS.includes(raw) ? raw : undefined;
}

const trimmed = (value?: string | null): string | undefined => {
  const text = value?.trim();
  return text ? text : undefined;
};

/**
 * Builds an app `Word` out of a backend word, using its embedded definitions
 * when the endpoint sends them.
 *
 * The backend stores strictly less than the card shows — no category, no
 * mnemonic, and a Vietnamese sentence translation only if one was saved as a
 * `vi` example — so every gap is filled from `fallback`, i.e. the locally
 * entered copy, before the generated placeholder text is used.
 */
export function mapBackendWordToWord(
  backendWord: BackendWord,
  fallback?: Partial<Word>
): Word {
  const headword = backendWord.headword;
  const definitions = backendWord.definitions ?? [];
  const primary = definitions.find((d) => trimmed(d.definition)) ?? definitions[0];
  const examples = (primary?.examples ?? []).concat(
    definitions.filter((d) => d !== primary).flatMap((d) => d.examples ?? [])
  );
  const english = examples.find((e) => e.language !== 'vi' && trimmed(e.example));
  const vietnameseExample = examples.find((e) => e.language === 'vi' && trimmed(e.example));
  const meaning = trimmed(primary?.definition);

  return {
    id: String(backendWord.id),
    word: headword,
    ipa: trimmed(backendWord.ipaPronunciation) ?? fallback?.ipa ?? `/${headword}/`,
    pos: normalizePos(primary?.partOfSpeech) ?? fallback?.pos ?? 'n.',
    definition: meaning ?? fallback?.definition,
    // `vietnamese` is the meaning shown on the back of the card; the app writes
    // what the user typed into the backend's `definition`, so it round-trips.
    vietnamese: meaning ?? fallback?.vietnamese ?? '',
    example: trimmed(english?.example) ?? fallback?.example ?? `Example with ${headword}.`,
    translation:
      trimmed(vietnameseExample?.example) ?? fallback?.translation ?? `Ví dụ với ${headword}.`,
    level: normalizeLevel(backendWord.cefrLevel) ?? fallback?.level ?? 'B1',
    category: fallback?.category ?? 'Custom',
    mnemonic: fallback?.mnemonic,
  };
}

export function mapAddWordResponseToWord(
  response: AddWordResponse,
  fallback?: Partial<Word>
): Word {
  return mapBackendWordToWord(response.word, fallback);
}

export function mapAddWordResponseToSRS(response: AddWordResponse): SRSData {
  const userWord = response.userWord;
  return {
    userWordId: userWord.id,
    wordId: String(userWord.wordId),
    interval: userWord.interval,
    easeFactor: userWord.easinessFactor,
    repetitions: userWord.repetitions,
    lastReviewed: null,
    nextReviewDate: userWord.dueAt,
    state: (userWord.status as SRSState) || 'new',
  };
}

export function mapReviewResponseToSRS(response: ReviewWordResponse): SRSData {
  return {
    userWordId: response.id,
    wordId: String(response.wordId),
    interval: response.interval,
    easeFactor: response.easinessFactor,
    repetitions: response.repetitions,
    lastReviewed: new Date().toISOString(),
    nextReviewDate: response.dueAt,
    state: (response.status as SRSState) || 'learning',
  };
}

/**
 * Words added locally hold an optimistic `custom_…` id until the backend
 * answers with a numeric one, so a lookup by backend id compares as strings.
 */
export function findWordById(wordId: string | number, allWords: Word[]): Word | undefined {
  const targetId = String(wordId);
  return allWords.find((w) => String(w.id) === targetId);
}

/** Stand-in for a backend word this client has no local copy of. */
export function createPlaceholderWord(wordId: string | number): Word {
  const targetId = String(wordId);
  return {
    id: targetId,
    word: `Word #${targetId}`,
    ipa: `/#${targetId}/`,
    pos: 'n.',
    vietnamese: `Từ vựng #${targetId}`,
    example: `Example sentence for word #${targetId}.`,
    translation: `Ví dụ minh họa cho từ #${targetId}.`,
    level: 'B1',
    category: 'Custom',
  };
}

/**
 * Reconciles a backend user-word with the account's locally stored words.
 *
 * The embedded `word` is what makes a due item readable on a device that never
 * added it — without it the only thing left to show is a `Word #9` placeholder.
 * A local copy still fills in what the backend has no column for.
 */
export function resolveWordForUserWord(userWord: BackendDueReview, allWords: Word[]): Word {
  const local = findWordById(userWord.wordId, allWords);
  if (userWord.word) return mapBackendWordToWord(userWord.word, local);
  return local ?? createPlaceholderWord(userWord.wordId);
}

export function mapBackendUserWordToSRS(userWord: BackendUserWord): SRSData {
  return {
    userWordId: userWord.id,
    wordId: String(userWord.wordId),
    interval: userWord.interval,
    easeFactor: userWord.easinessFactor,
    repetitions: userWord.repetitions,
    lastReviewed: null,
    nextReviewDate: userWord.dueAt,
    state: (userWord.status as SRSState) || 'new',
  };
}


