'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, Volume2 } from 'lucide-react';
import { ArgumentChain, ChainRole, ChainStep } from '@/types/chain';
import { speakWord, soundFX } from '@/lib/audio';

export const cardClass =
  'rounded-card p-4 bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm';
const buttonClass =
  'w-full py-3.5 rounded-2xl border-clay font-extrabold text-sm shadow-clay active:scale-[0.98] disabled:opacity-40 transition-all';
export const primaryClass = `${buttonClass} bg-blue-600 border-blue-400 text-white`;
export const secondaryClass = `${buttonClass} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200`;

const ROLES: Record<ChainRole, { label: string; tone: string }> = {
  cause: {
    label: 'Nguyên nhân',
    tone: 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40',
  },
  middle: {
    label: 'Diễn biến',
    tone: 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40',
  },
  result: {
    label: 'Kết quả',
    tone: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40',
  },
};

function play(step: ChainStep) {
  if (!step.audioUrl) {
    speakWord(step.headword);
    return;
  }
  void new Audio(step.audioUrl).play().catch(() => speakWord(step.headword));
}

/** One step; tapping it says the word and opens its meaning. */
const Step: React.FC<{ step: ChainStep }> = ({ step }) => {
  const [isOpen, setIsOpen] = useState(false);
  const role = ROLES[step.role];
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={() => {
        play(step);
        setIsOpen(!isOpen);
      }}
      className={`w-full text-left rounded-2xl border-2 p-3 ${role.tone}`}
    >
      <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
        {role.label}
      </span>
      <span className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-slate-100 break-words">
        {step.headword}
        <Volume2 className="w-4 h-4 shrink-0 text-slate-400" />
      </span>
      {isOpen && (
        <span className="block mt-1 text-sm text-slate-700 dark:text-slate-300">
          {step.partOfSpeech && (
            <i className="text-xs text-slate-400 mr-1.5">{step.partOfSpeech}</i>
          )}
          {step.definition}
          {step.example && (
            <span className="block text-xs italic text-slate-500">“{step.example}”</span>
          )}
        </span>
      )}
    </button>
  );
};

const Between: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-2 py-1.5 pl-4">
    <ArrowDown className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
    <div className="min-w-0 text-sm">{children}</div>
  </div>
);

/** The whole chain, top to bottom, with its passage and summary. */
export const ChainDiagram: React.FC<{ chain: ArgumentChain }> = ({ chain }) => (
  <div className="space-y-4">
    <div>
      {chain.steps.map((step, i) => (
        <React.Fragment key={`${step.userWordId}-${i}`}>
          <Step step={step} />
          {step.link && (
            <Between>
              <p className="font-bold text-slate-800 dark:text-slate-200">{step.link.en}</p>
              <p className="text-xs text-slate-500">{step.link.vi}</p>
            </Between>
          )}
        </React.Fragment>
      ))}
    </div>
    <div className={`${cardClass} space-y-2`}>
      <p className="text-sm text-slate-800 dark:text-slate-200">{chain.passage}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{chain.summaryVi}</p>
    </div>
    {chain.leftOut.length > 0 && (
      <div className={`${cardClass} space-y-1`}>
        <p className="text-xs font-extrabold text-slate-500">Từ không đưa vào chuỗi</p>
        {chain.leftOut.map((word) => (
          <p key={word.userWordId} className="text-sm text-slate-700 dark:text-slate-300">
            <b>{word.headword}</b>: {word.reason}
          </p>
        ))}
      </div>
    )}
  </div>
);

// Never in the right order to begin with.
function scramble(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.every((v, i) => v === i) ? [...order.slice(1), order[0]] : order;
}

/** The User's own guess at the order, before the suggested one is shown. */
export const OrderGuess: React.FC<{
  chain: ArgumentChain;
  onDone: (rightPlaces: number) => void;
}> = ({ chain, onDone }) => {
  const shown = useMemo(() => scramble(chain.steps.length), [chain]);
  const [picked, setPicked] = useState<number[]>([]);

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-bold text-slate-700 dark:text-slate-200">
        Theo bạn, từ nào dẫn tới từ nào? Bấm lần lượt từ nguyên nhân đến kết quả.
      </p>
      <div className="space-y-2">
        {shown.map((index) => {
          const place = picked.indexOf(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                soundFX.playPop();
                setPicked(
                  place < 0 ? [...picked, index] : picked.filter((i) => i !== index),
                );
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left font-bold ${
                place < 0
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  : 'bg-blue-600 border-blue-400 text-white'
              }`}
            >
              <span className="w-6 h-6 shrink-0 rounded-full border-2 border-current text-xs flex items-center justify-center">
                {place < 0 ? '' : place + 1}
              </span>
              {chain.steps[index].headword}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={picked.length < chain.steps.length}
        onClick={() => onDone(picked.filter((step, place) => step === place).length)}
        className={primaryClass}
      >
        Xem chuỗi gợi ý
      </button>
    </div>
  );
};

/** Practice: every link is hidden and put back one after another. */
export const LinkFill: React.FC<{
  chain: ArgumentChain;
  /** Called once, when the last link is back. */
  onComplete: () => void;
  onClose: () => void;
}> = ({ chain, onComplete, onClose }) => {
  const total = chain.steps.length - 1;
  const bank = useMemo(() => scramble(total), [total]);
  const [filled, setFilled] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [misses, setMisses] = useState<Set<number>>(new Set());

  const choose = (index: number) => {
    if (index !== filled) {
      soundFX.playIncorrect();
      setWrong(index);
      setMisses(new Set(misses).add(filled));
      return;
    }
    soundFX.playCorrect();
    setWrong(null);
    setFilled(filled + 1);
    if (filled + 1 === total) onComplete();
  };

  return (
    <div className="space-y-4">
      <div>
        {chain.steps.map((step, i) => (
          <React.Fragment key={`${step.userWordId}-${i}`}>
            <Step step={step} />
            {step.link && (
              <Between>
                {i < filled ? (
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">{step.link.en}</p>
                ) : (
                  <p
                    className={`px-8 rounded-lg border-2 border-dashed ${
                      i === filled
                        ? 'border-blue-500 text-blue-600'
                        : 'border-slate-300 dark:border-slate-600 text-slate-400'
                    }`}
                  >
                    ?
                  </p>
                )}
              </Between>
            )}
          </React.Fragment>
        ))}
      </div>

      {filled < total ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 text-center">
            Chọn liên kết cho ô đang sáng
          </p>
          {bank
            .filter((index) => index >= filled)
            .map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => choose(index)}
                className={`w-full p-3 rounded-2xl border-2 text-left text-sm font-semibold ${
                  wrong === index
                    ? 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-600 dark:text-red-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {chain.steps[index].link?.en}
              </button>
            ))}
        </div>
      ) : (
        <div className="space-y-3 text-center">
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
            Đúng ngay lần đầu {total - misses.size}/{total} liên kết
          </p>
          <button type="button" onClick={onClose} className={primaryClass}>
            Xem lại chuỗi
          </button>
        </div>
      )}
    </div>
  );
};
