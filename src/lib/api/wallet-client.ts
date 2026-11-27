import { getAsync } from "./client";

export interface XuPrices {
  example: number;
  wordEntry: number;
  passage: number;
  pronunciation: number;
  speakingPerMinute: number;
  practiceRun: number;
}

/** `enabled: false` is all the server sends while xu is switched off. */
export type Wallet =
  | { enabled: false }
  | {
      enabled: true;
      balance: number;
      prices: XuPrices;
      supportEmails: string[];
    };

export async function fetchWallet(): Promise<Wallet> {
  return getAsync<Wallet>("/wallet", { auth: true });
}
