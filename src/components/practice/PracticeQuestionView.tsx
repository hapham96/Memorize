'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, RotateCw, Volume2, X } from 'lucide-react';
import { PracticeAnswer, PracticeQuestion, PracticeQuestionWord } from '@/types/practice';
import { speakWord, soundFX } from '@/lib/audio';

/** What the server said about one word of the question on screen. */
export interface PracticeResult {
  isCorrect: boolean;
  choiceId?: number;
}

interface PracticeQuestionViewProps {
  question: PracticeQuestion;
  /** Keyed by `userWordId`; a word with a result has been answered. */
  results: Record<number, PracticeResult>;
  isBusy: boolean;
  onAnswer: (answer: Omit<PracticeAnswer, 'questionId'>) => void;
  onDrop: (userWordId: number) => void;
  onContinue: () => void;
}

const RATINGS = [
  { score: 0, label: 'Quên hẳn' },
  { score: 1, label: 'Nhớ khi xem' },
  { score: 2, label: 'Thấy quen' },
  { score: 3, label: 'Vật lộn' },
  { score: 4, label: 'Đắn đo' },
  { score: 5, label: 'Hoàn hảo' },
];

const cardClass =
  'rounded-[28px] p-6 bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-lg';
const primaryClass =
  'w-full py-3.5 rounded-2xl bg-blue-600 border-clay border-blue-400 text-white font-extrabold text-sm shadow-clay-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 transition-all';
const idleChoice =
  'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';
const rightChoice =
  'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300';
const wrongChoice =
  'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-600 dark:text-red-300';
const choiceClass = 'w-full p-3 rounded-2xl border-clay font-semibold transition-all';

function playWord(word: PracticeQuestionWord) {
  if (!word.audioUrl) {
    speakWord(word.headword);
    return;
  }
  // A recording that will not load still has to be heard.
  void new Audio(word.audioUrl).play().catch(() => speakWord(word.headword));
}

const SpeakButton: React.FC<{ word: PracticeQuestionWord; large?: boolean }> = ({
  word,
  large,
}) => (
  <button
    type="button"
    onClick={() => playWord(word)}
    aria-label="Nghe phát âm"
    className={`rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center ${large ? 'p-6' : 'p-2.5'}`}
  >
    <Volume2 className={large ? 'w-9 h-9' : 'w-4 h-4'} />
  </button>
);

const DropButton: React.FC<{ onClick: () => void; disabled: boolean; label?: string }> = ({
  onClick,
  disabled,
  label = 'Từ này oke rồi',
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="mx-auto flex items-center gap-1.5 px-3 py-2 rounded-button text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40"
  >
    <Check className="w-3.5 h-3.5" />
    {label}
  </button>
);

const ContinueButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" autoFocus onClick={onClick} className={primaryClass}>
    Tiếp tục <ArrowRight className="w-4 h-4" />
  </button>
);

const Flashcard: React.FC<PracticeQuestionViewProps> = ({
  question,
  isBusy,
  onAnswer,
  onDrop,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const word = question.words[0];

  return (
    <div className="space-y-3">
      <div className={`${cardClass} min-h-[280px] flex flex-col items-center justify-center text-center gap-3`}>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 break-words">
          {word.headword}
        </h2>
        <p className="text-sm font-mono text-slate-500">{word.ipaPronunciation}</p>
        <SpeakButton word={word} />
        {isFlipped && (
          <ul className="w-full space-y-2 pt-3 border-t-2 border-slate-100 dark:border-slate-700">
            {word.definitions.map((meaning) => (
              <li key={meaning.userWordDefinitionId}>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {meaning.partOfSpeech && (
                    <span className="text-[11px] italic text-slate-400 mr-1.5">
                      {meaning.partOfSpeech}
                    </span>
                  )}
                  {meaning.definition}
                </p>
                {meaning.example && (
                  <p className="text-xs italic text-slate-500">“{meaning.example}”</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isFlipped ? (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {RATINGS.map(({ score, label }) => (
            <button
              key={score}
              type="button"
              disabled={isBusy}
              onClick={() => onAnswer({ userWordId: word.userWordId, quality: score })}
              className={`py-2 rounded-xl border-2 font-extrabold text-sm disabled:opacity-40 ${
                score >= 3 ? rightChoice : wrongChoice
              }`}
            >
              {score}
              <span className="block text-[9px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            soundFX.playFlip();
            setIsFlipped(true);
          }}
          className={primaryClass}
        >
          <RotateCw className="w-4 h-4" /> Xem đáp án
        </button>
      )}
      <DropButton onClick={() => onDrop(word.userWordId)} disabled={isBusy} />
    </div>
  );
};

const MultipleChoice: React.FC<PracticeQuestionViewProps> = ({
  question,
  results,
  isBusy,
  onAnswer,
  onDrop,
  onContinue,
}) => {
  const word = question.words[0];
  const result = results[word.userWordId];
  const correctId = word.definitions[0].userWordDefinitionId;

  return (
    <div className="space-y-3">
      <div className={`${cardClass} text-center space-y-2`}>
        <p className="text-[11px] font-bold uppercase text-slate-400">Chọn nghĩa đúng</p>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 break-words">
          {word.headword}
        </h2>
        <p className="text-sm font-mono text-slate-500">{word.ipaPronunciation}</p>
        <SpeakButton word={word} />
      </div>
      <div className="space-y-2">
        {question.options.map((option) => (
          <button
            key={option.userWordDefinitionId}
            type="button"
            disabled={isBusy || Boolean(result)}
            onClick={() =>
              onAnswer({ userWordId: word.userWordId, choiceId: option.userWordDefinitionId })
            }
            className={`${choiceClass} text-left text-sm ${
              result && option.userWordDefinitionId === correctId
                ? rightChoice
                : result?.choiceId === option.userWordDefinitionId
                  ? wrongChoice
                  : idleChoice
            }`}
          >
            {option.definition}
          </button>
        ))}
      </div>
      {result && <ContinueButton onClick={onContinue} />}
      <DropButton onClick={() => onDrop(word.userWordId)} disabled={isBusy} />
    </div>
  );
};

const Match: React.FC<PracticeQuestionViewProps> = ({
  question,
  results,
  isBusy,
  onAnswer,
  onDrop,
  onContinue,
}) => {
  const [picked, setPicked] = useState<number | null>(null);
  const isDone = question.words.every((w) => results[w.userWordId]);
  const active = picked !== null && !results[picked] ? picked : null;

  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-bold text-slate-500">
        Nối từ với nghĩa: chọn từ trước, rồi chọn nghĩa
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {question.words.map((word) => {
            const result = results[word.userWordId];
            return (
              <button
                key={word.userWordId}
                type="button"
                disabled={isBusy || Boolean(result)}
                aria-pressed={active === word.userWordId}
                onClick={() => {
                  soundFX.playPop();
                  setPicked(word.userWordId);
                }}
                className={`${choiceClass} text-sm break-words ${
                  result
                    ? result.isCorrect
                      ? rightChoice
                      : wrongChoice
                    : active === word.userWordId
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : idleChoice
                }`}
              >
                {word.headword}
                {/* A missed pair shows what it should have been. */}
                {result && !result.isCorrect && (
                  <span className="block text-[11px] font-medium mt-1">
                    {word.definitions[0].definition}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {question.options.map((option) => {
            const isMatched = question.words.some(
              (w) =>
                w.definitions[0].userWordDefinitionId === option.userWordDefinitionId &&
                results[w.userWordId],
            );
            return (
              <button
                key={option.userWordDefinitionId}
                type="button"
                disabled={isBusy || active === null || isMatched}
                onClick={() =>
                  active !== null &&
                  onAnswer({ userWordId: active, choiceId: option.userWordDefinitionId })
                }
                className={`${choiceClass} text-left text-xs ${
                  isMatched ? `${rightChoice} opacity-60` : idleChoice
                }`}
              >
                {option.definition}
              </button>
            );
          })}
        </div>
      </div>
      {isDone && <ContinueButton onClick={onContinue} />}
      {active !== null && (
        <DropButton
          onClick={() => onDrop(active)}
          disabled={isBusy}
          label="Từ đang chọn oke rồi"
        />
      )}
    </div>
  );
};

/**
 * The first third of each part of a long word or phrase, the rest blanked.
 * Null for a short single word, which is typed unaided.
 */
function typingHint(answer: string): string | null {
  const parts = answer.trim().split(/\s+/);
  if (parts.length === 1 && parts[0].length <= 10) return null;
  return parts
    .map((part) => {
      const shown = Math.ceil(part.length / 3);
      return part.slice(0, shown) + '_'.repeat(part.length - shown);
    })
    .join('  ');
}

/** Listening, fill in the blank, and typing the word from its meaning. */
const Typed: React.FC<PracticeQuestionViewProps> = ({
  question,
  results,
  isBusy,
  onAnswer,
  onDrop,
  onContinue,
}) => {
  const [value, setValue] = useState('');
  const word = question.words[0];
  const meaning = word.definitions[0];
  const result = results[word.userWordId];
  const hint = question.mode === 'typing' ? typingHint(word.correctAnswer ?? '') : null;
  const play = useCallback(() => playWord(word), [word]);

  useEffect(() => {
    if (question.mode !== 'listening') return;
    const timer = setTimeout(play, 350);
    return () => clearTimeout(timer);
  }, [question.mode, play]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isBusy || result) return;
    onAnswer({ userWordId: word.userWordId, answer: value.trim() });
  };

  return (
    <div className="space-y-3">
      <div className={`${cardClass} text-center space-y-3`}>
        {question.mode === 'listening' && (
          <>
            <p className="text-[11px] font-bold uppercase text-slate-400">Nghe rồi gõ lại từ</p>
            <SpeakButton word={word} large />
          </>
        )}
        {question.mode === 'fill_in_blank' && (
          <>
            <p className="text-[11px] font-bold uppercase text-slate-400">Điền vào chỗ trống</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{word.sentence}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{meaning.definition}</p>
          </>
        )}
        {question.mode === 'typing' && (
          <>
            <p className="text-[11px] font-bold uppercase text-slate-400">Gõ từ có nghĩa này</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {meaning.definition}
            </p>
            {meaning.partOfSpeech && (
              <p className="text-xs italic text-slate-400">{meaning.partOfSpeech}</p>
            )}
            {hint && (
              <p className="text-sm font-mono font-bold whitespace-pre-wrap break-all text-blue-600 dark:text-blue-400">
                Gợi ý: {hint}
              </p>
            )}
          </>
        )}
      </div>

      <form onSubmit={submit} className="space-y-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={Boolean(result)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Câu trả lời"
          placeholder="Gõ câu trả lời…"
          className={`w-full text-center px-4 py-3 rounded-2xl border-clay text-base font-bold shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            result ? (result.isCorrect ? rightChoice : wrongChoice) : idleChoice
          }`}
        />
        {!result && (
          <button type="submit" disabled={!value.trim() || isBusy} className={primaryClass}>
            Trả lời
          </button>
        )}
      </form>

      {result ? (
        <>
          {!result.isCorrect && (
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-red-500">
              <X className="w-4 h-4" /> Đáp án: {word.correctAnswer}
            </p>
          )}
          <ContinueButton onClick={onContinue} />
        </>
      ) : (
        <button
          type="button"
          disabled={isBusy}
          // Giving up counts as a miss: an empty answer matches nothing.
          onClick={() => onAnswer({ userWordId: word.userWordId, answer: '' })}
          className="w-full text-xs font-bold text-slate-500 dark:text-slate-400 disabled:opacity-40"
        >
          Chưa nhớ ra, xem đáp án
        </button>
      )}
      <DropButton onClick={() => onDrop(word.userWordId)} disabled={isBusy} />
    </div>
  );
};

/** Give it `key={question.id}` so what was typed or flipped never carries over. */
export const PracticeQuestionView: React.FC<PracticeQuestionViewProps> = (props) => {
  switch (props.question.mode) {
    case 'flashcard':
      return <Flashcard {...props} />;
    case 'multiple_choice':
      return <MultipleChoice {...props} />;
    case 'match':
      return <Match {...props} />;
    default:
      return <Typed {...props} />;
  }
};
