import { LeaderboardEntry } from '@/types';

/**
 * Placeholder ranking, shown only while `GET /users/leaderboard` does not exist
 * (any failed fetch). It is labelled "Sample data" in the UI so it can never be
 * mistaken for real accounts.
 *
 * Delete this file and the `MOCK` branch in `LeaderboardCard` once the endpoint
 * ships — nothing else reads it.
 */
const MOCK_ROWS: Omit<LeaderboardEntry, 'rank'>[] = [
  { userId: -1, name: 'minhanh', wordsLearned: 428, masteredCount: 190 },
  { userId: -2, name: 'thuhien', wordsLearned: 391, masteredCount: 174 },
  { userId: -3, name: 'quangduy', wordsLearned: 356, masteredCount: 158 },
  { userId: -4, name: 'lananh', wordsLearned: 302, masteredCount: 121 },
  { userId: -5, name: 'hoangnam', wordsLearned: 287, masteredCount: 113 },
  { userId: -6, name: 'ngocmai', wordsLearned: 245, masteredCount: 98 },
  { userId: -7, name: 'trungkien', wordsLearned: 212, masteredCount: 84 },
  { userId: -8, name: 'phuongthao', wordsLearned: 186, masteredCount: 70 },
  { userId: -9, name: 'baolong', wordsLearned: 154, masteredCount: 61 },
  { userId: -10, name: 'khanhvy', wordsLearned: 131, masteredCount: 49 },
];

/**
 * The mock board, with the signed-in learner dropped into the middle of it so
 * the "You" row is visible in the preview. Ids are negative, so they can never
 * collide with a real account id.
 */
export function buildMockLeaderboard(
  currentUserId: number | null,
  currentUserName?: string,
): LeaderboardEntry[] {
  const rows = MOCK_ROWS.map((row, index) =>
    // Slot 5 is the one handed to the current user.
    index === 4 && currentUserId !== null
      ? { ...row, userId: currentUserId, name: currentUserName?.trim() || row.name }
      : row
  );

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
