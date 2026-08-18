import { LeaderboardEntry } from "@/types";
import { BackendLeaderboardEntry } from "@/types/leaderboard";
import { getAsync } from "./client";

/** How many learners the stats screen shows. */
export const LEADERBOARD_LIMIT = 10;

/**
 * The ranking endpoint. It is not built yet, so it is kept in one place: when
 * the backend lands under a different path, this is the only line to change.
 */
export const LEADERBOARD_PATH = "/users/leaderboard";

/**
 * A name to print for a row. The backend stores no display name, so the email
 * local-part is the same fallback the profile screen uses; an id-only row still
 * gets something readable rather than a blank cell.
 */
function resolveName(entry: BackendLeaderboardEntry): string {
  const displayName = entry.displayName?.trim();
  if (displayName) return displayName;

  const local = entry.email?.split('@')[0]?.trim();
  if (local) return local;

  return `User #${entry.userId}`;
}

/**
 * Wire rows → board rows: drops anything without a usable numeric id, sorts by
 * words learned (ties broken by mastered count, then name so the order is
 * stable between renders), then numbers what survives.
 */
export function mapLeaderboard(
  data: unknown,
  limit = LEADERBOARD_LIMIT,
): LeaderboardEntry[] {
  if (!Array.isArray(data)) return [];

  const rows = data.reduce<Omit<LeaderboardEntry, 'rank'>[]>((acc, raw) => {
    const entry = raw as BackendLeaderboardEntry;
    const userId = Number(entry?.userId);
    if (!Number.isFinite(userId)) return acc;

    const wordsLearned = Number(entry?.wordsLearned);
    const masteredCount = Number(entry?.masteredCount);

    acc.push({
      userId,
      name: resolveName(entry),
      wordsLearned: Number.isFinite(wordsLearned) ? wordsLearned : 0,
      ...(Number.isFinite(masteredCount) ? { masteredCount } : {}),
    });
    return acc;
  }, []);

  return rows
    .sort(
      (a, b) =>
        b.wordsLearned - a.wordsLearned ||
        (b.masteredCount ?? 0) - (a.masteredCount ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * Top learners by words added. Throws like every other client — the caller
 * catches and shows an unavailable state, since a missing board is not worth
 * blocking the stats screen over (and the endpoint 404s until it ships).
 */
export async function fetchLeaderboard(
  limit = LEADERBOARD_LIMIT,
): Promise<LeaderboardEntry[]> {
  const data = await getAsync<BackendLeaderboardEntry[]>(
    `${LEADERBOARD_PATH}?limit=${limit}`,
    { auth: true },
  );
  return mapLeaderboard(data, limit);
}
