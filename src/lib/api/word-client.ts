import { AddWordRequest, AddWordResponse } from "@/types/word";
import { Word, SRSData, SRSState } from "@/types";
import { postAsync } from "./client";

export async function addWord(word: AddWordRequest): Promise<AddWordResponse> {
  return postAsync<AddWordResponse>("/words", word, { auth: true });
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
    wordId: String(userWord.wordId),
    interval: userWord.interval,
    easeFactor: userWord.easinessFactor,
    repetitions: userWord.repetitions,
    lastReviewed: null,
    nextReviewDate: userWord.dueAt,
    state: (userWord.status as SRSState) || 'new',
  };
}

