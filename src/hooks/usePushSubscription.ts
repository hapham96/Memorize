"use client";

import { useEffect, useState } from "react";
import { NotificationPermissionState } from "@/lib/notifications";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";

export type PushSubscriptionStatus =
  | "idle"
  | "subscribing"
  | "subscribed"
  | "unsubscribing"
  | "error"
  | "unsupported";

interface UsePushSubscriptionArgs {
  isReady: boolean;
  enabled: boolean;
  permission: NotificationPermissionState;
}

export function usePushSubscription({
  isReady,
  enabled,
  permission,
}: UsePushSubscriptionArgs): { pushStatus: PushSubscriptionStatus } {
  const [status, setStatus] = useState<PushSubscriptionStatus>("idle");

  useEffect(() => {
    if (!isReady) return;

    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;

    if (enabled && permission === "granted" && status === "idle") {
      setStatus("subscribing");
      subscribeToPush()
        .then(() => {
          if (!cancelled) setStatus("subscribed");
        })
        .catch((e) => {
          console.warn("Push subscribe failed:", e);
          if (!cancelled) setStatus("error");
        });
      return () => {
        cancelled = true;
      };
    }

    if (!enabled && status === "subscribed") {
      setStatus("unsubscribing");
      unsubscribeFromPush()
        .then(() => {
          if (!cancelled) setStatus("idle");
        })
        .catch((e) => {
          console.warn("Push unsubscribe failed:", e);
          if (!cancelled) setStatus("error");
        });
      return () => {
        cancelled = true;
      };
    }

    // Toggling off resets an errored attempt, so turning it back on retries.
    if (!enabled && status === "error") {
      setStatus("idle");
    }
  }, [isReady, enabled, permission, status]);

  return { pushStatus: status };
}
