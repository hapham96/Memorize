'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { History, Loader2, LogIn, Plus, Swords, Trophy } from 'lucide-react';
import { BattleRequestError, type BattleApi } from '@/hooks/useBattle';
import { MODE_LABEL, type BattleHistoryItem } from '@/types/battle';
import { BattleIcon, BTN_PRIMARY, BTN_SECONDARY, CARD, ErrorLine, INPUT } from './BattleChrome';
import { Mascot } from '@/components/mascot/Mascot';

function poolLabel(item: BattleHistoryItem): string {
  const pool = item.wordPool;
  if (pool.kind === 'stakes') return `${pool.stakeCount} từ mỗi người`;
  const topics = pool.kind === 'topics' ? (pool.topicNames?.join(', ') ?? `${pool.topicIds.length} chủ đề`) : 'Ngẫu nhiên';
  return pool.cefrLevels?.length ? `${topics} · ${pool.cefrLevels.join('/')}` : topics;
}

function HistoryList({ items, meId }: { items: BattleHistoryItem[] | null; meId: number | null }) {
  if (items === null) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        Đang tải…
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <div className="clay-well p-6 text-center">
        <History className="w-8 h-8 mx-auto text-slate-400" aria-hidden />
        <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">Chưa có trận nào</p>
        <p className="text-xs text-slate-400">Các trận đã chơi sẽ hiện ở đây.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const mine = item.participants.find((p) => p.userId === meId);
        const won = mine?.placing === 1;
        return (
          <li key={item.battleId} className="rounded-2xl border-2 border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums',
                  won
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
                )}
              >
                {won && <Trophy className="w-3 h-3" aria-hidden />}
                {mine ? `#${mine.placing}` : '—'}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{MODE_LABEL[item.mode]}</span>
              {item.mode !== 'chain' && <span className="text-xs text-slate-400">{poolLabel(item)}</span>}
              <span className="ml-auto text-xs text-slate-400 tabular-nums">
                {new Date(item.endedAt).toLocaleString('vi-VN')}
              </span>
            </div>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {item.participants.map((p) => (
                <span key={p.userId} className={clsx(p.userId === meId && 'font-bold text-slate-800 dark:text-slate-100')}>
                  {p.name} <span className="tabular-nums">{p.points}</span>
                </span>
              ))}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

interface BattleHomeProps {
  battle: BattleApi;
  meId: number | null;
  history: BattleHistoryItem[] | null;
  /** A room code from an invite link. Only pre-filled — joining stays an explicit press. */
  initialCode: string;
}

/** Not in a room yet: create one, join one by code, or look back at past Battles. */
export function BattleHome({ battle, meId, history, initialCode }: BattleHomeProps) {
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = battle.state.connection === 'connected';

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof BattleRequestError ? err.message : 'Đã có lỗi xảy ra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={`${CARD} p-5 space-y-5`}>
        <div className="flex items-center gap-3">
          <BattleIcon icon={Swords} />
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">Chơi Battle</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thi đấu trực tiếp với 1–3 người bạn — hoặc đặt cược từ vựng của chính mình trong Word Heist.
            </p>
          </div>
          <Mascot mood="fight" size={64} interactive={false} className="shrink-0" />
        </div>

        <button
          type="button"
          className={`${BTN_PRIMARY} w-full py-3.5 text-base`}
          disabled={!online || busy}
          onClick={() => void run(battle.createRoom)}
        >
          <Plus className="w-5 h-5" aria-hidden />
          Tạo phòng Battle
        </button>

        <div className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400" aria-hidden>
          <span className="h-0.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          hoặc vào bằng mã phòng
          <span className="h-0.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => battle.joinRoom(code.trim()));
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Mã phòng"
            maxLength={6}
            aria-label="Mã phòng"
            className={`${INPUT} text-center font-display text-lg uppercase tracking-[0.25em] placeholder:tracking-normal placeholder:text-sm`}
          />
          <button
            type="submit"
            className={`${BTN_SECONDARY} px-4 shrink-0`}
            disabled={!online || busy || code.trim().length !== 6}
          >
            <LogIn className="w-4 h-4" aria-hidden />
            Vào
          </button>
        </form>

        {error && <ErrorLine>{error}</ErrorLine>}
      </section>

      <section className={`${CARD} p-5 space-y-4`}>
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">
          <History className="w-5 h-5 text-slate-400" aria-hidden />
          Trận gần đây
        </h3>
        <HistoryList items={history} meId={meId} />
      </section>
    </div>
  );
}
