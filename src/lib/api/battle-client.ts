import type { BattleHistoryItem, BattleTopic } from "@/types/battle";
import { getAsync } from "./client";

/**
 * The REST half of Vocabulary Battle. Everything live goes over the `/battles`
 * socket (`useBattle`); these are the two plain reads the lobby needs.
 */

/** The catalog topics a Battle's Word Pool can name. */
export async function fetchBattleTopics(): Promise<BattleTopic[]> {
  const data = await getAsync<BattleTopic[]>("/topics", { auth: true });
  return Array.isArray(data) ? data : [];
}

/** The account's finished Battles, newest first. */
export async function fetchBattleHistory(limit = 10): Promise<BattleHistoryItem[]> {
  const data = await getAsync<{ items?: BattleHistoryItem[] }>(
    `/battles/history?limit=${limit}`,
    { auth: true },
  );
  return Array.isArray(data?.items) ? data.items : [];
}
