'use client';

import React, { useState } from 'react';
import { Volume2, Heart, RotateCw, ArrowLeft, Sparkles } from 'lucide-react';
import { Word } from '@/types';
import { speakWord, soundFX } from '@/lib/audio';

interface FlashcardQuizProps {
  words: Word[];
  favorites: string[];
  onToggleFavorite: (wordId: string) => void;
  onRateWord: (word: Word, rating: 1 | 4 | 5) => void;
  onClose: () => void;
}

export const FlashcardQuiz: React.FC<FlashcardQuizProps> = ({
  words,
  favorites,
  onToggleFavorite,
  onRateWord,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentWord = words[currentIndex] || words[0];
  const isFavorite = favorites.includes(currentWord?.id);

  if (!currentWord) return null;

  const handleFlip = () => {
    soundFX.playFlip();
    setIsFlipped(!isFlipped);
  };

  const handleRating = (rating: 1 | 4 | 5) => {
    onRateWord(currentWord, rating);
    setIsFlipped(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakWord(currentWord.word);
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(currentWord.id);
  };

  const progressPercentage = Math.round(((currentIndex + 1) / words.length) * 100);

  return (
    <div className="flex-1 flex flex-col justify-between px-4 md:px-8 py-5 pb-28 bg-slate-50 dark:bg-slate-900 animate-fadeIn min-h-[calc(100vh-80px)]">
      {/* Top Header & Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Word {currentIndex + 1} / {words.length}
          </span>

          <button
            onClick={handleFav}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-red-500"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 3D Flashcard Container */}
      <div className="my-auto py-3 perspective-1000">
        <div
          onClick={handleFlip}
          className={`w-full min-h-[300px] sm:min-h-[340px] rounded-[28px] p-6 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xl flex flex-col justify-between cursor-pointer transition-all duration-500 transform-style-3d relative ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT OF CARD */}
          <div className={`flex-1 flex flex-col justify-between backface-hidden ${isFlipped ? 'hidden' : 'flex'}`}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {currentWord.level} • {currentWord.pos}
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" /> Tap card to flip
              </span>
            </div>

            <div className="text-center my-auto py-6">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {currentWord.word}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-mono">
                {currentWord.ipa}
              </p>

              <button
                onClick={handleAudio}
                className="mt-5 px-4 py-2.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 active:scale-95 transition-all mx-auto inline-flex items-center gap-2 font-bold text-xs"
              >
                <Volume2 className="w-5 h-5" />
                <span>Listen Audio</span>
              </button>
            </div>

            <div className="text-center text-xs text-slate-400 font-medium">
              Category: <span className="font-bold text-slate-600 dark:text-slate-300">{currentWord.category}</span>
            </div>
          </div>

          {/* BACK OF CARD */}
          <div
            className={`flex-1 flex flex-col justify-between rotate-y-180 backface-hidden ${
              isFlipped ? 'flex' : 'hidden'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Meaning & Context
              </span>
              <button
                onClick={handleAudio}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="my-auto py-4 space-y-3">
              <div>
                <span className="text-xs uppercase font-extrabold text-slate-400">Vietnamese Meaning</span>
                <h3 className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {currentWord.vietnamese}
                </h3>
              </div>

              {currentWord.definition && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 text-xs text-blue-800 dark:text-blue-200">
                  📖 <span className="font-bold">Definition:</span> <span className="italic">{currentWord.definition}</span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200 italic">
                  "{currentWord.example}"
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  👉 {currentWord.translation}
                </p>
              </div>

              {currentWord.mnemonic && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/50">
                  💡 <span className="font-bold">Mnemonic:</span> {currentWord.mnemonic}
                </div>
              )}
            </div>

            <div className="text-center text-xs text-slate-400 font-medium">
              Đánh giá mức độ ghi nhớ để sang từ tiếp theo
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Controls */}
      {!isFlipped ? (
        <div className="space-y-2 pt-2">
          <button
            onClick={handleFlip}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span>Xem đáp án / Lật thẻ (Reveal Answer)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => handleRating(1)}
            className="py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-sm border border-red-500/20 active:scale-95 transition-all text-center"
          >
            Chưa nhớ 🔴
          </button>
          <button
            onClick={() => handleRating(4)}
            className="py-3.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold text-sm border border-blue-500/20 active:scale-95 transition-all text-center"
          >
            Nhớ vừa 🔵
          </button>
          <button
            onClick={() => handleRating(5)}
            className="py-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm border border-emerald-500/20 active:scale-95 transition-all text-center"
          >
            Rất tốt 🟢
          </button>
        </div>
      )}
    </div>
  );
};
