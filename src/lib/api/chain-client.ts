import { ArgumentChain, ChainSummary, LeftOutWord, WordSuggestion } from "@/types/chain";
import { ApiError, deleteAsync, getAsync, postAsync } from "./client";

const auth = { auth: true };

export const MIN_CHAIN_WORDS = 3;
export const MAX_CHAIN_WORDS = 8;
/** Below this many words, adding some is what to do next. */
export const SUPPLEMENT_BELOW = 4;

/** A paid AI call. `chain` is null when too few words connect: nothing is saved. */
export async function createChain(
  userWordIds: number[],
): Promise<{ chain: ArgumentChain | null; leftOut: LeftOutWord[] }> {
  return postAsync("/argument-chains", { userWordIds }, auth);
}

/** A paid AI call. Adds nothing: a ticked new word goes through `addWord`. */
export async function suggestChainWords(
  userWordIds: number[],
): Promise<{ vocabularySetId: number; suggestions: WordSuggestion[] }> {
  return postAsync("/argument-chains/word-suggestions", { userWordIds }, auth);
}

export async function fetchChains(): Promise<ChainSummary[]> {
  return getAsync<ChainSummary[]>("/argument-chains", auth);
}

export async function fetchChain(id: number): Promise<ArgumentChain> {
  return getAsync<ArgumentChain>(`/argument-chains/${id}`, auth);
}

/** Counts for the Streak; changes no schedule. */
export async function markChainPractised(id: number): Promise<void> {
  await postAsync(`/argument-chains/${id}/practised`, {}, auth);
}

export async function deleteChain(id: number): Promise<void> {
  await deleteAsync(`/argument-chains/${id}`, auth);
}

export function chainErrorText(err: unknown): string {
  const status = err instanceof ApiError ? err.status : 0;
  // The server words "not enough xu" for the User.
  if (status === 402) return (err as ApiError).message;
  if (status === 429) return 'Hết lượt AI hôm nay rồi, mai thử lại nhé.';
  if (status === 422) return 'Có từ không còn trong kho. Quay lại chọn từ khác nhé.';
  if (status === 404) return 'Chuỗi này không còn nữa.';
  return 'Chưa làm được, kiểm tra kết nối rồi thử lại nhé.';
}
