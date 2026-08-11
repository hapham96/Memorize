'use client';

import React, { useState } from 'react';
import { Volume2, ArrowLeft, CheckCircle, XCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { Word } from '@/types';
import { speakWord, soundFX } from '@/lib/audio';

interface MultipleChoiceQuizProps {
  words: Word[];
  allWords: Word[];
  onComplete: (correctCount: number, mistakes: Word[]) => void;
  onClose: () => void;
}

export const MultipleChoiceQuiz: React.FC<MultipleChoiceQuizProps> = ({
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
  const [shakeOption, setShakeOption] = useState<string | null>(null);

  const currentWord = words[currentIndex] || words[0];

  // Generate 4 choices (1 correct + 3 distractor meanings)
  const options = React.useMemo(() => {
    if (!currentWord) return [];
    const distractors = allWords
      .filter((w) => w.id !== currentWord.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((w) => w.vietnamese);
    const list = [currentWord.vietnamese, ...distractors];
    return list.sort(() => 0.5 - Math.random());
  }, [currentIndex, currentWord, allWords]);

  if (!currentWord) return null;

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentWord.vietnamese;
    if (isCorrect) {
      soundFX.playCorrect();
      setCorrectCount((prev) => prev + 1);
    } else {
      soundFX.playIncorrect();
      setShakeOption(option);
      setMistakes((prev) => [...prev, currentWord]);
      setTimeout(() => setShakeOption(null), 500);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete(correctCount + (selectedOption === currentWord.vietnamese ? 1 : 0), mistakes);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-4 bg-slate-50 dark:bg-slate-900">
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
            Question {currentIndex + 1} / {words.length}
          </span>
          <button
            onClick={() => speakWord(currentWord.word)}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Prompt */}
      <div className="my-auto py-4 text-center">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          What is the meaning of
        </span>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
          {currentWord.word}
        </h2>
        <p className="text-sm font-mono text-slate-500 mt-1">{currentWord.ipa}</p>

        {/* 4 Choices Grid */}
        <div className="space-y-3 mt-6 text-left max-w-md mx-auto">
          {options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option === currentWord.vietnamese;

            let cardStyle =
              'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

            if (isAnswered) {
              if (isCorrectOption) {
                cardStyle =
                  'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-apple-glow';
              } else if (isSelected && !isCorrectOption) {
                cardStyle = 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-button border-2 text-sm font-semibold flex items-center justify-between transition-all duration-200 shadow-apple-soft ${cardStyle} ${
                  shakeOption === option ? 'animate-bounce' : ''
                }`}
              >
                <span>{option}</span>
                {isAnswered && (
                  <>
                    {isCorrectOption && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    {isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500" />}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Reveal */}
        {isAnswered && (
          <div className="mt-5 p-4 rounded-card bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 text-left space-y-1 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <HelpCircle className="w-4 h-4" />
              <span>Explanation & Example</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
              "{currentWord.example}"
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">👉 {currentWord.translation}</p>
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="pt-2">
        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className={`w-full py-4 rounded-button font-bold text-sm shadow-apple-card flex items-center justify-center gap-2 transition-all ${
            isAnswered
              ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
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
