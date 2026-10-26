/**
 * Vocabulary Battle wire shapes, mirroring the backend's battle protocol
 * (socket.io namespace `/battles`). The backend owns every room, question,
 * timer and point total — nothing here is graded or timed locally, and a
 * Battle never touches the SRS schedule or the word library cache.
 */

/** 'chain' = Word Chain: turn-based, no questions. 'heist' = Word Heist: played with the players' own words. */
export type BattleMode = 'recall' | 'match' | 'chain' | 'heist';
export type BattleDuration = 60 | 120 | 180;
/** Word Heist: how many Stakes each player puts up. */
export type StakeCount = 10 | 12 | 15;
export const DEFAULT_STAKE_COUNT: StakeCount = 10;

export const MODE_LABEL: Record<BattleMode, string> = {
  recall: 'Battle Recall',
  match: 'Battle Match',
  chain: 'Word Chain',
  heist: 'Word Heist',
};

export type WordPool =
  | { kind: 'random'; cefrLevels?: string[]; topicNames?: string[] }
  | { kind: 'topics'; topicIds: number[]; cefrLevels?: string[]; topicNames?: string[] };

export interface BattleConfig {
  mode: BattleMode;
  wordPool: WordPool;
  durationSeconds: BattleDuration;
  /** Word Heist only. Always present in what the backend sends back. */
  stakeCount?: StakeCount;
}

/** One Stake a player puts up: one of their own words and exactly one of its definitions. */
export interface StakePick {
  userWordId: number;
  userWordDefinitionId: number;
}

export interface Stake {
  stakeId: string;
  ownerUserId: number;
  headword: string;
  ipaPronunciation: string | null;
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
}

export type HeistOutcome = 'steal' | 'defend' | 'retry' | 'burned';

export interface HeistQuestionView {
  questionId: string;
  index: number;
  /** 'pick' = choose among the options, one try; 'type' = second attempt, typed with a hint. */
  attempt: 'pick' | 'type';
  ownerUserId: number;
  definition: string;
  partOfSpeech: string | null;
  options: string[];
  hint: string | null;
  startedAt: string;
  endsAt: string;
  lockedUserIds: number[];
}

export interface HeistPlayer {
  userId: number;
  name: string;
  held: number;
  stolen: number;
  defended: number;
  left: boolean;
}

export interface HeistView {
  phase: 'study' | 'question' | 'reveal';
  serverNow: string;
  total: number;
  remaining: number;
  study: null | { endsAt: string; readyUserIds: number[]; stakes: Stake[] };
  question: HeistQuestionView | null;
  reveal: null | {
    questionId: string;
    answer: string;
    winnerUserId: number | null;
    outcome: HeistOutcome;
    endsAt: string;
  };
  players: HeistPlayer[];
}

/** One word a finished Battle showed — a row of its recap. */
export interface RecapEntry {
  headword: string;
  definition: string | null;
  partOfSpeech: string | null;
  ipaPronunciation: string | null;
  example: string | null;
  /** Word Heist: who put the Stake up, and who holds it (null = burned or never asked). */
  ownerUserId: number | null;
  holderUserId: number | null;
  /** Word Chain: who added the Link (null = the Starting Word). */
  addedByUserId: number | null;
  correctUserIds: number[];
  wrongUserIds: number[];
}

export interface BattleMember {
  userId: number;
  name: string;
  connected: boolean;
  joinedAt: string;
}

export interface BattleParticipant {
  userId: number;
  name: string;
  points: number;
  left: boolean;
}

export interface BattleStanding {
  userId: number;
  name: string;
  points: number;
  placing: number;
  left: boolean;
}

export interface BattleResult {
  battleId: string;
  mode: BattleMode;
  standings: BattleStanding[];
  /** The recap. Missing from a backend that predates it. */
  recap?: RecapEntry[];
}

export interface RoomState {
  code: string;
  hostUserId: number;
  members: BattleMember[];
  config: BattleConfig;
  status: 'lobby' | 'in_battle';
  battle: null | {
    battleId: string;
    mode: BattleMode;
    /** null for Word Chain, which has no total duration. */
    endsAt: string | null;
    participants: BattleParticipant[];
  };
  lastResult: BattleResult | null;
  /** Word Heist: members whose Stakes are locked. */
  stakeUserIds?: number[];
}

export interface MatchClaim {
  headwordId: string;
  definitionId: string;
  userId: number;
}

export interface ChainLink {
  word: string;
  /** null for the Starting Word, which the backend picked. */
  userId: number | null;
  definition: string | null;
}

export interface ChainPlayer {
  userId: number;
  name: string;
  lives: number;
  eliminated: boolean;
  links: number;
}

export interface ChainView {
  links: ChainLink[];
  nextLetter: string;
  turnUserId: number | null;
  turnStartedAt: string;
  turnEndsAt: string;
  turnMs: number;
  serverNow: string;
  /** The Turn's player has a Link being verified — the Turn's clock is paused. */
  checking: boolean;
  /** While checking: the frozen time left in the Turn (turnEndsAt is stale meanwhile). */
  pausedMsLeft: number | null;
  players: ChainPlayer[];
}

export interface QuestionView {
  questionId: string;
  index: number;
  mode: BattleMode;
  startedAt: string;
  endsAt: string;
  serverNow: string;
  recall?: { definition: string; partOfSpeech: string | null; options: string[] };
  match?: {
    headwords: { id: string; text: string }[];
    definitions: { id: string; text: string }[];
  };
  answeredUserIds: number[];
  claimed: MatchClaim[];
  points: Record<number, number>;
}

export interface ProgressView {
  questionId: string;
  answeredUserIds: number[];
  claimed: MatchClaim[];
  points: Record<number, number>;
}

export interface QuestionResult {
  questionId: string;
  recallAnswer?: string;
  matchPairs?: { headwordId: string; definitionId: string }[];
  results: { userId: number; correct: boolean | null; pointsDelta: number }[];
  points: Record<number, number>;
}

export interface AnswerResult {
  correct: boolean;
  pointsDelta: number;
  points: number;
}

export type Ack<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: { code: string; message: string } };

/** `GET /battles/history` — one finished Battle. */
export interface BattleHistoryItem {
  battleId: string;
  mode: BattleMode;
  wordPool: WordPool | { kind: 'stakes'; stakeCount: number };
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
  participants: { userId: number; name: string; points: number; placing: number }[];
}

/** `GET /topics` — one tag in the backend's shared word catalog. */
export interface BattleTopic {
  id: number;
  name: string;
}
