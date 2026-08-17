export interface BackendPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface BackendPushSubscription {
  endpoint: string;
  keys: BackendPushSubscriptionKeys;
}

export interface SubscribePushRequest {
  subscription: BackendPushSubscription;
}

export interface UnsubscribePushRequest {
  endpoint: string;
}

export interface VapidPublicKeyResponse {
  publicKey: string;
}
