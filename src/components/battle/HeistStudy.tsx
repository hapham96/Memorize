'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { BookOpen, Check, Eye, EyeOff, Gem, Hourglass, Loader2, Shield, Swords } from 'lucide-react';
import { BattleRequestError, useNow } from '@/hooks/useBattle';
import { formatClock, msLeft } from '@/lib/battle';
import type { HeistView, Stake } from '@/types/battle';
import { BandChip, BattleBand, BTN_PRIMARY, ClockChip, SeatAvatar, seatFor, type Seat } from './BattleChrome';

/** One Stake, face up. In self-test mode the headword stays covered until it's tapped. */
function StakeCard({ stake, seat, index, covered }: { stake: Stake; seat: Seat; index: number; covered: boolean }) {
  const [peeked, setPeeked] = useState(false);
  const hidden = covered && !peeked;
  // Covering again (the switch flipped back on) hides every card afresh.
  useEffect(() => {
    if (covered) setPeeked(false);
  }, [covered]);

  return (
    <li
      className={clsx('rounded-2xl border-clay bg-white dark:bg-slate-800 p-3.5 shadow-clay-sm animate-popIn', seat.border)}
      style={{ animationDelay: `${Math.min(index, 14) * 45}ms` }}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {hidden ? (
          <button
            type="button"
            onClick={() => setPeeked(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-dashed border-blue-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 text-sm font-bold text-slate-400 hover:border-blue-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden />
            Chạm để xem
          </button>
        ) : (
          <span className={clsx('min-w-0 break-words font-display text-lg font-extrabold', seat.text)}>{stake.headword}</span>
        )}
        {!hidden && stake.ipaPronunciation && <span className="text-xs font-mono text-slate-400">{stake.ipaPronunciation}</span>}
        {stake.partOfSpeech && (
          <span className="ml-auto rounded-full border-2 border-blue-100 dark:border-slate-600 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-300">
            {stake.partOfSpeech}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-snug text-slate-800 dark:text-slate-100">{stake.definition}</p>
      {stake.example && !hidden && (
        <p className="mt-1.5 border-l-[3px] border-blue-100 dark:border-slate-600 pl-2 text-xs italic text-slate-500 dark:text-slate-400">
          {stake.example}
        </p>
      )}
    </li>
  );
}

interface HeistStudyProps {
  heist: HeistView;
  meId: number | null;
  clockOffset: number;
  canPlay: boolean;
  onReady: () => Promise<void>;
}

/**
 * Word Heist's Study Phase: every Stake face up, grouped by owner — rivals'
 * first, since those are the ones to steal. The backend ends it when the clock
 * runs out or everyone is ready.
 */
export function HeistStudy({ heist, meId, clockOffset, canPlay, onReady }: HeistStudyProps) {
  const study = heist.study!;
  const now = useNow(250);
  const [covered, setCovered] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const left = msLeft(study.endsAt, clockOffset, now);
  const ready = new Set(study.readyUserIds);
  const iAmReady = meId !== null && ready.has(meId);
  const present = heist.players.filter((p) => !p.left);
  // Rivals first: those are the words worth the most study time.
  const owners = [...heist.players].sort((a, b) => Number(a.userId === meId) - Number(b.userId === meId));

  async function markReady() {
    setSending(true);
    setError(null);
    try {
      await onReady();
    } catch (err) {
      setError(err instanceof BattleRequestError ? err.message : 'Không liên lạc được máy chủ.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <BattleBand icon={BookOpen} title="Giai đoạn ôn tập">
        <BandChip>
          <Gem className="w-3.5 h-3.5" aria-hidden />
          {heist.total} từ
        </BandChip>
        <ClockChip low={left < 10_000}>
          <span className="sr-only">Thời gian ôn còn lại </span>
          {formatClock(left)}
        </ClockChip>
      </BattleBand>

      <div className="clay-well flex flex-wrap items-center gap-x-4 gap-y-3 p-3.5">
        <p className="min-w-0 flex-1 basis-64 text-sm text-slate-700 dark:text-slate-200">
          <span className="font-extrabold">Học thuộc trước khi bắt đầu.</span> Nhớ từ của đối thủ để <b>cướp</b>; nhớ từ
          của mình để <b>giữ</b>.
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={covered}
          onClick={() => setCovered((c) => !c)}
          className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"
        >
          <span
            className={clsx(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors',
              covered ? 'bg-blue-600 border-blue-400' : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600',
            )}
          >
            <span
              className={clsx(
                'inline-block w-4 h-4 rounded-full bg-white shadow transition-transform',
                covered ? 'translate-x-5' : 'translate-x-1',
              )}
            />
          </span>
          {covered ? <EyeOff className="w-4 h-4 text-slate-400" aria-hidden /> : <Eye className="w-4 h-4 text-slate-400" aria-hidden />}
          Tự kiểm tra
        </button>
      </div>

      {owners.map((owner) => {
        const seat = seatFor(heist.players, owner.userId);
        const mine = owner.userId === meId;
        const stakes = study.stakes.filter((s) => s.ownerUserId === owner.userId);
        return (
          <section key={owner.userId} aria-label={mine ? 'Từ cược của bạn' : `Từ cược của ${owner.name}`} className="space-y-2.5">
            <h3 className="flex items-center gap-2.5">
              <SeatAvatar seat={seat} name={owner.name} />
              <span className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100">
                {mine ? 'Từ cược của bạn' : `Từ cược của ${owner.name}`}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-300">
                {mine ? <Shield className="w-3 h-3" aria-hidden /> : <Swords className="w-3 h-3" aria-hidden />}
                {mine ? 'cần giữ' : 'cần cướp'}
              </span>
            </h3>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {stakes.map((stake, i) => (
                <StakeCard key={stake.stakeId} stake={stake} seat={seat} index={i} covered={covered} />
              ))}
            </ul>
          </section>
        );
      })}

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-card border-clay border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-clay-lg">
        <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5" aria-live="polite" aria-label="Ai đã sẵn sàng">
          {present.map((p) => {
            const done = ready.has(p.userId);
            return (
              <li
                key={p.userId}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-bold transition-colors',
                  done
                    ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-slate-800 dark:text-slate-100'
                    : 'border-blue-100 dark:border-slate-700 text-slate-400',
                )}
              >
                {done ? <Check className="w-3 h-3 text-emerald-500" aria-hidden /> : <Hourglass className="w-3 h-3" aria-hidden />}
                {p.userId === meId ? 'Bạn' : p.name}
                <span className="sr-only">{done ? ' (sẵn sàng)' : ' (đang ôn)'}</span>
              </li>
            );
          })}
        </ul>
        {error && <p role="alert" className="text-xs font-semibold text-red-500">{error}</p>}
        <button
          type="button"
          className={`${BTN_PRIMARY} px-5 py-3`}
          disabled={!canPlay || iAmReady || sending}
          onClick={() => void markReady()}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : iAmReady ? (
            <Check className="w-4 h-4" aria-hidden />
          ) : (
            <Swords className="w-4 h-4" aria-hidden />
          )}
          {iAmReady ? 'Đã sẵn sàng — chờ người khác' : 'Tôi sẵn sàng'}
        </button>
      </div>
    </div>
  );
}
