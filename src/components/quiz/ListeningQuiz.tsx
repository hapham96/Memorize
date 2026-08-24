'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Headphones,
  Lightbulb,
  Rabbit,
  Volume2,
  XCircle,
} from 'lucide-react';
import {
  ExerciseAnswerResult,
  ExerciseMistake,
  ListeningExercise,
} from '@/types/exercise';
import { isSpeechSupported, speakWord, soundFX } from '@/lib/audio';

interface ListeningQuizProps {
  exercises: ListeningExercise[];
  onSubmitAnswer: (
    exercise: ListeningExercise,
    answer: string
  ) => Promise<ExerciseAnswerResult>;
  onComplete: (correctCount: number, mistakes: ExerciseMistake[]) => void;
  onClose: () => void;
}

/** Slower playback rate for the "nghe chậm" replay button. */
const SLOW_RATE = 0.55;
const NORMAL_RATE = 0.85;

export const ListeningQuiz: React.FC<ListeningQuizProps> = ({
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<ExerciseMistake[]>([]);

  const currentExercise = exercises[currentIndex] || exercises[0];
  // A real recording never needs the TTS fallback or its browser-support check.
  const canPlay = Boolean(currentExercise?.audioUrl) || isSpeechSupported();

  // Latest playback handle, so a replay does not leave a stale `onend`/`onended`
  // running that would flip `isSpeaking` off while the new audio is still playing.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(
    (rate = NORMAL_RATE) => {
      if (!currentExercise) return;

      if (currentExercise.audioUrl) {
        const audio = new Audio(currentExercise.audioUrl);
        audioRef.current = audio;
        audio.playbackRate = rate;
        const stop = () => {
          if (audioRef.current === audio) setIsSpeaking(false);
        };
        audio.onended = stop;
        audio.onerror = stop;
        setIsSpeaking(true);
        setPlayCount((prev) => prev + 1);
        void audio.play();
        return;
      }

      const utterance = speakWord(currentExercise.headword, 'en-US', rate);
      utteranceRef.current = utterance;
      if (!utterance) return;

      setIsSpeaking(true);
      setPlayCount((prev) => prev + 1);

      const stop = () => {
        if (utteranceRef.current === utterance) setIsSpeaking(false);
      };
      utterance.onend = stop;
      utterance.onerror = stop;
    },
    [currentExercise]
  );

  // Auto-play each new question. The learner arrived here by tapping a card, so
  // the gesture requirement for audio is already satisfied.
  useEffect(() => {
    if (!canPlay || !currentExercise) return;
    const timer = setTimeout(() => play(), 350);
    return () => clearTimeout(timer);
    // Re-run per question only — `play` changes with `currentExercise` anyway.
  }, [currentIndex, canPlay, currentExercise, play]);

  // Never leave audio running when the quiz unmounts.
  useEffect(() => {
    return () => {
      if (isSpeechSupported()) window.speechSynthesis.cancel();
      audioRef.current?.pause();
    };
  }, []);

  if (!currentExercise) return null;

  // The headword is already in the payload, so this grades locally and syncs
  // the backend in the background, same as FillBlankQuiz/TypeWordQuiz.
  const finishQuestion = (answer: string, revealed: boolean) => {
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
    finishQuestion(inputVal, false);
  };

  const handleReveal = () => {
    if (isAnswered) return;
    setInputVal(currentExercise.headword);
    finishQuestion(currentExercise.headword, true);
  };

  const handleNext = () => {
    if (isSpeechSupported()) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    setInputVal('');
    setShowHint(false);
    setIsAnswered(false);
    setIsSpeaking(false);
    setPlayCount(0);
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsCorrect(false);
    } else {
      onComplete(correctCount, mistakes);
    }
  };

  // First letter plus blanks — enough to unstick a learner without giving the
  // spelling away.
  const hintText = `${currentExercise.headword.charAt(0)}${'_ '.repeat(
    Math.max(currentExercise.headword.length - 1, 0)
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
            Word {currentIndex + 1} / {exercises.length}
          </span>
          <span className="p-2 text-cyan-600 dark:text-cyan-400">
            <Headphones className="w-5 h-5" />
          </span>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-clay-inset border-2 border-slate-300 dark:border-slate-700">
          <div
            className="bg-cyan-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Form */}
      <div className="my-auto py-4 text-center max-w-sm mx-auto w-full">
        <span className="text-xs uppercase font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 px-2.5 py-1 rounded-full">
          Listen &amp; type the word
        </span>

        {!canPlay ? (
          <p className="mt-6 p-4 rounded-card border-clay border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs font-semibold">
            Trình duyệt này không hỗ trợ đọc phát âm nên chế độ Listening không hoạt động. Hãy thử
            trên Chrome, Safari hoặc Edge.
          </p>
        ) : (
          <>
            {/* Play button */}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => play()}
                aria-label="Play pronunciation"
                className={`w-28 h-28 rounded-full bg-cyan-500 hover:bg-cyan-600 border-clay border-cyan-300 text-white shadow-clay flex items-center justify-center transition-all duration-200 ease-clay active:scale-95 active:shadow-clay-inset ${
                  isSpeaking ? 'scale-105 animate-pulse' : ''
                }`}
              >
                <Volume2 className="w-12 h-12" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => play(SLOW_RATE)}
                className="py-2 px-4 rounded-button bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold text-xs border-clay border-cyan-300 flex items-center gap-1.5"
              >
                <Rabbit className="w-4 h-4" />
                <span>Nghe chậm</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              {playCount > 0 ? `Đã nghe ${playCount} lần` : 'Nhấn để nghe phát âm'}
            </p>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Type what you hear..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={isAnswered}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className={`w-full p-4 rounded-input text-center text-lg font-bold border-2 bg-white dark:bg-slate-800 focus:outline-none transition-all shadow-clay-sm ${
                  isAnswered
                    ? isCorrect
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                      : 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600'
                    : 'border-slate-300 dark:border-slate-700 focus:border-cyan-500'
                }`}
              />

              {!isAnswered && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="flex-1 py-2.5 rounded-button bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold text-xs border-clay border-amber-300 flex items-center justify-center gap-1.5"
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
                <p className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg">
                  💡 Hint: {hintText} ({currentExercise.headword.length} letters)
                  {currentExercise.ipaPronunciation ? ` · ${currentExercise.ipaPronunciation}` : ''}
                </p>
              )}

              {!isAnswered && (
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="w-full py-3.5 rounded-button bg-cyan-500 hover:bg-cyan-600 border-clay border-cyan-300 active:shadow-clay-inset text-white font-bold text-sm shadow-clay disabled:opacity-50 transition-all"
                >
                  Submit Answer
                </button>
              )}
            </form>
          </>
        )}

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
                {isCorrect ? 'Correct!' : `Correct word: ${currentExercise.headword}`}
              </p>
              {currentExercise.ipaPronunciation && (
                <p className="text-xs opacity-90">{currentExercise.ipaPronunciation}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next Button */}
      {(isAnswered || !canPlay) && (
        <div className="pt-2">
          <button
            onClick={canPlay ? handleNext : onClose}
            className="w-full py-4 rounded-button bg-cyan-500 hover:bg-cyan-600 border-clay border-cyan-300 active:shadow-clay-inset text-white font-bold text-sm shadow-clay flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>{canPlay ? 'Continue' : 'Quay lại'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
