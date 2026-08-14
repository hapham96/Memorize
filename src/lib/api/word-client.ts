import { AddWordRequest, AddWordResponse, BackendUserWord, ReviewQuality, ReviewWordResponse } from "@/types/word";
import { Word, SRSData, SRSState } from "@/types";
import { getAsync, postAsync } from "./client";

export async function addWord(word: AddWordRequest): Promise<AddWordResponse> {
  return postAsync<AddWordResponse>("/words", word, { auth: true });
}

export async function submitReview(
  userWordId: number | string,
  quality: ReviewQuality
): Promise<ReviewWordResponse> {
  return postAsync<ReviewWordResponse>(`/reviews/${userWordId}`, { quality }, { auth: true });
}

export async function getDueReviews(userId: number | string = 1): Promise<BackendUserWord[]> {
  return getAsync<BackendUserWord[]>(`/reviews/due?userId=${userId}`, { auth: true });
}

export function mapAddWordResponseToWord(
  response: AddWordResponse,
  fallback?: Partial<Word>
): Word {
  return {
    id: String(response.word.id),
    word: response.word.headword,
    ipa: response.word.ipaPronunciation ?? fallback?.ipa ?? `/${response.word.headword}/`,
    pos: fallback?.pos ?? 'n.',
    vietnamese: fallback?.vietnamese ?? '',
    example: fallback?.example ?? `Example with ${response.word.headword}.`,
    translation: fallback?.translation ?? `Ví dụ với ${response.word.headword}.`,
    level: fallback?.level ?? (response.word.cefrLevel as any) ?? 'B1',
    category: fallback?.category ?? 'Custom',
    mnemonic: fallback?.mnemonic,
  };
}

export function mapAddWordResponseToSRS(response: AddWordResponse): SRSData {
  const userWord = response.userWord;
  return {
    userWordId: userWord.id,
    wordId: String(userWord.wordId),
    interval: userWord.interval,
    easeFactor: userWord.easinessFactor,
    repetitions: userWord.repetitions,
    lastReviewed: null,
    nextReviewDate: userWord.dueAt,
    state: (userWord.status as SRSState) || 'new',
  };
}

export function mapReviewResponseToSRS(response: ReviewWordResponse): SRSData {
  return {
    userWordId: response.id,
    wordId: String(response.wordId),
    interval: response.interval,
    easeFactor: response.easinessFactor,
    repetitions: response.repetitions,
    lastReviewed: new Date().toISOString(),
    nextReviewDate: response.dueAt,
    state: (response.status as SRSState) || 'learning',
  };
}

export function mapBackendUserWordToSRS(userWord: BackendUserWord): SRSData {
  return {
    userWordId: userWord.id,
    wordId: String(userWord.wordId),
    interval: userWord.interval,
    easeFactor: userWord.easinessFactor,
    repetitions: userWord.repetitions,
    lastReviewed: null,
    nextReviewDate: userWord.dueAt,
    state: (userWord.status as SRSState) || 'new',
  };
}


