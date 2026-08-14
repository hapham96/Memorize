'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Lightbulb,
  Check,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Word, WordCategory, LevelDifficulty } from '@/types';
import { getRelatedWordSuggestions, getWordDetails } from '@/data/relatedWords';
import { soundFX } from '@/lib/audio';
import { addWord, mapAddWordResponseToWord, mapAddWordResponseToSRS } from '@/lib/api/word-client';
import { AddWordRequest } from '@/types/word';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (word: Word) => void;
  onAddWords?: (words: Word[]) => void;
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

interface ParsedWordRow {
  raw: Record<string, any>;
  word: string;
  vietnamese: string;
  definition?: string;
  ipa: string;
  pos: string;
  example: string;
  translation: string;
  category: WordCategory;
  level: LevelDifficulty;
  mnemonic?: string;
  isValid: boolean;
  errorReason?: string;
}

// Download sample Excel template
const downloadSampleExcel = () => {
  soundFX.playPop();
  const sampleData = [
    {
      'Từ tiếng Anh (Word)': 'resilient',
      'Nghĩa tiếng Việt (Vietnamese)': 'kiên cường, phục hồi nhanh',
      'Định nghĩa (Definition)': 'Able to withstand or recover quickly from difficult conditions.',
      'Phiên âm (IPA)': '/rɪˈzɪl.jənt/',
      'Từ loại (POS)': 'adj.',
      'Ví dụ (Example)': 'He is resilient in the face of hardship.',
      'Dịch ví dụ (Translation)': 'Anh ấy rất kiên cường trước khó khăn.',
      'Bộ từ (Category)': 'IELTS',
      'Cấp độ (Level)': 'B2',
      'Mẹo nhớ (Mnemonic)': 'Re + silient -> Lại nổi lên nhẹ nhàng',
    },
    {
      'Từ tiếng Anh (Word)': 'perseverance',
      'Nghĩa tiếng Việt (Vietnamese)': 'sự kiên trì, nhẫn nại',
      'Định nghĩa (Definition)': 'Persistence in doing something despite difficulty or delay.',
      'Phiên âm (IPA)': '/ˌpɜː.sɪˈvɪə.rəns/',
      'Từ loại (POS)': 'n.',
      'Ví dụ (Example)': 'Perseverance is key to success.',
      'Dịch ví dụ (Translation)': 'Sự kiên trì là chìa khóa tới thành công.',
      'Bộ từ (Category)': 'Academic',
      'Cấp độ (Level)': 'C1',
      'Mẹo nhớ (Mnemonic)': 'Per + sever -> Vượt qua khó khăn bằng nhẫn nại',
    },
    {
      'Từ tiếng Anh (Word)': 'ubiquitous',
      'Nghĩa tiếng Việt (Vietnamese)': 'có mặt ở khắp nơi',
      'Định nghĩa (Definition)': 'Present, appearing, or found everywhere.',
      'Phiên âm (IPA)': '/juːˈbɪk.wɪ.təs/',
      'Từ loại (POS)': 'adj.',
      'Ví dụ (Example)': 'Smartphones are ubiquitous today.',
      'Dịch ví dụ (Translation)': 'Điện thoại thông minh hiện có mặt ở khắp mọi nơi.',
      'Bộ từ (Category)': 'TOEIC',
      'Cấp độ (Level)': 'C1',
      'Mẹo nhớ (Mnemonic)': 'U + bi + qui -> Đi đâu cũng quẹo thấy',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 22 }, // Word
    { wch: 32 }, // Vietnamese
    { wch: 45 }, // Definition
    { wch: 18 }, // IPA
    { wch: 12 }, // POS
    { wch: 42 }, // Example
    { wch: 42 }, // Translation
    { wch: 16 }, // Category
    { wch: 10 }, // Level
    { wch: 40 }, // Mnemonic
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Import_Tu_Vung');
  XLSX.writeFile(workbook, 'Memorize_Vocab_Template.xlsx');
};

// Extract field value flexibly matching English & Vietnamese header keys
const getRowVal = (row: Record<string, any>, possibleKeys: string[]): string => {
  const rowKeys = Object.keys(row);
  const normalizedMap = new Map<string, string>();

  for (const key of rowKeys) {
    normalizedMap.set(key.trim().toLowerCase(), key);
  }

  // 1. Try exact match first across all columns
  for (const p of possibleKeys) {
    const targetKey = p.trim().toLowerCase();
    if (normalizedMap.has(targetKey)) {
      const actualKey = normalizedMap.get(targetKey)!;
      const val = row[actualKey];
      if (val !== undefined && val !== null) return String(val).trim();
    }
  }

  // 2. Fallback to substring matching for longer key alias patterns to avoid false positives (e.g. matching 'bộ từ' as 'từ')
  for (const [normKey, actualKey] of normalizedMap.entries()) {
    for (const p of possibleKeys) {
      const targetKey = p.trim().toLowerCase();
      if (targetKey.length > 3 && normKey.includes(targetKey)) {
        const val = row[actualKey];
        if (val !== undefined && val !== null) return String(val).trim();
      }
    }
  }

  return '';
};

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onAddWord,
  onAddWords,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'excel'>('single');

  // Single word form state
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

  // Excel Import state
  const [isDragOver, setIsDragOver] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedWordRow[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetExcelState = () => {
    setExcelFile(null);
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetExcelState();
    }
  }, [isOpen]);

  useEffect(() => {
    if (word.trim()) {
      const rel = getRelatedWordSuggestions(word);
      setSuggestions(rel);
    } else {
      setSuggestions(getRelatedWordSuggestions('teacher'));
    }
  }, [word]);

  if (!isOpen) return null;

  const handleModalClose = () => {
    resetExcelState();
    onClose();
  };

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

    try {
      const addWordResponse = await addWord(request);
      if (addWordResponse?.word && addWordResponse?.userWord) {
        const mappedWord = mapAddWordResponseToWord(addWordResponse, newWordItem);
        const mappedSRS = mapAddWordResponseToSRS(addWordResponse);
        console.log('Successfully added word to backend:', mappedWord, mappedSRS);
      }
    } catch (err) {
      console.error('API addWord error:', err);
    }

    soundFX.playCorrect();

    setIsSubmitting(false);
    setError('');
    // Reset form
    setWord('');
    setIpa('');
    setMeanings([createMeaning()]);
    setCategory('Custom');
    setMnemonic('');
    handleModalClose();
  };

  // Parse uploaded Excel or CSV file
  const processFile = async (file: File) => {
    setExcelFile(file);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

      const parsed: ParsedWordRow[] = rawData.map((row) => {
        const wordVal = getRowVal(row, ['word', 'từ tiếng anh', 'từ vựng', 'tu tieng anh', 'tu vung', 'english']);
        const vnVal = getRowVal(row, ['vietnamese', 'nghĩa tiếng việt', 'nghĩa', 'nghia', 'meaning']);
        const defVal = getRowVal(row, ['definition', 'định nghĩa', 'dịnh nghĩa', 'dinh nghia', 'english definition', 'diễn giải']);
        const ipaVal = getRowVal(row, ['ipa', 'phiên âm', 'phien am']);
        const posVal = getRowVal(row, ['pos', 'từ loại', 'tu loai', 'part of speech']);
        const exVal = getRowVal(row, ['example', 'ví dụ', 'vi du', 'câu ví dụ']);
        const trVal = getRowVal(row, ['translation', 'dịch', 'dich', 'dịch câu ví dụ']);
        const catVal = getRowVal(row, ['category', 'bộ từ', 'bo tu', 'danh mục']);
        const lvlVal = getRowVal(row, ['level', 'cấp độ', 'cap do', 'trình độ']);
        const mneVal = getRowVal(row, ['mnemonic', 'mẹo nhớ', 'meo nho', 'ghi nhớ']);

        const isValidWord = wordVal.length > 0;
        const isValidVn = vnVal.length > 0;
        const isValid = isValidWord && isValidVn;

        let errorReason = '';
        if (!isValidWord && !isValidVn) {
          errorReason = 'Thiếu cả từ tiếng Anh và Nghĩa tiếng Việt';
        } else if (!isValidWord) {
          errorReason = 'Thiếu Từ tiếng Anh';
        } else if (!isValidVn) {
          errorReason = 'Thiếu Nghĩa tiếng Việt';
        }

        // Validate Category
        let finalCat: WordCategory = 'Custom';
        const matchedCat = CATEGORIES.find(
          (c) => c.toLowerCase() === catVal.toLowerCase()
        );
        if (matchedCat) finalCat = matchedCat;

        // Validate Level
        let finalLvl: LevelDifficulty = 'B1';
        const matchedLvl = LEVELS.find((l) => l.toLowerCase() === lvlVal.toLowerCase());
        if (matchedLvl) finalLvl = matchedLvl;

        return {
          raw: row,
          word: wordVal.toLowerCase(),
          vietnamese: vnVal,
          definition: defVal || undefined,
          ipa: ipaVal || `/${wordVal.toLowerCase()}/`,
          pos: posVal || 'n.',
          example: exVal || (wordVal ? `Example with ${wordVal}.` : ''),
          translation: trVal || (wordVal ? `Ví dụ với ${wordVal}.` : ''),
          category: finalCat,
          level: finalLvl,
          mnemonic: mneVal || undefined,
          isValid,
          errorReason,
        };
      });

      setParsedRows(parsed);
      soundFX.playPop();
    } catch (err) {
      console.error('Error parsing Excel file:', err);
      alert('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleBulkSubmit = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    const newWordsList: Word[] = validRows.map((r, index) => ({
      id: `custom_import_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
      word: r.word,
      vietnamese: r.vietnamese,
      definition: r.definition,
      ipa: r.ipa,
      pos: r.pos,
      example: r.example,
      translation: r.translation,
      category: r.category,
      level: r.level,
      mnemonic: r.mnemonic,
    }));

    if (onAddWords) {
      onAddWords(newWordsList);
    } else {
      newWordsList.forEach((w) => onAddWord(w));
    }

    soundFX.playCorrect();
    handleModalClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
      <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-800/95 rounded-[32px] p-5 md:p-7 shadow-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4 animate-scaleUp max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100">
                Thêm từ vựng mới
              </h3>
              <p className="text-xs text-slate-500">
                Thêm từng từ hoặc Import hàng loạt bằng Excel / CSV
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'single'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Thêm 1 từ thủ công</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'excel'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Import từ Excel / CSV</span>
          </button>
        </div>

        {/* TAB 1: Single Word Form */}
        {activeTab === 'single' && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
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
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu từ mới'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Excel Import Form */}
        {activeTab === 'excel' && (
          <div className="space-y-4 pt-1">
            {/* Quick Action Bar & Guide Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    File mẫu Excel chuẩn (.xlsx)
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Tải file mẫu có sẵn tiêu đề & từ ví dụ
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-slate-700 hover:bg-emerald-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showGuide ? 'Ẩn hướng dẫn' : 'Xem hướng dẫn'}</span>
                  {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={downloadSampleExcel}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file mẫu Excel</span>
                </button>
              </div>
            </div>

            {/* Instruction Guide Accordion */}
            {showGuide && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3 animate-fadeIn text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Hướng dẫn định dạng file Excel / CSV chính xác</span>
                  </h5>
                </div>

                <p className="leading-relaxed">
                  File Excel cần chứa dòng đầu tiên là <span className="font-bold text-blue-600 dark:text-blue-400">Tiêu đề cột (Header)</span>. Bạn có thể dùng tên cột tiếng Anh hoặc tiếng Việt (không phân biệt chữ hoa/thường):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <span className="text-red-500 font-bold">*</span> Word / Từ tiếng Anh
                    </div>
                    <p className="text-slate-500">Từ vựng cần học (Ví dụ: <code className="text-blue-600 dark:text-blue-400">opportunity</code>)</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <span className="text-red-500 font-bold">*</span> Vietnamese / Nghĩa tiếng Việt
                    </div>
                    <p className="text-slate-500">Nghĩa tiếng Việt (Ví dụ: <code className="text-blue-600 dark:text-blue-400">cơ hội</code>)</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Definition / Định nghĩa
                    </div>
                    <p className="text-slate-500">Định nghĩa tiếng Anh (Không bắt buộc)</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      IPA / Phiên âm
                    </div>
                    <p className="text-slate-500">Không bắt buộc (Tự tạo nếu trống)</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      POS / Từ loại
                    </div>
                    <p className="text-slate-500"><code className="text-emerald-600">n.</code>, <code className="text-emerald-600">v.</code>, <code className="text-emerald-600">adj.</code>, <code className="text-emerald-600">adv.</code>, <code className="text-emerald-600">phrase</code> (Default: n.)</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Example / Câu ví dụ
                    </div>
                    <p className="text-slate-500">Câu ví dụ tiếng Anh</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Translation / Dịch câu ví dụ
                    </div>
                    <p className="text-slate-500">Bản dịch nghĩa câu ví dụ</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Category / Bộ từ
                    </div>
                    <p className="text-slate-500">IELTS, TOEIC, Daily Life, Academic, Custom...</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Level / Cấp độ & Mnemonic
                    </div>
                    <p className="text-slate-500">A1, A2, B1, B2, C1 & Mẹo ghi nhớ từ</p>
                  </div>
                </div>
              </div>
            )}

            {/* Dropzone File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {!excelFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-3xl cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 scale-[0.99]'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-blue-400'
                }`}
              >
                <div className="p-3.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Kéo thả file Excel (.xlsx, .xls) hoặc CSV vào đây
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Hoặc bấm vào để duyệt file từ máy tính của bạn
                  </p>
                </div>
                <div className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                  Hỗ trợ: .xlsx, .xls, .csv
                </div>
              </div>
            ) : (
              /* Selected File Summary & Re-upload */
              <div className="p-3.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {excelFile.name}
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      {(excelFile.size / 1024).toFixed(1)} KB • {parsedRows.length} dòng dữ liệu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetExcelState}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Chọn file khác</span>
                </button>
              </div>
            )}

            {/* Parsed Rows Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                {/* Stats Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kết quả xem trước ({parsedRows.length} bản ghi):
                  </span>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {validCount} hợp lệ
                    </span>
                    {invalidCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {invalidCount} lỗi / bỏ qua
                      </span>
                    )}
                  </div>
                </div>

                {/* Table Box */}
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-3">STT</th>
                        <th className="py-2 px-3">Từ (Word)</th>
                        <th className="py-2 px-3">Nghĩa tiếng Việt</th>
                        <th className="py-2 px-3">POS</th>
                        <th className="py-2 px-3">Bộ từ</th>
                        <th className="py-2 px-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {parsedRows.slice(0, 50).map((row, index) => (
                        <tr
                          key={index}
                          className={
                            !row.isValid
                              ? 'bg-red-50/60 dark:bg-red-950/20 text-red-900 dark:text-red-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }
                        >
                          <td className="py-2 px-3 font-medium text-slate-400">{index + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {row.word || <span className="text-red-500 italic">(Trống)</span>}
                          </td>
                          <td className="py-2 px-3 font-medium">
                            {row.vietnamese || <span className="text-red-500 italic">(Trống)</span>}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                            {row.pos}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-200 dark:border-blue-800">
                              {row.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Hợp lệ
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400"
                                title={row.errorReason}
                              >
                                <AlertCircle className="w-3.5 h-3.5" /> {row.errorReason}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 50 && (
                  <p className="text-center text-[11px] text-slate-500 font-medium pt-1">
                    Đang hiển thị xem trước 50 / {parsedRows.length} từ vựng. Tất cả {validCount} từ hợp lệ sẽ được import.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={validCount === 0}
                onClick={handleBulkSubmit}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  validCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 active:scale-98 cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-700 opacity-60 cursor-not-allowed'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Import {validCount} từ hợp lệ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
