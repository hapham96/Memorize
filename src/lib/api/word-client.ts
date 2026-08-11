import { AddWordRequest, AddWordResponse } from "@/types/word";
import { postAsync } from "./client";

export async function addWord(word: AddWordRequest): Promise<AddWordResponse> {
  return postAsync<AddWordResponse>("/words", word, { auth: true });
}
