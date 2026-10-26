'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { BattleRequestError } from '@/hooks/useBattle';
import type { AnswerResult, QuestionResult, QuestionView } from '@/types/battle';
import { ErrorLine } from './BattleChrome';

interface RecallBoardProps {
  question: QuestionView;
  reveal: QuestionResult | null;
  canAnswer: boolean;
  onAnswer: (headword: string) => Promise<AnswerResult>;
}

/**
 * Battle Recall: a catalog definition and four headwords. One pick per
 * question — the backend grades and times it. Remount per question (key on
 * questionId) so the pick resets.
 */
export function RecallBoard({ question, reveal, canAnswer, onAnswer }: RecallBoardProps) {
  const recall = question.recall!;
  const [pick, setPick] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(option: string) {
    if (pick || reveal || !canAnswer) return;
    setPick(option);
    setError(null);
    try {
      setResult(await onAnswer(option));
    } catch (err) {
      setError(err instanceof BattleRequestError ? err.message : 'Không gửi được câu trả lời.');
    }
  }

  const answer = reveal?.recallAnswer;

  return (
    <div className="space-y-5">
      <div className="clay-well px-4 py-5 text-center">
        {recall.partOfSpeech && (
          <span className="mb-2 inline-block rounded-full bg-white dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-300">
            {recall.partOfSpeech}
          </span>
        )}
        <p className="text-lg leading-relaxed font-semibold text-slate-900 dark:text-slate-100">{recall.definition}</p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {recall.options.map((option) => {
          const isPick = option === pick;
          const isAnswer = answer !== undefined && option === answer;
          // Before the reveal, our own graded pick already shows right/wrong.
          const good = reveal ? isAnswer : isPick && result?.correct === true;
          const bad = reveal ? isPick && !isAnswer : isPick && result?.correct === false;
          const waiting = isPick && !reveal && !result && !error;
          return (
            <button
              key={option}
              type="button"
              onClick={() => void choose(option)}
              disabled={pick !== null || reveal !== null || !canAnswer}
              className={clsx(
                'w-full min-h-14 p-4 rounded-button border-3 text-sm font-bold flex items-center justify-between gap-3 text-left shadow-clay-sm transition-all duration-200 disabled:cursor-default',
                pick === null && !reveal && 'border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 enabled:hover:-translate-y-0.5 enabled:hover:border-blue-400',
                isPick && !good && !bad && 'border-blue-500 bg-blue-50 dark:bg-blue-950/40',
                good && 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 animate-popIn',
                bad && 'border-red-400 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 animate-battle-shake',
                (pick !== null || reveal) && !isPick && !good && 'border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 opacity-60 shadow-none',
              )}
            >
              <span className="min-w-0 break-words">{option}</span>
              {waiting && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-slate-400" aria-hidden />}
              {good && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4" aria-hidden />
                  {isPick ? 'Đúng' : 'Đáp án'}
                </span>
              )}
              {bad && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-red-500">
                  <XCircle className="w-4 h-4" aria-hidden />
                  Sai
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-7 text-center text-sm" aria-live="polite">
        {error && <ErrorLine className="justify-center">{error}</ErrorLine>}
        {!error && result && (
          <p
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-display text-base font-extrabold tabular-nums',
              result.correct
                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-300',
            )}
          >
            {result.correct ? <CheckCircle className="w-4 h-4" aria-hidden /> : <XCircle className="w-4 h-4" aria-hidden />}
            {result.correct ? `Chính xác! +${result.pointsDelta}` : `Sai rồi ${result.pointsDelta}`}
          </p>
        )}
        {!error && !result && reveal && <p className="text-slate-400">Hết giờ — chưa trả lời.</p>}
      </div>
    </div>
  );
}
