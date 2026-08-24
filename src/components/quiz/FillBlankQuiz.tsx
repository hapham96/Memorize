'use client';

import React, { useState } from 'react';
import { ArrowLeft, Lightbulb, CheckCircle2, XCircle, ArrowRight, Volume2 } from 'lucide-react';
import {
  ExerciseAnswerResult,
  ExerciseMistake,
  FillInBlankExercise,
} from '@/types/exercise';
import { speakWord, soundFX } from '@/lib/audio';

interface FillBlankQuizProps {
  exercises: FillInBlankExercise[];
  onSubmitAnswer: (
    exercise: FillInBlankExercise,
    answer: string
  ) => Promise<ExerciseAnswerResult>;
  onComplete: (correctCount: number, mistakes: ExerciseMistake[]) => void;
  onClose: () => void;
}

export const FillBlankQuiz: React.FC<FillBlankQuizProps> = ({
  exercises,
  onSubmitAnswer,
  onComplete,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<ExerciseMistake[]>([]);

  const currentExercise = exercises[currentIndex] || exercises[0];

  if (!currentExercise) return null;

  // The headword is already in the payload, so the answer can be graded
  // locally the instant the user submits — the backend call runs alongside to
  // sync the SRS schedule, not to gate the feedback.
  const gradeAndAdvance = (answer: string, revealed: boolean) => {
    const correct = !revealed && answer.trim().toLowerCase() === currentExercise.headword.trim().toLowerCase();
    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      soundFX.playCorrect();
      setCorrectCount((prev) => prev + 1);
    } else {
      soundFX.playIncorrect();
      setMistakes((prev) => [
        ...prev,
        {
          exercise: currentExercise,
          // A revealed answer is not an attempt — keep it out of the recap.
          userAnswer: revealed ? '' : answer.trim(),
          correctAnswer: currentExercise.headword,
        },
      ]);
    }

    void onSubmitAnswer(currentExercise, answer.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswered || !inputVal.trim()) return;
    gradeAndAdvance(inputVal, false);
  };

  const handleReveal = () => {
    setInputVal(currentExercise.headword);
    gradeAndAdvance(currentExercise.headword, true);
  };

  const handleNext = () => {
    setInputVal('');
    setShowHint(false);
    setIsAnswered(false);
    setIsCorrect(false);
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete(correctCount, mistakes);
    }
  };

  const hintText = `${currentExercise.headword.substring(0, 2)}${'_ '.repeat(
    Math.max(0, currentExercise.headword.length - 2)
  )}`;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col justify-between px-5 py-4 bg-slate-50 dark:bg-slate-900">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-slate-500">
            Sentence {currentIndex + 1} / {exercises.length}
          </span>
          <button
            onClick={() => speakWord(currentExercise.sentence)}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-clay-inset border-2 border-slate-300 dark:border-slate-700">
          <div
            className="bg-purple-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Sentence Prompt Card */}
      <div className="my-auto py-4 max-w-md mx-auto w-full">
        <div className="bg-white dark:bg-slate-800 rounded-card p-6 border-clay border-blue-200 dark:border-slate-700 shadow-clay text-center mb-6">
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Fill in the blank
          </span>

          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-4 leading-relaxed">
            "{currentExercise.sentence}"
          </h3>
          {currentExercise.definitionHint && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Hint: {currentExercise.definitionHint}
            </p>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Type the missing word..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isAnswered}
            autoFocus
            className={`w-full p-4 rounded-input text-center text-lg font-bold border-2 bg-white dark:bg-slate-800 focus:outline-none transition-all shadow-clay-sm ${
              isAnswered
                ? isCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                  : 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600'
                : 'border-slate-300 dark:border-slate-700 focus:border-purple-500'
            }`}
          />

          {!isAnswered && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="flex-1 py-2.5 rounded-button bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 font-semibold text-xs border-clay border-purple-300 flex items-center justify-center gap-1.5"
              >
                <Lightbulb className="w-4 h-4" />
                <span>Hint</span>
              </button>

              <button
                type="button"
                onClick={handleReveal}
                className="flex-1 py-2.5 rounded-button bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Reveal Answer
              </button>
            </div>
          )}

          {showHint && !isAnswered && (
            <p className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/50 p-2 rounded-lg">
              💡 Hint: {hintText} ({currentExercise.headword.length} letters)
            </p>
          )}

          {!isAnswered && (
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="w-full py-3.5 rounded-button bg-purple-600 hover:bg-purple-700 border-clay border-purple-400 active:shadow-clay-inset text-white font-bold text-sm shadow-clay disabled:opacity-50 transition-all"
            >
              Submit Answer
            </button>
          )}
        </form>

        {/* Answer Feedback Banner */}
        {isAnswered && (
          <div
            className={`mt-4 p-4 rounded-card border flex items-center gap-3 text-left ${
              isCorrect
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-800 dark:text-red-200'
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500 shrink-0" />
            )}
            <p className="font-bold text-sm">
              {isCorrect ? 'Correct!' : `Correct word: ${currentExercise.headword}`}
            </p>
          </div>
        )}
      </div>

      {/* Next Button */}
      {isAnswered && (
        <div className="pt-2">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-button bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-clay flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
