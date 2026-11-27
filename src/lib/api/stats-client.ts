import { BackendStatsSummary, StatsSummary } from "@/types/stats";
import { getAsync } from "./client";

/** The home screen's aggregate counters. */
export const STATS_SUMMARY_PATH = "/stats/summary";

function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** Wire summary → app summary. Missing or non-numeric counters read as zero. */
export function mapStatsSummary(data: unknown): StatsSummary {
  const summary = (data ?? {}) as BackendStatsSummary;
  return {
    learnedToday: toCount(summary.todayLearntWord),
    totalWords: toCount(summary.totalWords),
    learningCount: toCount(summary.learningWord),
    masteredCount: toCount(summary.masteredWord),
  };
}

/**
 * Reads the account's aggregate counters. Throws like every other client — the
 * caller catches and keeps the locally derived numbers, since the home screen
 * has to render whether or not this endpoint answers.
 */
export async function fetchStatsSummary(): Promise<StatsSummary> {
  const data = await getAsync<BackendStatsSummary>(STATS_SUMMARY_PATH, { auth: true });
  return mapStatsSummary(data);
}
