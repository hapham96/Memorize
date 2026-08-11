'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, BookOpen, Lightbulb, Check } from 'lucide-react';
import { Word, WordCategory, LevelDifficulty } from '@/types';
import { getRelatedWordSuggestions, getWordDetails } from '@/data/relatedWords';
import { soundFX } from '@/lib/audio';
import { addWord } from '@/lib/api/word-client';
import { AddWordRequest } from '@/types/word';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (word: Word) => void;
}

const CATEGORIES: WordCategory[] = [
  'Custom',
  'IELTS',
  'TOEIC',
  'TOEFL',
  'Daily Life',
  'Business',
  'Academic',
  'Travel',
  'Technology',
  'Emotions',
  'Idioms & Phrasal Verbs',
];

const LEVELS: LevelDifficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

interface MeaningDraft {
  id: string;
  definition: string;
  examples: string[];
}

const createMeaning = (): MeaningDraft => ({
  id: `meaning_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  definition: '',
  examples: [''],
});

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onAddWord,
}) => {
  const [word, setWord] = useState('');
  const [ipa, setIpa] = useState('');
  const [pos, setPos] = useState('n.');
  const [meanings, setMeanings] = useState<MeaningDraft[]>([createMeaning()]);
  const [category, setCategory] = useState<WordCategory>('Custom');
  const [level, setLevel] = useState<LevelDifficulty>('B1');
  const [mnemonic, setMnemonic] = useState('');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [autoFilled, setAutoFilled] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (word.trim()) {
      const rel = getRelatedWordSuggestions(word);
      setSuggestions(rel);
    } else {
      setSuggestions(getRelatedWordSuggestions('teacher'));
    }
  }, [word]);

  if (!isOpen) return null;

  const handleSelectSuggestion = (suggestedWord: string) => {
    soundFX.playPop();
    const details = getWordDetails(suggestedWord);
    if (details) {
      setWord(details.word);
      setIpa(details.ipa);
      setPos(details.pos);
      setMeanings((prev) => [
        { ...(prev[0] ?? createMeaning()), definition: details.vietnamese, examples: [details.example] },
        ...prev.slice(1),
      ]);
      setLevel(details.level);

      setAutoFilled(true);
      setTimeout(() => setAutoFilled(false), 2000);
    } else {
      setWord(suggestedWord);
    }
  };

  const handleAddMeaning = () => {
    setMeanings((prev) => [...prev, createMeaning()]);
  };

  const handleRemoveMeaning = (meaningId: string) => {
    setMeanings((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== meaningId) : prev));
  };

  const handleMeaningDefinitionChange = (meaningId: string, value: string) => {
    setMeanings((prev) => prev.map((m) => (m.id === meaningId ? { ...m, definition: value } : m)));
  };

  const handleAddExample = (meaningId: string) => {
    setMeanings((prev) =>
      prev.map((m) => (m.id === meaningId ? { ...m, examples: [...m.examples, ''] } : m))
    );
  };

  const handleRemoveExample = (meaningId: string, exampleIndex: number) => {
    setMeanings((prev) =>
      prev.map((m) =>
        m.id === meaningId && m.examples.length > 1
          ? { ...m, examples: m.examples.filter((_, i) => i !== exampleIndex) }
          : m
      )
    );
  };

  const handleExampleChange = (meaningId: string, exampleIndex: number, value: string) => {
    setMeanings((prev) =>
      prev.map((m) =>
        m.id === meaningId
          ? { ...m, examples: m.examples.map((ex, i) => (i === exampleIndex ? value : ex)) }
          : m
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstDefinition = meanings[0]?.definition.trim();
    if (!word.trim() || !firstDefinition) return;

    setIsSubmitting(true);
    setError('');

    const firstExample = meanings[0]?.examples.map((ex) => ex.trim()).find(Boolean);

    const newWordItem: Word = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: word.trim().toLowerCase(),
      ipa: ipa.trim() || `/${word.trim().toLowerCase()}/`,
      pos: pos || 'n.',
      vietnamese: firstDefinition,
      example: firstExample || `Example with ${word.trim()}.`,
      translation: `Ví dụ với ${word.trim()}.`,
      level,
      category,
      mnemonic: mnemonic.trim() || undefined,
    };

    onAddWord(newWordItem);

    const definitions = meanings
      .filter((m) => m.definition.trim())
      .map((m) => {
        const validExamples = m.examples.map((ex) => ex.trim()).filter(Boolean);
        const examples = validExamples.length > 0 ? validExamples : [`Example with ${word.trim()}.`];
        return {
          definition: m.definition.trim(),
          partOfSpeech: pos,
          examples: examples.map((example) => ({ example, language: 'en' as const })),
        };
      });

    const request: AddWordRequest = {
      userId: 1, // Replace with actual user ID if available
      headword: newWordItem.word,
      ipaPronunciation: newWordItem.ipa,
      definitions,
    };

    const addWordResponse = await addWord(request);
    console.log(addWordResponse);
    soundFX.playCorrect();

    setIsSubmitting(false);
    setError('');
    // Reset form
    setWord('');
    setIpa('');
    setMeanings([createMeaning()]);
    setCategory('Custom');
    setMnemonic('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-800/95 rounded-[32px] p-6 md:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Thêm từ mới (Add Custom Word)
              </h3>
              <p className="text-xs text-slate-500">Tự chọn bộ từ hoặc mặc định là Custom</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Word Input & Smart Suggestions */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Từ Tiếng Anh (English Word) <span className="text-red-500">*</span>
              </label>
              {autoFilled && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5" /> Đã tự động điền từ gợi ý!
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="ví dụ: teacher, doctor, innovate..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Smart Suggestions Chips */}
            {suggestions.length > 0 && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Từ liên quan gợi ý (Smart Related Suggestions):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-blue-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm flex items-center gap-1 active:scale-95"
                    >
                      <span>+ {sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* IPA & Part of Speech */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Phiên âm (IPA)
              </label>
              <input
                type="text"
                value={ipa}
                onChange={(e) => setIpa(e.target.value)}
                placeholder="/ˈtiː.tʃər/"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Từ loại (POS)
              </label>
              <select
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="n.">Danh từ (n.)</option>
                <option value="v.">Động từ (v.)</option>
                <option value="adj.">Tính từ (adj.)</option>
                <option value="adv.">Trạng từ (adv.)</option>
                <option value="phrase">Cụm từ (phrase)</option>
              </select>
            </div>
          </div>

          {/* Meanings (Definitions) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Định nghĩa (English Definition) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddMeaning}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" />
                Thêm nghĩa
              </button>
            </div>

            {meanings.map((meaning, mIndex) => (
              <div
                key={meaning.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Nghĩa {mIndex + 1}
                  </span>
                  {meanings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMeaning(meaning.id)}
                      className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required={mIndex === 0}
                  value={meaning.definition}
                  onChange={(e) => handleMeaningDefinitionChange(meaning.id, e.target.value)}
                  placeholder="ví dụ: a person who teaches, especially in a school"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="space-y-1.5">
                  {meaning.examples.map((ex, eIndex) => (
                    <div key={eIndex} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={ex}
                        onChange={(e) => handleExampleChange(meaning.id, eIndex, e.target.value)}
                        placeholder="Câu ví dụ Tiếng Anh..."
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {meaning.examples.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExample(meaning.id, eIndex)}
                          className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddExample(meaning.id)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + Thêm câu ví dụ
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Category & Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Bộ từ vựng (Category)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WordCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} {cat === 'Custom' ? '(Tự chọn)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Cấp độ (Level)
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LevelDifficulty)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mnemonic / Tip */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Mẹo ghi nhớ (Mnemonic / Tip)</span>
            </label>
            <input
              type="text"
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              placeholder="ví dụ: Tea (trà) + cher (chờ) -> vừa uống trà vừa chờ giáo viên"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Lưu từ mới</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
