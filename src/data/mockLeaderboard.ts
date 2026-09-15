import { Leaderboard, LeaderboardEntry } from '@/types';

/**
 * Placeholder ranking, shown only when `GET /users/leaderboard` fails. It is
 * labelled "Sample data" in the UI so it can never be mistaken for real accounts.
 *
 * Delete this file and the `MOCK` branch in `LeaderboardCard` once the endpoint
 * is dependable — nothing else reads it.
 */
const MOCK_ROWS: Omit<LeaderboardEntry, 'rank'>[] = [
  { userId: -1, name: 'minhanh', score: 428 },
  { userId: -2, name: 'thuhien', score: 391 },
  { userId: -3, name: 'quangduy', score: 356 },
  { userId: -4, name: 'lananh', score: 302 },
  { userId: -5, name: 'hoangnam', score: 287 },
  { userId: -6, name: 'ngocmai', score: 245 },
  { userId: -7, name: 'trungkien', score: 212 },
  { userId: -8, name: 'phuongthao', score: 186 },
  { userId: -9, name: 'baolong', score: 154 },
  { userId: -10, name: 'khanhvy', score: 131 },
];

/**
 * The mock board, with the signed-in learner dropped into the middle of it so
 * the "You" row is visible in the preview. Ids are negative, so they can never
 * collide with a real account id. The period is the current month — the same
 * window the real board reports on.
 */
export function buildMockLeaderboard(
  currentUserId: number | null,
  currentUserName?: string,
): Leaderboard {
  const rows = MOCK_ROWS.map((row, index) =>
    // Slot 5 is the one handed to the current user.
    index === 4 && currentUserId !== null
      ? { ...row, userId: currentUserId, name: currentUserName?.trim() || row.name }
      : row
  );

  const now = new Date();
  return {
    // UTC month start, matching how the endpoint pins its period — the label is
    // formatted in UTC, so a local-midnight date would name the previous month
    // west of Greenwich.
    period: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    entries: rows.map((row, index) => ({ ...row, rank: index + 1 })),
  };
}
