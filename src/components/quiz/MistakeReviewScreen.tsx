'use client';

import React from 'react';
import { ArrowLeft, CheckCircle2, Headphones, Volume2, XCircle } from 'lucide-react';
import { AutoGradedExercise, ExerciseMistake } from '@/types/exercise';
import { speakWord } from '@/lib/audio';
import { ModalPortal } from '@/components/layout/ModalPortal';

interface MistakeReviewScreenProps {
  mistakes: ExerciseMistake[];
  /** Back to the result modal — this screen never re-grades anything. */
  onClose: () => void;
}

/** The question as it was asked, so the recap reads like the quiz did. */
const describeQuestion = (
  exercise: AutoGradedExercise
): { label: string; prompt: string } => {
  switch (exercise.exerciseType) {
    case 'multiple_choice':
      return { label: 'What is the meaning of', prompt: exercise.headword };
    case 'fill_in_blank':
      return { label: 'Fill in the blank', prompt: `"${exercise.sentence}"` };
    case 'type_missing_word':
      return { label: 'Complete the sentence', prompt: `"${exercise.sentence}"` };
    case 'listening':
      return { label: 'Listen & type the word', prompt: exercise.headword };
  }
};

/**
 * Read-only recap of the questions missed in a session: the question, what was
 * answered, and the right answer. Nothing here posts to
 * `/exercises/:id/submit` — the words were already graded and rescheduled when
 * they were answered, and grading them a second time would move their SRS
 * schedule (and award XP) for a round the learner never really sat.
 */
export const MistakeReviewScreen: React.FC<MistakeReviewScreenProps> = ({
  mistakes,
  onClose,
}) => {
  const playAudio = (exercise: AutoGradedExercise) => {
    if (exercise.exerciseType === 'listening' && exercise.audioUrl) {
      void new Audio(exercise.audioUrl).play();
      return;
    }
    speakWord(exercise.headword);
  };

  return (
    <ModalPortal>
      {/* Above the result modal's z-50 — it stays mounted underneath. */}
      <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
          <button
            onClick={onClose}
            aria-label="Quay lại"
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Review Mistakes
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {mistakes.length} câu sai trong phiên này
            </p>
          </div>
        </div>

        {/* Mistake list */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {mistakes.map((mistake, idx) => {
            const { exercise, userAnswer, correctAnswer } = mistake;
            const { label, prompt } = describeQuestion(exercise);

            return (
              <div
                key={`${exercise.userWordDefinitionId}_${idx}`}
                className="bg-white dark:bg-slate-800 rounded-card p-4 border-clay border-blue-200 dark:border-slate-700 shadow-clay"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {idx + 1}. {label}
                  </span>
                  <button
                    onClick={() => playAudio(exercise)}
                    aria-label={`Nghe ${exercise.headword}`}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 shrink-0"
                  >
                    {exercise.exerciseType === 'listening' ? (
                      <Headphones className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 leading-relaxed">
                  {prompt}
                </p>
                {exercise.ipaPronunciation && (
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {exercise.ipaPronunciation}
                  </p>
                )}

                <div className="mt-3 space-y-2">
                  {/* An empty answer means the learner revealed it instead of guessing. */}
                  {userAnswer && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-900">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                          Your answer
                        </p>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400 break-words">
                          {userAnswer}
                        </p>
                      </div>
                    </div>
                  )}

                  {correctAnswer ? (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                          Correct answer
                        </p>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 break-words">
                          {correctAnswer}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Only reachable when the grader never answered — better than
                       printing a guess as the right answer. */
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      Không lấy được đáp án đúng cho câu này.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset text-white font-bold text-sm shadow-clay transition-all active:scale-95"
          >
            Xong
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};
