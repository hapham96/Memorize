import { VocabularySet, WordCategory } from "@/types";
import { deleteAsync, getAsync, patchAsync, postAsync } from "./client";
import { loadCategories, saveCategories } from "@/lib/storage";

/**
 * The backend row shape for `GET /vocabulary-sets` — `VocabularySetResponseDto`.
 */
interface BackendVocabularySet {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

/**
 * The bucket a word falls into when nothing else names one. It is local-only —
 * the backend has no such row — so it is always offered alongside the fetched
 * list rather than expected to come back from `/vocabulary-sets`.
 */
export const FALLBACK_CATEGORY: WordCategory = 'Custom';

/** Drops rows with no usable name; the name is what the whole UI keys on. */
function mapBackendVocabularySet(set: BackendVocabularySet): VocabularySet | null {
  const name = typeof set?.name === 'string' ? set.name.trim() : '';
  if (!name) return null;

  return {
    id: Number(set.id),
    userId: Number(set.userId),
    name,
    description: typeof set.description === 'string' ? set.description : null,
    isDefault: Boolean(set.isDefault),
    createdAt: set.createdAt,
  };
}

function toVocabularySets(data: unknown): VocabularySet[] {
  if (!Array.isArray(data)) return [];

  // Names need not be unique: every row is kept, since each has its own id.
  return data.reduce<VocabularySet[]>((acc, raw) => {
    const set = mapBackendVocabularySet(raw as BackendVocabularySet);
    if (set) acc.push(set);
    return acc;
  }, []);
}

export async function fetchVocabularySets(): Promise<VocabularySet[]> {
  return toVocabularySets(
    await getAsync<BackendVocabularySet[]>('/vocabulary-sets', { auth: true }),
  );
}

/**
 * The single read of `/vocabulary-sets`, run at sign-in.
 *
 * The list is small and effectively static, so it is fetched once and served
 * from localStorage thereafter. `force` is what sign-in passes to refresh the
 * cached copy; every other caller reuses the stored list and only reaches the
 * network when there is nothing stored at all. A failed fetch keeps whatever
 * was cached — a category picker is not worth blocking a session over.
 */
export async function syncVocabularySets(
  options: { force?: boolean } = {}
): Promise<VocabularySet[]> {
  const cached = loadCategories();
  if (!options.force && cached.length > 0) return cached;

  try {
    const sets = await fetchVocabularySets();
    // An empty answer is not worth overwriting a usable cached list with.
    if (sets.length === 0) return cached;

    saveCategories(sets);
    return sets;
  } catch (e) {
    if (cached.length > 0) return cached;
    throw e;
  }
}

/**
 * The name of the vocabulary set a word is filed under. A word now belongs to
 * exactly one set (`vocabularySetId`), so this is a lookup, not a pick-latest.
 */
export function resolveVocabularySetName(
  vocabularySetId: number | null | undefined,
  sets: VocabularySet[],
): WordCategory | undefined {
  if (vocabularySetId === null || vocabularySetId === undefined) return undefined;
  return sets.find((s) => s.id === vocabularySetId)?.name;
}

export async function createVocabularySet(name: string): Promise<VocabularySet> {
  const created = await postAsync<BackendVocabularySet>(
    "/vocabulary-sets",
    { name: name.trim() },
    { auth: true },
  );
  return mapBackendVocabularySet(created)!;
}

export async function renameVocabularySet(id: number, name: string): Promise<void> {
  await patchAsync(`/vocabulary-sets/${id}`, { name: name.trim() }, { auth: true });
}

/** The server moves the set's words to the default set before deleting it. */
export async function deleteVocabularySet(id: number): Promise<void> {
  await deleteAsync(`/vocabulary-sets/${id}`, { auth: true });
}

/** How many ids the move endpoint accepts at once. */
const MOVE_BATCH = 500;

export async function moveWordsToSet(setId: number, wordIds: string[]): Promise<void> {
  const userWordIds = wordIds.filter((id) => /^\d+$/.test(id)).map(Number);
  for (let i = 0; i < userWordIds.length; i += MOVE_BATCH) {
    await postAsync(
      `/vocabulary-sets/${setId}/words`,
      { userWordIds: userWordIds.slice(i, i + MOVE_BATCH) },
      { auth: true },
    );
  }
}
