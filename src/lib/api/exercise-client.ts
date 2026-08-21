import { QuizType, Word, WordMeaning } from "@/types";
import { ReviewQuality, ReviewWordRequest, WordRatingResponse } from "@/types/word";
import {
  ExerciseItem,
  ExerciseType,
  AutoGradedExerciseType,
  FlashcardExercise,
  FlashcardExerciseDefinition,
  SubmitExerciseRequest,
  SubmitExerciseResponse,
} from "@/types/exercise";
import { getAsync, postAsync } from "./client";
import {
  findWordById,
  invalidateDueReviews,
  normalizePos,
  patchCachedUserWord,
  pickRepresentativeDefinition,
} from "./word-client";
import { FALLBACK_CATEGORY } from "./category-client";

/**
 * Maps a UI quiz mode to the backend's exercise type. `null` for `image`,
 * which isn't implemented yet.
 */
export const QUIZ_TYPE_TO_EXERCISE_TYPE: Partial<
  Record<QuizType, ExerciseType>
> = {
  flashcards: "flashcard",
  "multiple-choice": "multiple_choice",
  "fill-blank": "fill_in_blank",
  "type-word": "type_missing_word",
  listening: "listening",
};

export async function getDueExercises(
  exerciseType: ExerciseType,
): Promise<ExerciseItem[]> {
  return getAsync<ExerciseItem[]>(
    `/exercises/due?exerciseType=${encodeURIComponent(exerciseType)}`,
    { auth: true },
  );
}

/** One `WordMeaning` per DUE flashcard definition that carries text. */
function mapFlashcardDefinitionsToMeanings(
  definitions: FlashcardExerciseDefinition[],
): WordMeaning[] {
  const meanings: WordMeaning[] = [];
  definitions.forEach((definition) => {
    const text = definition.definition?.trim();
    if (!text) return;
    meanings.push({
      pos: normalizePos(definition.partOfSpeech) ?? "",
      definition: text,
      example: "",
      translation: "",
    });
  });
  return meanings;
}

/**
 * Builds a flashcard session `Word` from the `/exercises/due` payload. Each
 * row bundles every currently DUE meaning under one word, so `Word.id` is the
 * word's own `userWordId` — the id `/exercises/word/:userWordId/submit` is
 * posted to — and `Word.meanings` holds exactly those due meanings (grading
 * applies to that same set —
 * `docs/adr/0013-flashcard-blends-grading-across-due-meanings`). A local copy
 * (matched by id) fills what the row doesn't carry (level, category,
 * mnemonic, example sentences). Unmatched words (never synced to this device)
 * fall back to synthetic gaps; rating them still updates local SRS state,
 * just not through a real backend id.
 */
export function mapFlashcardExerciseToWord(
  exercise: FlashcardExercise,
  allWords: Word[],
): Word {
  const local = findWordById(exercise.userWordId, allWords);
  const primary = exercise.definitions[0];
  const meanings = mapFlashcardDefinitionsToMeanings(exercise.definitions);

  return {
    id: `${exercise.userWordId}`,
    word: exercise.headword,
    ipa: exercise.ipaPronunciation ?? local?.ipa ?? `/${exercise.headword}/`,
    pos: normalizePos(primary?.partOfSpeech) ?? local?.pos ?? "n.",
    definition: primary?.definition ?? local?.definition,
    vietnamese: local?.vietnamese ?? primary?.definition ?? "",
    // The backend sends no example sentence for flashcard rows — local only.
    example: local?.example ?? "",
    translation: local?.translation ?? "",
    // Only the DUE meanings — a word with 3 senses but 1 due today shows (and
    // grades) that one, not all 3.
    meanings: meanings.length > 0 ? meanings : local?.meanings,
    level: local?.level ?? "B1",
    category: local?.category ?? FALLBACK_CATEGORY,
    mnemonic: local?.mnemonic,
  };
}

export async function submitExercise(
  userWordDefinitionId: number | string,
  exerciseType: AutoGradedExerciseType,
  answer: string,
): Promise<SubmitExerciseResponse> {
  const body: SubmitExerciseRequest = { exerciseType, answer };
  const response = await postAsync<SubmitExerciseResponse>(
    `/exercises/${userWordDefinitionId}/submit`,
    body,
    { auth: true },
  );
  invalidateDueReviews();
  // Grading here reschedules the same word `/reviews/:id` does, so the cached
  // library — which is what review reminders read — has to follow, or a word
  // just practised keeps announcing itself as due. `response.userWordId` is
  // the parent word id, which is what the cache is keyed by.
  patchCachedUserWord(response.userWordId, response.status, response.dueAt);
  return response;
}

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
  invalidateDueReviews();
  const representative = pickRepresentativeDefinition(response);
  if (representative) {
    patchCachedUserWord(userWordId, representative.status, representative.dueAt);
  }
  return response;
}

/**
 * SM-2 always resets `repetitions` to 0 on an incorrect (quality < 3) grade
 * and always increments it on a correct one — so `repetitions > 0` implies a
 * correct answer even without an explicit `isCorrect` flag in the response.
 */
export function isExerciseAnswerCorrect(
  response: SubmitExerciseResponse,
): boolean {
  if (typeof response.isCorrect === "boolean") return response.isCorrect;
  return response.repetitions > 0;
}
