import { NotificationPermissionState } from '@/lib/notifications';
import { loadNotificationPrompt, saveNotificationPrompt } from '@/lib/storage';

const ASK_AGAIN_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_ASKS = 2;

/** iOS has no Notification API in a browser tab, only in the home-screen app. */
export function needsHomeScreenForPush(): boolean {
  if (typeof window === 'undefined') return false;
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports a Mac; only the touch points give it away.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return ios && !installed;
}

/** Whether to ask now, after a finished session: once, then once more 3 days on. */
export function shouldAskForNotifications(
  permission: NotificationPermissionState,
): boolean {
  if (permission === 'granted' || permission === 'denied') return false;
  if (permission === 'unsupported' && !needsHomeScreenForPush()) return false;

  const { asks, lastAskedAt } = loadNotificationPrompt();
  if (asks >= MAX_ASKS) return false;
  return !lastAskedAt || Date.now() - Date.parse(lastAskedAt) >= ASK_AGAIN_AFTER_MS;
}

export function markNotificationsAsked(): void {
  const { asks } = loadNotificationPrompt();
  saveNotificationPrompt({ asks: asks + 1, lastAskedAt: new Date().toISOString() });
}
