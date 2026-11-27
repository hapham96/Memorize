import { ActivityDay } from '@/types';

/** A server day is a bare date; reading it as UTC keeps that date anywhere. */
export function toUtcDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** `0` = Monday … `6` = Sunday, the column order of the heatmap. */
export function weekdayColumn(day: string): number {
  return (toUtcDate(day).getUTCDay() + 6) % 7;
}

export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function formatDay(day: string): string {
  const date = toUtcDate(day);
  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
}

export function totalReviewsIn(days: ActivityDay[]): number {
  return days.reduce((sum, d) => sum + d.count, 0);
}
