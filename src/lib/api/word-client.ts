import {
  AddBulkWordsRequest,
  AddWordRequest,
  AddWordResponse,
  BackendDefinition,
  BackendDueReview,
  BackendUserWord,
  BackendWord,
  BackendWordListItem,
  BackendWordListResponse,
  BackendWordListRow,
  BulkAddWordResponse,
  ReviewQuality,
  ReviewWordResponse,
} from "@/types/word";
import {
  Word,
  SRSData,
  SRSState,
  LevelDifficulty,
  UserWordListItem,
  WordMeaning,
} from "@/types";
import {
  clearWordLibraryCache,
  loadWordLibraryCache,
  saveWordLibraryCache,
} from "@/lib/storage";
import { getAsync, postAsync } from "./client";
import { getCurrentUserId } from "./auth-client";
import { FALLBACK_CATEGORY, pickLatestCategoryName } from "./category-client";

export async function addWord(word: AddWordRequest): Promise<AddWordResponse> {
  const response = await postAsync<AddWordResponse>("/words", word, {
    auth: true,
  });
  invalidateDueReviews();
  invalidateUserWordLibrary();
  return response;
}

/**
 * Bulk equivalent of `addWord` — one request for the whole Excel/CSV import.
 * The response reports success or failure per headword (e.g. a duplicate key
 * violation), so a partial import never blocks the words that did land.
 */
export async function addWordsBulk(
  words: AddBulkWordsRequest,
): Promise<BulkAddWordResponse> {
  const response = await postAsync<BulkAddWordResponse>("/words/bulk", words, {
    auth: true,
  });
  invalidateDueReviews();
  invalidateUserWordLibrary();
  return response;
}

export async function submitReview(
  userWordId: number | string,
  quality: ReviewQuality,
): Promise<ReviewWordResponse> {
  const response = await postAsync<ReviewWordResponse>(
    `/reviews/${userWordId}`,
    { quality },
    { auth: true },
  );
  invalidateDueReviews();
  // A review moves one word's status and due date. Patching that row keeps the
  // cached library honest without re-reading every page of it.
  patchCachedUserWord(response.wordId, response.status, response.dueAt);
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
  options: { force?: boolean } = {},
): Promise<BackendDueReview[]> {
  const userId = getCurrentUserId();
  if (userId === null) return [];

  const key = String(userId);

  if (!options.force) {
    const cached = dueCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < DUE_CACHE_TTL_MS)
      return cached.data;

    const pending = dueInFlight.get(key);
    if (pending) return pending;
  }

  const request: Promise<BackendDueReview[]> = getAsync<BackendDueReview[]>(
    "/reviews/due",
    { auth: true },
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
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adverb: "adv.",
  pronoun: "pron.",
  preposition: "prep.",
  conjunction: "conj.",
  interjection: "interj.",
};

const LEVELS: LevelDifficulty[] = ["A1", "A2", "B1", "B2", "C1"];

function normalizePos(partOfSpeech?: string | null): string | undefined {
  const raw = partOfSpeech?.trim();
  if (!raw) return undefined;
  return POS_ABBREVIATIONS[raw.toLowerCase()] ?? raw;
}

/** The backend column is a free string; anything outside the app's ramp is dropped. */
function normalizeLevel(
  cefrLevel?: string | null,
): LevelDifficulty | undefined {
  const raw = cefrLevel?.trim().toUpperCase() as LevelDifficulty | undefined;
  return raw && LEVELS.includes(raw) ? raw : undefined;
}

const trimmed = (value?: string | null): string | undefined => {
  const text = value?.trim();
  return text ? text : undefined;
};

/**
 * One `WordMeaning` per backend definition that carries text, each keeping its
 * own part of speech and its own examples (`en` reads as the sentence, `vi` as
 * its translation). This is what lets a card page through the senses instead of
 * only showing the primary one.
 *
 * A sense can carry many English examples; `example` stays the first one so
 * everything that reads the flat field is unchanged, and `examples` holds the
 * whole list for the detail view.
 */
function mapBackendDefinitionsToMeanings(
  definitions: BackendDefinition[],
): WordMeaning[] {
  const meanings: WordMeaning[] = [];
  definitions.forEach((definition) => {
    const text = trimmed(definition.definition);
    if (!text) return;
    const examples = definition.examples ?? [];
    const english = examples
      .filter((e) => e.language !== "vi")
      .map((e) => trimmed(e.example))
      .filter(Boolean) as string[];
    meanings.push({
      pos: normalizePos(definition.partOfSpeech) ?? "",
      definition: text,
      example: english[0] ?? "",
      translation:
        trimmed(examples.find((e) => e.language === "vi")?.example) ?? "",
      ...(english.length > 0 ? { examples: english } : {}),
    });
  });
  return meanings;
}

/**
 * Builds an app `Word` out of a backend word, using its embedded definitions
 * when the endpoint sends them.
 *
 * The backend stores less than the card shows — no mnemonic, and a Vietnamese
 * sentence translation only if one was saved as a `vi` example — so every gap
 * is filled from `fallback`, i.e. the locally entered copy, before the
 * generated placeholder text is used. A word with no backend category keeps
 * whatever the local copy was filed under rather than being re-filed.
 */
export function mapBackendWordToWord(
  backendWord: BackendWord,
  fallback?: Partial<Word>,
): Word {
  const headword = backendWord.headword;
  const definitions = backendWord.definitions ?? [];
  const primary =
    definitions.find((d) => trimmed(d.definition)) ?? definitions[0];
  const examples = (primary?.examples ?? []).concat(
    definitions.filter((d) => d !== primary).flatMap((d) => d.examples ?? []),
  );
  const english = examples.find(
    (e) => e.language !== "vi" && trimmed(e.example),
  );
  const vietnameseExample = examples.find(
    (e) => e.language === "vi" && trimmed(e.example),
  );
  const meaning = trimmed(primary?.definition);
  // A backend word with no embedded definitions says nothing about the senses,
  // so the local copy's list is kept rather than collapsed to one.
  const meanings = mapBackendDefinitionsToMeanings(definitions);

  return {
    id: String(backendWord.id),
    word: headword,
    ipa:
      trimmed(backendWord.ipaPronunciation) ?? fallback?.ipa ?? `/${headword}/`,
    pos: normalizePos(primary?.partOfSpeech) ?? fallback?.pos ?? "n.",
    definition: meaning ?? fallback?.definition,
    // `vietnamese` is the meaning shown on the back of the card; the app writes
    // what the user typed into the backend's `definition`, so it round-trips.
    vietnamese: meaning ?? fallback?.vietnamese ?? "",
    example: trimmed(english?.example) ?? fallback?.example ?? "",
    translation:
      trimmed(vietnameseExample?.example) ??
      fallback?.translation ??
      `Ví dụ với ${headword}.`,
    meanings: meanings.length > 0 ? meanings : fallback?.meanings,
    audioUrl: trimmed(backendWord.audioUrl) ?? fallback?.audioUrl,
    level: normalizeLevel(backendWord.cefrLevel) ?? fallback?.level ?? "B1",
    category:
      pickLatestCategoryName(backendWord.categories) ??
      fallback?.category ??
      FALLBACK_CATEGORY,
    mnemonic: fallback?.mnemonic,
  };
}

export function mapAddWordResponseToWord(
  response: AddWordResponse,
  fallback?: Partial<Word>,
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
    state: (userWord.status as SRSState) || "new",
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
    state: (response.status as SRSState) || "learning",
  };
}

/**
 * Words added locally hold an optimistic `custom_…` id until the backend
 * answers with a numeric one, so a lookup by backend id compares as strings.
 */
export function findWordById(
  wordId: string | number,
  allWords: Word[],
): Word | undefined {
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
    pos: "n.",
    vietnamese: `Từ vựng #${targetId}`,
    example: `Example sentence for word #${targetId}.`,
    translation: `Ví dụ minh họa cho từ #${targetId}.`,
    level: "B1",
    category: FALLBACK_CATEGORY,
  };
}

/**
 * Reconciles a backend user-word with the account's locally stored words.
 *
 * The embedded `word` is what makes a due item readable on a device that never
 * added it — without it the only thing left to show is a `Word #9` placeholder.
 * A local copy still fills in what the backend has no column for.
 */
export function resolveWordForUserWord(
  userWord: BackendDueReview,
  allWords: Word[],
): Word {
  const local = findWordById(userWord.wordId, allWords);
  if (userWord.word) return mapBackendWordToWord(userWord.word, local);
  return local ?? createPlaceholderWord(userWord.wordId);
}

/** How many words the profile library lists per page. */
export const WORDS_PAGE_SIZE = 10;

/** Guard on the export loop so an endpoint that ignores `page` cannot spin. */
const MAX_EXPORT_PAGES = 500;

/** Declared in `@/types` so the storage layer can hold these without a cycle. */
export type { UserWordListItem };

export interface UserWordsPage {
  items: UserWordListItem[];
  /** Total words in the account, as reported (or counted) by the backend. */
  total: number;
  /**
   * False when `total` had to be inferred — from `totalPages`, or from this
   * page's offset — in which case it is an upper or lower bound, not a count.
   * The UI must not print an inferred number as the size of the library.
   */
  isTotalExact: boolean;
  page: number;
  pageSize: number;
  /** Derived, so a backend that sends only `totalPages` is still honoured. */
  totalPages: number;
}

const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return undefined;
};

const SRS_STATES: SRSState[] = ["new", "learning", "review", "mastered"];

/** The status column is a free string; anything the app has no pill for is dropped. */
function normalizeState(status?: string | null): SRSState | undefined {
  const raw = trimmed(status)?.toLowerCase() as SRSState | undefined;
  return raw && SRS_STATES.includes(raw) ? raw : undefined;
}

/**
 * Splits a list row into its word and the account's progress on it, which the
 * row carries either flattened onto the word or inside a `userWord` wrapper.
 */
function splitListRow(
  row: BackendWordListRow,
): { word: BackendWord; progress?: Partial<BackendUserWord> } | null {
  if (!row || typeof row !== "object") return null;

  if ("headword" in row && typeof row.headword === "string") {
    const flat = row as BackendWordListItem;
    return {
      word: flat,
      progress: {
        ...(flat.status ? { status: flat.status } : {}),
        ...(flat.dueAt ? { dueAt: flat.dueAt } : {}),
        ...(typeof flat.isFavorite === "boolean"
          ? { isFavorite: flat.isFavorite }
          : {}),
      },
    };
  }

  const wrapper = row as { word?: BackendWord | null; userWord?: BackendUserWord | null };
  if (wrapper.word && typeof wrapper.word === "object") {
    return { word: wrapper.word, progress: wrapper.userWord ?? undefined };
  }

  return null;
}

function mapListRow(row: BackendWordListRow, fallbacks: Word[]): UserWordListItem | null {
  const split = splitListRow(row);
  if (!split) return null;

  const { word: backendWord, progress } = split;
  const local = findWordById(backendWord.id, fallbacks);

  return {
    word: mapBackendWordToWord(backendWord, local),
    addedAt: trimmed(progress?.createdAt) ?? trimmed(backendWord.createdAt),
    state: normalizeState(progress?.status),
    dueAt: trimmed(progress?.dueAt),
    ...(typeof progress?.isFavorite === "boolean"
      ? { isFavorite: progress.isFavorite }
      : {}),
  };
}

/**
 * Reads one page of the account's words from `GET /words`.
 *
 * The contract is unconfirmed — the endpoint is absent from the deployed
 * OpenAPI document — so the response is read defensively. A bare array is taken
 * as the *whole* library and sliced here, which is also what a backend that
 * ignores `page`/`pageSize` produces; an envelope is trusted about its own page
 * and total. Either way the caller gets the same shape.
 *
 * Throws like every other client. `fallbacks` are the locally stored words,
 * used to fill the fields the backend has no column for.
 */
export async function fetchUserWords(
  options: { page?: number; pageSize?: number; fallbacks?: Word[] } = {},
): Promise<UserWordsPage> {
  const pageSize = Math.max(1, options.pageSize ?? WORDS_PAGE_SIZE);
  const page = Math.max(1, options.page ?? 1);
  const fallbacks = options.fallbacks ?? [];

  const data = await getAsync<BackendWordListResponse>(
    `/words?page=${page}&pageSize=${pageSize}`,
    { auth: true },
  );

  if (Array.isArray(data)) {
    const all = data.map((row) => mapListRow(row, fallbacks)).filter(Boolean) as UserWordListItem[];
    // A response longer than the page is the endpoint answering with everything,
    // so the window is applied here rather than shown as one very long page.
    const items = all.length > pageSize ? all.slice((page - 1) * pageSize, page * pageSize) : all;
    return {
      items,
      total: all.length,
      // The whole library was in hand, so the count is the count.
      isTotalExact: true,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
    };
  }

  const envelope = data ?? {};
  const meta = envelope.meta ?? {};
  const rows =
    envelope.data ?? envelope.items ?? envelope.words ?? envelope.results ?? [];
  const items = (Array.isArray(rows) ? rows : [])
    .map((row) => mapListRow(row, fallbacks))
    .filter(Boolean) as UserWordListItem[];

  const reportedPageSize =
    firstNumber(envelope.pageSize, envelope.limit, envelope.perPage, meta.pageSize, meta.limit) ??
    pageSize;
  const effectivePageSize = Math.max(1, reportedPageSize);
  const reportedPage =
    firstNumber(envelope.page, envelope.pageNumber, meta.page, meta.pageNumber) ?? page;
  const reportedTotalPages = firstNumber(envelope.totalPages, meta.totalPages);
  const reportedTotal = firstNumber(
    envelope.total,
    envelope.totalItems,
    envelope.count,
    meta.total,
    meta.totalItems,
  );

  // `total` is what paging is driven off, so when only `totalPages` came back it
  // is reconstructed from it — and when neither did, the offset of this page
  // plus what it holds is the smallest count that is certainly true.
  const total =
    reportedTotal ??
    (reportedTotalPages !== undefined
      ? reportedTotalPages * effectivePageSize
      : (reportedPage - 1) * effectivePageSize + items.length);

  return {
    items,
    total,
    isTotalExact: reportedTotal !== undefined,
    page: reportedPage,
    pageSize: effectivePageSize,
    totalPages: reportedTotalPages ?? Math.max(1, Math.ceil(total / effectivePageSize)),
  };
}

/**
 * Every word in the account, straight off the network.
 *
 * Pages through `fetchUserWords` until the reported total is covered, stopping
 * early on an empty page and hard-stopping at `MAX_EXPORT_PAGES` so a backend
 * that returns the same page forever cannot loop. Ids are de-duplicated for the
 * same reason.
 *
 * Prefer `getUserWordLibrary`, which answers from the cache — this is what it
 * calls on a miss.
 */
export async function fetchAllUserWords(
  options: { pageSize?: number; fallbacks?: Word[] } = {},
): Promise<UserWordListItem[]> {
  const pageSize = Math.max(1, options.pageSize ?? 100);
  const collected: UserWordListItem[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_EXPORT_PAGES; page++) {
    const result = await fetchUserWords({ page, pageSize, fallbacks: options.fallbacks });
    if (result.items.length === 0) break;

    let added = 0;
    result.items.forEach((item) => {
      const id = String(item.word.id);
      if (seen.has(id)) return;
      seen.add(id);
      collected.push(item);
      added++;
    });

    // Nothing new, or the backend answered with the whole library in one go.
    if (added === 0 || result.items.length < result.pageSize) break;
    if (result.total > 0 && collected.length >= result.total) break;
  }

  return collected;
}

/** How many words one `GET /words` request asks for while filling the cache. */
const LIBRARY_FETCH_PAGE_SIZE = 100;

/**
 * Concurrent readers of the library share one network read, keyed per account so
 * a sign-in can never be answered out of the previous user's request.
 */
const libraryInFlight = new Map<string, Promise<UserWordListItem[]>>();

/** Cache key for a client with no numeric user id (see `getCurrentUserId`). */
const ANON_SCOPE = "anon";

/**
 * Drops the cached library so the next read goes to the backend. Called after
 * anything that adds words — the library changes at no other time.
 */
export function invalidateUserWordLibrary(): void {
  libraryInFlight.clear();
  clearWordLibraryCache();
}

/**
 * Rewrites one cached row's progress in place, so a review does not cost a
 * refetch of the whole library. A no-op when nothing is cached, or when the
 * reviewed word is not in the copy on disk.
 *
 * This is what keeps the cache — and therefore the reminders that read it —
 * honest between two reads of `GET /words`. Every endpoint that reschedules a
 * word must call it: `/reviews/:id` here, `/exercises/:id/submit` in
 * `exercise-client`.
 */
export function patchCachedUserWord(
  wordId: number | string,
  status?: string | null,
  dueAt?: string | null,
): void {
  const cached = loadWordLibraryCache();
  if (!cached) return;

  const targetId = String(wordId);
  let changed = false;
  const items = cached.items.map((item) => {
    if (String(item.word.id) !== targetId) return item;
    changed = true;
    return {
      ...item,
      state: normalizeState(status) ?? item.state,
      dueAt: trimmed(dueAt) ?? item.dueAt,
    };
  });

  if (changed) saveWordLibraryCache(items, cached.fetchedAt);
}

export interface UserWordLibrary {
  items: UserWordListItem[];
  /** When the copy in hand was read from the backend. */
  fetchedAt: number;
  /** True when nothing was requested — the answer came from localStorage. */
  fromCache: boolean;
}

/**
 * The cached library, without touching the network — null when there is none.
 *
 * Synchronous on purpose: a caller that already has the answer on disk should
 * not have to flash a loading state to find that out. Never call it at render
 * time, though — localStorage does not exist during SSR.
 */
export function readCachedUserWordLibrary(): UserWordLibrary | null {
  const cached = loadWordLibraryCache();
  if (!cached) return null;
  return { items: cached.items, fetchedAt: cached.fetchedAt, fromCache: true };
}

/**
 * The account's whole word library, from localStorage when it is there.
 *
 * The library only changes when the account adds words, so it is fetched once
 * and then read from the cache on every later visit; `addWord`/`addWordsBulk`
 * drop the cache, which is what makes the next read fetch again. Pass `force`
 * for the explicit refresh button.
 *
 * `fallbacks` fill the fields the backend has no column for, so they are baked
 * into the cached rows — a mnemonic typed after the fetch shows up on the next
 * refresh, not before.
 */
export async function getUserWordLibrary(
  options: { force?: boolean; fallbacks?: Word[] } = {},
): Promise<UserWordLibrary> {
  const scope = String(getCurrentUserId() ?? ANON_SCOPE);

  if (!options.force) {
    const cached = readCachedUserWordLibrary();
    if (cached) return cached;

    const pending = libraryInFlight.get(scope);
    if (pending) {
      const items = await pending;
      return { items, fetchedAt: Date.now(), fromCache: false };
    }
  }

  const request = fetchAllUserWords({
    pageSize: LIBRARY_FETCH_PAGE_SIZE,
    fallbacks: options.fallbacks,
  })
    .then((items) => {
      // The account may have changed while this was open; writing then would
      // stamp one user's library onto another's key.
      if (String(getCurrentUserId() ?? ANON_SCOPE) === scope) {
        saveWordLibraryCache(items);
      }
      return items;
    })
    .finally(() => {
      // Only clear the slot this request owns — a later `force` may have
      // already replaced it.
      if (libraryInFlight.get(scope) === request) libraryInFlight.delete(scope);
    });

  libraryInFlight.set(scope, request);
  const items = await request;
  return { items, fetchedAt: Date.now(), fromCache: false };
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
    state: (userWord.status as SRSState) || "new",
  };
}
