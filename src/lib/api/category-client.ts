import { VocabularySet, WordCategory } from "@/types";
import { getAsync } from "./client";
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

/**
 * Names the app shipped before `/vocabulary-sets` existed. Used only while the
 * list is empty — a first run that has not reached the backend yet, or an
 * account whose fetch failed — so the pickers are never blank.
 */
export const FALLBACK_CATEGORY_NAMES: WordCategory[] = [
  'Custom',
  'IELTS',
  'TOEIC',
  'TOEFL',
  'Daily Life',
  'Business',
  'Academic',
  'Travel',
  'Technology',
  'Emotions',
  'Idioms & Phrasal Verbs',
];

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

  const seen = new Set<string>();
  return data.reduce<VocabularySet[]>((acc, raw) => {
    const set = mapBackendVocabularySet(raw as BackendVocabularySet);
    // Two rows with the same name would render as two identical chips that
    // filter identically — keep the first.
    if (!set || seen.has(set.name.toLowerCase())) return acc;

    seen.add(set.name.toLowerCase());
    acc.push(set);
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

/** Names for the pickers: the account's list, or the shipped names until it loads. */
export function categoryNames(sets: VocabularySet[]): WordCategory[] {
  const names = sets.map((s) => s.name).filter(Boolean);
  if (names.length === 0) return FALLBACK_CATEGORY_NAMES;

  // `Custom` is where locally added words land, so it must always be pickable
  // even when the backend does not define it.
  return names.some((name) => name.toLowerCase() === FALLBACK_CATEGORY.toLowerCase())
    ? names
    : [FALLBACK_CATEGORY, ...names];
}
