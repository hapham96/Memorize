'use client';

import React, { useState } from 'react';
import { CheckSquare, ChevronDown, ChevronRight, MinusSquare, Square } from 'lucide-react';
import { UserWordListItem, VocabularySet } from '@/types';
import { soundFX } from '@/lib/audio';

/**
 * What is chosen, in the terms the server takes: whole sets, single words
 * outside them, and words unticked out of whatever would include them.
 */
export interface WordSelection {
  setIds: Set<number>;
  wordIds: Set<number>;
  excludedIds: Set<number>;
  favorites: boolean;
  oftenMissed: boolean;
}

export const EMPTY_SELECTION: WordSelection = {
  setIds: new Set(),
  wordIds: new Set(),
  excludedIds: new Set(),
  favorites: false,
  oftenMissed: false,
};

export function isWordChosen(
  selection: WordSelection,
  item: UserWordListItem,
  favorites: string[],
): boolean {
  const id = Number(item.word.id);
  if (selection.excludedIds.has(id)) return false;
  return (
    selection.wordIds.has(id) ||
    (item.vocabularySetId !== undefined && selection.setIds.has(item.vocabularySetId)) ||
    (selection.favorites && favorites.includes(String(id)))
  );
}

interface WordPickerProps {
  /** Words the server knows. */
  items: UserWordListItem[];
  vocabularySets: VocabularySet[];
  favorites: string[];
  selection: WordSelection;
  onChange: (selection: WordSelection) => void;
}

export const WordPicker: React.FC<WordPickerProps> = ({
  items,
  vocabularySets,
  favorites,
  selection,
  onChange,
}) => {
  const [openId, setOpenId] = useState<number | null>(null);

  const groups = new Map<number, UserWordListItem[]>();
  items.forEach((item) => {
    if (item.vocabularySetId === undefined) return;
    const words = groups.get(item.vocabularySetId) ?? [];
    words.push(item);
    groups.set(item.vocabularySetId, words);
  });

  const copy = (): WordSelection => ({
    ...selection,
    setIds: new Set(selection.setIds),
    wordIds: new Set(selection.wordIds),
    excludedIds: new Set(selection.excludedIds),
  });

  const toggleSet = (setId: number, words: UserWordListItem[], isWhole: boolean) => {
    soundFX.playPop();
    const next = copy();
    if (isWhole) next.setIds.delete(setId);
    else next.setIds.add(setId);
    words.forEach((item) => {
      next.wordIds.delete(Number(item.word.id));
      next.excludedIds.delete(Number(item.word.id));
    });
    onChange(next);
  };

  const toggleWord = (item: UserWordListItem) => {
    const id = Number(item.word.id);
    const next = copy();
    if (isWordChosen(selection, item, favorites)) {
      next.wordIds.delete(id);
      next.excludedIds.add(id);
    } else {
      next.excludedIds.delete(id);
      if (!isWordChosen(next, item, favorites)) next.wordIds.add(id);
    }
    onChange(next);
  };

  return (
    <ul className="space-y-1.5">
      {Array.from(groups, ([setId, words]) => {
        const name = vocabularySets.find((set) => set.id === setId)?.name ?? 'Bộ từ';
        const chosen = words.filter((item) => isWordChosen(selection, item, favorites)).length;
        const isWhole = selection.setIds.has(setId) && chosen === words.length;
        const SetIcon = isWhole ? CheckSquare : chosen > 0 ? MinusSquare : Square;
        const isOpen = openId === setId;
        return (
          <li
            key={setId}
            className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
          >
            <div className="flex items-center">
              <button
                type="button"
                role="checkbox"
                aria-checked={isWhole ? true : chosen > 0 ? 'mixed' : false}
                onClick={() => toggleSet(setId, words, isWhole)}
                className="min-w-0 flex-1 flex items-center gap-2 p-3 text-left"
              >
                <SetIcon
                  className={`w-5 h-5 shrink-0 ${chosen > 0 ? 'text-blue-600' : 'text-slate-400'}`}
                />
                <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {name}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {chosen}/{words.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : setId)}
                aria-expanded={isOpen}
                aria-label={`Chọn từng từ trong ${name}`}
                className="p-3 text-slate-500"
              >
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
            {isOpen && (
              <ul className="max-h-56 overflow-y-auto border-t-2 border-slate-200 dark:border-slate-700 p-1.5">
                {words.map((item) => (
                  <li key={String(item.word.id)}>
                    <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWordChosen(selection, item, favorites)}
                        onChange={() => toggleWord(item)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {item.word.word}
                      </span>
                      <span className="truncate text-xs text-slate-400">{item.word.definition}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
};
