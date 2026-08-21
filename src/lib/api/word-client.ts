import {
  AddBulkWordsRequest,
  AddWordRequest,
  AddWordResponse,
  BackendDueReview,
  BackendUserWord,
  BackendWordDefinition,
  BackendWordListItem,
  BackendWordListResponse,
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
  VocabularySet,
  WordMeaning,
} from "@/types";
import {
  clearWordLibraryCache,
  loadWordLibraryCache,
  saveWordLibraryCache,
} from "@/lib/storage";
import { getAsync, postAsync } from "./client";
import { getCurrentUserId } from "./auth-client";
import { FALLBACK_CATEGORY, resolveVocabularySetName } from "./category-client";

/**
 * The word-level columns `mapBackendWordToWord` actually reads — shared by
 * `BackendUserWord` (`GET /words/bulk`, add-word responses) and
 * `BackendWordListItem` (`GET /words`), which report the same word columns
 * but not the same envelope.
 */
type BackendWordCore = {
  id: number;
  headword: string;
  ipaPronunciation: string | null;
  audioUrl: string | null;
  cefrLevel: string | null;
  vocabularySetId: number;
};

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
  userWordDefinitionId: number | string,
  quality: ReviewQuality,
): Promise<ReviewWordResponse> {
  const response = await postAsync<ReviewWordResponse>(
    `/reviews/${userWordDefinitionId}`,
    { quality },
    { auth: true },
  );
  invalidateDueReviews();
  // A review moves one definition's status and due date. Patching the parent
  // word's cached row keeps the cached library honest without re-reading
  // every page of it.
  patchCachedUserWord(response.userWordId, response.status, response.dueAt);
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
 * One `WordMeaning` per backend definition that carries text. The backend no
 * longer distinguishes an English example from a Vietnamese one (one `example`
 * string, no language tag), so `translation` has no backend source anymore —
 * it is left for the caller's `fallback` to fill.
 */
function mapBackendDefinitionsToMeanings(
  definitions: BackendWordDefinition[],
): WordMeaning[] {
  const meanings: WordMeaning[] = [];
  definitions.forEach((definition) => {
    const text = trimmed(definition.definition);
    if (!text) return;
    const example = trimmed(definition.example);
    meanings.push({
      pos: normalizePos(definition.partOfSpeech) ?? "",
      definition: text,
      example: example ?? "",
      translation: "",
      ...(example ? { examples: [example] } : {}),
    });
  });
  return meanings;
}

/**
 * Builds an app `Word` out of a backend word and its sibling definitions —
 * separate objects now that SRS state moved off the word and onto each sense.
 *
 * The backend stores less than the card shows — no mnemonic, no Vietnamese
 * translation of the example — so every gap is filled from `fallback`, i.e.
 * the locally entered copy, before the generated placeholder text is used. A
 * word with no resolvable vocabulary set keeps whatever the local copy was
 * filed under rather than being re-filed.
 */
export function mapBackendWordToWord(
  backendWord: BackendWordCore,
  definitions: BackendWordDefinition[],
  vocabularySets: VocabularySet[],
  fallback?: Partial<Word>,
): Word {
  const headword = backendWord.headword;
  const primary =
    definitions.find((d) => trimmed(d.definition)) ?? definitions[0];
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
    example: trimmed(primary?.example) ?? fallback?.example ?? "",
    translation: fallback?.translation ?? `Ví dụ với ${headword}.`,
    meanings: meanings.length > 0 ? meanings : fallback?.meanings,
    audioUrl: trimmed(backendWord.audioUrl) ?? fallback?.audioUrl,
    level: normalizeLevel(backendWord.cefrLevel) ?? fallback?.level ?? "B1",
    category:
      resolveVocabularySetName(backendWord.vocabularySetId, vocabularySets) ??
      fallback?.category ??
      FALLBACK_CATEGORY,
    mnemonic: fallback?.mnemonic,
  };
}

export function mapAddWordResponseToWord(
  response: AddWordResponse,
  vocabularySets: VocabularySet[],
  fallback?: Partial<Word>,
): Word {
  return mapBackendWordToWord(response.word, response.definitions, vocabularySets, fallback);
}

/**
 * The word's primary sense is "the" SRS entry the library-level `srsMap`
 * tracks for it — a deliberate simplification distinct from the review flow's
 * true per-definition tracking, since adding a word / browsing the library
 * isn't part of the one-card-per-definition review model.
 */
export function mapAddWordResponseToSRS(
  response: { word: BackendUserWord; definitions: BackendWordDefinition[] },
): SRSData | undefined {
  const primary = response.definitions[0];
  if (!primary) return undefined;

  return {
    userWordId: primary.id,
    wordId: String(response.word.id),
    interval: primary.interval,
    easeFactor: primary.easinessFactor,
    repetitions: primary.repetitions,
    lastReviewed: null,
    nextReviewDate: primary.dueAt,
    state: (primary.status as SRSState) || "new",
  };
}

export function mapReviewResponseToSRS(response: ReviewWordResponse): SRSData {
  return {
    userWordId: response.id,
    wordId: String(response.id),
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
 * Reconciles a `/reviews/due` row with the account's locally stored words.
 *
 * Each row is one definition (one card), so `Word.id` is the definition's own
 * id — the id `/reviews/:id` is posted to. The row's flat fields make the card
 * readable on a device that never added the word locally; a local copy
 * (matched by the parent word id) fills what those flat fields don't carry
 * (mnemonic, resolved category, etc).
 */
export function resolveWordForUserWord(
  dueRow: BackendDueReview,
  allWords: Word[],
): Word {
  const local = findWordById(dueRow.userWordId, allWords);
  return {
    id: String(dueRow.id),
    word: dueRow.headword,
    ipa: trimmed(dueRow.ipaPronunciation) ?? local?.ipa ?? `/${dueRow.headword}/`,
    pos: normalizePos(dueRow.partOfSpeech) ?? local?.pos ?? "n.",
    definition: trimmed(dueRow.definition) ?? local?.definition,
    vietnamese: trimmed(dueRow.definition) ?? local?.vietnamese ?? "",
    example: trimmed(dueRow.example) ?? local?.example ?? "",
    translation: local?.translation ?? `Ví dụ với ${dueRow.headword}.`,
    audioUrl: trimmed(dueRow.audioUrl) ?? local?.audioUrl,
    level: normalizeLevel(dueRow.cefrLevel) ?? local?.level ?? "B1",
    category: local?.category ?? FALLBACK_CATEGORY,
    mnemonic: local?.mnemonic,
  };
}

/** How many words the profile library lists per page. */
export const WORDS_PAGE_SIZE = 10;

/** Guard on the export loop so an endpoint that ignores `pageNumber` cannot spin. */
const MAX_EXPORT_PAGES = 500;

/** Declared in `@/types` so the storage layer can hold these without a cycle. */
export type { UserWordListItem };

export interface UserWordsPage {
  items: UserWordListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const SRS_STATES: SRSState[] = ["new", "learning", "review", "mastered"];

/** The status column is a free string; anything the app has no pill for is dropped. */
function normalizeState(status?: string | null): SRSState | undefined {
  const raw = trimmed(status)?.toLowerCase() as SRSState | undefined;
  return raw && SRS_STATES.includes(raw) ? raw : undefined;
}

/**
 * The word's "worst case" definition — the one due soonest — so a library
 * card's single `state`/`dueAt` reflects whichever sense needs attention
 * first, and a reminder fires as soon as any sense is due.
 */
function pickRepresentativeDefinition(
  definitions: BackendWordDefinition[],
): BackendWordDefinition | undefined {
  return definitions.reduce<BackendWordDefinition | undefined>((soonest, d) => {
    if (!soonest) return d;
    const soonestAt = Date.parse(soonest.dueAt);
    const dAt = Date.parse(d.dueAt);
    if (Number.isNaN(dAt)) return soonest;
    if (Number.isNaN(soonestAt)) return d;
    return dAt < soonestAt ? d : soonest;
  }, undefined);
}

function mapListRow(
  row: BackendWordListItem,
  fallbacks: Word[],
  vocabularySets: VocabularySet[],
): UserWordListItem {
  const local = findWordById(row.id, fallbacks);
  const representative = pickRepresentativeDefinition(row.definitions);

  return {
    word: mapBackendWordToWord(row, row.definitions, vocabularySets, local),
    // The word-level response reports no `createdAt` of its own; the earliest
    // definition's is the closest stand-in.
    addedAt: trimmed(representative?.createdAt),
    state: normalizeState(representative?.status),
    dueAt: trimmed(representative?.dueAt),
    isFavorite: row.isFavorite,
  };
}

/**
 * Reads one page of the account's words from `GET /words`.
 *
 * `fallbacks` are the locally stored words, used to fill the fields the
 * backend has no column for. `vocabularySets` resolves each word's single
 * `vocabularySetId` to a display name.
 */
export async function fetchUserWords(
  options: {
    page?: number;
    pageSize?: number;
    fallbacks?: Word[];
    vocabularySets?: VocabularySet[];
  } = {},
): Promise<UserWordsPage> {
  const pageSize = Math.max(1, options.pageSize ?? WORDS_PAGE_SIZE);
  const page = Math.max(1, options.page ?? 1);
  const fallbacks = options.fallbacks ?? [];
  const vocabularySets = options.vocabularySets ?? [];

  const data = await getAsync<BackendWordListResponse>(
    `/words?pageNumber=${page}&pageSize=${pageSize}`,
    { auth: true },
  );

  const items = (data.items ?? []).map((row) => mapListRow(row, fallbacks, vocabularySets));

  return {
    items,
    total: data.totalItems,
    page: data.pageNumber,
    pageSize: data.pageSize,
    totalPages: data.totalPages,
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
  options: { pageSize?: number; fallbacks?: Word[]; vocabularySets?: VocabularySet[] } = {},
): Promise<UserWordListItem[]> {
  const pageSize = Math.max(1, options.pageSize ?? 100);
  const collected: UserWordListItem[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_EXPORT_PAGES; page++) {
    const result = await fetchUserWords({
      page,
      pageSize,
      fallbacks: options.fallbacks,
      vocabularySets: options.vocabularySets,
    });
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
 * `exercise-client`. `wordId` here is the *parent word* id (a review/exercise
 * reschedules one definition, but the cached row only tracks one representative
 * state for the whole word).
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
 * refresh, not before. `vocabularySets` resolves each word's category name.
 */
export async function getUserWordLibrary(
  options: { force?: boolean; fallbacks?: Word[]; vocabularySets?: VocabularySet[] } = {},
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
    vocabularySets: options.vocabularySets,
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

/** Maps one `/reviews/due` row straight to the SRS schedule it carries. */
export function mapBackendUserWordToSRS(dueRow: BackendDueReview): SRSData {
  return {
    userWordId: dueRow.id,
    wordId: String(dueRow.id),
    interval: dueRow.interval,
    easeFactor: dueRow.easinessFactor,
    repetitions: dueRow.repetitions,
    lastReviewed: null,
    nextReviewDate: dueRow.dueAt,
    state: (dueRow.status as SRSState) || "new",
  };
}
