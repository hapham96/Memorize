import { SRSData, SRSState } from '@/types';
import { ReviewQuality } from '@/types/word';

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * Rating 5 levels:
 * 1: Quên (Blackout / Again)
 * 2: Yếu (Very Hard / Incorrect)
 * 3: Khó (Hard / Hesitant)
 * 4: Tốt (Good / Normal)
 * 5: Dễ (Easy / Perfect)
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
