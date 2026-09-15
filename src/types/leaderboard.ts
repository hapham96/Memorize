/**
 * Wire types for the ranking endpoint.
 *
 * The board is scoped to **one month**: the response is an envelope carrying the
 * period it covers plus the rows for it, so the UI can name the month instead of
 * implying an all-time ranking.
 *
 * `rank` is deliberately absent from a row — the app numbers the rows itself from
 * the sorted order, so a backend that forgets to send one cannot break the list.
 */
export type BackendLeaderboardEntry = {
  userId: number;
  /** What the endpoint actually sends — same field as `GET /users/profile`. */
  name?: string | null;
  /** Used to derive a name when neither name field is present (local-part only). */
  email?: string | null;
  /** Older/alternate spelling of `name`; kept so either shape renders. */
  displayName?: string | null;
  /** Points earned inside the period — what the ranking sorts on. */
  score: number;
};

/**
 * The envelope. `period` is an ISO timestamp pinned to the first day of the
 * month the board covers (e.g. `2026-09-01T00:00:00.000Z`); it is optional here
 * because a board with an unreadable period still renders, it just loses its
 * month label.
 */
export type BackendLeaderboardResponse = {
  period?: string | null;
  entries?: BackendLeaderboardEntry[] | null;
};
