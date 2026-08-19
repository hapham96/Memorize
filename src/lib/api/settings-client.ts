import { CEFRLevel } from "@/types";
import {
  BackendSettings,
  UpdateSettingsRequest,
} from "@/types/settings";
import { AppSettings } from "@/lib/storage";
import { CEFR_LEVELS } from "@/data/cefrLevels";
import { FALLBACK_CATEGORY } from "./category-client";
import { getAsync, patchAsync } from "./client";

/**
 * The account's preferences, held on the backend so a second device inherits
 * them. Local storage stays the source the UI renders from — this only seeds it
 * at sign-in and mirrors every later change — so a failed request never costs
 * the user a setting.
 *
 * Nothing here is passed through: `AppSettings` and `BackendSettings` disagree
 * on every field name and on three of the shapes (a duration string, two clock
 * strings, one category instead of a list), so both directions are mapped.
 */

/**
 * What `focusCategory` holds when the learner has picked no focus — the
 * backend's documented default. Compared case-insensitively against
 * `FALLBACK_CATEGORY`, which is the same bucket under the app's own spelling.
 */
const UNSET_FOCUS_CATEGORY = 'custom';

/** `"1h"`, `"90m"`, `"1h30m"`, or a bare number of minutes. */
const DURATION_UNITS: Record<string, number> = { h: 60, m: 1, s: 1 / 60 };
const DURATION_PART = /(\d+(?:\.\d+)?)\s*(h|m|s)/gi;

/** Returns undefined for anything unparseable — the local value then stands. */
function parseIntervalMinutes(raw: unknown): number | undefined {
  if (typeof raw === "number") return raw > 0 ? raw : undefined;
  if (typeof raw !== "string") return undefined;

  const value = raw.trim();
  if (!value) return undefined;

  // A bare "60" means minutes; that is what the app has always stored.
  if (/^\d+(\.\d+)?$/.test(value)) {
    const minutes = Number(value);
    return minutes > 0 ? minutes : undefined;
  }

  let total = 0;
  for (const [, amount, unit] of value.matchAll(DURATION_PART)) {
    total += Number(amount) * DURATION_UNITS[unit.toLowerCase()];
  }

  const minutes = Math.round(total);
  return minutes > 0 ? minutes : undefined;
}

/** Whole hours go out as `"2h"`, anything else as minutes. */
function formatIntervalMinutes(minutes: number): string {
  const safe = Math.max(1, Math.round(minutes));
  return safe % 60 === 0 ? `${safe / 60}h` : `${safe}m`;
}

/**
 * `"22:00"` → `22`. The app stores quiet hours as whole hours, so the minutes
 * the backend can express are dropped rather than half-honoured.
 */
function parseHour(raw: unknown): number | undefined {
  if (typeof raw !== "string") return undefined;

  const match = raw.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return undefined;

  const hour = Number(match[1]);
  return hour >= 0 && hour <= 23 ? hour : undefined;
}

function formatHour(hour: number): string {
  const safe = Math.min(23, Math.max(0, Math.round(hour)));
  return `${String(safe).padStart(2, "0")}:00`;
}

/** The band is the CEFR ladder numbered from 1, so the order of `CEFR_LEVELS` is the map. */
function parseCefrLevel(raw: unknown): CEFRLevel | null | undefined {
  const index = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(index)) return undefined;

  // 0 is how "not answered yet" comes back; the app must not guess a band.
  if (index <= 0) return null;
  return CEFR_LEVELS[index - 1]?.id ?? undefined;
}

function formatCefrLevel(level: CEFRLevel | null): number | undefined {
  if (!level) return undefined;

  const index = CEFR_LEVELS.findIndex((entry) => entry.id === level);
  return index < 0 ? undefined : index + 1;
}

function parseTheme(raw: unknown): AppSettings["theme"] | undefined {
  const theme = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return theme === "light" || theme === "dark" || theme === "system" ? theme : undefined;
}

/**
 * The backend holds one focus category where the app holds a list, and its
 * default is `"custom"`. That default means "nothing chosen", so it maps to an
 * empty list — reading it as a real choice would silently narrow the whole word
 * pool to locally added words on a fresh account.
 */
function parseFocusCategory(raw: unknown): string[] | undefined {
  if (typeof raw !== "string") return undefined;

  const name = raw.trim();
  if (!name || name.toLowerCase() === FALLBACK_CATEGORY.toLowerCase()) return [];
  return [name];
}

function formatFocusCategory(categories: string[] | undefined): string {
  // Only the first survives the trip; the backend has room for one. With none
  // chosen the backend's own default spelling goes back, so "no focus" reads the
  // same way it arrived.
  return categories?.[0] ?? UNSET_FOCUS_CATEGORY;
}

/**
 * Maps a `/settings` response onto the app's own shape. Only fields the response
 * actually carried are returned, so the caller merges them over the local copy
 * and a sparse or partial answer never blanks a preference.
 */
export function mapBackendSettings(
  backend: BackendSettings | null | undefined,
): Partial<AppSettings> {
  if (!backend || typeof backend !== "object") return {};

  const settings: Partial<AppSettings> = {};

  if (typeof backend.soundEffect === "boolean") settings.soundEnabled = backend.soundEffect;

  const theme = parseTheme(backend.theme);
  if (theme) settings.theme = theme;

  if (typeof backend.dailyWord === "number" && backend.dailyWord > 0) {
    settings.dailyGoal = backend.dailyWord;
  }

  const cefrLevel = parseCefrLevel(backend.cefrLevel ?? backend.certLevel);
  if (cefrLevel !== undefined) settings.cefrLevel = cefrLevel;

  const focusCategories = parseFocusCategory(backend.focusCategory);
  if (focusCategories) settings.focusCategories = focusCategories;

  const notification = backend.notification;
  if (notification && typeof notification === "object") {
    if (typeof notification.enabled === "boolean") {
      settings.notifications = notification.enabled;
    }

    const interval = parseIntervalMinutes(notification.minIntervalBetweenPushNotifications);
    if (interval !== undefined) settings.reminderIntervalMinutes = interval;
  }

  const doNotDisturb = backend.doNotDisturb;
  if (doNotDisturb && typeof doNotDisturb === "object") {
    if (typeof doNotDisturb.enabled === "boolean") {
      settings.quietHoursEnabled = doNotDisturb.enabled;
    }

    const start = parseHour(doNotDisturb.startTime);
    if (start !== undefined) settings.quietHoursStart = start;

    const end = parseHour(doNotDisturb.endTime);
    if (end !== undefined) settings.quietHoursEnd = end;
  }

  return settings;
}

/**
 * Builds the PATCH body from the settings as they now stand.
 *
 * The endpoint takes the whole object rather than a diff, so this never looks at
 * *which* field the user touched — it always sends all of them. That also means
 * the local copy is the one that wins on a write: anything the backend held that
 * this device disagrees with is overwritten, which is why `hydrateSettingsFromApi`
 * runs at sign-in, before the user can change anything.
 */
export function mapSettingsToRequest(settings: AppSettings): UpdateSettingsRequest {
  const cefrLevel = formatCefrLevel(settings.cefrLevel);

  return {
    soundEffect: settings.soundEnabled,
    notification: {
      enabled: settings.notifications,
      minIntervalBetweenPushNotifications: formatIntervalMinutes(
        settings.reminderIntervalMinutes,
      ),
    },
    doNotDisturb: {
      enabled: settings.quietHoursEnabled,
      startTime: formatHour(settings.quietHoursStart),
      endTime: formatHour(settings.quietHoursEnd),
    },
    theme: settings.theme,
    dailyWord: settings.dailyGoal,
    // Left out entirely while the CEFR question is unanswered — see the type.
    ...(cefrLevel === undefined ? {} : { cefrLevel }),
    focusCategory: formatFocusCategory(settings.focusCategories),
  };
}

/** `GET /settings` for the account behind the bearer token. */
export async function fetchSettings(): Promise<Partial<AppSettings>> {
  return mapBackendSettings(await getAsync<BackendSettings>("/settings", { auth: true }));
}

/**
 * `PATCH /settings`. The response is the updated row, mapped back so the caller
 * can adopt whatever the backend normalised; an empty body maps to `{}`.
 */
export async function updateSettings(
  request: UpdateSettingsRequest,
): Promise<Partial<AppSettings>> {
  return mapBackendSettings(
    await patchAsync<BackendSettings>("/settings", request, { auth: true }),
  );
}
