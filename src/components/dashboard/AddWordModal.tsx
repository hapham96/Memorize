'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, BookOpen, Lightbulb, Check } from 'lucide-react';
import { Word, WordCategory, LevelDifficulty } from '@/types';
import { getRelatedWordSuggestions, getWordDetails } from '@/data/relatedWords';
import { soundFX } from '@/lib/audio';

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

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onAddWord,
}) => {
  const [word, setWord] = useState('');
  const [ipa, setIpa] = useState('');
  const [pos, setPos] = useState('n.');
  const [vietnamese, setVietnamese] = useState('');
  const [example, setExample] = useState('');
  const [translation, setTranslation] = useState('');
  const [category, setCategory] = useState<WordCategory>('Custom');
  const [level, setLevel] = useState<LevelDifficulty>('B1');
  const [mnemonic, setMnemonic] = useState('');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [autoFilled, setAutoFilled] = useState(false);

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
      setVietnamese(details.vietnamese);
      setExample(details.example);
      setTranslation(details.translation);
      setLevel(details.level);

      setAutoFilled(true);
      setTimeout(() => setAutoFilled(false), 2000);
    } else {
      setWord(suggestedWord);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !vietnamese.trim()) return;

    const newWordItem: Word = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: word.trim().toLowerCase(),
      ipa: ipa.trim() || `/${word.trim().toLowerCase()}/`,
      pos: pos || 'n.',
      vietnamese: vietnamese.trim(),
      example: example.trim() || `Example with ${word.trim()}.`,
      translation: translation.trim() || `Ví dụ với ${word.trim()}.`,
      level,
      category,
      mnemonic: mnemonic.trim() || undefined,
    };

    onAddWord(newWordItem);
    soundFX.playCorrect();

    // Reset form
    setWord('');
    setIpa('');
    setVietnamese('');
    setExample('');
    setTranslation('');
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

          {/* Vietnamese Meaning */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nghĩa Tiếng Việt <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={vietnamese}
              onChange={(e) => setVietnamese(e.target.value)}
              placeholder="ví dụ: giáo viên, thầy cô giáo"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Example Sentence & Translation */}
          <div className="space-y-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Câu ví dụ Tiếng Anh
              </label>
              <input
                type="text"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="She is a great teacher."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Dịch câu ví dụ
              </label>
              <input
                type="text"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="Cô ấy là một giáo viên tuyệt vời."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
