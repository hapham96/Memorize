'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { Check, Copy, Crown, Gem, Hourglass, Link2, Lock, LogOut, Play, Settings2, Trophy, UserPlus, WifiOff } from 'lucide-react';
import { BattleRequestError, type BattleApi } from '@/hooks/useBattle';
import { battleInviteLink } from '@/lib/battle';
import { DEFAULT_STAKE_COUNT, MODE_LABEL, type BattleResult, type BattleTopic, type StakePick } from '@/types/battle';
import { BattleConfigPanel } from './BattleConfigPanel';
import { BattleRecap } from './BattleRecap';
import { BattleIcon, BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, CARD, ErrorLine, SectionLabel, Standings } from './BattleChrome';
import { StakePicker } from './StakePicker';
import { Mascot } from '@/components/mascot/Mascot';
import { useMascotLine } from '@/components/mascot/mascotLines';

const MAX_MEMBERS = 4;

function ResultCard({ result, meId, onDismiss }: { result: BattleResult; meId: number | null; onDismiss?: () => void }) {
  const mine = result.standings.find((s) => s.userId === meId);
  const won = mine?.placing === 1;
  const title = won ? 'Bạn thắng rồi! 🎉' : mine ? `Bạn xếp hạng #${mine.placing}` : 'Trận vừa rồi';
  // A spectator's view of a past Battle (no `mine`) has nobody to cheer or console.
  const mascotLine = useMascotLine(won ? 'battleWin' : 'battleLoss');
  return (
    <section className={clsx(CARD, 'overflow-hidden animate-popIn', won && 'border-amber-300 dark:border-amber-500/60')}>
      <div
        className={clsx(
          'flex items-center gap-3 px-5 py-4',
          won ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-900/40',
        )}
      >
        <span
          className={clsx(
            'w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center',
            won ? 'bg-amber-400 text-amber-950 shadow-clay-sm' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600',
          )}
        >
          <Trophy className="w-6 h-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={clsx('font-display text-xl font-extrabold', !won && 'text-slate-900 dark:text-slate-100')}>{title}</h3>
          <p className={clsx('text-xs font-bold', won ? 'text-white/80' : 'text-slate-400')}>{MODE_LABEL[result.mode]}</p>
        </div>
        {mine && (
          <Mascot
            mood={won ? 'cheer' : 'encourage'}
            size={56}
            bubble={mascotLine}
            bubblePosition="left"
            interactive={false}
            className="shrink-0"
          />
        )}
      </div>
      <div className="p-4 space-y-3">
        <Standings rows={result.standings} meId={meId} />
        {onDismiss && (
          <button type="button" onClick={onDismiss} className={BTN_GHOST}>
            Đóng
          </button>
        )}
      </div>
    </section>
  );
}

interface RoomLobbyProps {
  battle: BattleApi;
  meId: number | null;
  topics: BattleTopic[] | null;
  /** Word Heist: the Stakes this player last locked. */
  stakePicks: StakePick[];
  onStakePicks: (picks: StakePick[]) => void;
}

/**
 * A room between Battles: its code, the members, the Host's settings, the last
 * Battle's standings and its recap — and, for Word Heist, choosing the Stakes.
 */
export function RoomLobby({ battle, meId, topics, stakePicks, onStakePicks }: RoomLobbyProps) {
  const room = battle.state.room!;
  const isHost = room.hostUserId === meId;
  const [picking, setPicking] = useState(false);
  const isHeist = room.config.mode === 'heist';
  const stakeCount = room.config.stakeCount ?? DEFAULT_STAKE_COUNT;
  const locked = new Set(room.stakeUserIds ?? []);
  const iLocked = meId !== null && locked.has(meId);
  const waitingForStakes = isHeist && !room.members.every((m) => locked.has(m.userId));
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const result = battle.state.result ?? room.lastResult;

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

  async function copy(what: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(what === 'code' ? room.code : battleInviteLink(room.code));
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard can be unavailable (insecure origin); the code is visible anyway.
    }
  }

  const openSeats = Math.max(0, MAX_MEMBERS - room.members.length);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4 min-w-0">
        {result && (
          <ResultCard result={result} meId={meId} onDismiss={battle.state.result ? battle.dismissResult : undefined} />
        )}
        {result && <BattleRecap result={result} meId={meId} />}

        <section className={`${CARD} p-5 space-y-4`}>
          <div className="flex items-center gap-3">
            <BattleIcon icon={Settings2} />
            <div className="min-w-0">
              <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">Cài đặt trận đấu</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isHost ? 'Bạn là chủ phòng — hãy chọn cách chơi.' : 'Chủ phòng sẽ chọn cách chơi.'}
              </p>
            </div>
          </div>
          <BattleConfigPanel config={room.config} topics={topics} isHost={isHost} onConfigure={battle.configure} />
        </section>

        {isHeist && (
          <section
            className={clsx(
              CARD,
              'p-4 flex flex-wrap items-center gap-3 animate-popIn',
              iLocked ? 'border-emerald-300 dark:border-emerald-700' : 'border-blue-400',
            )}
          >
            <BattleIcon icon={iLocked ? Lock : Gem} className={iLocked ? 'bg-emerald-500 border-emerald-300' : undefined} />
            <div className="min-w-0 flex-1 basis-48">
              <p className="font-display font-extrabold text-slate-900 dark:text-slate-100">
                {iLocked ? `Đã khoá ${stakeCount} từ cược` : `Chọn ${stakeCount} từ để cược`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {iLocked
                  ? 'Người khác chỉ thấy chúng ở giai đoạn ôn tập.'
                  : 'Từ trong thư viện của bạn — người khác sẽ cố cướp chúng.'}
              </p>
            </div>
            <button
              type="button"
              className={`${iLocked ? BTN_SECONDARY : BTN_PRIMARY} px-5 py-2.5`}
              onClick={() => setPicking(true)}
            >
              <Gem className="w-4 h-4" aria-hidden />
              {iLocked ? 'Đổi' : 'Chọn từ cược'}
            </button>
          </section>
        )}

        {picking && (
          <StakePicker
            stakeCount={stakeCount}
            initial={iLocked ? stakePicks : []}
            onClose={() => setPicking(false)}
            onLock={async (picks) => {
              await battle.lockStakes(picks);
              onStakePicks(picks);
            }}
          />
        )}
      </div>

      <section className={`${CARD} p-5 space-y-4 h-fit`}>
        <div className="space-y-2">
          <SectionLabel>Mã phòng</SectionLabel>
          <div className="relative overflow-hidden rounded-2xl border-clay border-blue-400 bg-blue-600 px-4 py-3 text-center text-white shadow-clay-sm">
            <span aria-hidden className="absolute -right-4 -top-6 w-16 h-16 rotate-12 rounded-2xl bg-white/10" />
            <span className="relative font-display text-3xl font-extrabold tracking-[0.25em] tabular-nums">{room.code}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={`${BTN_SECONDARY} py-2.5`} onClick={() => void copy('code')}>
              {copied === 'code' ? <Check className="w-4 h-4 text-emerald-500" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
              {copied === 'code' ? 'Đã sao chép' : 'Sao chép mã'}
            </button>
            <button type="button" className={`${BTN_SECONDARY} py-2.5`} onClick={() => void copy('link')}>
              {copied === 'link' ? <Check className="w-4 h-4 text-emerald-500" aria-hidden /> : <Link2 className="w-4 h-4" aria-hidden />}
              {copied === 'link' ? 'Đã sao chép' : 'Link mời'}
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            {copied === 'code' ? 'Đã sao chép mã phòng' : copied === 'link' ? 'Đã sao chép link mời' : ''}
          </p>
        </div>

        <div className="space-y-2">
          <SectionLabel className="flex items-center justify-between">
            Người chơi
            <span className="tabular-nums" aria-live="polite">
              {room.members.length}/{MAX_MEMBERS}
            </span>
          </SectionLabel>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {room.members.map((m) => {
              const host = m.userId === room.hostUserId;
              const hasLocked = locked.has(m.userId);
              return (
                <li
                  key={m.userId}
                  className={clsx(
                    'flex items-center gap-3 rounded-2xl border-2 p-2.5 animate-popIn',
                    m.userId === meId
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800',
                  )}
                >
                  <span
                    aria-hidden
                    className={clsx(
                      'relative w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-display font-extrabold',
                      host ? 'bg-amber-400 text-amber-950' : 'bg-clay-lilac text-blue-800',
                    )}
                  >
                    {m.name.slice(0, 1).toUpperCase()}
                    <span
                      className={clsx(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-800',
                        m.connected ? 'bg-emerald-500' : 'bg-slate-400',
                      )}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                      {m.name}
                      {m.userId === meId && <span className="ml-1.5 text-xs font-normal text-slate-400">(bạn)</span>}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      {m.connected ? (
                        'Trực tuyến'
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3" aria-hidden />
                          Ngoại tuyến
                        </>
                      )}
                    </p>
                  </div>
                  {isHeist && (
                    <span
                      className={clsx(
                        'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                        hasLocked
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
                      )}
                    >
                      {hasLocked ? <Lock className="w-3 h-3" aria-hidden /> : <Hourglass className="w-3 h-3" aria-hidden />}
                      {hasLocked ? 'Đã khoá' : 'Đang chọn'}
                    </span>
                  )}
                  {host && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                      <Crown className="w-3 h-3" aria-hidden />
                      Chủ phòng
                    </span>
                  )}
                </li>
              );
            })}
            {Array.from({ length: openSeats }, (_, i) => (
              <li
                key={`seat-${i}`}
                className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-blue-200 dark:border-slate-700 p-2.5 text-sm text-slate-400"
              >
                <span aria-hidden className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </span>
                Chỗ trống
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <button
            type="button"
            className={`${BTN_PRIMARY} w-full py-3.5 text-base`}
            disabled={busy || room.members.length < 2 || waitingForStakes}
            onClick={() => void run(battle.start)}
          >
            <Play className="w-5 h-5 fill-white" aria-hidden />
            {room.members.length < 2
              ? 'Đang chờ người chơi…'
              : waitingForStakes
                ? 'Đang chờ chọn từ cược…'
                : 'Bắt đầu trận'}
          </button>
        ) : (
          <p role="status" className="clay-well flex items-center justify-center gap-2 px-3 py-3 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            <Hourglass className="w-4 h-4 shrink-0 animate-pulse" aria-hidden />
            Đang chờ chủ phòng bắt đầu…
          </p>
        )}
        <button type="button" className={`${BTN_GHOST} w-full`} disabled={busy} onClick={() => void run(battle.leaveRoom)}>
          <LogOut className="w-4 h-4" aria-hidden />
          Rời phòng
        </button>
        {error && <ErrorLine>{error}</ErrorLine>}
      </section>
    </div>
  );
}
