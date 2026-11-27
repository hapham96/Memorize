import { SRSData, UserProgress } from '@/types';

/**
 * Recomputes every field that is a function of other state, so the UI can never
 * show a counter that drifted out of sync with the SRS map or settings. XP,
 * level, streak and accuracy are not here: the server owns those.
 */
export function deriveProgress(
  progress: UserProgress,
  srsMap: Record<string, SRSData>,
  dailyGoal: number
): UserProgress {
  // Every SRS entry counts, including words that exist only on the backend —
  // the local dataset is not the full picture of what the user has studied.
  const entries = Object.values(srsMap);
  const studied = entries.filter((srs) => srs.state !== 'new');
  const mastered = entries.filter((srs) => srs.state === 'mastered');

  return {
    ...progress,
    dailyGoal,
    wordsLearned: studied.length,
    masteredCount: mastered.length,
  };
}
