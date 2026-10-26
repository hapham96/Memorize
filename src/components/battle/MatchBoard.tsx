'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { CheckCircle, Lock, XCircle } from 'lucide-react';
import { BattleRequestError } from '@/hooks/useBattle';
import type { AnswerResult, QuestionResult, QuestionView } from '@/types/battle';

interface MatchBoardProps {
  question: QuestionView;
  reveal: QuestionResult | null;
  meId: number | null;
  names: Record<number, string>;
  canAnswer: boolean;
  onMatch: (headwordId: string, definitionId: string) => Promise<AnswerResult>;
}

const TILE =
  'flex min-h-14 w-full flex-col items-start justify-center gap-1 rounded-2xl border-3 bg-white dark:bg-slate-800 px-3 py-2 text-left shadow-clay-sm transition-all duration-200 disabled:cursor-default';

const TILE_MINE = 'animate-popIn border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40';
const TILE_TAKEN = 'border-blue-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-none';

/**
 * Battle Match: one shared board of four headword ↔ definition pairs. Pick a
 * headword, then its definition; whoever matches a pair first claims it, and a
 * wrong match costs points but leaves the pair open. Remount per question.
 */
export function MatchBoard({ question, reveal, meId, names, canAnswer, onMatch }: MatchBoardProps) {
  const match = question.match!;
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ headwordId: string; definitionId: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  const claimByHeadword = new Map(question.claimed.map((c) => [c.headwordId, c]));
  const claimByDefinition = new Map(question.claimed.map((c) => [c.definitionId, c]));
  // During the reveal, show which headword each definition belonged to.
  const answerByDefinition = new Map(
    (reveal?.matchPairs ?? []).map((p) => [p.definitionId, match.headwords.find((h) => h.id === p.headwordId)?.text]),
  );
  const open = canAnswer && !reveal;

  async function chooseDefinition(definitionId: string) {
    if (!selected || !open || sending || claimByDefinition.has(definitionId)) return;
    const headwordId = selected;
    setSending(true);
    try {
      const result = await onMatch(headwordId, definitionId);
      if (result.correct) {
        setSelected(null);
        setMessage({ text: `Ghép đúng! +${result.pointsDelta}`, good: true });
      } else {
        setWrong({ headwordId, definitionId });
        setMessage({ text: `Không phải cặp này ${result.pointsDelta}`, good: false });
        window.setTimeout(() => setWrong(null), 600);
      }
    } catch (err) {
      // Most often someone else claimed it a moment earlier.
      setSelected(null);
      setMessage({ text: err instanceof BattleRequestError ? err.message : 'Không gửi được lượt ghép.', good: false });
    } finally {
      setSending(false);
    }
  }

  const claimLabel = (userId: number) => (userId === meId ? 'bạn' : (names[userId] ?? 'ai đó'));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 sm:gap-3">
        <div className="space-y-2">
          {match.headwords.map((h) => {
            const claim = claimByHeadword.get(h.id);
            const mine = claim?.userId === meId;
            const isSelected = selected === h.id;
            return (
              <button
                key={h.id}
                type="button"
                disabled={!open || !!claim}
                aria-pressed={!claim ? isSelected : undefined}
                onClick={() => setSelected((cur) => (cur === h.id ? null : h.id))}
                className={clsx(
                  TILE,
                  'text-sm font-extrabold text-slate-900 dark:text-slate-100',
                  !claim && !isSelected && 'border-blue-200 dark:border-slate-700 enabled:hover:border-blue-400',
                  isSelected && 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-4 ring-blue-500/20',
                  wrong?.headwordId === h.id && 'animate-battle-shake border-red-400 bg-red-50 dark:bg-red-950/40',
                  claim && (mine ? TILE_MINE : TILE_TAKEN),
                )}
              >
                <span className="break-words">{h.text}</span>
                {claim && (
                  <span className={clsx('flex items-center gap-1 text-xs font-semibold', mine ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400')}>
                    {mine ? <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden /> : <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                    {claimLabel(claim.userId)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {match.definitions.map((d) => {
            const claim = claimByDefinition.get(d.id);
            const mine = claim?.userId === meId;
            const revealed = answerByDefinition.get(d.id);
            const isWrong = wrong?.definitionId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                disabled={!open || !!claim || !selected}
                onClick={() => void chooseDefinition(d.id)}
                className={clsx(
                  TILE,
                  'text-xs leading-snug sm:text-sm',
                  !claim && 'border-blue-200 dark:border-slate-700',
                  !claim && selected && open && 'border-dashed enabled:hover:border-solid enabled:hover:border-blue-400',
                  isWrong && 'animate-battle-shake border-solid border-red-400 bg-red-50 dark:bg-red-950/40',
                  claim && (mine ? TILE_MINE : TILE_TAKEN),
                )}
              >
                <span className="flex w-full items-start gap-1.5 text-slate-800 dark:text-slate-100">
                  <span className="min-w-0 flex-1 break-words">{d.text}</span>
                  {isWrong && <XCircle className="w-4 h-4 shrink-0 text-red-500" aria-hidden />}
                </span>
                {claim && (
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-lg px-1.5 text-xs font-semibold',
                      mine ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 text-slate-400',
                    )}
                  >
                    {mine ? <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden /> : <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                    {claimLabel(claim.userId)}
                  </span>
                )}
                {reveal && revealed && !claim && (
                  <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />= {revealed}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p
        aria-live="polite"
        className={clsx(
          'flex min-h-7 items-center justify-center gap-1.5 text-center text-sm font-bold',
          !message ? 'text-slate-400' : message.good ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-500',
        )}
      >
        {message && (message.good ? <CheckCircle className="w-4 h-4 shrink-0" aria-hidden /> : <XCircle className="w-4 h-4 shrink-0" aria-hidden />)}
        {message?.text ?? (open ? (selected ? 'Giờ chọn định nghĩa của nó.' : 'Chọn một từ.') : '')}
      </p>
    </div>
  );
}
