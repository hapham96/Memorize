import { CEFRLevel } from "@/types";
import {
  BackendDueReview,
  ReviewQuality,
  WordRatingResponse,
} from "@/types/word";
import { getAsync, postAsync } from "./client";
import {
  invalidateDueReviews,
  invalidateUserWordLibrary,
  patchCachedUserWord,
  pickRepresentativeDefinition,
} from "./word-client";

/**
 * Every due word of any phase: what the home button counts and what its one
 * flashcard run goes through. Unlike `/reviews/due` it includes new and
 * learning words.
 */
export async function getReviewQueue(): Promise<BackendDueReview[]> {
  return getAsync<BackendDueReview[]>("/reviews/queue", { auth: true });
}

/** One rating for every due meaning of the word, whatever its phase. */
export async function submitQueueWord(
  userWordId: number | string,
  quality: ReviewQuality,
): Promise<WordRatingResponse> {
  const response = await postAsync<WordRatingResponse>(
    `/reviews/queue/${userWordId}`,
    { quality },
    { auth: true },
  );
  invalidateDueReviews();
  const representative = pickRepresentativeDefinition(response);
  if (representative) {
    patchCachedUserWord(userWordId, representative.status, representative.dueAt);
  }
  return response;
}

/**
 * The ten words a new account starts with. The server adds them only to an
 * account with no words, so calling twice is harmless.
 */
export async function giveStarterWords(
  cefrLevel?: CEFRLevel,
): Promise<{ added: number }> {
  const result = await postAsync<{ added: number }>(
    "/starter-words",
    cefrLevel ? { cefrLevel } : {},
    { auth: true },
  );
  invalidateDueReviews();
  invalidateUserWordLibrary();
  return result;
}
