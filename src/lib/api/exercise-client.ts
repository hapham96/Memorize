import { QuizType, Word } from '@/types';
import {
  ExerciseItem,
  ExerciseType,
  AutoGradedExerciseType,
  FlashcardExercise,
  SubmitExerciseRequest,
  SubmitExerciseResponse,
} from '@/types/exercise';
import { getAsync, postAsync } from './client';
import { invalidateDueReviews } from './word-client';
import { FALLBACK_CATEGORY } from './category-client';

/**
 * Maps a UI quiz mode to the backend's exercise type. `null` for `image`,
 * which isn't implemented yet.
 */
export const QUIZ_TYPE_TO_EXERCISE_TYPE: Partial<Record<QuizType, ExerciseType>> = {
  flashcards: 'flashcard',
  'multiple-choice': 'multiple_choice',
  'fill-blank': 'fill_in_blank',
  'type-word': 'type_missing_word',
  listening: 'listening',
};

export async function getDueExercises(exerciseType: ExerciseType): Promise<ExerciseItem[]> {
  return getAsync<ExerciseItem[]>(
    `/exercises/due?exerciseType=${encodeURIComponent(exerciseType)}`,
    { auth: true }
  );
}

/**
 * Builds a flashcard session `Word` from the sparse `/exercises/due` payload.
 * There's no `wordId` on this endpoint (only `userWordId`, the join-row id),
 * so a local copy is matched by headword text to keep `Word.id` — and
 * therefore SRS map keys and the existing `/reviews/:id` submission — exactly
 * as they already work today. Unmatched words (never synced to this device)
 * fall back to a synthetic id; rating them still updates local SRS state, just
 * not through a real backend id.
 */
export function mapFlashcardExerciseToWord(exercise: FlashcardExercise, allWords: Word[]): Word {
  const local = allWords.find((w) => w.word.toLowerCase() === exercise.headword.toLowerCase());
  const primary = exercise.definitions[0];
  const examples = primary?.examples ?? [];
  const englishExample = examples.find((e) => e.language !== 'vi' && e.example?.trim());
  const vietnameseExample = examples.find((e) => e.language === 'vi' && e.example?.trim());

  return {
    id: local?.id ?? `exercise_${exercise.userWordId}`,
    word: exercise.headword,
    ipa: exercise.ipaPronunciation ?? local?.ipa ?? `/${exercise.headword}/`,
    pos: primary?.partOfSpeech ?? local?.pos ?? 'n.',
    definition: primary?.definition ?? local?.definition,
    vietnamese: local?.vietnamese ?? primary?.definition ?? '',
    example: englishExample?.example ?? local?.example ?? '',
    translation: vietnameseExample?.example ?? local?.translation ?? '',
    level: local?.level ?? 'B1',
    category: local?.category ?? FALLBACK_CATEGORY,
    mnemonic: local?.mnemonic,
  };
}

export async function submitExercise(
  userWordId: number | string,
  exerciseType: AutoGradedExerciseType,
  answer: string
): Promise<SubmitExerciseResponse> {
  const body: SubmitExerciseRequest = { exerciseType, answer };
  const response = await postAsync<SubmitExerciseResponse>(
    `/exercises/${userWordId}/submit`,
    body,
    { auth: true }
  );
  invalidateDueReviews();
  return response;
}

/**
 * SM-2 always resets `repetitions` to 0 on an incorrect (quality < 3) grade
 * and always increments it on a correct one — so `repetitions > 0` implies a
 * correct answer even without an explicit `isCorrect` flag in the response.
 */
export function isExerciseAnswerCorrect(response: SubmitExerciseResponse): boolean {
  if (typeof response.isCorrect === 'boolean') return response.isCorrect;
  return response.repetitions > 0;
}
