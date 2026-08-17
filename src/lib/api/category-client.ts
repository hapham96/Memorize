import { Category, WordCategory } from "@/types";
import { BackendCategory } from "@/types/word";
import { getAsync } from "./client";
import { loadCategories, saveCategories } from "@/lib/storage";

/**
 * The bucket a word falls into when nothing else names one. It is local-only —
 * the backend has no such row — so it is always offered alongside the fetched
 * list rather than expected to come back from `/categories`.
 */
export const FALLBACK_CATEGORY: WordCategory = 'Custom';

/**
 * Names the app shipped before `/categories` existed. Used only while the list
 * is empty — a first run that has not reached the backend yet, or an account
 * whose fetch failed — so the pickers are never blank.
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
function mapBackendCategory(category: BackendCategory): Category | null {
  const name = typeof category?.name === 'string' ? category.name.trim() : '';
  if (!name) return null;

  const createdAt = category.createdAt?.trim();
  return {
    id: Number(category.id),
    name,
    ...(createdAt ? { createdAt } : {}),
  };
}

function toCategories(data: unknown): Category[] {
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  return data.reduce<Category[]>((acc, raw) => {
    const category = mapBackendCategory(raw as BackendCategory);
    // Two rows with the same name would render as two identical chips that
    // filter identically — keep the first.
    if (!category || seen.has(category.name.toLowerCase())) return acc;

    seen.add(category.name.toLowerCase());
    acc.push(category);
    return acc;
  }, []);
}

export async function fetchCategories(): Promise<Category[]> {
  return toCategories(await getAsync<BackendCategory[]>('/categories', { auth: true }));
}

/**
 * The single read of `/categories`, run at sign-in.
 *
 * The list is small and effectively static, so it is fetched once and served
 * from localStorage thereafter. `force` is what sign-in passes to refresh the
 * cached copy; every other caller reuses the stored list and only reaches the
 * network when there is nothing stored at all. A failed fetch keeps whatever
 * was cached — a category picker is not worth blocking a session over.
 */
export async function syncCategories(
  options: { force?: boolean } = {}
): Promise<Category[]> {
  const cached = loadCategories();
  if (!options.force && cached.length > 0) return cached;

  try {
    const categories = await fetchCategories();
    // An empty answer is not worth overwriting a usable cached list with.
    if (categories.length === 0) return cached;

    saveCategories(categories);
    return categories;
  } catch (e) {
    if (cached.length > 0) return cached;
    throw e;
  }
}

/**
 * The one category a word is labelled with. A word can belong to several and
 * the card has room for one, so the latest wins.
 *
 * A row is only `{ id, name }`, so there is no timestamp to sort on: the last
 * entry of the array is taken as the most recently attached one. `createdAt` is
 * still honoured if the backend ever starts sending it.
 */
export function pickLatestCategoryName(
  categories?: BackendCategory[] | null
): WordCategory | undefined {
  if (!Array.isArray(categories)) return undefined;

  const named = categories.filter((c) => typeof c?.name === 'string' && c.name.trim());
  if (named.length === 0) return undefined;

  const latest = named.reduce((newest, candidate) => {
    const candidateAt = Date.parse(candidate.createdAt ?? '');
    const newestAt = Date.parse(newest.createdAt ?? '');
    // Either side missing a usable date drops back to array order.
    if (Number.isNaN(candidateAt) || Number.isNaN(newestAt)) return candidate;
    return candidateAt >= newestAt ? candidate : newest;
  });

  return latest.name.trim();
}

/** Names for the pickers: the account's list, or the shipped names until it loads. */
export function categoryNames(categories: Category[]): WordCategory[] {
  const names = categories.map((c) => c.name).filter(Boolean);
  if (names.length === 0) return FALLBACK_CATEGORY_NAMES;

  // `Custom` is where locally added words land, so it must always be pickable
  // even when the backend does not define it.
  return names.some((name) => name.toLowerCase() === FALLBACK_CATEGORY.toLowerCase())
    ? names
    : [FALLBACK_CATEGORY, ...names];
}
