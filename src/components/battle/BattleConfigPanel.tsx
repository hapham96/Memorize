'use client';

import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { Brain, Check, Gem, Link2, Puzzle, type LucideIcon } from 'lucide-react';
import { BattleRequestError } from '@/hooks/useBattle';
import {
  DEFAULT_STAKE_COUNT,
  type BattleConfig,
  type BattleDuration,
  type BattleMode,
  type BattleTopic,
  type StakeCount,
  type WordPool,
} from '@/types/battle';
import { Chip, ErrorLine, SectionLabel } from './BattleChrome';

const MODES: { mode: BattleMode; label: string; hint: string; icon: LucideIcon }[] = [
  { mode: 'recall', label: 'Battle Recall', hint: 'Đọc định nghĩa, chọn đúng từ trong 4 đáp án.', icon: Brain },
  { mode: 'match', label: 'Battle Match', hint: 'Đua nhau ghép 4 từ với định nghĩa của chúng.', icon: Puzzle },
  { mode: 'chain', label: 'Word Chain', hint: 'Lần lượt nối từ bắt đầu bằng chữ cái cuối. 3 mạng.', icon: Link2 },
  { mode: 'heist', label: 'Word Heist', hint: 'Cược từ của bạn, ôn từ của mọi người, rồi cướp chúng.', icon: Gem },
];
const DURATIONS: BattleDuration[] = [60, 120, 180];
const STAKE_COUNTS: StakeCount[] = [10, 12, 15];
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

interface BattleConfigPanelProps {
  config: BattleConfig;
  topics: BattleTopic[] | null;
  isHost: boolean;
  onConfigure: (config: BattleConfig) => Promise<void>;
}

/**
 * The Host's Battle settings — mode, Word Pool (random or catalog topics,
 * optionally by CEFR level) and duration, or for Word Heist how many Stakes
 * each player puts up. Read-only for everyone else.
 *
 * Each change goes straight to the backend, which validates it (e.g. a Word
 * Pool too small to play). The Host sees the change at once and it reverts if
 * the backend rejects it.
 */
export function BattleConfigPanel({ config: saved, topics, isHost, onConfigure }: BattleConfigPanelProps) {
  // "By topic" with nothing ticked yet isn't a valid Word Pool, so that half-made choice stays local until a topic is picked.
  const [pickingTopics, setPickingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The Host's latest change, shown until the backend confirms (the saved config then matches) or rejects it.
  const [pending, setPending] = useState<BattleConfig | null>(null);
  const latestRequest = useRef(0);
  const config = pending ?? saved;
  const pool = config.wordPool;
  const poolKind = pickingTopics ? 'topics' : pool.kind;
  const topicIds = pool.kind === 'topics' ? pool.topicIds : [];
  const cefr = pool.cefrLevels ?? [];

  async function send(next: BattleConfig) {
    const request = ++latestRequest.current;
    setPending(next);
    setError(null);
    try {
      await onConfigure(next);
      setPickingTopics(false);
    } catch (err) {
      setError(err instanceof BattleRequestError ? err.message : 'Không cập nhật được cài đặt.');
    } finally {
      // Only the newest change decides what's shown; an older reply mustn't clobber a newer pick.
      if (request === latestRequest.current) setPending(null);
    }
  }

  function withPool(changes: { kind?: 'random' | 'topics'; topicIds?: number[]; cefrLevels?: string[] }): WordPool | null {
    const kind = changes.kind ?? poolKind;
    const cefrLevels = changes.cefrLevels ?? cefr;
    const extra = cefrLevels.length ? { cefrLevels } : {};
    if (kind === 'random') return { kind: 'random', ...extra };
    const ids = changes.topicIds ?? topicIds;
    return ids.length ? { kind: 'topics', topicIds: ids, ...extra } : null;
  }

  function update(changes: Parameters<typeof withPool>[0]) {
    const wordPool = withPool(changes);
    if (wordPool) void send({ ...config, wordPool });
    else setPickingTopics(true);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <SectionLabel>Chế độ</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => {
            const active = config.mode === m.mode;
            return (
              <button
                key={m.mode}
                type="button"
                disabled={!isHost}
                aria-pressed={active}
                onClick={() => void send({ ...config, mode: m.mode })}
                className={clsx(
                  'relative flex items-start gap-3 rounded-2xl border-clay p-3 text-left transition-all duration-200 ease-clay disabled:cursor-default',
                  active
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-clay-sm'
                    : 'border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-800',
                  isHost && !active && 'hover:-translate-y-0.5 hover:border-blue-300',
                )}
              >
                <span
                  className={clsx(
                    'w-10 h-10 shrink-0 rounded-xl flex items-center justify-center',
                    active ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400',
                  )}
                >
                  <m.icon className="w-5 h-5" aria-hidden />
                </span>
                <span className="min-w-0 pr-5">
                  <span className="block font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">{m.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{m.hint}</span>
                </span>
                {active && (
                  <span className="absolute right-2.5 top-2.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {config.mode === 'chain' ? (
        <p className="clay-well p-3 text-sm text-slate-500 dark:text-slate-400">
          Word Chain dùng bất kỳ từ tiếng Anh thật nào và kéo dài tới khi chỉ còn một người — không cần chọn bộ từ hay thời lượng.
        </p>
      ) : config.mode === 'heist' ? (
        <>
          <div className="space-y-2">
            <SectionLabel>Số từ cược mỗi người</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {STAKE_COUNTS.map((n) => (
                <Chip
                  key={n}
                  active={(config.stakeCount ?? DEFAULT_STAKE_COUNT) === n}
                  disabled={!isHost}
                  onClick={() => void send({ ...config, stakeCount: n })}
                >
                  <span className="tabular-nums">{n} từ</span>
                </Chip>
              ))}
            </div>
          </div>
          <p className="clay-well p-3 text-sm text-slate-500 dark:text-slate-400">
            Mọi người cược cùng số từ lấy từ thư viện của mình. Sau giai đoạn ôn tập, mỗi từ thuộc về người trả lời đúng
            nhanh nhất. Đổi số từ sẽ mở khoá từ cược của tất cả.
          </p>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <SectionLabel>Bộ từ</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <Chip active={poolKind === 'random'} disabled={!isHost} onClick={() => update({ kind: 'random' })}>
                Ngẫu nhiên
              </Chip>
              <Chip active={poolKind === 'topics'} disabled={!isHost} onClick={() => update({ kind: 'topics' })}>
                Theo chủ đề
              </Chip>
            </div>
            {poolKind === 'topics' && (
              <div className="clay-well flex flex-wrap gap-2 p-2">
                {topics === null && <p className="text-xs text-slate-400">Đang tải chủ đề…</p>}
                {topics?.length === 0 && <p className="text-xs text-slate-400">Không tải được danh sách chủ đề.</p>}
                {topics?.map((t) =>
                  isHost || topicIds.includes(t.id) ? (
                    <Chip
                      key={t.id}
                      active={topicIds.includes(t.id)}
                      disabled={!isHost}
                      onClick={() => update({ kind: 'topics', topicIds: toggle(topicIds, t.id) })}
                    >
                      {t.name}
                    </Chip>
                  ) : null,
                )}
              </div>
            )}
            {pickingTopics && <p className="text-xs text-slate-400">Chọn ít nhất một chủ đề.</p>}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold text-slate-400">Trình độ</span>
              {CEFR_LEVELS.map((level) => (
                <Chip
                  key={level}
                  active={cefr.includes(level)}
                  disabled={!isHost}
                  onClick={() => update({ cefrLevels: toggle(cefr, level) })}
                >
                  {level}
                </Chip>
              ))}
              {cefr.length === 0 && <span className="text-xs text-slate-400">mọi trình độ</span>}
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>Thời lượng</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  active={config.durationSeconds === d}
                  disabled={!isHost}
                  onClick={() => void send({ ...config, durationSeconds: d })}
                >
                  <span className="tabular-nums">{d / 60} phút</span>
                </Chip>
              ))}
            </div>
          </div>
        </>
      )}

      {error && <ErrorLine>{error}</ErrorLine>}
    </div>
  );
}
