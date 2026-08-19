'use client';

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, ArrowRight, Volume2 } from 'lucide-react';
import { TypeMissingWordExercise } from '@/types/exercise';
import { speakWord, soundFX } from '@/lib/audio';

interface TypeWordQuizProps {
  exercises: TypeMissingWordExercise[];
  onSubmitAnswer: (exercise: TypeMissingWordExercise, answer: string) => Promise<boolean>;
  onComplete: (correctCount: number, mistakes: TypeMissingWordExercise[]) => void;
  onClose: () => void;
}

export const TypeWordQuiz: React.FC<TypeWordQuizProps> = ({
  exercises,
  onSubmitAnswer,
  onComplete,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<TypeMissingWordExercise[]>([]);

  const currentExercise = exercises[currentIndex] || exercises[0];

  if (!currentExercise) return null;

  // The headword (the correct choice) is already in the payload, so this
  // grades locally and syncs the backend in the background, same as FillBlankQuiz.
  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option.toLowerCase() === currentExercise.headword.toLowerCase();
    if (isCorrect) {
      soundFX.playCorrect();
      setCorrectCount((prev) => prev + 1);
    } else {
      soundFX.playIncorrect();
      setMistakes((prev) => [...prev, currentExercise]);
    }

    void onSubmitAnswer(currentExercise, option);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete(correctCount, mistakes);
    }
  };

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
            className="bg-amber-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Sentence Prompt */}
      <div className="my-auto py-4 max-w-md mx-auto w-full">
        <div className="bg-white dark:bg-slate-800 rounded-card p-6 border-clay border-blue-200 dark:border-slate-700 shadow-clay text-center mb-6">
          <span className="text-xs uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-full">
            Complete the sentence
          </span>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-4 leading-relaxed">
            "{currentExercise.sentence}"
          </h3>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-3">
          {currentExercise.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option.toLowerCase() === currentExercise.headword.toLowerCase();

            let btnStyle =
              'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

            if (isAnswered) {
              if (isCorrectOption) {
                btnStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold';
              } else if (isSelected && !isCorrectOption) {
                btnStyle = 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-bold';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                disabled={isAnswered}
                className={`p-4 rounded-button border-3 text-sm font-semibold flex items-center justify-between transition-all duration-200 shadow-clay-sm ${btnStyle}`}
              >
                <span>{option}</span>
                {isAnswered && (
                  <>
                    {isCorrectOption && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {isSelected && !isCorrectOption && <XCircle className="w-4 h-4 text-red-500" />}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Next Button */}
      <div className="pt-2">
        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className={`w-full py-4 rounded-button font-bold text-sm shadow-clay flex items-center justify-center gap-2 transition-all ${
            isAnswered
              ? 'bg-amber-500 hover:bg-amber-600 border-clay border-amber-300 active:shadow-clay-inset text-white active:scale-95'
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
