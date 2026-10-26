'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle, Flame, Gem, Keyboard, Loader2, Lock, RotateCcw, Send, Shield, Swords, XCircle, type LucideIcon } from 'lucide-react';
import { BattleRequestError, useNow } from '@/hooks/useBattle';
import { msLeft } from '@/lib/battle';
import type { HeistOutcome, HeistQuestionView, HeistView } from '@/types/battle';
import {
  BandChip,
  BattleBand,
  BTN_PRIMARY,
  CARD,
  ClockChip,
  Confetti,
  INPUT,
  SeatAvatar,
  SectionLabel,
  seatFor,
  TimeBar,
  WaitingLine,
} from './BattleChrome';
import { HeistStudy } from './HeistStudy';

const QUESTION_MS = 20_000;

export interface HeistArenaProps {
  heist: HeistView;
  meId: number | null;
  clockOffset: number;
  canPlay: boolean;
  onReady: () => Promise<void>;
  /** Resolves to whether the backend judged the answer correct. */
  onAnswer: (questionId: string, answer: string) => Promise<boolean>;
}

/** A Word Heist in progress: the Study Phase first, then the Stakes one at a time. The backend judges and times everything. */
export function HeistArena(props: HeistArenaProps) {
  if (props.heist.phase === 'study' && props.heist.study) return <HeistStudy {...props} />;
  return <HeistTable {...props} />;
}

const STAMP: Record<HeistOutcome, { label: string; icon: LucideIcon }> = {
  steal: { label: 'Cướp!', icon: Swords },
  defend: { label: 'Giữ được', icon: Shield },
  retry: { label: 'Trượt', icon: RotateCcw },
  burned: { label: 'Cháy', icon: Flame },
};

/** The typed attempt's hint as letter tiles: the first letter shown, one blank per further letter. */
function HintTiles({ hint }: { hint: string }) {
  return (
    <p
      className="flex flex-wrap justify-center gap-x-3 gap-y-2"
      aria-label={`Gợi ý: bắt đầu bằng ${hint.slice(0, 1)}, ${hint.replace(/\s/g, '').length} ký tự`}
    >
      {hint.split(' ').map((word, w) => (
        <span key={w} aria-hidden className="flex gap-1">
          {[...word].map((ch, i) => (
            <span
              key={i}
              className={clsx(
                'flex h-10 w-8 items-center justify-center rounded-lg border-2 font-display text-lg font-extrabold uppercase animate-popIn',
                ch === '_'
                  ? 'border-dashed border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent'
                  : 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-slate-900 dark:text-slate-100',
              )}
              style={{ animationDelay: `${(w * 4 + i) * 35}ms` }}
            >
              {ch === '_' ? '·' : ch}
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}

interface AnswerProps {
  question: HeistQuestionView;
  /** The answer, once the Stake has closed. */
  answer: string | null;
  canAnswer: boolean;
  onAnswer: (answer: string) => Promise<boolean>;
}

/** First attempt: one pick among the headwords. A wrong pick locks you out of this Stake. */
function PickOptions({ question, answer, canAnswer, onAnswer }: AnswerProps) {
  const [pick, setPick] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(option: string) {
    if (pick || answer !== null || !canAnswer) return;
    setPick(option);
    try {
      setVerdict(await onAnswer(option));
    } catch (err) {
      setError(err instanceof BattleRequestError ? err.message : 'Không gửi được lựa chọn.');
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.options.map((option, i) => {
          const isPick = option === pick;
          const good = answer !== null ? option === answer : isPick && verdict === true;
          const bad = isPick && (answer !== null ? option !== answer : verdict === false);
          const waiting = isPick && verdict === null && answer === null && !error;
          return (
            <button
              key={option}
              type="button"
              onClick={() => void choose(option)}
              disabled={pick !== null || answer !== null || !canAnswer}
              style={{ animationDelay: `${120 + i * 60}ms` }}
              className={clsx(
                'w-full min-h-14 p-4 rounded-button border-3 text-sm font-bold flex items-center justify-between gap-3 text-left text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 shadow-clay-sm transition-all duration-200 animate-popIn enabled:hover:-translate-y-0.5 enabled:hover:border-blue-400 disabled:cursor-default',
                !isPick && !good && 'border-blue-200 dark:border-slate-700',
                isPick && !good && !bad && 'border-blue-500 bg-blue-50 dark:bg-blue-950/40',
                good && 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
                bad && 'border-red-400 bg-red-50 dark:bg-red-950/40 animate-battle-shake',
                (pick !== null || answer !== null) && !isPick && !good && 'opacity-55 shadow-none',
              )}
            >
              <span className="min-w-0 break-words">{option}</span>
              {waiting && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-slate-400" aria-hidden />}
              {good && <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" aria-label={isPick ? 'Đúng' : 'Đáp án'} />}
              {bad && <XCircle className="w-5 h-5 shrink-0 text-red-500" aria-label="Sai" />}
            </button>
          );
        })}
      </div>
      <p className="min-h-6 text-center text-sm font-semibold" aria-live="polite">
        {error && <span className="text-red-500">{error}</span>}
        {!error && verdict === false && answer === null && (
          <span className="inline-flex items-center gap-1.5 text-red-500">
            <Lock className="w-4 h-4" aria-hidden />
            Bị khoá — người khác vẫn có thể giành từ này.
          </span>
        )}
      </p>
    </div>
  );
}

/** Second attempt: type the headword from its hint. Wrong tries can be repeated until the time is up. */
function TypeAnswer({ question, answer, canAnswer, onAnswer }: AnswerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [misses, setMisses] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (canAnswer) inputRef.current?.focus();
  }, [canAnswer]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !text.trim() || answer !== null || !canAnswer) return;
    setSending(true);
    setError(null);
    try {
      if (!(await onAnswer(text.trim()))) {
        setMisses((n) => n + 1);
        setText('');
      }
    } catch (err) {
      setError(err instanceof BattleRequestError ? err.message : 'Không gửi được câu trả lời.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-3">
      {question.hint && <HintTiles hint={question.hint} />}
      {/* Re-keyed on each miss so the shake replays. */}
      <form key={misses} onSubmit={(e) => void submit(e)} className={clsx('flex gap-2', misses > 0 && 'animate-battle-shake')}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Gõ từ…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={answer !== null || !canAnswer}
          aria-label="Câu trả lời của bạn"
          className={INPUT}
        />
        <button
          type="submit"
          className={`${BTN_PRIMARY} px-4 shrink-0`}
          disabled={sending || !text.trim() || answer !== null || !canAnswer}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-4 h-4" aria-hidden />}
          Gửi
        </button>
      </form>
      <p className="min-h-6 text-center text-sm font-semibold" aria-live="polite">
        {error && <span className="text-red-500">{error}</span>}
        {!error && misses > 0 && answer === null && <span className="text-red-500">Chưa đúng — thử lại.</span>}
      </p>
    </div>
  );
}

/** The Stakes in play: who holds how many, the Stake being fought over, and the reveal when it closes. */
function HeistTable({ heist, meId, clockOffset, canPlay, onAnswer }: HeistArenaProps) {
  const now = useNow(100);
  const question = heist.question;
  const reveal = heist.reveal;
  const names = Object.fromEntries(heist.players.map((p) => [p.userId, p.name]));
  const who = (userId: number) => (userId === meId ? 'Bạn' : names[userId]);

  if (!question) return <WaitingLine>Đang xáo các từ cược…</WaitingLine>;

  const left = reveal ? 0 : msLeft(question.endsAt, clockOffset, now);
  const low = !reveal && left < 5_000;
  const mine = question.ownerUserId === meId;
  const ownerSeat = seatFor(heist.players, question.ownerUserId);
  const winnerSeat = reveal?.winnerUserId != null ? seatFor(heist.players, reveal.winnerUserId) : null;
  const iWon = reveal != null && reveal.winnerUserId === meId;
  const locked = new Set(question.lockedUserIds);
  const stamp = reveal ? STAMP[reveal.outcome] : null;

  const revealLine = !reveal
    ? null
    : reveal.outcome === 'steal'
      ? `${who(reveal.winnerUserId!)} đã cướp từ của ${mine ? 'bạn' : names[question.ownerUserId]}!`
      : reveal.outcome === 'defend'
        ? `${who(reveal.winnerUserId!)} đã giữ được từ.`
        : reveal.outcome === 'retry'
          ? 'Chưa ai đúng — từ này sẽ quay lại, lần này phải gõ.'
          : 'Cháy — không ai giữ được từ này.';

  return (
    <div className="space-y-4">
      <BattleBand icon={Gem} title="Word Heist">
        <BandChip aria-live="polite">
          {question.attempt === 'type' && <Keyboard className="w-3.5 h-3.5" aria-hidden />}
          {question.attempt === 'type' ? 'Cơ hội thứ hai' : `Từ ${question.index}`}
        </BandChip>
        <BandChip>Còn {heist.remaining}</BandChip>
        <ClockChip low={low} muted={!!reveal}>
          <span className="sr-only">Thời gian còn lại cho từ này </span>
          {Math.ceil(left / 1000)} s
        </ClockChip>
      </BattleBand>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px]">
        <section className={`${CARD} p-4 md:p-5 space-y-5 min-w-0`}>
          <TimeBar fraction={left / QUESTION_MS} low={low} />

          <div
            key={`stake-${question.questionId}`}
            className={clsx(
              'relative rounded-3xl border-clay bg-white dark:bg-slate-800 px-4 pb-5 pt-4 text-center shadow-clay animate-scaleUp',
              ownerSeat.border,
              reveal?.outcome === 'burned' && 'opacity-60 grayscale',
            )}
          >
            <p className="flex flex-wrap items-center justify-center gap-2">
              <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-sm font-extrabold text-white shadow-clay-sm', ownerSeat.bg)}>
                {mine ? <Shield className="w-4 h-4" aria-hidden /> : <Swords className="w-4 h-4" aria-hidden />}
                {mine ? 'Bảo vệ từ của bạn' : `Cướp từ của ${names[question.ownerUserId]}`}
              </span>
              {question.partOfSpeech && (
                <span className="rounded-full border-2 border-blue-100 dark:border-slate-600 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-300">
                  {question.partOfSpeech}
                </span>
              )}
            </p>
            <p className="mt-3 text-lg leading-relaxed font-semibold text-slate-900 dark:text-slate-100">{question.definition}</p>

            {reveal && (
              <div className="mt-4 space-y-1.5" aria-live="polite">
                <p className="animate-popIn font-display text-3xl font-extrabold text-slate-900 dark:text-slate-100">{reveal.answer}</p>
                <p className={clsx('text-sm font-bold', winnerSeat ? winnerSeat.text : 'text-slate-400')}>{revealLine}</p>
              </div>
            )}
            {stamp && (
              <span
                aria-hidden
                className={clsx(
                  'absolute -right-2 -top-3 inline-flex items-center gap-1.5 rounded-xl border-[3px] bg-white dark:bg-slate-800 px-3 py-1 font-display text-base font-extrabold uppercase tracking-wider shadow-clay-sm animate-battle-stamp',
                  winnerSeat ? clsx(winnerSeat.border, winnerSeat.text) : 'border-slate-400 text-slate-400',
                )}
              >
                <stamp.icon className="w-4 h-4" />
                {stamp.label}
              </span>
            )}
            {iWon && <Confetti />}
          </div>

          {question.attempt === 'pick' ? (
            <PickOptions
              key={`answer-${question.questionId}`}
              question={question}
              answer={reveal?.answer ?? null}
              canAnswer={canPlay}
              onAnswer={(answer) => onAnswer(question.questionId, answer)}
            />
          ) : (
            <TypeAnswer
              key={`answer-${question.questionId}`}
              question={question}
              answer={reveal?.answer ?? null}
              canAnswer={canPlay}
              onAnswer={(answer) => onAnswer(question.questionId, answer)}
            />
          )}
        </section>

        <section className={`${CARD} p-4 space-y-3 h-fit`}>
          <SectionLabel className="flex items-center gap-1.5">
            <Gem className="w-3.5 h-3.5" aria-hidden />
            Từ đang giữ
          </SectionLabel>
          <div
            className="flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900 shadow-clay-inset"
            role="img"
            aria-label={heist.players.map((p) => `${p.name} giữ ${p.held}`).join(', ')}
          >
            {heist.players.map((p) => (
              <span
                key={p.userId}
                className={clsx('h-full transition-[width] duration-700 ease-clay', seatFor(heist.players, p.userId).bg)}
                style={{ width: `${(p.held / Math.max(1, heist.total)) * 100}%` }}
              />
            ))}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1" aria-live="polite">
            {heist.players.map((p) => {
              const seat = seatFor(heist.players, p.userId);
              const scored = reveal != null && reveal.winnerUserId === p.userId;
              return (
                <li
                  key={p.userId}
                  className={clsx(
                    'relative flex items-center gap-2.5 rounded-2xl border-2 px-3 py-2.5 transition-colors duration-300',
                    scored ? clsx(seat.border, seat.soft) : 'border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800',
                    p.left && 'opacity-60',
                  )}
                >
                  <SeatAvatar seat={seat} name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                      {p.name}
                      {p.userId === meId && <span className="ml-1 text-xs font-normal text-slate-400">(bạn)</span>}
                    </p>
                    <p className="flex items-center gap-2.5 text-xs text-slate-400 tabular-nums">
                      <span className="inline-flex items-center gap-0.5" title="Đã cướp">
                        <Swords className="w-3 h-3" aria-hidden />
                        {p.stolen}
                        <span className="sr-only"> đã cướp</span>
                      </span>
                      <span className="inline-flex items-center gap-0.5" title="Đã giữ">
                        <Shield className="w-3 h-3" aria-hidden />
                        {p.defended}
                        <span className="sr-only"> đã giữ</span>
                      </span>
                      {p.left && <span className="font-bold">Đã rời</span>}
                      {!reveal && locked.has(p.userId) && (
                        <span className="inline-flex items-center gap-0.5 font-bold text-red-500">
                          <Lock className="w-3 h-3" aria-hidden />
                          Bị khoá
                        </span>
                      )}
                    </p>
                  </div>
                  {/* Re-keyed on the count so a newly won Stake pops. */}
                  <span key={p.held} className={clsx('shrink-0 font-display text-2xl font-extrabold tabular-nums', seat.text, p.held > 0 && 'animate-popIn')}>
                    {p.held}
                    <span className="sr-only"> từ đang giữ</span>
                  </span>
                  {scored && (
                    <span aria-hidden className={clsx('absolute -top-2 right-3 font-display text-lg font-extrabold animate-battle-float-up', seat.text)}>
                      +1
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
