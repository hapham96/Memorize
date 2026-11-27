import { ReviewQuality, ReviewWordRequest, WordRatingResponse } from "@/types/word";
import { postAsync } from "./client";
import { patchCachedUserWord, pickRepresentativeDefinition } from "./word-client";

/**
 * Rates a Flashcard in the Learning phase — one `quality` applied to every
 * DUE meaning under `userWordId` at once
 * (`docs/adr/0013-flashcard-blends-grading-across-due-meanings`).
 */
export async function submitFlashcardExercise(
  userWordId: number | string,
  quality: ReviewQuality,
): Promise<WordRatingResponse> {
  const body: ReviewWordRequest = { quality };
  const response = await postAsync<WordRatingResponse>(
    `/exercises/word/${userWordId}/submit`,
    body,
    { auth: true },
  );
  const representative = pickRepresentativeDefinition(response);
  if (representative) {
    patchCachedUserWord(userWordId, representative.status, representative.dueAt);
  }
  return response;
}
