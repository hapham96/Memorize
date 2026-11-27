'use client';

import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PracticeAnswer, PracticeSitting, PracticeSummaryWord } from '@/types/practice';
import {
  answerPractice,
  discardPractice,
  dropPracticeWord,
  fetchPracticeSitting,
  nextPracticeRound,
} from '@/lib/api/practice-client';
import { ApiError } from '@/lib/api/client';
import { soundFX } from '@/lib/audio';
import { trackEvent } from '@/lib/analytics';
import { Mascot } from '@/components/mascot/Mascot';
import { MascotReaction } from '@/components/mascot/MascotReaction';
import { PracticeQuestionView, PracticeResult } from './PracticeQuestionView';

interface PracticeSessionProps {
  initial: PracticeSitting;
  /** Wraps every write, so counters elsewhere can wait for it and refresh. */
  track: <T>(request: Promise<T>) => Promise<T>;
  /** An answer was a real review: the words' schedules have moved. */
  onReviewed: () => void;
  onRoundFinished: () => void;
  onClose: () => void;
}

/**
 * Why the sitting on screen cannot go on. `replaced`: another device started a
 * newer one. `gone`: it could not be restored. `offline`: try again.
 */
type Problem = 'replaced' | 'gone' | 'offline';

const PROBLEM_TEXT: Record<Problem, string> = {
  replaced: 'Buổi này đã được thay bằng buổi mới ở máy khác.',
  gone: 'Không khôi phục được buổi luyện tập này.',
  offline: 'Chưa gửi được, kiểm tra kết nối rồi thử lại nhé.',
};

const buttonClass =
  'w-full py-3.5 rounded-2xl border-clay font-extrabold text-sm shadow-clay active:scale-[0.98] disabled:opacity-40 transition-all';
const primaryClass = `${buttonClass} bg-blue-600 border-blue-400 text-white`;
const secondaryClass = `${buttonClass} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200`;

const WordList: React.FC<{ title: string; words: PracticeSummaryWord[]; tone: string }> = ({
  title,
  words,
  tone,
}) =>
  words.length === 0 ? null : (
    <div>
      <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-1.5">
        {title} ({words.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {words.map((word) => (
          <span key={word.userWordId} className={`px-2.5 py-1 rounded-full text-xs font-bold ${tone}`}>
            {word.headword}
          </span>
        ))}
      </div>
    </div>
  );

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  initial,
  track,
  onReviewed,
  onRoundFinished,
  onClose,
}) => {
  // What the server last said, and the question still on screen — which stays
  // until the learner has seen how they did.
  const [sitting, setSitting] = useState(initial);
  const [question, setQuestion] = useState(initial.question);
  const [results, setResults] = useState<Record<number, PracticeResult>>({});
  const [last, setLast] = useState<{ count: number; correct: boolean } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  const show = (next: PracticeSitting) => {
    setSitting(next);
    setQuestion(next.question);
    setResults({});
  };

  const run = async (work: () => Promise<void>) => {
    if (isBusy) return;
    setIsBusy(true);
    setProblem(null);
    try {
      await work();
    } catch (err) {
      console.warn('Practice request failed:', err);
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 409) setProblem('replaced');
      else if (status === 410) setProblem('gone');
      else if (status === 422) {
        // The question moved on (a word was deleted, or this was sent twice).
        const current = await fetchPracticeSitting().catch(() => null);
        if (current) show(current);
        else setProblem('gone');
      } else setProblem('offline');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAnswer = (answer: Omit<PracticeAnswer, 'questionId'>) =>
    run(async () => {
      if (!question) return;
      const response = await track(
        answerPractice(sitting.id, { ...answer, questionId: question.id }),
      );
      if (response.reviewCount > 0) onReviewed();
      if (response.sitting.summary) {
        trackEvent('practice_round_complete', { xp_earned: response.sitting.summary.xpEarned });
        onRoundFinished();
      }
      setLast((prev) => ({ count: (prev?.count ?? 0) + 1, correct: response.isCorrect }));
      if (response.isCorrect) soundFX.playCorrect();
      else soundFX.playIncorrect();

      // A flashcard was rated with its answer in view: nothing left to show.
      if (question.mode === 'flashcard') {
        show(response.sitting);
        return;
      }
      setSitting(response.sitting);
      setResults((prev) => ({
        ...prev,
        [answer.userWordId]: { isCorrect: response.isCorrect, choiceId: answer.choiceId },
      }));
    });

  const handleDrop = (userWordId: number) =>
    run(async () => {
      soundFX.playPop();
      show(await track(dropPracticeWord(sitting.id, userWordId)));
    });

  const handleNextRound = () =>
    run(async () => {
      soundFX.playPop();
      show(await nextPracticeRound(sitting.id));
    });

  /** "Tui oke": a sitting left behind would otherwise be offered again. */
  const handleFinish = () => {
    soundFX.playPop();
    if (!sitting.done) {
      discardPractice(sitting.id).catch((err) => console.warn('Could not discard practice:', err));
    }
    onClose();
  };

  const handleReload = () =>
    run(async () => {
      const current = await fetchPracticeSitting();
      if (current) show(current);
      else setProblem('gone');
    });

  const { round, summary } = sitting;
  const isStopped = problem === 'replaced' || problem === 'gone';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 pb-8 space-y-4 bg-slate-50 dark:bg-slate-900">
      <MascotReaction
        result={last ? (last.correct ? 'correct' : 'wrong') : null}
        questionKey={last?.count ?? -1}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Thoát, lần sau làm tiếp"
            title="Thoát, lần sau làm tiếp"
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Vòng {round.number} · còn {round.remaining} từ
          </span>
          <span className="w-9 flex justify-center">
            {isBusy && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-clay-inset border-2 border-slate-300 dark:border-slate-700">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{
              width: `${round.size ? ((round.size - round.remaining) / round.size) * 100 : 100}%`,
            }}
          />
        </div>
      </div>

      {problem && (
        <div
          role="alert"
          className="space-y-2 rounded-2xl p-4 bg-amber-50 dark:bg-amber-500/10 border-clay border-amber-300 text-center"
        >
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{PROBLEM_TEXT[problem]}</p>
          {problem === 'replaced' && (
            <button type="button" onClick={() => void handleReload()} className={primaryClass}>
              Làm buổi mới nhất
            </button>
          )}
          {isStopped && (
            <button type="button" onClick={onClose} className={secondaryClass}>
              {problem === 'gone' ? 'Chọn từ cho buổi mới' : 'Thoát'}
            </button>
          )}
        </div>
      )}

      {isStopped ? null : question ? (
        <PracticeQuestionView
          key={question.id}
          question={question}
          results={results}
          isBusy={isBusy}
          onAnswer={(answer) => void handleAnswer(answer)}
          onDrop={(userWordId) => void handleDrop(userWordId)}
          onContinue={() => show(sitting)}
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-[28px] p-6 bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-lg space-y-4">
            <div className="text-center">
              <Mascot mood="cheer" size={80} interactive={false} className="mx-auto" />
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-2">
                {sitting.done ? 'Hết từ rồi, xong buổi!' : `Xong vòng ${round.number}`}
              </h2>
              {summary && summary.xpEarned > 0 && (
                <p className="text-sm font-extrabold text-emerald-600">
                  +{summary.xpEarned} XP thưởng vòng
                </p>
              )}
            </div>
            <WordList
              title="Đã nhớ"
              words={summary?.remembered ?? []}
              tone="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
            />
            <WordList
              title="Còn yếu"
              words={summary?.weak ?? []}
              tone="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
            />
          </div>
          {!sitting.done && (
            <button
              type="button"
              onClick={() => void handleNextRound()}
              disabled={isBusy}
              className={primaryClass}
            >
              Học tiếp
            </button>
          )}
          <button type="button" onClick={handleFinish} className={secondaryClass}>
            Tui oke
          </button>
        </div>
      )}
    </div>
  );
};
