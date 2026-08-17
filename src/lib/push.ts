import {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
} from "@/lib/api/push-client";

const SW_URL = "/sw.js";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  if (existing?.active) return existing;

  // `pushManager.subscribe()` needs an *active* worker, but `register()`
  // resolves as soon as the registration exists — on a first visit that worker
  // is still installing, and subscribing there throws InvalidStateError.
  await navigator.serviceWorker.register(SW_URL);
  return navigator.serviceWorker.ready;
}

export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const registration = await getRegistration();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const publicKey = await getVapidPublicKey();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  await subscribePush(subscription.toJSON());
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  // Server first: dropping the browser subscription is irreversible, so doing it
  // before the backend knows would strand an endpoint that nothing can ever
  // unregister — the server would keep pushing into it forever.
  await unsubscribePush(subscription.endpoint);
  await subscription.unsubscribe();
}
