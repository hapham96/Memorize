import { Leaderboard, LeaderboardEntry } from "@/types";
import {
  BackendLeaderboardEntry,
  BackendLeaderboardResponse,
} from "@/types/leaderboard";
import { getAsync } from "./client";

/** How many learners the stats screen shows. */
export const LEADERBOARD_LIMIT = 10;

/**
 * The ranking endpoint. Kept in one place: when the backend moves it, this is
 * the only line to change.
 */
export const LEADERBOARD_PATH = "/users/leaderboard";

/**
 * A name to print for a row. `name` is what the endpoint sends; `displayName`
 * covers the alternate spelling, then the email local-part is the same fallback
 * the profile screen uses. An id-only row still gets something readable rather
 * than a blank cell.
 */
function resolveName(entry: BackendLeaderboardEntry): string {
  const name = entry.name?.trim() || entry.displayName?.trim();
  if (name) return name;

  const local = entry.email?.split('@')[0]?.trim();
  if (local) return local;

  return `User #${entry.userId}`;
}

/**
 * The month the board covers. Anything unparseable becomes null — a board with
 * no readable period still renders, it just drops the month label rather than
 * printing "Invalid Date".
 */
function parsePeriod(raw: unknown): Date | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Wire rows → board rows: drops anything without a usable numeric id, sorts by
 * score (ties broken by name so the order is stable between renders), then
 * numbers what survives.
 */
export function mapLeaderboardEntries(
  data: unknown,
  limit = LEADERBOARD_LIMIT,
): LeaderboardEntry[] {
  if (!Array.isArray(data)) return [];

  const rows = data.reduce<Omit<LeaderboardEntry, 'rank'>[]>((acc, raw) => {
    const entry = raw as BackendLeaderboardEntry;
    const userId = Number(entry?.userId);
    if (!Number.isFinite(userId)) return acc;

    const score = Number(entry?.score);

    acc.push({
      userId,
      name: resolveName(entry),
      score: Number.isFinite(score) ? score : 0,
    });
    return acc;
  }, []);

  return rows
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * Envelope → board. The endpoint answers `{ period, entries }`, but a bare array
 * is still accepted as the rows of an unnamed period, so a backend that drops
 * the envelope only costs the month label.
 */
export function mapLeaderboard(
  data: unknown,
  limit = LEADERBOARD_LIMIT,
): Leaderboard {
  if (Array.isArray(data)) {
    return { period: null, entries: mapLeaderboardEntries(data, limit) };
  }

  const envelope = (data ?? {}) as BackendLeaderboardResponse;
  return {
    period: parsePeriod(envelope.period),
    entries: mapLeaderboardEntries(envelope.entries, limit),
  };
}

/**
 * This month's top learners by score. Throws like every other client — the
 * caller catches and shows an unavailable state, since a missing board is not
 * worth blocking the stats screen over.
 */
export async function fetchLeaderboard(
  limit = LEADERBOARD_LIMIT,
): Promise<Leaderboard> {
  const data = await getAsync<BackendLeaderboardResponse>(
    `${LEADERBOARD_PATH}?limit=${limit}`,
    { auth: true },
  );
  return mapLeaderboard(data, limit);
}
