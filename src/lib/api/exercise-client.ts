import { QuizType, Word } from "@/types";
import {
  ExerciseItem,
  ExerciseType,
  AutoGradedExerciseType,
  FlashcardExercise,
  SubmitExerciseRequest,
  SubmitExerciseResponse,
} from "@/types/exercise";
import { getAsync, postAsync } from "./client";
import { invalidateDueReviews, patchCachedUserWord } from "./word-client";
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

/**
 * Builds a flashcard session `Word` from the sparse `/exercises/due` payload.
 * Each row is one definition, so `Word.id` is the exercise's own
 * `userWordDefinitionId` — the id `/reviews/:id` is posted to. A local copy is
 * matched by headword text to fill what the flat row doesn't carry (level,
 * category, mnemonic). Unmatched words (never synced to this device) fall back
 * to a synthetic id; rating them still updates local SRS state, just not
 * through a real backend id.
 */
export function mapFlashcardExerciseToWord(
  exercise: FlashcardExercise,
  allWords: Word[],
): Word {
  const local = allWords.find(
    (w) => w.word.toLowerCase() === exercise.headword.toLowerCase(),
  );

  return {
    id: `${exercise.userWordDefinitionId}`,
    word: exercise.headword,
    ipa: exercise.ipaPronunciation ?? local?.ipa ?? `/${exercise.headword}/`,
    pos: exercise.partOfSpeech ?? local?.pos ?? "n.",
    definition: exercise.definition ?? local?.definition,
    vietnamese: local?.vietnamese ?? exercise.definition ?? "",
    // The backend sends no example sentence for flashcard rows — local only.
    example: local?.example ?? "",
    translation: local?.translation ?? "",
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
