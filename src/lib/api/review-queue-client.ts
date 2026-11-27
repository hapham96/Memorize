import { CEFRLevel } from "@/types";
import { BackendDueReview } from "@/types/word";
import { normalizeSRSState } from "@/lib/srs";
import { getAsync, postAsync } from "./client";
import { invalidateUserWordLibrary } from "./word-client";

/** The most words one run from the home button holds. */
export const RUN_SIZE = 20;

const isGraduated = (status?: string | null) => {
  const state = normalizeSRSState(status);
  return state === "review" || state === "mastered";
};

/**
 * The words of the next run: those to review first, then the ones part way
 * through learning, then new ones.
 */
export function nextRun(queue: BackendDueReview[]): BackendDueReview[] {
  const rank = ({ definitions }: BackendDueReview) => {
    if (definitions.some((d) => isGraduated(d.status))) return 0;
    return definitions.some((d) => normalizeSRSState(d.status) === "learning") ? 1 : 2;
  };
  return [...queue].sort((a, b) => rank(a) - rank(b)).slice(0, RUN_SIZE);
}

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
    row.definitions.some((definition) => isGraduated(definition.status)),
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
