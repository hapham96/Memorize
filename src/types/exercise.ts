import { BackendExample, BackendUserWord } from './word';

/**
 * The exercise types served by `GET /exercises/due`. Only the four below are
 * also graded by `POST /exercises/:userWordId/submit` — flashcards keep the
 * existing `/reviews` flow, so they're excluded from `AutoGradedExerciseType`.
 */
export type AutoGradedExerciseType =
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'type_missing_word'
  | 'listening';

export type ExerciseType = 'flashcard' | AutoGradedExerciseType;

interface BaseExercise<T extends ExerciseType> {
  userWordId: number;
  exerciseType: T;
  headword: string;
  ipaPronunciation: string | null;
}

export interface FlashcardDefinition {
  definition: string;
  partOfSpeech: string | null;
  /** Same `{ example, language }` shape as everywhere else in this API, not plain strings. */
  examples: BackendExample[];
}

export interface FlashcardExercise extends BaseExercise<'flashcard'> {
  definitions: FlashcardDefinition[];
}

export interface MultipleChoiceExercise extends BaseExercise<'multiple_choice'> {
  options: string[];
}

export interface FillInBlankExercise extends BaseExercise<'fill_in_blank'> {
  sentence: string;
  definitionHint: string | null;
  partOfSpeech: string | null;
}

export interface TypeMissingWordExercise extends BaseExercise<'type_missing_word'> {
  sentence: string;
  options: string[];
}

export interface ListeningExercise extends BaseExercise<'listening'> {
  audioUrl: string | null;
}

export type AutoGradedExercise =
  | MultipleChoiceExercise
  | FillInBlankExercise
  | TypeMissingWordExercise
  | ListeningExercise;

/** The full union `GET /exercises/due` can answer with, across all five modes. */
export type ExerciseItem = FlashcardExercise | AutoGradedExercise;

export const isFlashcardExercise = (e: ExerciseItem): e is FlashcardExercise =>
  e.exerciseType === 'flashcard';

export const isMultipleChoiceExercise = (
  e: ExerciseItem
): e is MultipleChoiceExercise => e.exerciseType === 'multiple_choice';

export const isFillInBlankExercise = (e: ExerciseItem): e is FillInBlankExercise =>
  e.exerciseType === 'fill_in_blank';

export const isTypeMissingWordExercise = (
  e: ExerciseItem
): e is TypeMissingWordExercise => e.exerciseType === 'type_missing_word';

export const isListeningExercise = (e: ExerciseItem): e is ListeningExercise =>
  e.exerciseType === 'listening';

export interface SubmitExerciseRequest {
  exerciseType: AutoGradedExerciseType;
  answer: string;
}

/**
 * The backend's submit-exercise response isn't documented on the frontend
 * side; it's assumed to carry the same SRS columns `/reviews/:id` returns,
 * since both endpoints grade into the same `user_words` row. `isCorrect` is
 * read opportunistically if present, with a fallback in `isExerciseAnswerCorrect`.
 */
export type SubmitExerciseResponse = BackendUserWord & { isCorrect?: boolean };
