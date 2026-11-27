import { CEFRLevel } from "@/types";
import { BackendDueReview } from "@/types/word";
import { normalizeSRSState } from "@/lib/srs";
import { getAsync, postAsync } from "./client";
import { invalidateDueReviews, invalidateUserWordLibrary } from "./word-client";

/**
 * Every due word of any phase. Unlike `/reviews/due` it includes new and
 * learning words; `splitQueue` tells the two apart.
 */
export async function getReviewQueue(): Promise<BackendDueReview[]> {
  return getAsync<BackendDueReview[]>("/reviews/queue", { auth: true });
}

/**
 * Words to review (graduated meanings) apart from words still being practised
 * (new or learning). Each row keeps only the meanings of its own phase, which
 * are also the only ones its submit endpoint grades. A word with due meanings
 * of both phases is in both lists.
 */
export function splitQueue(queue: BackendDueReview[]): {
  review: BackendDueReview[];
  practice: BackendDueReview[];
} {
  const only = (graduated: boolean) =>
    queue.flatMap((row) => {
      const definitions = row.definitions.filter((definition) => {
        const state = normalizeSRSState(definition.status);
        return (state === "review" || state === "mastered") === graduated;
      });
      return definitions.length > 0
        ? [{ ...row, definitions, example: definitions[0].example ?? null }]
        : [];
    });

  return { review: only(true), practice: only(false) };
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
  invalidateDueReviews();
  invalidateUserWordLibrary();
  return result;
}
