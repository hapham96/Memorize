'use client';

import React from 'react';
import clsx from 'clsx';
import { Brain, Check, Clock, Hash, Puzzle, Timer, Trophy } from 'lucide-react';
import { useNow, type BattleApi } from '@/hooks/useBattle';
import { formatClock, msLeft, rankByPoints } from '@/lib/battle';
import { BandChip, BattleBand, CARD, ClockChip, SectionLabel, Standings, TimeBar, WaitingLine } from './BattleChrome';
import { ChainArena } from './ChainArena';
import { HeistArena } from './HeistArena';
import { MatchBoard } from './MatchBoard';
import { RecallBoard } from './RecallBoard';

const QUESTION_MS = 20_000;

/** A Battle in progress — Word Chain, Word Heist, or a Battle Recall / Battle Match question round. */
export function BattleArena({ battle, meId }: { battle: BattleApi; meId: number | null }) {
  const { state } = battle;
  const info = state.room!.battle!;
  const me = info.participants.find((p) => p.userId === meId);
  const canPlay = !!me && !me.left && state.connection === 'connected';

  if (info.mode === 'heist') {
    if (!state.heist) return <WaitingLine>Đang bày các từ cược…</WaitingLine>;
    return (
      <HeistArena
        heist={state.heist}
        meId={meId}
        clockOffset={state.clockOffset}
        canPlay={canPlay}
        onReady={battle.heistReady}
        onAnswer={battle.answerHeist}
      />
    );
  }
  if (info.mode === 'chain') {
    if (!state.chain) return <WaitingLine>Đang chọn từ khởi đầu…</WaitingLine>;
    return (
      <ChainArena
        chain={state.chain}
        meId={meId}
        clockOffset={state.clockOffset}
        canPlay={canPlay}
        onSubmit={battle.submitLink}
      />
    );
  }
  return <QuestionArena battle={battle} meId={meId} canAnswer={canPlay} />;
}

/** Battle Recall / Battle Match: both countdowns, the live points table, and the current question. */
function QuestionArena({ battle, meId, canAnswer }: { battle: BattleApi; meId: number | null; canAnswer: boolean }) {
  const { state } = battle;
  const info = state.room!.battle!;
  const now = useNow(100);
  const { question, reveal, points, clockOffset } = state;

  const battleLeft = info.endsAt ? msLeft(info.endsAt, clockOffset, now) : 0;
  const questionLeft = question ? msLeft(question.endsAt, clockOffset, now) : 0;
  const names = Object.fromEntries(info.participants.map((p) => [p.userId, p.name]));

  const lastDelta = new Map((reveal?.results ?? []).map((r) => [r.userId, r.pointsDelta]));
  const rows = rankByPoints(
    info.participants.map((p) => ({
      userId: p.userId,
      name: p.name,
      left: p.left,
      points: points[p.userId] ?? p.points,
      delta: reveal ? (lastDelta.get(p.userId) ?? null) : null,
    })),
  );
  const answered = new Set(question?.answeredUserIds ?? []);
  const questionLow = !reveal && questionLeft < 5_000;

  return (
    <div className="space-y-4">
      <BattleBand icon={info.mode === 'recall' ? Brain : Puzzle} title={info.mode === 'recall' ? 'Battle Recall' : 'Battle Match'}>
        {question && (
          <BandChip aria-live="polite">
            <Hash className="w-3.5 h-3.5" aria-hidden />
            Câu {question.index}
          </BandChip>
        )}
        <ClockChip low={battleLeft < 10_000}>
          <Timer aria-hidden />
          <span className="sr-only">Thời gian trận còn lại </span>
          {formatClock(battleLeft)}
        </ClockChip>
      </BattleBand>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className={`${CARD} p-4 md:p-5 space-y-5 min-w-0`}>
          {question ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <TimeBar fraction={reveal ? 0 : questionLeft / QUESTION_MS} low={questionLow} />
                </div>
                <p
                  className={clsx(
                    'shrink-0 text-right font-display text-sm font-extrabold tabular-nums',
                    reveal ? 'text-slate-400' : questionLow ? 'animate-pulse text-red-500' : 'text-slate-800 dark:text-slate-100',
                  )}
                >
                  {reveal ? 'Câu tiếp theo…' : `${Math.ceil(questionLeft / 1000)} s`}
                </p>
              </div>
              {question.mode === 'recall' ? (
                <RecallBoard
                  key={question.questionId}
                  question={question}
                  reveal={reveal}
                  canAnswer={canAnswer}
                  onAnswer={(headword) => battle.answerRecall(question.questionId, headword)}
                />
              ) : (
                <MatchBoard
                  key={question.questionId}
                  question={question}
                  reveal={reveal}
                  meId={meId}
                  names={names}
                  canAnswer={canAnswer}
                  onMatch={(h, d) => battle.answerMatch(question.questionId, h, d)}
                />
              )}
            </>
          ) : (
            <WaitingLine>Chuẩn bị…</WaitingLine>
          )}
        </section>

        <section className={`${CARD} p-4 space-y-3 h-fit`}>
          <SectionLabel className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" aria-hidden />
            Điểm Battle
          </SectionLabel>
          <div aria-live="polite">
            <Standings rows={rows} meId={meId} compact />
          </div>
          {question?.mode === 'recall' && !reveal && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400">Đã trả lời:</p>
              <ul className="flex flex-wrap gap-1.5">
                {info.participants
                  .filter((p) => !p.left)
                  .map((p) => {
                    const done = answered.has(p.userId);
                    return (
                      <li
                        key={p.userId}
                        className={clsx(
                          'inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs font-semibold',
                          done
                            ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-slate-800 dark:text-slate-100'
                            : 'border-blue-100 dark:border-slate-700 text-slate-400',
                        )}
                      >
                        {done ? <Check className="w-3 h-3 text-emerald-500" aria-hidden /> : <Clock className="w-3 h-3" aria-hidden />}
                        {p.name}
                        <span className="sr-only">{done ? ' (đã trả lời)' : ' (đang nghĩ)'}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
