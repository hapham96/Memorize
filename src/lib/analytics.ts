/**
 * Google Analytics 4 — the one place that talks to `gtag`.
 *
 * Everything here is a no-op while `NEXT_PUBLIC_GA_MEASUREMENT_ID` is empty
 * (local dev, previews), so call sites never need to check. The id is inlined
 * at build time like every other `NEXT_PUBLIC_*` value.
 *
 * Never put PII in an event: no email, no name, no word the user typed. The
 * only identifier sent is the backend's numeric user id (`user_id`), which
 * Google's policy allows and which lets GA join one account across devices.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';

export const isAnalyticsEnabled = GA_MEASUREMENT_ID !== '';

type GtagParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * The bootstrap `layout.tsx` inlines into `<head>`. It defines `gtag` and
 * queues `config` before any React code runs, so an event fired during
 * hydration is queued behind the config instead of being dropped — `gtag.js`
 * itself loads later and drains the queue in order.
 */
export const GA_BOOTSTRAP_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}'${
  process.env.NODE_ENV === 'production' ? '' : ", { debug_mode: true }"
});
`;

function gtag(...args: unknown[]) {
  if (!isAnalyticsEnabled || typeof window === 'undefined' || !window.gtag) return;
  window.gtag(...args);
}

/**
 * Outside production every hit carries `debug_mode` so it shows in GA4's
 * DebugView. It is stamped per call because a later `config` (see
 * `setAnalyticsUser`) replaces the bootstrap's params. It must be *omitted* in
 * production — GA reads any `debug_mode`, even `false`, as debug traffic.
 */
const DEBUG_PARAMS: GtagParams =
  process.env.NODE_ENV === 'production' ? {} : { debug_mode: true };

/** Sends one GA4 event. Event and param names are snake_case, max 40 chars. */
export function trackEvent(name: string, params?: GtagParams) {
  gtag('event', name, { ...params, ...DEBUG_PARAMS });
}

/**
 * Ties later events to an account (`null` on sign-out). Goes through `config`
 * with `send_page_view: false` so updating the id does not count a page view.
 */
export function setAnalyticsUser(userId: number | null) {
  gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId === null ? null : String(userId),
    send_page_view: false,
    ...DEBUG_PARAMS,
  });
}