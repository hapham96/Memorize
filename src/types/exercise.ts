import { BackendWordDefinition } from './word';

/**
 * The exercise types served by `GET /exercises/due`. Only the four below are
 * also graded by `POST /exercises/:userWordDefinitionId/submit` — flashcards
 * keep the existing `/reviews` flow, so they're excluded from
 * `AutoGradedExerciseType`.
 */
export type AutoGradedExerciseType =
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'type_missing_word'
  | 'listening';

export type ExerciseType = 'flashcard' | AutoGradedExerciseType;

interface BaseExercise<T extends ExerciseType> {
  userWordDefinitionId: number;
  exerciseType: T;
  headword: string;
  ipaPronunciation: string | null;
}

export interface FlashcardExercise extends BaseExercise<'flashcard'> {
  definition: string;
  partOfSpeech: string | null;
}

export interface MultipleChoiceExercise extends BaseExercise<'multiple_choice'> {
  options: string[];
  /** Not used for local grading — `/exercises/:id/submit` remains the source of truth. */
  correctAnswer?: string;
}

export interface FillInBlankExercise extends BaseExercise<'fill_in_blank'> {
  sentence: string;
  definitionHint: string | null;
  partOfSpeech: string | null;
  correctAnswer?: string;
}

export interface TypeMissingWordExercise extends BaseExercise<'type_missing_word'> {
  sentence: string;
  options: string[];
  correctAnswer?: string;
}

export interface ListeningExercise extends BaseExercise<'listening'> {
  audioUrl: string | null;
  correctAnswer?: string;
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
 * `/exercises/:userWordDefinitionId/submit` grades into the same definition
 * row `/reviews/:id` does, so the response carries the same SRS columns plus
 * `isCorrect`. `userWordId` here is the *parent word*, not the definition —
 * use it to patch the cached library row.
 */
export type SubmitExerciseResponse = BackendWordDefinition & { isCorrect?: boolean };
