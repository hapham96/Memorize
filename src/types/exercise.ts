import { BackendWordDefinition } from './word';

/**
 * The exercise types served by `GET /exercises/due`. Only the four below are
 * also graded by `POST /exercises/:userWordDefinitionId/submit` — flashcards
 * are graded word-level instead, via `POST /exercises/word/:userWordId/submit`.
 */
export type AutoGradedExerciseType =
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'type_missing_word'
  | 'listening';

export type ExerciseType = 'flashcard' | AutoGradedExerciseType;

interface BaseAutoGradedExercise<T extends AutoGradedExerciseType> {
  userWordDefinitionId: number;
  exerciseType: T;
  headword: string;
  ipaPronunciation: string | null;
}

export interface MultipleChoiceExercise extends BaseAutoGradedExercise<'multiple_choice'> {
  options: string[];
  /** Not used for local grading — `/exercises/:id/submit` remains the source of truth. */
  correctAnswer?: string;
}

export interface FillInBlankExercise extends BaseAutoGradedExercise<'fill_in_blank'> {
  sentence: string;
  definitionHint: string | null;
  partOfSpeech: string | null;
  correctAnswer?: string;
}

export interface TypeMissingWordExercise extends BaseAutoGradedExercise<'type_missing_word'> {
  sentence: string;
  options: string[];
  correctAnswer?: string;
}

export interface ListeningExercise extends BaseAutoGradedExercise<'listening'> {
  audioUrl: string | null;
  correctAnswer?: string;
}

export type AutoGradedExercise =
  | MultipleChoiceExercise
  | FillInBlankExercise
  | TypeMissingWordExercise
  | ListeningExercise;

/** One DUE meaning within a `flashcard`-mode `GET /exercises/due` row. */
export interface FlashcardExerciseDefinition {
  userWordDefinitionId: number;
  definition: string;
  partOfSpeech: string | null;
}

/**
 * A `flashcard`-mode `GET /exercises/due` row — one per word (not per
 * meaning), bundling every currently due meaning under `definitions` so the
 * card can show and grade them together
 * (`docs/adr/0013-flashcard-blends-grading-across-due-meanings`). Rated as a
 * whole via `POST /exercises/word/:userWordId/submit`.
 */
export interface FlashcardExercise {
  userWordId: number;
  exerciseType: 'flashcard';
  headword: string;
  ipaPronunciation: string | null;
  definitions: FlashcardExerciseDefinition[];
}

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
