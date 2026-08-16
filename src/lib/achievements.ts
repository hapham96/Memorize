import { Achievement, SRSData, UserProgress } from '@/types';
import { INITIAL_ACHIEVEMENTS } from '@/data/achievements';

/** Current value for each achievement, read from real progress. */
const PROGRESS_RESOLVERS: Record<
  string,
  (progress: UserProgress, srsMap: Record<string, SRSData>) => number
> = {
  first_step: (progress) => (progress.history.length > 0 ? 1 : 0),
  streak_3: (progress) => Math.max(progress.streak, progress.bestStreak ?? 0),
  streak_7: (progress) => Math.max(progress.streak, progress.bestStreak ?? 0),
  words_20: (progress) => progress.wordsLearned,
  words_100: (progress) => progress.masteredCount,
  perfect_quiz: (progress) =>
    progress.history.some(
      (item) => item.totalQuestions > 0 && item.correctCount === item.totalQuestions
    )
      ? 1
      : 0,
  night_owl: (progress) => progress.xp,
};

/**
 * Recomputes every achievement from the user's actual numbers. The seeds in
 * INITIAL_ACHIEVEMENTS only supply titles, icons and thresholds — their
 * `unlocked`/`progress` values are placeholders and never shown as-is.
 */
export function computeAchievements(
  progress: UserProgress,
  srsMap: Record<string, SRSData>
): Achievement[] {
  return INITIAL_ACHIEVEMENTS.map((achievement) => {
    const resolve = PROGRESS_RESOLVERS[achievement.id];
    if (!resolve) return achievement;

    const current = Math.max(0, resolve(progress, srsMap));
    return {
      ...achievement,
      progress: Math.min(current, achievement.maxProgress),
      unlocked: current >= achievement.maxProgress,
    };
  });
}
