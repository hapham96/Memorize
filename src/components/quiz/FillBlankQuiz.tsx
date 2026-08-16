'use client';

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, ArrowRight, Volume2 } from 'lucide-react';
import { Word } from '@/types';
import { speakWord, soundFX } from '@/lib/audio';

interface FillBlankQuizProps {
  words: Word[];
  allWords: Word[];
  onComplete: (correctCount: number, mistakes: Word[]) => void;
  onClose: () => void;
}

export const FillBlankQuiz: React.FC<FillBlankQuizProps> = ({
  words,
  allWords,
  onComplete,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<Word[]>([]);

  const currentWord = words[currentIndex] || words[0];

  // Generate blank sentence (replace word in example with ____)
  const sentenceWithBlank = React.useMemo(() => {
    if (!currentWord) return '';
    const regex = new RegExp(currentWord.word, 'gi');
    return currentWord.example.replace(regex, '________');
  }, [currentWord]);

  // Generate 4 choice options (target word + 3 distractors)
  const options = React.useMemo(() => {
    if (!currentWord) return [];
    const distractors = allWords
      .filter((w) => w.id !== currentWord.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((w) => w.word);
    return [currentWord.word, ...distractors].sort(() => 0.5 - Math.random());
  }, [currentIndex, currentWord, allWords]);

  if (!currentWord) return null;

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option.toLowerCase() === currentWord.word.toLowerCase();
    if (isCorrect) {
      soundFX.playCorrect();
      setCorrectCount((prev) => prev + 1);
    } else {
      soundFX.playIncorrect();
      setMistakes((prev) => [...prev, currentWord]);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete(correctCount + (selectedOption === currentWord.word ? 1 : 0), mistakes);
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
            Sentence {currentIndex + 1} / {words.length}
          </span>
          <button
            onClick={() => speakWord(currentWord.example)}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-clay-inset border-2 border-slate-300 dark:border-slate-700">
          <div
            className="bg-purple-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Sentence Prompt Card */}
      <div className="my-auto py-4">
        <div className="bg-white dark:bg-slate-800 rounded-card p-6 border-clay border-blue-200 dark:border-slate-700 shadow-clay text-center mb-6">
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Fill in the blank
          </span>

          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-4 leading-relaxed">
            "{sentenceWithBlank}"
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Translation: {currentWord.translation}
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option.toLowerCase() === currentWord.word.toLowerCase();

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
              ? 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95'
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
