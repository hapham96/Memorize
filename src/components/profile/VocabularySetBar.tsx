'use client';

import React, { useState } from 'react';
import { Heart, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { VocabularySet } from '@/types';
import {
  createVocabularySet,
  deleteVocabularySet,
  renameVocabularySet,
} from '@/lib/api/category-client';
import { ApiError } from '@/lib/api/client';
import { soundFX } from '@/lib/audio';

/** What the word list is narrowed to: one set, the Favorites, or nothing (null). */
export type SetFilter = number | 'favorites' | null;

interface VocabularySetBarProps {
  sets: VocabularySet[];
  /** Exactly one chip is lit at a time. */
  filter: SetFilter;
  onSelect: (filter: SetFilter) => void;
  /** A set was created, renamed or deleted; resolves once the new list is in. */
  onChanged: () => Promise<void>;
}

const chipClass = (isActive: boolean) =>
  `shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border-2 transition-all ${
    isActive
      ? 'bg-blue-600 text-white border-blue-400 shadow-clay-sm'
      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
  }`;

const actionClass =
  'flex items-center gap-1 px-2 py-1 rounded-button text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors';

/** The set filter above the word list, with the sets' own create/rename/delete. */
export const VocabularySetBar: React.FC<VocabularySetBarProps> = ({
  sets,
  filter,
  onSelect,
  onChanged,
}) => {
  // 'new' while naming a new set, 'rename' while renaming the selected one.
  const [editing, setEditing] = useState<'new' | 'rename' | null>(null);
  const [name, setName] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = sets.find((set) => set.id === filter);
  const favoritesOnly = filter === 'favorites';

  /** Picks a chip, closing a name form left open for the previous one. */
  const choose = (next: SetFilter) => {
    setEditing(null);
    setError(null);
    onSelect(next);
  };

  const run = async (change: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await change();
      setEditing(null);
    } catch (err) {
      console.warn('Vocabulary set change failed:', err);
      setError(
        err instanceof ApiError && !err.isNetworkError && err.message
          ? err.message
          : 'Không lưu được, kiểm tra kết nối rồi thử lại nhé.',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const startEditing = (mode: 'new' | 'rename') => {
    soundFX.playPop();
    setError(null);
    setName(mode === 'rename' ? (selected?.name ?? '') : '');
    setEditing(mode);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isBusy) return;
    void run(async () => {
      if (editing === 'rename' && selected) {
        await renameVocabularySet(selected.id, name);
        await onChanged();
        return;
      }
      const created = await createVocabularySet(name);
      await onChanged();
      onSelect(created.id);
    });
  };

  const remove = () => {
    if (!selected) return;
    const fallback = sets.find((set) => set.isDefault)?.name ?? 'bộ mặc định';
    if (!confirm(`Xoá bộ "${selected.name}"? Các từ trong bộ được chuyển sang "${fallback}", không mất từ nào.`)) {
      return;
    }
    void run(async () => {
      await deleteVocabularySet(selected.id);
      onSelect(null);
      await onChanged();
    });
  };

  return (
    <div className="mb-2.5 space-y-1.5">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        <button type="button" onClick={() => choose(null)} aria-pressed={filter === null} className={chipClass(filter === null)}>
          Tất cả bộ
        </button>
        <button type="button" onClick={() => choose(favoritesOnly ? null : 'favorites')} aria-pressed={favoritesOnly} className={chipClass(favoritesOnly)}>
          <Heart className={`w-3 h-3 ${favoritesOnly ? 'fill-white' : ''}`} />
          Yêu thích
        </button>
        {sets.map((set) => (
          <button
            key={set.id}
            type="button"
            onClick={() => choose(set.id === filter ? null : set.id)}
            aria-pressed={set.id === filter}
            className={chipClass(set.id === filter)}
          >
            <span className="max-w-32 truncate">{set.name}</span>
          </button>
        ))}
        <button type="button" onClick={() => startEditing('new')} className={chipClass(false)}>
          <Plus className="w-3 h-3" />
          Bộ mới
        </button>
      </div>

      {editing ? (
        <form onSubmit={submit} className="flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên bộ từ"
            aria-label="Tên bộ từ"
            className="min-w-0 flex-1 px-3 py-1.5 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!name.trim() || isBusy}
            className="px-3 py-1.5 rounded-button bg-blue-600 text-white font-bold text-[11px] disabled:opacity-40 flex items-center gap-1"
          >
            {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
            Lưu
          </button>
          <button type="button" onClick={() => setEditing(null)} aria-label="Huỷ" className={actionClass}>
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        selected && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => startEditing('rename')} disabled={isBusy} className={actionClass}>
              <Pencil className="w-3 h-3" />
              Đổi tên
            </button>
            {/* The default set is where orphaned words go, so it stays. */}
            {!selected.isDefault && (
              <button type="button" onClick={remove} disabled={isBusy} className={actionClass}>
                <Trash2 className="w-3 h-3" />
                Xoá bộ
              </button>
            )}
          </div>
        )
      )}

      {error && (
        <p role="alert" className="text-[11px] font-semibold text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};
