'use client';

import React, { useState } from 'react';
import { ArrowLeft, Lightbulb, CheckCircle2, XCircle, ArrowRight, Volume2 } from 'lucide-react';
import { Word } from '@/types';
import { speakWord, soundFX } from '@/lib/audio';

interface TypeWordQuizProps {
  words: Word[];
  onComplete: (correctCount: number, mistakes: Word[]) => void;
  onClose: () => void;
}

export const TypeWordQuiz: React.FC<TypeWordQuizProps> = ({ words, onComplete, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<Word[]>([]);

  const currentWord = words[currentIndex] || words[0];

  if (!currentWord) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswered || !inputVal.trim()) return;

    const userClean = inputVal.trim().toLowerCase();
    const targetClean = currentWord.word.toLowerCase();
    const correct = userClean === targetClean;

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      soundFX.playCorrect();
      setCorrectCount((prev) => prev + 1);
    } else {
      soundFX.playIncorrect();
      setMistakes((prev) => [...prev, currentWord]);
    }
  };

  const handleReveal = () => {
    setShowAnswer(true);
    setIsAnswered(true);
    setIsCorrect(false);
    setInputVal(currentWord.word);
    soundFX.playIncorrect();
    setMistakes((prev) => [...prev, currentWord]);
  };

  const handleNext = () => {
    setInputVal('');
    setShowHint(false);
    setShowAnswer(false);
    setIsAnswered(false);
    setIsCorrect(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete(correctCount + (isCorrect ? 1 : 0), mistakes);
    }
  };

  const hintText = `${currentWord.word.substring(0, 2)}${'_ '.repeat(currentWord.word.length - 2)}`;

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
            Word {currentIndex + 1} / {words.length}
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
            className="bg-amber-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Form */}
      <div className="my-auto py-4 text-center max-w-sm mx-auto w-full">
        <span className="text-xs uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-full">
          Translate to English
        </span>

        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-4">
          "{currentWord.vietnamese}"
        </h2>
        <p className="text-xs text-slate-500 mt-1">Part of speech: {currentWord.pos}</p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="Type English word..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isAnswered}
            autoFocus
            className={`w-full p-4 rounded-input text-center text-lg font-bold border-2 bg-white dark:bg-slate-800 focus:outline-none transition-all shadow-apple-soft ${
              isAnswered
                ? isCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                  : 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600'
                : 'border-slate-300 dark:border-slate-700 focus:border-amber-500'
            }`}
          />

          {!isAnswered && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="flex-1 py-2.5 rounded-button bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold text-xs border border-amber-200/50 flex items-center justify-center gap-1.5"
              >
                <Lightbulb className="w-4 h-4" />
                <span>Hint</span>
              </button>

              <button
                type="button"
                onClick={handleReveal}
                className="flex-1 py-2.5 rounded-button bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Reveal Answer
              </button>
            </div>
          )}

          {showHint && !isAnswered && (
            <p className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg">
              💡 Hint: {hintText} ({currentWord.word.length} letters)
            </p>
          )}

          {!isAnswered && (
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="w-full py-3.5 rounded-button bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-apple-card disabled:opacity-50 transition-all"
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
            <div>
              <p className="font-bold text-sm">
                {isCorrect ? 'Correct!' : `Correct word: ${currentWord.word}`}
              </p>
              <p className="text-xs opacity-90">"{currentWord.example}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Next Button */}
      {isAnswered && (
        <div className="pt-2">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-button bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-apple-card flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
