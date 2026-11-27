/**
 * Wire type for `GET /stats/summary`. The account comes from the bearer token,
 * so the request carries no id.
 *
 * Every field is optional on purpose: the endpoint is the home screen's only
 * remote source and a partial answer must still render — anything missing falls
 * back to the number derived from the local SRS map.
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
};

/** The app-side shape of `GET /stats/summary`, ready for the home screen. */
export interface StatsSummary {
  learnedToday: number;
  totalWords: number;
  learningCount: number;
  masteredCount: number;
}
