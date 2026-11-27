'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Trash2, X } from 'lucide-react';
import { ArgumentChain, ChainPick, ChainStart, LeftOutWord, WordSuggestion } from '@/types/chain';
import {
  MAX_CHAIN_WORDS,
  MIN_CHAIN_WORDS,
  SUPPLEMENT_BELOW,
  chainErrorText,
  createChain,
  deleteChain,
  fetchChain,
  markChainPractised,
  suggestChainWords,
} from '@/lib/api/chain-client';
import { addWord } from '@/lib/api/word-client';
import { XuPrices } from '@/lib/api/wallet-client';
import { soundFX } from '@/lib/audio';
import { trackEvent } from '@/lib/analytics';
import {
  ChainDiagram,
  LinkFill,
  OrderGuess,
  cardClass,
  primaryClass,
  secondaryClass,
} from './ChainViews';

interface ChainScreenProps {
  start: ChainStart;
  /** Null while xu is switched off: then no price is shown. */
  prices: XuPrices | null;
  /** Wraps every write, so counters elsewhere can wait for it and refresh. */
  track: <T>(request: Promise<T>) => Promise<T>;
  /** A suggested new word was added to the library. */
  onWordAdded: () => void;
  onClose: () => void;
}

interface Suggested {
  vocabularySetId: number;
  list: WordSuggestion[];
}

export const ChainScreen: React.FC<ChainScreenProps> = ({
  start,
  prices,
  track,
  onWordAdded,
  onClose,
}) => {
  const [words, setWords] = useState<ChainPick[]>(start.kind === 'new' ? start.words : []);
  const [suggested, setSuggested] = useState<Suggested | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [leftOut, setLeftOut] = useState<LeftOutWord[]>([]);
  const [chain, setChain] = useState<ArgumentChain | null>(null);
  const [view, setView] = useState<'order' | 'chain' | 'fill'>('chain');
  const [rightPlaces, setRightPlaces] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const savedId = start.kind === 'saved' ? start.chainId : null;
  useEffect(() => {
    if (savedId === null) return;
    let isCurrent = true;
    fetchChain(savedId)
      .then((next) => isCurrent && setChain(next))
      .catch((err) => isCurrent && setError(chainErrorText(err)));
    return () => {
      isCurrent = false;
    };
  }, [savedId]);

  const price = (xu: number | undefined) => (xu ? ` (${xu} xu)` : '');

  /** Every paid call starts from a tap, never from an effect. */
  const run = async (label: string, work: () => Promise<void>) => {
    if (busy) return;
    soundFX.playPop();
    setBusy(label);
    setError(null);
    try {
      await work();
    } catch (err) {
      console.warn('Argument Chain request failed:', err);
      setError(chainErrorText(err));
    } finally {
      setBusy(null);
    }
  };

  const make = (ids: number[]) =>
    run('Memo đang nối các từ…', async () => {
      const result = await track(createChain(ids));
      if (!result.chain) {
        setLeftOut(result.leftOut);
        return;
      }
      trackEvent('chain_create', { item_count: result.chain.steps.length });
      setLeftOut([]);
      setRightPlaces(null);
      setChain(result.chain);
      setView('order');
    });

  const suggest = () =>
    run('Memo đang tìm từ hợp…', async () => {
      const next = await suggestChainWords(words.map((w) => w.userWordId));
      setSuggested({ vocabularySetId: next.vocabularySetId, list: next.suggestions });
      setTicked(new Set());
    });

  /** New words are added the ordinary way, one by one, before they join. */
  const addTicked = () =>
    run('Đang thêm từ…', async () => {
      if (!suggested) return;
      for (const item of suggested.list.filter((s) => ticked.has(s.headword))) {
        let userWordId = item.userWordId;
        if (userWordId === null) {
          const added = await track(
            addWord({
              headword: item.headword,
              vocabularySetId: suggested.vocabularySetId,
              ipaPronunciation: item.ipaPronunciation ?? '',
              definitions: [
                {
                  definition: item.definition,
                  partOfSpeech: item.partOfSpeech ?? undefined,
                  example: item.example ?? undefined,
                },
              ],
            }),
          );
          userWordId = Number(added.word.id);
          onWordAdded();
        }
        const pick = { userWordId, headword: item.headword };
        // Kept as each one lands, so a failure part way loses nothing.
        setWords((prev) => [...prev, pick]);
        setSuggested((prev) =>
          prev && { ...prev, list: prev.list.filter((s) => s.headword !== item.headword) },
        );
      }
      setSuggested(null);
      setLeftOut([]);
    });

  const remove = () =>
    run('Đang xoá…', async () => {
      if (!chain) return;
      await track(deleteChain(chain.id));
      onClose();
    });

  const complete = () => {
    if (!chain) return;
    trackEvent('chain_practised', { item_count: chain.steps.length });
    track(markChainPractised(chain.id)).catch((err) =>
      console.warn('Could not record the chain practice:', err),
    );
  };

  const room = MAX_CHAIN_WORDS - words.length - ticked.size;

  const picking = suggested ? (
    <div className="space-y-3">
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
        {suggested.list.length
          ? 'Chọn từ muốn thêm. Từ mới được lưu vào cùng bộ từ.'
          : 'Chưa tìm được từ nào hợp.'}
      </p>
      {suggested.list.map((item) => {
        const isTicked = ticked.has(item.headword);
        return (
          <label key={item.headword} className={`${cardClass} flex gap-3 cursor-pointer`}>
            <input
              type="checkbox"
              checked={isTicked}
              disabled={!isTicked && room <= 0}
              onChange={() => {
                const next = new Set(ticked);
                if (isTicked) next.delete(item.headword);
                else next.add(item.headword);
                setTicked(next);
              }}
              className="mt-1 w-5 h-5 shrink-0 accent-blue-600"
            />
            <span className="min-w-0">
              <span className="font-extrabold text-slate-900 dark:text-slate-100">
                {item.headword}
              </span>
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  item.source === 'new'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {item.source === 'new' ? 'Mới' : 'Đã có'}
              </span>
              <span className="block text-sm text-slate-600 dark:text-slate-300">
                {item.definition}
              </span>
              {item.example && (
                <span className="block text-xs italic text-slate-500">“{item.example}”</span>
              )}
            </span>
          </label>
        );
      })}
      <button
        type="button"
        disabled={!ticked.size || Boolean(busy)}
        onClick={() => void addTicked()}
        className={primaryClass}
      >
        Thêm {ticked.size || ''} từ đã chọn
      </button>
      <button type="button" onClick={() => setSuggested(null)} className={secondaryClass}>
        Không thêm
      </button>
    </div>
  ) : (
    <div className="space-y-3">
      <div className={`${cardClass} space-y-2`}>
        <p className="text-xs font-extrabold text-slate-500">
          {words.length} từ (cần {MIN_CHAIN_WORDS} đến {MAX_CHAIN_WORDS})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {words.map((word) => (
            <button
              key={word.userWordId}
              type="button"
              aria-label={`Bỏ ${word.headword}`}
              onClick={() => setWords(words.filter((w) => w.userWordId !== word.userWordId))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
            >
              {word.headword} <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>

      {leftOut.length > 0 && (
        <div role="alert" className={`${cardClass} space-y-1`}>
          <p className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
            Các từ này chưa nối được thành chuỗi. Bỏ bớt hoặc bổ sung từ rồi thử lại.
          </p>
          {leftOut.map((word) => (
            <p key={word.userWordId} className="text-sm text-slate-700 dark:text-slate-300">
              <b>{word.headword}</b>: {word.reason}
            </p>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={words.length < MIN_CHAIN_WORDS || Boolean(busy)}
        onClick={() => void make(words.map((w) => w.userWordId))}
        className={primaryClass}
      >
        Tạo chuỗi nhớ{price(prices?.chain)}
      </button>
      {words.length > 0 && words.length < MAX_CHAIN_WORDS && (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void suggest()}
          className={`${words.length < SUPPLEMENT_BELOW ? primaryClass : secondaryClass} flex items-center justify-center gap-1.5`}
        >
          <Plus className="w-4 h-4" /> Bổ sung từ{price(prices?.chainWords)}
        </button>
      )}
    </div>
  );

  const showing =
    chain &&
    (view === 'order' ? (
      <OrderGuess
        chain={chain}
        onDone={(places) => {
          setRightPlaces(places);
          setView('chain');
        }}
      />
    ) : view === 'fill' ? (
      <LinkFill chain={chain} onComplete={complete} onClose={() => setView('chain')} />
    ) : (
      <div className="space-y-4">
        {rightPlaces !== null && (
          <p className="text-center text-sm font-extrabold text-slate-700 dark:text-slate-200">
            Bạn xếp đúng {rightPlaces}/{chain.steps.length} vị trí. Đây là chuỗi gợi ý:
          </p>
        )}
        <ChainDiagram chain={chain} />
        <button
          type="button"
          onClick={() => {
            soundFX.playPop();
            setView('fill');
          }}
          className={primaryClass}
        >
          Luyện: điền liên kết
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() =>
            void make(
              [...chain.steps, ...chain.leftOut]
                .map((w) => w.userWordId)
                .slice(0, MAX_CHAIN_WORDS),
            )
          }
          className={secondaryClass}
        >
          Tạo lại{price(prices?.chain)}
        </button>
        {isDeleting ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => void remove()} className={`${secondaryClass} text-red-600`}>
              Xoá thật
            </button>
            <button type="button" onClick={() => setIsDeleting(false)} className={secondaryClass}>
              Giữ lại
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsDeleting(true)}
            className="mx-auto flex items-center gap-1.5 text-xs font-bold text-slate-500"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xoá chuỗi này
          </button>
        )}
      </div>
    ));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 pb-8 space-y-4 bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Quay lại"
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Chuỗi nhớ</h2>
      </div>

      {error && (
        <p role="alert" className="text-sm font-bold text-amber-700 dark:text-amber-300 text-center">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> {busy}
        </p>
      )}

      {showing ??
        (savedId === null ? (
          picking
        ) : (
          !error && <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
        ))}
    </div>
  );
};
