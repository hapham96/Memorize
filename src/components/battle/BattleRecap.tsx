'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { BookOpenCheck, Check, CheckCircle, Flame, Loader2, Minus, Plus, Shield, Swords, XCircle } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { addWord } from '@/lib/api/word-client';
import type { BattleResult, RecapEntry } from '@/types/battle';
import { BattleIcon, CARD, ErrorLine } from './BattleChrome';

type Mark = { tone: 'good' | 'bad' | 'neutral'; label: string; icon: React.ComponentType<{ className?: string }> };

/** How this word went for the viewer, in the terms of the Battle mode it came from. */
function markFor(entry: RecapEntry, mode: BattleResult['mode'], meId: number | null, name: (userId: number) => string): Mark {
  if (mode === 'chain') {
    if (entry.addedByUserId === null) return { tone: 'neutral', label: 'Từ khởi đầu', icon: Minus };
    return entry.addedByUserId === meId
      ? { tone: 'good', label: 'Từ bạn nối', icon: CheckCircle }
      : { tone: 'neutral', label: `Từ của ${name(entry.addedByUserId)}`, icon: Minus };
  }
  if (mode === 'heist') {
    const mine = entry.ownerUserId === meId;
    if (entry.holderUserId === null) {
      return entry.wrongUserIds.length > 0 || entry.correctUserIds.length > 0
        ? { tone: 'bad', label: 'Bị cháy', icon: Flame }
        : { tone: 'neutral', label: 'Chưa chơi', icon: Minus };
    }
    if (entry.holderUserId === meId) {
      return mine ? { tone: 'good', label: 'Bạn đã giữ', icon: Shield } : { tone: 'good', label: 'Bạn đã cướp', icon: Swords };
    }
    return mine
      ? { tone: 'bad', label: `Bị ${name(entry.holderUserId)} cướp`, icon: Swords }
      : { tone: 'neutral', label: `${name(entry.holderUserId)} giữ`, icon: Minus };
  }
  if (meId !== null && entry.correctUserIds.includes(meId)) return { tone: 'good', label: 'Bạn trả lời đúng', icon: CheckCircle };
  if (meId !== null && entry.wrongUserIds.includes(meId)) return { tone: 'bad', label: 'Bạn trả lời sai', icon: XCircle };
  return { tone: 'neutral', label: 'Chưa trả lời', icon: Minus };
}

const TONE_CLASS: Record<Mark['tone'], string> = {
  good: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
  bad: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300',
  neutral: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
};

type AddState = 'idle' | 'adding' | 'added' | { error: string };

/**
 * The recap: every word the Battle that just ended showed, and a way to keep
 * the ones worth learning. "Thêm" sends that one word through the ordinary
 * `POST /words` — which also drops the cached library, so it shows up in the
 * word library and the review queue on their next read.
 */
export function BattleRecap({ result, meId }: { result: BattleResult; meId: number | null }) {
  const recap = result.recap ?? [];
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [added, setAdded] = useState<Record<number, AddState>>({});

  // A new Battle's recap starts with nothing added.
  useEffect(() => setAdded({}), [result.battleId]);

  if (recap.length === 0) return null;

  const names = Object.fromEntries(result.standings.map((s) => [s.userId, s.name]));
  const name = (userId: number) => names[userId] ?? 'ai đó';
  const rows = recap.map((entry, index) => ({ entry, index, mark: markFor(entry, result.mode, meId, name) }));
  const missed = rows.filter((r) => r.mark.tone !== 'good');
  const shown = onlyMissed ? missed : rows;

  async function add(index: number, entry: RecapEntry) {
    if (!entry.definition) return;
    setAdded((prev) => ({ ...prev, [index]: 'adding' }));
    try {
      await addWord({
        headword: entry.headword,
        ipaPronunciation: entry.ipaPronunciation ?? '',
        definitions: [
          {
            definition: entry.definition,
            ...(entry.partOfSpeech ? { partOfSpeech: entry.partOfSpeech } : {}),
            ...(entry.example ? { example: entry.example } : {}),
          },
        ],
      });
      setAdded((prev) => ({ ...prev, [index]: 'added' }));
    } catch (err) {
      const message =
        err instanceof ApiError && !err.isNetworkError ? err.message : 'Không thêm được từ này. Kiểm tra kết nối rồi thử lại.';
      setAdded((prev) => ({ ...prev, [index]: { error: message } }));
    }
  }

  return (
    <section className={`${CARD} p-5 space-y-4 animate-popIn`}>
      <div className="flex items-center gap-3">
        <BattleIcon icon={BookOpenCheck} />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">Tổng kết từ vựng</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {recap.length} từ trong trận này. Thêm những từ đáng nhớ vào thư viện của bạn.
          </p>
        </div>
      </div>

      <div className="flex gap-1.5" role="group" aria-label="Hiện những từ nào">
        {[
          { missedOnly: false, label: `Tất cả ${rows.length}` },
          { missedOnly: true, label: `Cần học ${missed.length}` },
        ].map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={onlyMissed === f.missedOnly}
            onClick={() => setOnlyMissed(f.missedOnly)}
            className={clsx(
              'inline-flex h-9 items-center rounded-full border-2 px-3.5 text-xs font-bold tabular-nums transition-colors',
              onlyMissed === f.missedOnly
                ? 'border-blue-400 bg-blue-600 text-white'
                : 'border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">Không còn từ nào cần học — bạn đã nắm hết rồi!</p>
      ) : (
        <ul className="max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain pr-1">
          {shown.map(({ entry, index, mark }) => {
            const state = added[index] ?? 'idle';
            // Your own Stake is already in your library.
            const canAdd = !!entry.definition && !(result.mode === 'heist' && entry.ownerUserId === meId);
            return (
              <li key={index} className="flex items-start gap-3 rounded-2xl border-2 border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="break-words font-display text-base font-extrabold text-slate-900 dark:text-slate-100">{entry.headword}</span>
                    {entry.ipaPronunciation && <span className="text-xs font-mono text-slate-400">{entry.ipaPronunciation}</span>}
                    {entry.partOfSpeech && (
                      <span className="rounded-full border-2 border-blue-100 dark:border-slate-600 px-2 text-[10px] font-bold text-blue-600 dark:text-blue-300">
                        {entry.partOfSpeech}
                      </span>
                    )}
                    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold', TONE_CLASS[mark.tone])}>
                      <mark.icon className="w-3 h-3" aria-hidden />
                      {mark.label}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                    {entry.definition ?? <span className="text-slate-400">Không có định nghĩa.</span>}
                  </p>
                  {entry.example && (
                    <p className="mt-1 border-l-[3px] border-blue-100 dark:border-slate-600 pl-2 text-xs italic text-slate-500 dark:text-slate-400">
                      {entry.example}
                    </p>
                  )}
                  {typeof state === 'object' && <ErrorLine className="mt-1.5 text-xs">{state.error}</ErrorLine>}
                </div>
                {canAdd &&
                  (state === 'added' ? (
                    <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 px-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-popIn">
                      <Check className="w-3.5 h-3.5" aria-hidden />
                      Đã thêm
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={state === 'adding'}
                      onClick={() => void add(index, entry)}
                      aria-label={`Thêm ${entry.headword} vào thư viện`}
                      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border-2 border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 text-xs font-bold text-blue-600 dark:text-blue-300 hover:border-blue-400 disabled:opacity-60"
                    >
                      {state === 'adding' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Plus className="w-3.5 h-3.5" aria-hidden />}
                      Thêm
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
