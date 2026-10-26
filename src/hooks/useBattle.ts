'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api/client';
import { battleReducer, initialBattleState } from '@/lib/battle';
import type {
  Ack,
  AnswerResult,
  BattleConfig,
  BattleResult,
  ChainLink,
  ChainView,
  HeistView,
  ProgressView,
  QuestionResult,
  QuestionView,
  RoomState,
  StakePick,
} from '@/types/battle';

const ACK_TIMEOUT_MS = 8_000;
/** A Word Chain Link may wait on the backend's external dictionary lookup (the Turn is paused meanwhile). */
const LINK_ACK_TIMEOUT_MS = 12_000;

export class BattleRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * One live connection to the backend's `/battles` socket for the signed-in
 * account. The backend owns every rule and timer; this hook only mirrors its
 * events into state and turns requests into promises that reject with a
 * `BattleRequestError` when the backend says no.
 */
export function useBattle(accessToken: string) {
  const [state, dispatch] = useReducer(battleReducer, initialBattleState);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${API_BASE_URL}/battles`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => dispatch({ type: 'connected' }));
    socket.on('disconnect', () => dispatch({ type: 'disconnected' }));
    socket.on('session:replaced', () => dispatch({ type: 'replaced' }));
    socket.on('battle:error', (e: { code: string }) => {
      if (e.code === 'unauthorized') dispatch({ type: 'unauthorized' });
    });
    socket.on('room:state', (room: RoomState) => dispatch({ type: 'room', room }));
    socket.on('battle:question', (question: QuestionView) =>
      dispatch({ type: 'question', question, receivedAt: Date.now() }),
    );
    socket.on('battle:progress', (progress: ProgressView) => dispatch({ type: 'progress', progress }));
    socket.on('battle:question-ended', (result: QuestionResult) =>
      dispatch({ type: 'questionEnded', result }),
    );
    socket.on('battle:ended', (result: BattleResult) => dispatch({ type: 'battleEnded', result }));
    socket.on('chain:state', (chain: ChainView) =>
      dispatch({ type: 'chain', chain, receivedAt: Date.now() }),
    );
    socket.on('heist:state', (heist: HeistView) =>
      dispatch({ type: 'heist', heist, receivedAt: Date.now() }),
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  const request = useCallback(
    async <T extends object>(event: string, payload: unknown = {}, timeoutMs = ACK_TIMEOUT_MS): Promise<T> => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        throw new BattleRequestError('offline', 'Chưa kết nối tới máy chủ Battle.');
      }
      let ack: Ack<T>;
      try {
        ack = (await socket.timeout(timeoutMs).emitWithAck(event, payload)) as Ack<T>;
      } catch {
        throw new BattleRequestError('timeout', 'Máy chủ không phản hồi. Thử lại nhé.');
      }
      if (!ack.ok) throw new BattleRequestError(ack.error.code, ack.error.message);
      return ack;
    },
    [],
  );

  const actions = useMemo(
    () => ({
      createRoom: async () => {
        const { room } = await request<{ room: RoomState }>('room:create');
        dispatch({ type: 'room', room });
      },
      joinRoom: async (code: string) => {
        const { room } = await request<{ room: RoomState }>('room:join', { code });
        dispatch({ type: 'room', room });
      },
      leaveRoom: async () => {
        await request('room:leave');
        dispatch({ type: 'left' });
      },
      configure: async (config: BattleConfig) => {
        const { room } = await request<{ room: RoomState }>('room:configure', config);
        dispatch({ type: 'room', room });
      },
      start: () => request('battle:start').then(() => undefined),
      answerRecall: (questionId: string, headword: string) =>
        request<AnswerResult>('battle:answer', { questionId, headword }),
      answerMatch: (questionId: string, headwordId: string, definitionId: string) =>
        request<AnswerResult>('battle:match', { questionId, headwordId, definitionId }),
      submitLink: (word: string) =>
        request<{ link: ChainLink }>('chain:link', { word }, LINK_ACK_TIMEOUT_MS).then((r) => r.link),
      /** Word Heist: lock these Stakes (an empty list unlocks). The backend reads the words itself from the ids. */
      lockStakes: async (picks: StakePick[]) => {
        const { room } = await request<{ room: RoomState }>('heist:stakes', { picks });
        dispatch({ type: 'room', room });
      },
      heistReady: () => request('heist:ready').then(() => undefined),
      answerHeist: (questionId: string, answer: string) =>
        request<{ correct: boolean }>('heist:answer', { questionId, answer }).then((r) => r.correct),
      dismissResult: () => dispatch({ type: 'dismissResult' }),
    }),
    [request],
  );

  return { state, ...actions };
}

export type BattleApi = ReturnType<typeof useBattle>;

/** Re-renders every `intervalMs` and returns the current time — drives the countdowns. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
