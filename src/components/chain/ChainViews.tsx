'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, Volume2 } from 'lucide-react';
import { ArgumentChain, ChainRole, ChainStep } from '@/types/chain';
import { speakWord, soundFX } from '@/lib/audio';
import { normalizePos } from '@/lib/api/word-client';

export const cardClass =
  'rounded-card p-4 bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm';
const buttonClass =
  'w-full py-3.5 rounded-2xl border-clay font-extrabold text-sm shadow-clay active:scale-[0.98] disabled:opacity-40 transition-all';
export const primaryClass = `${buttonClass} bg-blue-600 border-blue-400 text-white`;
export const secondaryClass = `${buttonClass} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200`;

const ROLES: Record<ChainRole, { label: string; tone: string; text: string }> = {
  cause: {
    label: 'Nguyên nhân',
    tone: 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40',
    text: 'text-amber-700 dark:text-amber-300',
  },
  middle: {
    label: 'Diễn biến',
    tone: 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40',
    text: 'text-blue-700 dark:text-blue-300',
  },
  result: {
    label: 'Kết quả',
    tone: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
};

function play(step: ChainStep) {
  if (!step.audioUrl) {
    speakWord(step.headword);
    return;
  }
  void new Audio(step.audioUrl).play().catch(() => speakWord(step.headword));
}

/** `noun`, `n` and `n.` all show as `n.`. */
function shortPos(partOfSpeech: string): string {
  const bare = partOfSpeech.trim().replace(/\.$/, '');
  const short = normalizePos(bare) ?? bare;
  return /^(n|v|adj|adv|pron|prep|conj|interj)$/.test(short) ? `${short}.` : short;
}

/** Which step is open: one at a time, so the chain stays in view. */
function useOpenStep() {
  const [open, setOpen] = useState<number | null>(null);
  return (i: number) => ({
    isOpen: open === i,
    onToggle: () => setOpen(open === i ? null : i),
  });
}

/** One step: the card opens its meaning, the speaker only says the word. */
const Step: React.FC<{ step: ChainStep; isOpen: boolean; onToggle: () => void }> = ({
  step,
  isOpen,
  onToggle,
}) => {
  const role = ROLES[step.role];
  return (
    // The headword button is the keyboard's way in; its click lands here too.
    <div
      onClick={onToggle}
      className={`rounded-2xl border-2 p-3 cursor-pointer ${role.tone}`}
    >
      <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
        {role.label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={isOpen}
          className="min-w-0 text-left text-lg font-black text-slate-900 dark:text-slate-100 break-words"
        >
          {step.headword}
        </button>
        <button
          type="button"
          aria-label={`Nghe ${step.headword}`}
          onClick={(e) => {
            e.stopPropagation();
            play(step);
          }}
          className="shrink-0 p-2 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-700"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
      {isOpen && (
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
          {step.partOfSpeech && (
            <i className="text-xs text-slate-400 mr-1.5">{shortPos(step.partOfSpeech)}</i>
          )}
          {step.definition}
          {step.example && (
            <span className="block text-xs italic text-slate-600 dark:text-slate-300">
              “{step.example}”
            </span>
          )}
        </p>
      )}
    </div>
  );
};

const Between: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-2 py-1.5 pl-4">
    <ArrowDown className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
    <div className="min-w-0 text-sm">{children}</div>
  </div>
);

/**
 * The passage with the chain's words coloured by role. The AI inflects them
 * ("compiles"), so each word of a headword matches by its stem.
 */
const Passage: React.FC<{ text: string; steps: ChainStep[] }> = ({ text, steps }) => {
  const sorted = [...steps].sort((a, b) => b.headword.length - a.headword.length);
  const patterns = sorted.map((step) =>
    step.headword
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .map((word) => (word.length > 3 ? `${word.replace(/[ey]$/i, '')}[a-z]{0,4}` : word))
      .join('\\s+'),
  );
  // One group per step, so a match tells which step it is.
  const matcher = new RegExp(`\\b(?:${patterns.map((p) => `(${p})`).join('|')})\\b`, 'gi');
  const parts: React.ReactNode[] = [];
  let from = 0;
  for (const match of Array.from(text.matchAll(matcher))) {
    const step = sorted[match.slice(1).findIndex(Boolean)];
    parts.push(
      text.slice(from, match.index),
      <b key={match.index} className={ROLES[step.role].text}>
        {match[0]}
      </b>,
    );
    from = match.index! + match[0].length;
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
};

/** The passage and summary, then the whole chain from top to bottom. */
export const ChainDiagram: React.FC<{ chain: ArgumentChain }> = ({ chain }) => {
  const stepProps = useOpenStep();
  return (
    <div className="space-y-4">
      <div className={`${cardClass} space-y-2`}>
        <p className="text-sm text-slate-800 dark:text-slate-200">
          <Passage text={chain.passage} steps={chain.steps} />
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300">{chain.summaryVi}</p>
      </div>
      <p className="text-center text-xs font-bold text-slate-500 dark:text-slate-400">
        Bấm vào từ để xem nghĩa, bấm loa để nghe
      </p>
      <div>
        {chain.steps.map((step, i) => (
          <React.Fragment key={`${step.userWordId}-${i}`}>
            <Step step={step} {...stepProps(i)} />
            {step.link && (
              <Between>
                <p className="font-bold text-slate-800 dark:text-slate-200">{step.link.en}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{step.link.vi}</p>
              </Between>
            )}
          </React.Fragment>
        ))}
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
};

// Never in the right order to begin with.
function scramble(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.every((v, i) => v === i) ? [...order.slice(1), order[0]] : order;
}

/** Practice: the User puts the words in order, then compares. */
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
  const stepProps = useOpenStep();
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
            <Step step={step} {...stepProps(i)} />
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
