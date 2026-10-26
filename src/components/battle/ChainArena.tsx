'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Heart, Hourglass, Link2, Loader2, Pause, Play, Send, XCircle } from 'lucide-react';
import { BattleRequestError, useNow } from '@/hooks/useBattle';
import { msLeft } from '@/lib/battle';
import type { ChainLink, ChainView } from '@/types/battle';
import { BandChip, BattleBand, BTN_PRIMARY, CARD, ClockChip, INPUT, SectionLabel, TimeBar } from './BattleChrome';

interface ChainArenaProps {
  chain: ChainView;
  meId: number | null;
  clockOffset: number;
  canPlay: boolean;
  onSubmit: (word: string) => Promise<ChainLink>;
}

function Lives({ lives }: { lives: number }) {
  return (
    <span role="img" className="flex shrink-0 gap-0.5" aria-label={`Còn ${lives} mạng`}>
      {[0, 1, 2].map((i) => (
        <Heart
          key={i}
          aria-hidden
          className={clsx('w-4 h-4', i < lives ? 'fill-red-500 text-red-500' : 'text-slate-300 dark:text-slate-600')}
        />
      ))}
    </span>
  );
}

/**
 * A Word Chain Battle: the chain so far (each Link with its definition), whose
 * Turn it is, and — on your Turn — a box to add the next Link. The backend
 * judges every Link and times every Turn.
 */
export function ChainArena({ chain, meId, clockOffset, canPlay, onSubmit }: ChainArenaProps) {
  const now = useNow(100);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const names = Object.fromEntries(chain.players.map((p) => [p.userId, p.name]));
  const myTurn = chain.turnUserId === meId && canPlay;
  // The backend pauses the Turn while it checks a Link; show the frozen time then.
  const paused = chain.checking && chain.pausedMsLeft !== null;
  const left = paused ? chain.pausedMsLeft! : msLeft(chain.turnEndsAt, clockOffset, now);
  const letter = chain.nextLetter.toUpperCase();

  // A new Turn: clear the box and, if it's ours, focus it.
  useEffect(() => {
    setWord('');
    setError(null);
    if (myTurn) inputRef.current?.focus();
  }, [chain.turnStartedAt, myTurn]);

  // Keep the newest Link in view.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chain.links.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!myTurn || sending || !word.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSubmit(word.trim());
    } catch (err) {
      setError(err instanceof BattleRequestError ? err.message : 'Không gửi được từ của bạn.');
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  const turnName = chain.turnUserId !== null ? names[chain.turnUserId] : null;

  return (
    <div className="space-y-4">
      <BattleBand icon={Link2} title="Word Chain">
        <BandChip>{chain.links.length} từ</BandChip>
        <ClockChip low={left < 4_000} muted={paused} title={paused ? 'Tạm dừng trong lúc kiểm tra từ' : undefined}>
          {paused && <Pause aria-label="Tạm dừng" />}
          {Math.ceil(left / 1000)} s
        </ClockChip>
      </BattleBand>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className={`${CARD} p-4 md:p-5 space-y-4 min-w-0`}>
          <TimeBar fraction={left / chain.turnMs} low={left < 4_000} paused={paused} />

          <ol ref={listRef} className="max-h-80 space-y-2 overflow-y-auto pr-1" aria-label="Chuỗi từ hiện tại">
            {chain.links.map((link, i) => {
              const newest = i === chain.links.length - 1;
              return (
                <li
                  key={`${i}-${link.word}`}
                  className={clsx(
                    'flex gap-3 rounded-2xl border-2 px-3 py-2.5',
                    newest
                      ? 'animate-popIn border-blue-400 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800',
                  )}
                >
                  <span className="mt-0.5 w-7 h-7 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-extrabold text-slate-400 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="min-w-0 break-all font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">
                        <span className="text-blue-600 dark:text-blue-400">{link.word.slice(0, 1)}</span>
                        {link.word.slice(1)}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {link.userId === null ? 'Từ khởi đầu' : link.userId === meId ? 'bạn' : names[link.userId]}
                      </span>
                    </div>
                    {link.definition && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{link.definition}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {myTurn ? (
            <form
              onSubmit={(e) => void submit(e)}
              className="space-y-3 rounded-2xl border-clay border-blue-400 bg-blue-50 dark:bg-blue-950/40 p-3 sm:p-4"
            >
              <p aria-live="polite" className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-base font-extrabold text-slate-900 dark:text-slate-100">
                Lượt của bạn — một từ bắt đầu bằng
                <span className="w-10 h-10 rounded-xl bg-blue-600 text-white text-2xl flex items-center justify-center shadow-clay-sm">
                  {letter}
                </span>
              </p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder={`${letter}…`}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={sending}
                  aria-label="Từ của bạn"
                  className={INPUT}
                />
                <button type="submit" className={`${BTN_PRIMARY} px-4 shrink-0`} disabled={sending || !word.trim()}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-4 h-4" aria-hidden />}
                  {sending ? 'Đang kiểm tra' : 'Gửi'}
                </button>
              </div>
              {error && (
                <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                  <XCircle className="mt-0.5 w-4 h-4 shrink-0" aria-hidden />
                  {error}
                </p>
              )}
            </form>
          ) : (
            <div
              aria-live="polite"
              className="clay-well flex min-h-14 items-center justify-center gap-2 px-3 py-3 text-center text-sm text-slate-500 dark:text-slate-400"
            >
              {turnName != null && (
                <>
                  {chain.checking ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Hourglass className="w-4 h-4 shrink-0" aria-hidden />
                  )}
                  <p>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{turnName}</span>{' '}
                    {chain.checking ? 'đang được kiểm tra từ — đồng hồ tạm dừng…' : `đang nghĩ một từ bắt đầu bằng ${letter}…`}
                  </p>
                </>
              )}
            </div>
          )}
        </section>

        <section className={`${CARD} p-4 space-y-3 h-fit`}>
          <SectionLabel>Người chơi</SectionLabel>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {chain.players.map((p) => {
              const playing = p.userId === chain.turnUserId;
              return (
                <li
                  key={p.userId}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-2xl border-2 px-3 py-2.5 text-sm transition-colors',
                    playing
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 shadow-clay-sm'
                      : 'border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800',
                    p.eliminated && 'opacity-60',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className={clsx('truncate font-bold text-slate-800 dark:text-slate-100', p.eliminated && 'line-through')}>
                      {p.name}
                      {p.userId === meId && <span className="ml-1 text-xs font-normal text-slate-400">(bạn)</span>}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-0.5 tabular-nums">
                        <Link2 className="w-3 h-3" aria-hidden />
                        {p.links}
                        <span className="sr-only"> từ</span>
                      </span>
                      {playing && !p.eliminated && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 px-1.5 font-bold text-blue-700 dark:text-blue-300">
                          <Play className="w-2.5 h-2.5 fill-current" aria-hidden />
                          Đang chơi
                        </span>
                      )}
                      {p.eliminated && <span className="font-bold">Bị loại</span>}
                    </p>
                  </div>
                  <Lives lives={p.lives} />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
