import {
  PracticeAnswer,
  PracticeChoices,
  PracticeSitting,
  StartPracticeRequest,
} from "@/types/practice";
import { deleteAsync, getAsync, postAsync } from "./client";

type SittingResponse = { sitting: PracticeSitting | null };

const auth = { auth: true };
const path = (sittingId: string) => `/practice/sitting/${sittingId}`;

export async function fetchPracticeChoices(): Promise<PracticeChoices> {
  return getAsync<PracticeChoices>("/practice/choices", auth);
}

/** The unfinished sitting, wherever it was left; null when there is none. */
export async function fetchPracticeSitting(): Promise<PracticeSitting | null> {
  return (await getAsync<SittingResponse>("/practice/sitting", auth)).sitting;
}

/** Replaces any unfinished sitting. */
export async function startPractice(
  request: StartPracticeRequest,
): Promise<PracticeSitting> {
  return (await postAsync<SittingResponse>("/practice/sitting", request, auth))
    .sitting!;
}

export async function answerPractice(
  sittingId: string,
  answer: PracticeAnswer,
): Promise<{ isCorrect: boolean; reviewCount: number; sitting: PracticeSitting }> {
  return postAsync(`${path(sittingId)}/answers`, answer, auth);
}

/** "Từ này oke rồi". */
export async function dropPracticeWord(
  sittingId: string,
  userWordId: number,
): Promise<PracticeSitting> {
  return (
    await postAsync<SittingResponse>(`${path(sittingId)}/dropped`, { userWordId }, auth)
  ).sitting!;
}

/** "Học tiếp". */
export async function nextPracticeRound(sittingId: string): Promise<PracticeSitting> {
  return (await postAsync<SittingResponse>(`${path(sittingId)}/rounds`, {}, auth))
    .sitting!;
}

/** "Tui oke". */
export async function discardPractice(sittingId: string): Promise<void> {
  await deleteAsync(path(sittingId), auth);
}
