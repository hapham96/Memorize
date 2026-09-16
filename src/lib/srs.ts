import { SRSData, SRSState } from '@/types';
import { ReviewQuality } from '@/types/word';

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * Rating 6 levels (0-5 Quality Rating Scale):
 * 0 (Complete blackout): Failure to recognize or recall item.
 * 1 (Incorrect, remembered): Wrong response, remembered upon reveal.
 * 2 (Incorrect, familiar): Wrong response, felt familiar upon reveal.
 * 3 (Correct with difficulty): Correct response, but required serious effort.
 * 4 (Correct with hesitation): Correct response, recalled after brief pause.
 * 5 (Perfect recall): Correct response, given without hesitation.
 */
export function calculateNextSRS(
  currentSRS: SRSData,
  rating: ReviewQuality
): SRSData {
  let { interval, easeFactor, repetitions } = currentSRS;

  // Calculate new Ease Factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const q = rating;
  let newEF = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newInterval: number;
  let newRepetitions: number;

  if (q < 3) {
    // Forgot/Again
    newRepetitions = 0;
    newInterval = 1;
  } else {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEF);
    }
    newRepetitions = repetitions + 1;
  }

  // Determine state
  let newState: SRSState = 'learning';
  if (newInterval >= 21) {
    newState = 'mastered';
  } else if (newRepetitions > 1) {
    newState = 'review';
  }

  const now = new Date();
  const nextDate = new Date();
  nextDate.setDate(now.getDate() + newInterval);

  return {
    ...currentSRS,
    interval: newInterval,
    easeFactor: newEF,
    repetitions: newRepetitions,
    lastReviewed: now.toISOString(),
    nextReviewDate: nextDate.toISOString(),
    state: newState,
  };
}

/**
 * The backend's `status` values, mapped to the app's four `SRSState`s.
 *
 * The two vocabularies differ by exactly one word: the backend calls the
 * graduated state `reviewing`, the app calls it `review` (the state
 * `calculateNextSRS` assigns above). The app's own spelling is accepted too, so
 * a state read back out of localStorage round-trips unchanged.
 */
const BACKEND_SRS_STATUSES: Record<string, SRSState> = {
  new: 'new',
  learning: 'learning',
  reviewing: 'review',
  review: 'review',
  mastered: 'mastered',
};

/**
 * Reads a backend `status` string as an `SRSState` — the single place that
 * translation happens.
 *
 * Every path that takes a status off the wire must come through here. A raw
 * `as SRSState` cast puts `reviewing` into `SRSData.state`, where it matches no
 * comparison the app makes: `ReviewDashboard`'s upcoming count, the library's
 * status filter and both status pills all test for `review` and would silently
 * miss every graduated word.
 *
 * An unrecognised status is `undefined`, never a guess — the caller decides
 * whether that means `new`, `learning`, or no pill at all.
 */
export function normalizeSRSState(status?: string | null): SRSState | undefined {
  const raw = status?.trim().toLowerCase();
  return raw ? BACKEND_SRS_STATUSES[raw] : undefined;
}

export function createInitialSRS(wordId: string): SRSData {
  return {
    wordId,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lastReviewed: null,
    nextReviewDate: new Date().toISOString(),
    state: 'new',
  };
}
