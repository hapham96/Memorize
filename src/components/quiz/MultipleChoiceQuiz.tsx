'use client';

import React, { useState } from 'react';
import { Volume2, ArrowLeft, CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { MultipleChoiceExercise } from '@/types/exercise';
import { speakWord, soundFX } from '@/lib/audio';

interface MultipleChoiceQuizProps {
  exercises: MultipleChoiceExercise[];
  onSubmitAnswer: (exercise: MultipleChoiceExercise, answer: string) => Promise<boolean>;
  onComplete: (correctCount: number, mistakes: MultipleChoiceExercise[]) => void;
  onClose: () => void;
}

export const MultipleChoiceQuiz: React.FC<MultipleChoiceQuizProps> = ({
  exercises,
  onSubmitAnswer,
  onComplete,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<MultipleChoiceExercise[]>([]);

  const currentExercise = exercises[currentIndex] || exercises[0];

  if (!currentExercise) return null;

  // The correct definition isn't in the payload, and grading happens server-side —
  // unlike the other exercise types there is no local fallback to grade with.
  const handleSelectOption = async (option: string) => {
    if (isAnswered || isChecking) return;
    setSelectedOption(option);
    setIsChecking(true);

    const correct = await onSubmitAnswer(currentExercise, option);

    setIsChecking(false);
    setIsAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      soundFX.playCorrect();
      setCorrectCount((prev) => prev + 1);
    } else {
      soundFX.playIncorrect();
      setMistakes((prev) => [...prev, currentExercise]);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete(correctCount, mistakes);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col justify-between px-5 py-4 bg-slate-50 dark:bg-slate-900">
      {/* Top Bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-slate-500">
            Question {currentIndex + 1} / {exercises.length}
          </span>
          <button
            onClick={() => speakWord(currentExercise.headword)}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-clay-inset border-2 border-slate-300 dark:border-slate-700">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Prompt */}
      <div className="my-auto py-4 text-center">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          What is the meaning of
        </span>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
          {currentExercise.headword}
        </h2>
        {currentExercise.ipaPronunciation && (
          <p className="text-sm font-mono text-slate-500 mt-1">{currentExercise.ipaPronunciation}</p>
        )}

        {/* 4 Choices Grid */}
        <div className="space-y-3 mt-6 text-left max-w-md mx-auto">
          {currentExercise.options.map((option, idx) => {
            const isSelected = selectedOption === option;

            let cardStyle =
              'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

            if (isAnswered && isSelected) {
              cardStyle = isCorrect
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-clay-glow'
                : 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                disabled={isAnswered || isChecking}
                className={`w-full p-4 rounded-button border-3 text-sm font-semibold flex items-center justify-between transition-all duration-200 shadow-clay-sm ${cardStyle}`}
              >
                <span>{option}</span>
                {isSelected && isChecking && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
                {isAnswered && isSelected && (
                  isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )
                )}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div
            className={`mt-5 p-4 rounded-card border-clay text-left animate-fadeIn ${
              isCorrect
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-800 dark:text-red-200'
            }`}
          >
            <p className="text-sm font-bold">{isCorrect ? 'Correct! 🎉' : 'Not quite — keep going!'}</p>
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="pt-2">
        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className={`w-full py-4 rounded-button font-bold text-sm shadow-clay flex items-center justify-center gap-2 transition-all ${
            isAnswered
              ? 'bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset text-white active:scale-95'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
