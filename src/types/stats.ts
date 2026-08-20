/**
 * Wire type for `GET /stats/summary`. The account comes from the bearer token,
 * so the request carries no id.
 *
 * Every field is optional on purpose: the endpoint is the home screen's only
 * remote source and a partial answer must still render — anything missing falls
 * back to the number derived from the local SRS map.
 *
 * `weeklyActivity` is keyed by full English weekday name (`"Monday"`), not by
 * date, and its key order is not the display order. The app resolves each name
 * against the last seven calendar days itself.
 */
export type BackendStatsSummary = {
  /** Words studied today — what the daily goal ring counts against. */
  todayLearntWord?: number | null;
  /** Words in the account's library, whatever their SRS state. */
  totalWords?: number | null;
  /** Words being studied but not yet mastered. */
  learningWord?: number | null;
  /** Words the backend considers mastered. */
  masteredWord?: number | null;
  /** Consecutive active days, counted across every device on the account. */
  streak?: number | null;
  /** Weekday name → words reviewed that day. */
  weeklyActivity?: Record<string, number> | null;
};

/** The app-side shape of `GET /stats/summary`, ready for the home screen. */
export interface StatsSummary {
  learnedToday: number;
  totalWords: number;
  learningCount: number;
  masteredCount: number;
  /**
   * Absent when the response carried no usable number — the local streak stands
   * in that case, so a backend that stops sending it cannot zero the badge.
   */
  streak?: number;
  /** Words reviewed per weekday, keyed by `Date.getDay()` (0 = Sunday). */
  weeklyActivity: Record<number, number>;
}
