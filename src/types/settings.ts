/**
 * Wire types for `/settings`. Every field is named and shaped differently from
 * `AppSettings` — see `src/lib/api/settings-client.ts` for the mapping, which is
 * the only place allowed to translate between the two.
 */

export interface BackendNotificationSettings {
  enabled: boolean;
  /** Duration string, e.g. `"1h"`, `"30m"`. */
  minIntervalBetweenPushNotifications: string;
}

export interface BackendDoNotDisturbSettings {
  enabled: boolean;
  /** `"HH:mm"` on a 24h clock. */
  startTime: string;
  /** `"HH:mm"`; may be earlier than `startTime`, meaning the window wraps midnight. */
  endTime: string;
}

export interface BackendSettings {
  soundEffect: boolean;
  notification: BackendNotificationSettings;
  doNotDisturb: BackendDoNotDisturbSettings;
  theme: string;
  /** Daily word target: 10, 20 or 30. */
  dailyWord: number;
  /** The CEFR bands numbered in order — 1 = A1 … 6 = C2. */
  cefrLevel: number;
  /**
   * The same band under the name `GET /settings` was specified with. Read as a
   * fallback so either spelling answers; only `cefrLevel` is ever sent.
   */
  certLevel?: number;
  /** A single category name; `"custom"` is the backend's default, i.e. unset. */
  focusCategory: string;
}

/**
 * `PATCH /settings` takes the whole settings object, not a diff — every field
 * goes on every write.
 *
 * `cefrLevel` is the one exception: a learner who answered "Để sau" has no band,
 * and there is no number that means "unanswered", so the field is left out
 * rather than sent as a level the user never picked.
 */
export type UpdateSettingsRequest = Omit<BackendSettings, 'cefrLevel' | 'certLevel'> & {
  cefrLevel?: number;
};
