'use client';

import { useEffect, useRef, useState } from 'react';
import { NotificationPermissionState } from '@/lib/notifications';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';

export type PushSubscriptionStatus =
  | 'idle'
  | 'subscribing'
  | 'subscribed'
  | 'unsubscribing'
  | 'error'
  | 'unsupported';

interface UsePushSubscriptionArgs {
  /** Held false until localStorage is read, so nothing fires on half-loaded state. */
  isReady: boolean;
  enabled: boolean;
  permission: NotificationPermissionState;
  /**
   * Changes on sign-in/out. The endpoint is bound to an account by the bearer
   * token, so this is part of the desired state, not just a gate: `settings` is
   * a global storage key, and without it a signed-out visitor would POST an
   * unauthenticated subscribe and a second account would inherit the first
   * account's registration.
   */
  userId: number | null;
}

/** What the backend was last told, so the effect only acts on a real change. */
interface AppliedState {
  subscribed: boolean;
  userId: number | null;
}

/**
 * Keeps the browser's push subscription in sync with the notification toggle.
 *
 * The applied state lives in a ref rather than in `status`: `status` is render
 * state, and feeding it back into the dependency array would make the effect
 * re-run — and therefore cancel its own in-flight request — the moment it moved
 * to `subscribing`.
 */
export function usePushSubscription({
  isReady,
  enabled,
  permission,
  userId,
}: UsePushSubscriptionArgs): { pushStatus: PushSubscriptionStatus } {
  const [status, setStatus] = useState<PushSubscriptionStatus>('idle');
  const appliedRef = useRef<AppliedState>({ subscribed: false, userId: null });

  useEffect(() => {
    if (!isReady) return;

    if (!isPushSupported()) {
      setStatus('unsupported');
      return;
    }

    // Signing out cannot unsubscribe — the token that authorises
    // /notification/unsubscribe is already cleared. Drop the local bookkeeping
    // so the next sign-in re-registers the endpoint under its own account.
    if (userId === null) {
      appliedRef.current = { subscribed: false, userId: null };
      setStatus('idle');
      return;
    }

    const want = enabled && permission === 'granted';
    const applied = appliedRef.current;
    // Which account holds the registration only matters while it exists.
    const inSync = want
      ? applied.subscribed && applied.userId === userId
      : !applied.subscribed;

    if (inSync) {
      // A failure the user has since toggled away from is no longer worth showing.
      setStatus((s) => (s === 'error' ? 'idle' : s));
      return;
    }

    let cancelled = false;
    // Recorded before awaiting, so a re-render mid-flight does not restart it.
    appliedRef.current = { subscribed: want, userId };
    setStatus(want ? 'subscribing' : 'unsubscribing');

    (want ? subscribeToPush() : unsubscribeFromPush())
      .then(() => {
        if (!cancelled) setStatus(want ? 'subscribed' : 'idle');
      })
      .catch((e) => {
        console.warn(
          want ? 'Push subscribe failed:' : 'Push unsubscribe failed:',
          e
        );
        if (cancelled) return;
        // Roll back so toggling off and on again retries the failed direction.
        appliedRef.current = { subscribed: !want, userId };
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, enabled, permission, userId]);

  return { pushStatus: status };
}
