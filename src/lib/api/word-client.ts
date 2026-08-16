import { AddWordRequest, AddWordResponse, BackendUserWord, ReviewQuality, ReviewWordResponse } from "@/types/word";
import { Word, SRSData, SRSState } from "@/types";
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
  data: BackendUserWord[];
}

const dueCache = new Map<string, DueCacheEntry>();
const dueInFlight = new Map<string, Promise<BackendUserWord[]>>();

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
 */
export async function getDueReviews(
  userId: number | string = getCurrentUserId(),
  options: { force?: boolean } = {}
): Promise<BackendUserWord[]> {
  const key = String(userId);

  if (!options.force) {
    const cached = dueCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < DUE_CACHE_TTL_MS) return cached.data;

    const pending = dueInFlight.get(key);
    if (pending) return pending;
  }

  const request: Promise<BackendUserWord[]> = getAsync<BackendUserWord[]>(
    `/reviews/due?userId=${key}`,
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

export function mapAddWordResponseToWord(
  response: AddWordResponse,
  fallback?: Partial<Word>
): Word {
  return {
    id: String(response.word.id),
    word: response.word.headword,
    ipa: response.word.ipaPronunciation ?? fallback?.ipa ?? `/${response.word.headword}/`,
    pos: fallback?.pos ?? 'n.',
    vietnamese: fallback?.vietnamese ?? '',
    example: fallback?.example ?? `Example with ${response.word.headword}.`,
    translation: fallback?.translation ?? `Ví dụ với ${response.word.headword}.`,
    level: fallback?.level ?? (response.word.cefrLevel as any) ?? 'B1',
    category: fallback?.category ?? 'Custom',
    mnemonic: fallback?.mnemonic,
  };
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
 * Local ids are strings (`w1`), backend ids are numeric, so both forms are
 * tried before giving up.
 */
export function findWordById(wordId: string | number, allWords: Word[]): Word | undefined {
  const targetId = String(wordId);
  return allWords.find((w) => String(w.id) === targetId || w.id === `w${targetId}`);
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

/** Reconciles a backend user-word with the local dataset. */
export function resolveWordForUserWord(userWord: BackendUserWord, allWords: Word[]): Word {
  return findWordById(userWord.wordId, allWords) ?? createPlaceholderWord(userWord.wordId);
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


