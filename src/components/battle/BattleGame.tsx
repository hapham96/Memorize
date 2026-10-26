'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, LogIn, MonitorSmartphone, Swords, WifiOff } from 'lucide-react';
import { useBattle } from '@/hooks/useBattle';
import { fetchBattleHistory, fetchBattleTopics } from '@/lib/api/battle-client';
import type { BattleHistoryItem, BattleTopic, StakePick } from '@/types/battle';
import { BattleArena } from './BattleArena';
import { BattleHome } from './BattleHome';
import { BTN_PRIMARY, CARD } from './BattleChrome';
import { RoomLobby } from './RoomLobby';

interface BattleGameProps {
  accessToken: string;
  /** The signed-in account — how the screens tell "you" apart from the other players. */
  meId: number | null;
  /** A room code from an invite link, pre-filled into the join box. */
  initialCode?: string;
  onClose: () => void;
  /** The socket rejected the token: the session is dead, so sign out. */
  onSessionExpired: () => void;
}

/**
 * Vocabulary Battle: a live, online-only contest against 1–3 other accounts,
 * hosted entirely by the backend over the `/battles` socket. Nothing here
 * touches the SRS schedule, the word library cache or XP — the only write a
 * Battle can cause is the recap's explicit "add word" button.
 */
export const BattleGame: React.FC<BattleGameProps> = ({ accessToken, meId, initialCode = '', onClose, onSessionExpired }) => {
  const battle = useBattle(accessToken);
  const { state } = battle;
  const [topics, setTopics] = useState<BattleTopic[] | null>(null);
  const [history, setHistory] = useState<BattleHistoryItem[] | null>(null);
  // Word Heist: what this player last locked, so "Đổi" reopens on it. The backend never sends Stakes back before the Study Phase.
  const [stakePicks, setStakePicks] = useState<StakePick[]>([]);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    fetchBattleTopics()
      .then(setTopics)
      .catch(() => setTopics([]));
  }, []);

  // Reload history on entry and whenever a Battle has just finished.
  const finishedBattleId = state.result?.battleId;
  useEffect(() => {
    let cancelled = false;
    fetchBattleHistory()
      .then((items) => !cancelled && setHistory(items))
      .catch(() => !cancelled && setHistory([]));
    return () => {
      cancelled = true;
    };
  }, [finishedBattleId]);

  const room = state.room;

  /** Leaves the room before closing, so the others see a seat free up rather than a member gone offline. */
  const handleClose = async () => {
    if (room?.status === 'in_battle' && !window.confirm('Rời khỏi trận đấu đang diễn ra?')) return;
    if (room && state.connection === 'connected') {
      setIsLeaving(true);
      try {
        await battle.leaveRoom();
      } catch (e) {
        console.warn('Leaving the Battle room failed:', e);
      }
    }
    onClose();
  };

  let body: React.ReactNode;
  if (state.connection === 'unauthorized') {
    body = (
      <div className={`${CARD} p-6 max-w-md mx-auto text-center space-y-4`}>
        <LogIn className="w-10 h-10 mx-auto text-blue-500" aria-hidden />
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Phiên đăng nhập đã hết hạn</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Đăng nhập lại để tiếp tục chơi Battle.</p>
        <button type="button" onClick={onSessionExpired} className={`${BTN_PRIMARY} w-full py-3`}>
          Đăng nhập lại
        </button>
      </div>
    );
  } else if (state.connection === 'replaced') {
    body = (
      <div className={`${CARD} p-6 max-w-md mx-auto text-center space-y-3`}>
        <MonitorSmartphone className="w-10 h-10 mx-auto text-slate-400" aria-hidden />
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Đang chơi ở nơi khác</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Trận Battle đã chuyển sang một tab hoặc thiết bị khác. Mở lại Battle Game để chơi tại đây.
        </p>
      </div>
    );
  } else {
    body = (
      <>
        {state.connection !== 'connected' && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-2xl border-clay border-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 text-sm font-semibold text-amber-800 dark:text-amber-200"
          >
            {state.connection === 'connecting' ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
            )}
            {state.connection === 'connecting' ? 'Đang kết nối máy chủ Battle…' : 'Mất kết nối — đang kết nối lại…'}
          </div>
        )}
        {!room && <BattleHome battle={battle} meId={meId} history={history} initialCode={initialCode} />}
        {room?.status === 'lobby' && (
          <RoomLobby battle={battle} meId={meId} topics={topics} stakePicks={stakePicks} onStakePicks={setStakePicks} />
        )}
        {room?.status === 'in_battle' && room.battle && <BattleArena battle={battle} meId={meId} />}
      </>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-6 py-4 pb-8 bg-slate-50 dark:bg-slate-900 space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleClose()}
          disabled={isLeaving}
          aria-label="Quay lại"
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-60"
        >
          {isLeaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowLeft className="w-5 h-5" />}
        </button>
        <Swords className="w-5 h-5 text-blue-600" aria-hidden />
        <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-slate-100">Battle Game</h2>
      </div>
      {body}
    </div>
  );
};
