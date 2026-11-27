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

/** The words behind the two shortcut chips. */
export interface ShortcutWords {
  favorites: string[];
  oftenMissedIds: number[];
}

export function isWordChosen(
  selection: WordSelection,
  item: UserWordListItem,
  { favorites, oftenMissedIds }: ShortcutWords,
): boolean {
  const id = Number(item.word.id);
  if (selection.excludedIds.has(id)) return false;
  return (
    selection.wordIds.has(id) ||
    (item.vocabularySetId !== undefined && selection.setIds.has(item.vocabularySetId)) ||
    (selection.favorites && favorites.includes(String(id))) ||
    (selection.oftenMissed && oftenMissedIds.includes(id))
  );
}

interface WordPickerProps {
  /** Words the server knows. */
  items: UserWordListItem[];
  vocabularySets: VocabularySet[];
  shortcuts: ShortcutWords;
  selection: WordSelection;
  onChange: (selection: WordSelection) => void;
}

export const WordPicker: React.FC<WordPickerProps> = ({
  items,
  vocabularySets,
  shortcuts,
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
    if (isWordChosen(selection, item, shortcuts)) {
      next.wordIds.delete(id);
      next.excludedIds.add(id);
    } else {
      next.excludedIds.delete(id);
      if (!isWordChosen(next, item, shortcuts)) next.wordIds.add(id);
    }
    onChange(next);
  };

  // What the shortcut chips brought in, listed by name: inside a large set
  // they could not be told apart.
  const shortcutLists = [
    {
      title: 'Yêu thích',
      isOn: selection.favorites,
      words: items.filter((item) => shortcuts.favorites.includes(String(item.word.id))),
    },
    {
      title: 'Từ hay sai',
      isOn: selection.oftenMissed,
      words: items.filter((item) => shortcuts.oftenMissedIds.includes(Number(item.word.id))),
    },
  ].filter((list) => list.isOn && list.words.length > 0);

  return (
    <ul className="space-y-1.5">
      {shortcutLists.map((list) => (
        <li key={list.title}>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{list.title}</p>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {list.words.map((item) => {
              const isChosen = isWordChosen(selection, item, shortcuts);
              return (
                <button
                  key={String(item.word.id)}
                  type="button"
                  aria-pressed={isChosen}
                  onClick={() => toggleWord(item)}
                  title={item.word.definition}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 ${
                    isChosen
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                  }`}
                >
                  {item.word.word}
                </button>
              );
            })}
          </div>
        </li>
      ))}
      {Array.from(groups, ([setId, words]) => {
        const name = vocabularySets.find((set) => set.id === setId)?.name ?? 'Bộ từ';
        const chosen = words.filter((item) => isWordChosen(selection, item, shortcuts)).length;
        const isWhole = selection.setIds.has(setId) && chosen === words.length;
        const SetIcon = isWhole ? CheckSquare : chosen > 0 ? MinusSquare : Square;
        const isOpen = openId === setId;
        return (
          <li
            key={setId}
            className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
          >
            {/* The box ticks the whole set; the rest of the row opens it. */}
            <div className="flex items-center">
              <button
                type="button"
                role="checkbox"
                aria-checked={isWhole ? true : chosen > 0 ? 'mixed' : false}
                aria-label={`Chọn cả bộ ${name}`}
                onClick={() => toggleSet(setId, words, isWhole)}
                className="shrink-0 p-3"
              >
                <SetIcon className={`w-5 h-5 ${chosen > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
              </button>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : setId)}
                aria-expanded={isOpen}
                className="min-w-0 flex-1 flex items-center gap-2 py-3 pr-3 text-left select-none"
              >
                <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {name}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {chosen}/{words.length}
                </span>
                <span className="ml-auto shrink-0 text-slate-500">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
              </button>
            </div>
            {isOpen && (
              <ul className="max-h-56 overflow-y-auto border-t-2 border-slate-200 dark:border-slate-700 p-1.5">
                {words.map((item) => (
                  <li key={String(item.word.id)}>
                    <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWordChosen(selection, item, shortcuts)}
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
