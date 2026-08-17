import {
  SubscribePushRequest,
  UnsubscribePushRequest,
  VapidPublicKeyResponse,
} from "@/types/push";
import { getAsync, postAsync } from "./client";

export async function getVapidPublicKey(): Promise<string> {
  const response = await getAsync<VapidPublicKeyResponse>("/notification/public-key");
  return response.publicKey;
}

export async function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error("Push subscription is missing endpoint/keys.");
  }

  const body: SubscribePushRequest = {
    subscription: {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    },
  };

  await postAsync("/notification/subscribe", body, { auth: true });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  const body: UnsubscribePushRequest = { endpoint };
  await postAsync("/notification/unsubscribe", body, { auth: true });
}
