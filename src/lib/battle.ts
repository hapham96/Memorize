import type {
  BattleResult,
  ChainView,
  HeistView,
  ProgressView,
  QuestionResult,
  QuestionView,
  RoomState,
} from '@/types/battle';

/**
 * Client-side view of one live Vocabulary Battle connection, folded from the
 * backend's socket events. Pure so the event-ordering rules stay readable
 * without a socket. The backend stays the authority: nothing here grades or times.
 */

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'replaced' | 'unauthorized';

export interface BattleState {
  connection: ConnectionStatus;
  room: RoomState | null;
  question: QuestionView | null;
  /** The open question's result once it has ended, shown during the short reveal. */
  reveal: QuestionResult | null;
  /** Word Chain: the chain so far and whose Turn it is. */
  chain: ChainView | null;
  /** Word Heist: the Study Phase's Stakes, or the open Stake and who holds what. */
  heist: HeistView | null;
  /** The Battle that just finished, until the player dismisses it. */
  result: BattleResult | null;
  points: Record<number, number>;
  /** The backend's clock minus ours (ms), so countdowns follow the server's deadlines. */
  clockOffset: number;
}

export type BattleEvent =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'replaced' }
  | { type: 'unauthorized' }
  | { type: 'room'; room: RoomState }
  | { type: 'left' }
  | { type: 'question'; question: QuestionView; receivedAt: number }
  | { type: 'progress'; progress: ProgressView }
  | { type: 'questionEnded'; result: QuestionResult }
  | { type: 'chain'; chain: ChainView; receivedAt: number }
  | { type: 'heist'; heist: HeistView; receivedAt: number }
  | { type: 'battleEnded'; result: BattleResult }
  | { type: 'dismissResult' };

export const initialBattleState: BattleState = {
  connection: 'connecting',
  room: null,
  question: null,
  reveal: null,
  chain: null,
  heist: null,
  result: null,
  points: {},
  clockOffset: 0,
};

export function battleReducer(state: BattleState, event: BattleEvent): BattleState {
  switch (event.type) {
    case 'connected':
      return { ...state, connection: 'connected' };
    case 'disconnected':
      // Keep the last known room so the screen doesn't jump while socket.io reconnects.
      return state.connection === 'replaced' || state.connection === 'unauthorized'
        ? state
        : { ...state, connection: 'disconnected' };
    case 'replaced':
      return { ...state, connection: 'replaced' };
    case 'unauthorized':
      return { ...state, connection: 'unauthorized' };
    case 'room': {
      const room = event.room;
      const inBattle = room.status === 'in_battle' && room.battle;
      return {
        ...state,
        room,
        question: inBattle ? state.question : null,
        reveal: inBattle ? state.reveal : null,
        chain: inBattle ? state.chain : null,
        heist: inBattle ? state.heist : null,
        // socket.io keeps one socket's events in order, so the newest event's totals are the current ones.
        points: inBattle
          ? Object.fromEntries(room.battle!.participants.map((p) => [p.userId, p.points]))
          : state.points,
      };
    }
    case 'left':
      return { ...initialBattleState, connection: state.connection, clockOffset: state.clockOffset };
    case 'question':
      return {
        ...state,
        question: event.question,
        reveal: null,
        result: null,
        points: event.question.points,
        clockOffset: new Date(event.question.serverNow).getTime() - event.receivedAt,
      };
    case 'progress':
      if (state.question?.questionId !== event.progress.questionId) {
        return { ...state, points: event.progress.points };
      }
      return {
        ...state,
        question: {
          ...state.question,
          answeredUserIds: event.progress.answeredUserIds,
          claimed: event.progress.claimed,
        },
        points: event.progress.points,
      };
    case 'questionEnded':
      if (state.question?.questionId !== event.result.questionId) return state;
      return { ...state, reveal: event.result, points: event.result.points };
    case 'chain':
      return {
        ...state,
        chain: event.chain,
        result: null,
        clockOffset: new Date(event.chain.serverNow).getTime() - event.receivedAt,
      };
    case 'heist':
      return {
        ...state,
        heist: event.heist,
        result: null,
        clockOffset: new Date(event.heist.serverNow).getTime() - event.receivedAt,
      };
    case 'battleEnded':
      return { ...state, question: null, reveal: null, chain: null, heist: null, result: event.result };
    case 'dismissResult':
      return { ...state, result: null };
  }
}

/** Milliseconds left until `deadline` (an ISO time on the backend's clock), never negative. */
export function msLeft(deadline: string, clockOffset: number, now: number = Date.now()): number {
  return Math.max(0, new Date(deadline).getTime() - (now + clockOffset));
}

/** Tied totals share a placing, matching how the backend ranks a finished Battle (100, 100, 80 → 1, 1, 3). */
export function rankByPoints<T extends { points: number }>(rows: T[]): (T & { placing: number })[] {
  return [...rows]
    .sort((a, b) => b.points - a.points)
    .map((row, _i, sorted) => ({
      ...row,
      placing: 1 + sorted.filter((other) => other.points > row.points).length,
    }));
}

/** The query parameter an invite link carries the room code in: `/app?battle=AB12CD`. */
export const BATTLE_INVITE_PARAM = 'battle';

/** A shareable link that opens Battle Game with `code` filled in. */
export function battleInviteLink(code: string): string {
  const url = new URL('/app', window.location.origin);
  url.searchParams.set(BATTLE_INVITE_PARAM, code);
  return url.toString();
}

/** A room code as the backend issues it (6 letters/digits, upper case), or null for anything else. */
export function normalizeRoomCode(raw: string | null | undefined): string | null {
  const code = raw?.trim().toUpperCase() ?? '';
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

/** `m:ss` for a countdown. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
