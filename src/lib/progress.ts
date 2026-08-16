import { SRSData, UserProgress } from '@/types';

export const XP_PER_LEVEL = 300;

export function levelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function daysBetween(from: string, to: Date): number {
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return Number.POSITIVE_INFINITY;
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Applies the passage of time to stored progress: the daily goal resets each
 * calendar day, and a streak only survives if the last active day was today or
 * yesterday. Without this the stored numbers keep yesterday's values forever.
 */
export function applyDailyRollover(progress: UserProgress, now: Date = new Date()): UserProgress {
  const gap = daysBetween(progress.lastActiveDate, now);
  if (gap <= 0) return progress;

  return {
    ...progress,
    dailyGoalProgress: 0,
    streak: gap === 1 ? progress.streak : 0,
  };
}

/**
 * Marks the user active now, extending the streak once per calendar day.
 */
export function recordActivity(progress: UserProgress, now: Date = new Date()): UserProgress {
  if (dayKey(progress.lastActiveDate) === dayKey(now)) return progress;

  const gap = daysBetween(progress.lastActiveDate, now);
  const streak = gap === 1 ? progress.streak + 1 : 1;

  return {
    ...progress,
    streak,
    bestStreak: Math.max(progress.bestStreak ?? 0, streak),
    lastActiveDate: now.toISOString(),
    dailyGoalProgress: gap === 0 ? progress.dailyGoalProgress : 0,
  };
}

/**
 * Recomputes every field that is a function of other state, so the UI can never
 * show a counter that drifted out of sync with the SRS map or settings.
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
    level: levelFromXp(progress.xp),
    dailyGoal,
    dailyGoalProgress: Math.min(dailyGoal, progress.dailyGoalProgress),
    wordsLearned: studied.length,
    masteredCount: mastered.length,
    bestStreak: Math.max(progress.bestStreak ?? 0, progress.streak),
  };
}

export type DailyActivity = {
  date: string;
  dayLabel: string;
  count: number;
  isToday: boolean;
};

/**
 * Buckets real quiz history into the last `days` calendar days.
 * Used by both the weekly bar chart and the activity heatmap so neither
 * invents numbers.
 */
export function buildActivitySeries(
  progress: UserProgress,
  days: number,
  now: Date = new Date()
): DailyActivity[] {
  const counts = new Map<string, number>();
  progress.history.forEach((item) => {
    const key = dayKey(item.timestamp);
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + item.totalQuestions);
  });

  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayKey = dayKey(now);

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    const key = dayKey(date);
    return {
      date: date.toISOString(),
      dayLabel: labels[date.getDay()],
      count: counts.get(key) ?? 0,
      isToday: key === todayKey,
    };
  });
}
