import { ActivityDay, LearningProgress } from "@/types";
import { getAsync, patchAsync, postAsync } from "./client";

/** Longest window the stats screen draws; the home chart takes its last week. */
export const ACTIVITY_DAYS = 28;

/** XP, level, streak and accuracy for the account behind the bearer token. */
export async function fetchLearningProgress(): Promise<LearningProgress> {
  return getAsync<LearningProgress>("/users/progress", { auth: true });
}

/** The last `days` Vietnam days, oldest first, empty days included. */
export async function fetchActivity(days = ACTIVITY_DAYS): Promise<ActivityDay[]> {
  return getAsync<ActivityDay[]>(`/stats/activity?days=${days}`, { auth: true });
}

/** `PATCH /words/favorites` takes at most 500 ids per call. */
const FAVORITES_BATCH = 500;

/** Local-only ids (`custom_…`) have no row on the server and are skipped. */
export async function setFavorites(wordIds: string[], isFavorite: boolean): Promise<void> {
  const userWordIds = wordIds.filter((id) => /^\d+$/.test(id)).map(Number);
  for (let i = 0; i < userWordIds.length; i += FAVORITES_BATCH) {
    await patchAsync(
      "/words/favorites",
      { userWordIds: userWordIds.slice(i, i + FAVORITES_BATCH), isFavorite },
      { auth: true },
    );
  }
}
