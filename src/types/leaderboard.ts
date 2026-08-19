/**
 * Wire type for the ranking endpoint. The endpoint does not exist yet — this is
 * the shape the app reads, so it doubles as the contract the backend has to
 * meet. Everything but `userId` and `wordsLearned` is optional: a row still
 * renders with only an id and a count.
 *
 * `rank` is deliberately absent — the app numbers the rows itself from the
 * sorted order, so a backend that forgets to send one cannot break the list.
 */
export type BackendLeaderboardEntry = {
  userId: number;
  /** What the endpoint actually sends — same field as `GET /users/profile`. */
  name?: string | null;
  /** Used to derive a name when neither name field is present (local-part only). */
  email?: string | null;
  /** Older/alternate spelling of `name`; kept so either shape renders. */
  displayName?: string | null;
  /** Distinct words the account has added/learned — what the ranking sorts on. */
  wordsLearned: number;
  masteredCount?: number | null;
};
