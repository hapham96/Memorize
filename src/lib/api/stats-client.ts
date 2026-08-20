import { BackendStatsSummary, StatsSummary } from "@/types/stats";
import { DailyActivity } from "@/lib/progress";
import { getAsync } from "./client";

/** The home screen's aggregate counters. */
export const STATS_SUMMARY_PATH = "/stats/summary";

/** `Date.getDay()` order, so a weekday name resolves to a real calendar day. */
const WEEKDAY_PREFIXES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Single-letter labels the weekly bar chart prints, in `Date.getDay()` order. */
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * A counter that has to stay distinguishable from zero: `null`/missing means
 * "the endpoint said nothing", which the caller answers with its local value,
 * while a real `0` is an answer and overrides it.
 */
function toOptionalCount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : undefined;
}

/**
 * Weekday names → `Date.getDay()` indices. Matching on the first three letters
 * accepts both `"Monday"` and a shortened `"Mon"`; anything unrecognised is
 * dropped rather than guessed at.
 */
function mapWeeklyActivity(raw: unknown): Record<number, number> {
  if (!raw || typeof raw !== "object") return {};

  return Object.entries(raw as Record<string, unknown>).reduce<Record<number, number>>(
    (acc, [name, value]) => {
      const index = WEEKDAY_PREFIXES.indexOf(name.trim().toLowerCase().slice(0, 3));
      if (index >= 0) acc[index] = toCount(value);
      return acc;
    },
    {},
  );
}

/** Wire summary → app summary. Missing or non-numeric counters read as zero. */
export function mapStatsSummary(data: unknown): StatsSummary {
  const summary = (data ?? {}) as BackendStatsSummary;
  const streak = toOptionalCount(summary.streak);

  return {
    learnedToday: toCount(summary.todayLearntWord),
    totalWords: toCount(summary.totalWords),
    learningCount: toCount(summary.learningWord),
    masteredCount: toCount(summary.masteredWord),
    ...(streak === undefined ? {} : { streak }),
    weeklyActivity: mapWeeklyActivity(summary.weeklyActivity),
  };
}

/**
 * The remote weekly series, laid out over the last `days` calendar days so the
 * chart keeps its real dates and its "today" marker.
 *
 * The endpoint sends weekday names, and seven consecutive days cover each name
 * exactly once — beyond seven days the names repeat, so an older bucket would
 * reuse a newer day's count. That is why the caller only ever asks for a week.
 */
export function buildRemoteActivitySeries(
  summary: StatsSummary,
  days = 7,
  now: Date = new Date(),
): DailyActivity[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i));
    return {
      date: date.toISOString(),
      dayLabel: DAY_LABELS[date.getDay()],
      count: summary.weeklyActivity[date.getDay()] ?? 0,
      isToday: date.getTime() === today.getTime(),
    };
  });
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
