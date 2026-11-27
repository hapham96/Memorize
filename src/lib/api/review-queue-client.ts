import { CEFRLevel } from "@/types";
import { BackendDueReview } from "@/types/word";
import { normalizeSRSState } from "@/lib/srs";
import { getAsync, postAsync } from "./client";
import { invalidateUserWordLibrary } from "./word-client";

export interface QueueCounts {
  fresh: number;
  again: number;
}

/**
 * Every due word of any phase: what the home button counts and studies. Unlike
 * `/reviews/due` it includes new and learning words.
 */
export async function getReviewQueue(): Promise<BackendDueReview[]> {
  return getAsync<BackendDueReview[]>("/reviews/queue", { auth: true });
}

/**
 * How many queued words are brand new or still being learned, and how many are
 * coming back for review. A word with a graduated meaning due counts as the latter.
 */
export function countQueue(queue: BackendDueReview[]): QueueCounts {
  const again = queue.filter((row) =>
    row.definitions.some((definition) => {
      const state = normalizeSRSState(definition.status);
      return state === "review" || state === "mastered";
    }),
  ).length;

  return { fresh: queue.length - again, again };
}

export interface StarterWord {
  headword: string;
  partOfSpeech: string;
  definition: string;
}

/** The ten words offered for a level, for the new account to pick from. */
export async function fetchStarterWords(cefrLevel?: CEFRLevel): Promise<StarterWord[]> {
  const query = cefrLevel ? `?cefrLevel=${cefrLevel}` : "";
  return getAsync<StarterWord[]>(`/starter-words${query}`, { auth: true });
}

/**
 * Adds the picked Starter Words. The server adds them only to an
 * account with no words, so calling twice is harmless.
 */
export async function giveStarterWords(
  cefrLevel?: CEFRLevel,
  headwords?: string[],
): Promise<{ added: number }> {
  const result = await postAsync<{ added: number }>(
    "/starter-words",
    { cefrLevel, headwords },
    { auth: true },
  );
  invalidateUserWordLibrary();
  return result;
}
