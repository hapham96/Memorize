'use client';

import React from 'react';
import clsx from 'clsx';
import { AlertCircle, Crown, Loader2, LogOut, type LucideIcon } from 'lucide-react';

/*
 * Shared Vocabulary Battle chrome: the clay surfaces, buttons and countdowns
 * every Battle screen sits on, plus the standings table and the per-player
 * seat colours. Class strings are spelled out in full — Tailwind cannot see
 * ones built at runtime.
 */

export const CARD =
  'bg-white dark:bg-slate-800 rounded-card border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-button border-clay font-bold text-sm transition-all active:shadow-clay-inset active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100';

export const BTN_PRIMARY = `${BTN_BASE} bg-blue-600 hover:bg-blue-700 border-blue-400 text-white shadow-clay`;

export const BTN_SECONDARY = `${BTN_BASE} bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border-blue-200 dark:border-slate-600 text-slate-700 dark:text-slate-100`;

export const BTN_GHOST =
  'inline-flex items-center justify-center gap-2 rounded-button px-3 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors';

export const INPUT =
  'w-full min-w-0 px-4 py-3 rounded-input bg-slate-100 dark:bg-slate-900 border-clay border-blue-200 dark:border-slate-700 shadow-clay-inset text-base font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60';

/** Small uppercase label above a group. */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={clsx('text-[11px] font-extrabold uppercase tracking-wider text-slate-400', className)}>
      {children}
    </p>
  );
}

/** A rounded tile with the icon on the Battle's primary colour. */
export function BattleIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={clsx(
        'w-10 h-10 shrink-0 rounded-2xl border-clay border-blue-400 bg-blue-600 text-white flex items-center justify-center shadow-clay-sm',
        className,
      )}
    >
      <Icon className="w-5 h-5" aria-hidden />
    </span>
  );
}

/** The coloured header band of a Battle in progress: mode, and the chips that go with it. */
export function BattleBand({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden flex flex-wrap items-center gap-3 rounded-card border-clay border-blue-400 bg-blue-600 text-white px-4 py-3 shadow-clay">
      <span aria-hidden className="absolute -right-6 -top-8 w-24 h-24 rotate-12 rounded-3xl bg-white/10" />
      <span className="relative w-10 h-10 shrink-0 rounded-2xl bg-white/15 border-2 border-white/25 flex items-center justify-center">
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      <h2 className="relative mr-auto font-display text-xl md:text-2xl font-extrabold">{title}</h2>
      {children && <div className="relative flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** A small white label that stays readable on the band. */
export function BandChip({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-100 tabular-nums',
        className,
      )}
      {...props}
    />
  );
}

/** A big countdown; turns red and pulses when time is short. */
export function ClockChip({
  low = false,
  muted = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { low?: boolean; muted?: boolean }) {
  return (
    <span
      role="timer"
      className={clsx(
        'inline-flex min-w-[4.5rem] items-center justify-center gap-1.5 rounded-xl px-3 py-1 font-display text-xl font-extrabold tabular-nums transition-colors [&_svg]:w-4 [&_svg]:h-4',
        low && !muted
          ? 'animate-pulse bg-red-500 text-white'
          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100',
        muted && 'text-slate-400',
        className,
      )}
      {...props}
    />
  );
}

/** The time-left track under a question. `fraction` is 0..1. */
export function TimeBar({ fraction, low = false, paused = false }: { fraction: number; low?: boolean; paused?: boolean }) {
  return (
    <div className="w-full h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-900 shadow-clay-inset border-2 border-slate-300 dark:border-slate-700">
      <div
        className={clsx('h-full rounded-full', paused ? 'bg-slate-400' : low ? 'bg-red-500' : 'bg-blue-500')}
        style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
      />
    </div>
  );
}

/** A centred spinner line for "waiting on the backend" moments. */
export function WaitingLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex items-center justify-center gap-2 py-16 text-center font-display text-lg font-bold text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
      {children}
    </p>
  );
}

export function ErrorLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={clsx('flex items-start gap-2 text-sm font-semibold text-red-600 dark:text-red-400', className)}>
      <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/** A pressable pill, used for the Host's settings. */
export function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'inline-flex h-9 items-center rounded-full border-2 px-3.5 text-xs font-bold transition-all disabled:cursor-default',
        active
          ? 'border-blue-400 bg-blue-600 text-white shadow-clay-sm'
          : 'border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400',
        !disabled && !active && 'hover:border-blue-400 hover:text-slate-800 dark:hover:text-slate-100',
      )}
    >
      {children}
    </button>
  );
}

export interface StandingRow {
  userId: number;
  name: string;
  points: number;
  placing: number;
  left?: boolean;
  /** Shown faintly next to the total, e.g. the last question's +/− delta. */
  delta?: number | null;
}

/** Battle Points table. Placings are shared on ties, as the backend ranks them. */
export function Standings({ rows, meId, compact = false }: { rows: StandingRow[]; meId: number | null; compact?: boolean }) {
  return (
    <ol className="space-y-1.5">
      {rows.map((row) => {
        const me = row.userId === meId;
        const first = row.placing === 1;
        return (
          <li
            key={row.userId}
            className={clsx(
              'flex items-center gap-3 rounded-2xl border-2 px-2.5 text-sm transition-colors',
              compact ? 'py-1.5' : 'py-2.5 shadow-clay-sm',
              me
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40'
                : 'border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800',
              row.left && 'opacity-60',
            )}
          >
            <span
              className={clsx(
                'flex shrink-0 items-center justify-center gap-0.5 rounded-xl font-display font-extrabold tabular-nums',
                compact ? 'h-7 min-w-7 px-1 text-xs' : 'h-9 min-w-9 px-1.5 text-sm',
                first ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
              )}
            >
              <span className="sr-only">Hạng </span>
              {first && !compact && <Crown className="w-3.5 h-3.5" aria-hidden />}
              {row.placing}
            </span>
            <span className={clsx('min-w-0 flex-1 truncate text-slate-800 dark:text-slate-100', me ? 'font-extrabold' : 'font-semibold')}>
              {row.name}
              {me && <span className="ml-1.5 text-xs font-normal text-slate-400">(bạn)</span>}
            </span>
            {row.left && <LogOut className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-label="Đã rời trận" />}
            {row.delta != null && row.delta !== 0 && (
              <span
                className={clsx(
                  'shrink-0 rounded-lg px-1.5 text-xs font-bold tabular-nums',
                  row.delta > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-300',
                )}
              >
                {row.delta > 0 ? `+${row.delta}` : row.delta}
              </span>
            )}
            <span
              className={clsx(
                'shrink-0 text-right font-display font-extrabold tabular-nums',
                compact ? 'min-w-10 text-base' : 'min-w-12 text-lg',
                row.points < 0 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100',
              )}
            >
              {row.points}
              <span className="sr-only"> điểm</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/*
 * Word Heist seats: each player gets one colour, by their position among the
 * Battle's participants, so "whose Stake is this" and "who holds it" read at a
 * glance everywhere.
 */
const SEATS = [
  { bg: 'bg-blue-600', soft: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-500' },
  { bg: 'bg-rose-500', soft: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-300', border: 'border-rose-400' },
  { bg: 'bg-emerald-500', soft: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-400' },
  { bg: 'bg-amber-500', soft: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-400' },
] as const;

export type Seat = (typeof SEATS)[number];

/** The seat colour of `userId` among `players` (participants in join order). */
export function seatFor(players: { userId: number }[], userId: number | null): Seat {
  const index = players.findIndex((p) => p.userId === userId);
  return SEATS[(index < 0 ? 0 : index) % SEATS.length];
}

/** A player's initial on their seat colour. */
export function SeatAvatar({ seat, name }: { seat: Seat; name: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-display text-sm font-extrabold text-white shadow-clay-sm',
        seat.bg,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const CONFETTI_COLOURS = ['bg-blue-500', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-clay-lilac', 'bg-clay-cta'];
const CONFETTI_PIECES = 22;

/**
 * A one-shot burst of confetti from the centre of its (relatively positioned)
 * parent. Decorative, so hidden from assistive tech; the reduced-motion rule in
 * globals.css stills it.
 */
export function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      {Array.from({ length: CONFETTI_PIECES }, (_, i) => {
        // Spread the pieces round a circle, alternating near and far, so the burst looks scattered but stays put between renders.
        const angle = (i / CONFETTI_PIECES) * Math.PI * 2;
        const distance = 90 + ((i * 53) % 110);
        return (
          <span
            key={i}
            className={clsx(
              'absolute left-1/2 top-1/2 h-2.5 w-1.5 rounded-sm animate-battle-confetti',
              CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
            )}
            style={
              {
                '--dx': `${Math.round(Math.cos(angle) * distance)}px`,
                '--dy': `${Math.round(Math.sin(angle) * distance - 40)}px`,
                '--rot': `${(i % 2 ? 1 : -1) * (240 + i * 31)}deg`,
                animationDelay: `${(i % 5) * 30}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
