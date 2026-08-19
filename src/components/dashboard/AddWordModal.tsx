"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Category,
  SRSData,
  Word,
  WordCategory,
  WordMeaning,
  LevelDifficulty,
} from "@/types";
import { getRelatedWordSuggestions, getWordDetails } from "@/data/relatedWords";
import { soundFX } from "@/lib/audio";
import {
  addWord,
  mapAddWordResponseToWord,
  mapAddWordResponseToSRS,
} from "@/lib/api/word-client";
import { FALLBACK_CATEGORY, categoryNames } from "@/lib/api/category-client";
import {
  fetchWordDictionary,
  generateWordExample,
  WordSuggestion,
  DictionaryEntry,
} from "@/lib/api/dictionary-client";
import { getCurrentUserId } from "@/lib/api/auth-client";
import { AddWordRequest } from "@/types/word";
import { ModalPortal } from "@/components/layout/ModalPortal";

interface AddWordModalProps {
  isOpen: boolean;
  /** The account's `/categories` list; fills the category picker and validates Excel rows. */
  categories?: Category[];
  onClose: () => void;
  onAddWord: (word: Word) => void;
  onAddWords?: (words: Word[]) => void;
  /** Replaces the optimistic local entry once the backend assigns a real id. */
  onWordSynced?: (localId: string, word: Word, srs: SRSData) => void;
}

const LEVELS: LevelDifficulty[] = ["A1", "A2", "B1", "B2", "C1"];

interface MeaningDraft {
  id: string;
  definition: string;
  examples: string[];
}

/** Datamuse tags each def with a POS up front, tab-separated: `"v\tTo bar someone..."`. */
const DATAMUSE_POS: Record<string, string> = {
  n: "n.",
  v: "v.",
  adj: "adj.",
  adv: "adv.",
  u: "",
};

const parseDatamuseDef = (raw: string): { pos: string; definition: string } => {
  const [tag, ...rest] = raw.split("\t");
  const text = rest.join(" ").trim();
  if (!text) return { pos: "", definition: raw.trim() };
  return { pos: DATAMUSE_POS[tag.trim()] ?? "", definition: text };
};

const createMeaning = (): MeaningDraft => ({
  id: `meaning_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  definition: "",
  examples: [""],
});

/**
 * `Example with <word>.` is the filler the app writes when nothing real is available. It is not a
 * sentence anyone wants to study, so it counts as "no example" — the AI button stays offered and
 * the generated sentence overwrites it instead of being appended below it.
 */
const isPlaceholderExample = (text: string, headword: string): boolean => {
  const value = text.trim().toLowerCase();
  if (!value) return true;
  return value === `example with ${headword.trim().toLowerCase()}.`;
};

/** Short label shown after each definition when a word has several parts of speech: `... (v)`. */
const POS_SHORT: Record<string, string> = {
  noun: "n",
  verb: "v",
  "modal verb": "modal v",
  "auxiliary verb": "aux v",
  "phrasal verb": "phr v",
  adjective: "adj",
  adverb: "adv",
  pronoun: "pron",
  preposition: "prep",
  conjunction: "conj",
  determiner: "det",
  interjection: "interj",
  exclamation: "excl",
  article: "art",
  numeral: "num",
  number: "num",
  abbreviation: "abbr",
  prefix: "pref",
  suffix: "suf",
  idiom: "idiom",
  phrase: "phrase",
};

const shortPos = (raw?: string): string => {
  const key = (raw ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!key) return "";
  return POS_SHORT[key] ?? key;
};

/** `POST /words/example` takes the full part of speech (`adjective`) — the inverse of `POS_SHORT`. */
const POS_FULL: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  prep: "preposition",
};

const fullPos = (raw?: string): string => {
  const key = (raw ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!key) return "noun";
  return POS_FULL[key] ?? key;
};

/** a line in  `/words/dictionary/:word` return. */
interface DefinitionOption {
  id: string;
  definition: string;
  example?: string;
  posLabel: string; // can be empty
}

/** Flattens `meanings[].definitions[]` into one list, labelling the POS when there is >1 of them. */
const buildDefinitionOptions = (entry: DictionaryEntry): DefinitionOption[] => {
  const meaningsList = entry.meanings ?? [];
  const posVariants = new Set(
    meaningsList.map((m) => shortPos(m.partOfSpeech)).filter(Boolean),
  );
  const showPos = posVariants.size > 1;

  const options: DefinitionOption[] = [];
  meaningsList.forEach((meaning, mIdx) => {
    (meaning.definitions ?? []).forEach((def, dIdx) => {
      const text = def.definition?.trim();
      if (!text) return;
      options.push({
        id: `dict_${mIdx}_${dIdx}`,
        definition: text,
        example: def.example?.trim() || undefined,
        posLabel: showPos ? shortPos(meaning.partOfSpeech) : "",
      });
    });
  });
  return options;
};

/** Fallback when `/words/dictionary` fails — word search already carries `defs` as `"v\tto whistle..."`. */
const buildDefinitionOptionsFromDefs = (defs: string[]): DefinitionOption[] => {
  const parsed = defs.map(parseDatamuseDef).filter((p) => p.definition);
  const posVariants = new Set(
    parsed.map((p) => shortPos(p.pos)).filter(Boolean),
  );
  const showPos = posVariants.size > 1;

  return parsed.map((p, idx) => ({
    id: `defs_${idx}`,
    definition: p.definition,
    posLabel: showPos ? shortPos(p.pos) : "",
  }));
};

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
      "Từ tiếng Anh (Word)": "resilient",
      "Nghĩa tiếng Việt (Vietnamese)": "kiên cường, phục hồi nhanh",
      "Định nghĩa (Definition)":
        "Able to withstand or recover quickly from difficult conditions.",
      "Phiên âm (IPA)": "/rɪˈzɪl.jənt/",
      "Từ loại (POS)": "adj.",
      "Ví dụ (Example)": "He is resilient in the face of hardship.",
      "Dịch ví dụ (Translation)": "Anh ấy rất kiên cường trước khó khăn.",
      "Bộ từ (Category)": "IELTS",
      "Cấp độ (Level)": "B2",
      "Mẹo nhớ (Mnemonic)": "Re + silient -> Lại nổi lên nhẹ nhàng",
    },
    {
      "Từ tiếng Anh (Word)": "perseverance",
      "Nghĩa tiếng Việt (Vietnamese)": "sự kiên trì, nhẫn nại",
      "Định nghĩa (Definition)":
        "Persistence in doing something despite difficulty or delay.",
      "Phiên âm (IPA)": "/ˌpɜː.sɪˈvɪə.rəns/",
      "Từ loại (POS)": "n.",
      "Ví dụ (Example)": "Perseverance is key to success.",
      "Dịch ví dụ (Translation)": "Sự kiên trì là chìa khóa tới thành công.",
      "Bộ từ (Category)": "Academic",
      "Cấp độ (Level)": "C1",
      "Mẹo nhớ (Mnemonic)": "Per + sever -> Vượt qua khó khăn bằng nhẫn nại",
    },
    {
      "Từ tiếng Anh (Word)": "ubiquitous",
      "Nghĩa tiếng Việt (Vietnamese)": "có mặt ở khắp nơi",
      "Định nghĩa (Definition)": "Present, appearing, or found everywhere.",
      "Phiên âm (IPA)": "/juːˈbɪk.wɪ.təs/",
      "Từ loại (POS)": "adj.",
      "Ví dụ (Example)": "Smartphones are ubiquitous today.",
      "Dịch ví dụ (Translation)":
        "Điện thoại thông minh hiện có mặt ở khắp mọi nơi.",
      "Bộ từ (Category)": "TOEIC",
      "Cấp độ (Level)": "C1",
      "Mẹo nhớ (Mnemonic)": "U + bi + qui -> Đi đâu cũng quẹo thấy",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet["!cols"] = [
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
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mau_Import_Tu_Vung");
  XLSX.writeFile(workbook, "Memorize_Vocab_Template.xlsx");
};

// Extract field value flexibly matching English & Vietnamese header keys
const getRowVal = (
  row: Record<string, any>,
  possibleKeys: string[],
): string => {
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

  return "";
};

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  categories = [],
  onClose,
  onAddWord,
  onAddWords,
  onWordSynced,
}) => {
  const [activeTab, setActiveTab] = useState<"single" | "excel">("single");

  // The backend list when it has loaded, the shipped names until then.
  const CATEGORIES: WordCategory[] = useMemo(
    () => categoryNames(categories),
    [categories],
  );

  // Single word form state
  const [word, setWord] = useState("");
  const [ipa, setIpa] = useState("");
  const [pos, setPos] = useState("n.");
  const [meanings, setMeanings] = useState<MeaningDraft[]>([createMeaning()]);
  const [category, setCategory] = useState<WordCategory>(FALLBACK_CATEGORY);
  const [level, setLevel] = useState<LevelDifficulty>("B1");
  const [mnemonic, setMnemonic] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Every definition of the word just picked (from `/words/dictionary/:word`), so the user
  // chooses which meanings to save.
  const [definitionOptions, setDefinitionOptions] = useState<
    DefinitionOption[]
  >([]);
  const [lookedUpWord, setLookedUpWord] = useState("");
  // Datamuse returns `defs` alongside when `md=d` is set — cache them to auto-fill if
  // dictionaryapi.dev fails.
  const datamuseDefsRef = useRef<Record<string, string[]>>({});
  const [autoFilled, setAutoFilled] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  // Id of the meaning waiting on `POST /words/example` — only one request at a time.
  const [generatingExampleId, setGeneratingExampleId] = useState<string | null>(
    null,
  );
  // Keyed per meaning, otherwise one failure renders under every meaning block.
  const [exampleError, setExampleError] = useState<{
    meaningId: string;
    message: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetExcelState();
      setDefinitionOptions([]);
      setLookedUpWord("");
      setExampleError(null);
    }
  }, [isOpen]);

  const cacheDatamuseDefs = (items: WordSuggestion[]) => {
    items.forEach((item) => {
      if (item.defs?.length) {
        datamuseDefsRef.current[item.word.toLowerCase()] = item.defs;
      }
    });
  };

  /** Fetches the defs for exactly one word — for when the cache has none because the user typed
   *  the word instead of picking a suggestion. */
  const fetchDatamuseDefs = async (target: string): Promise<string[]> => {
    const cached = datamuseDefsRef.current[target.toLowerCase()];
    if (cached?.length) return cached;

    try {
      const res = await fetch(
        `https://api.datamuse.com/words?sp=${encodeURIComponent(target)}&md=d&max=1`,
      );
      if (!res.ok) return [];
      const data: WordSuggestion[] = await res.json();
      if (!Array.isArray(data)) return [];
      cacheDatamuseDefs(data);
      const hit = data.find(
        (item) => item.word.toLowerCase() === target.toLowerCase(),
      );
      return hit?.defs ?? [];
    } catch (err) {
      console.warn("Datamuse defs fetch error:", err);
      return [];
    }
  };

  // Fetch Datamuse suggestions when user types prefix (e.g. "bea" -> "bea", "bean", "beautiful")
  useEffect(() => {
    const trimmed = word.trim();
    if (!trimmed) {
      setSuggestions([
        "teacher",
        "beautiful",
        "innovate",
        "generous",
        "perseverance",
      ]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://api.datamuse.com/words?sp=${encodeURIComponent(trimmed)}*&max=8&md=d`,
        );
        const data: WordSuggestion[] = res.ok ? await res.json() : [];
        if (Array.isArray(data) && data.length > 0) {
          cacheDatamuseDefs(data);
          // Put exact prefix first if present, followed by suggestions
          const wordsList = data.map((item) => item.word);
          setSuggestions(Array.from(new Set(wordsList)));
        } else {
          setSuggestions(getRelatedWordSuggestions(trimmed));
        }
      } catch (err) {
        console.warn("Datamuse API error:", err);
        setSuggestions(getRelatedWordSuggestions(trimmed));
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [word]);

  if (!isOpen) return null;

  const handleModalClose = () => {
    resetExcelState();
    onClose();
  };

  const mapPartOfSpeech = (posStr?: string): string => {
    if (!posStr) return "n.";
    const lower = posStr.toLowerCase();
    if (lower.includes("noun") || lower === "n") return "n.";
    if (lower.includes("verb") || lower === "v") return "v.";
    if (lower.includes("adj") || lower.includes("adjective")) return "adj.";
    if (lower.includes("adv") || lower.includes("adverb")) return "adv.";
    if (lower.includes("prep") || lower.includes("preposition")) return "prep.";
    return "n.";
  };

  const handleSelectSuggestion = async (suggestedWord: string) => {
    soundFX.playPop();
    setWord(suggestedWord);
    setIsLoadingDetails(true);
    setDefinitionOptions([]);
    setLookedUpWord(suggestedWord);
    setExampleError(null);

    let options: DefinitionOption[] = [];
    const localDetails = getWordDetails(suggestedWord);
    let fetchedIpa = localDetails?.ipa || "";
    let fetchedPos = localDetails?.pos || "n.";
    let fetchedDef = localDetails?.vietnamese || "";
    let fetchedExample = localDetails?.example || "";
    let fetchedLevel = localDetails?.level || "B1";

    try {
      const data = await fetchWordDictionary(suggestedWord);
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        options = buildDefinitionOptions(entry);

        if (!fetchedIpa) {
          fetchedIpa =
            entry.phonetic ||
            entry.phonetics?.find((p) => p.text)?.text ||
            `/${suggestedWord}/`;
        }

        if (entry.meanings && entry.meanings.length > 0) {
          const firstMeaning = entry.meanings[0];
          if (!localDetails) {
            fetchedPos = mapPartOfSpeech(firstMeaning.partOfSpeech);
          }

          if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
            const firstDef = firstMeaning.definitions[0];
            if (!fetchedDef) {
              fetchedDef = firstDef.definition || "";
            }
            if (!fetchedExample && firstDef.example) {
              fetchedExample = firstDef.example;
            }
          }
        }
      }
    } catch (err) {
      console.warn("Dictionary API fetch error:", err);
    }

    // The backend dictionary lookup fails often (rate limits) — Datamuse already has defs + POS.
    if (!fetchedDef || options.length === 0) {
      const defs = await fetchDatamuseDefs(suggestedWord);
      if (defs.length > 0) {
        if (options.length === 0) {
          options = buildDefinitionOptionsFromDefs(defs);
        }
        const { pos: datamusePos, definition } = parseDatamuseDef(defs[0]);
        if (!fetchedDef) {
          fetchedDef = definition;
        }
        if (!localDetails && datamusePos) {
          fetchedPos = datamusePos;
        }
      }
    }

    setDefinitionOptions(options);
    setIsLoadingDetails(false);

    setIpa(fetchedIpa || `/${suggestedWord}/`);
    setPos(fetchedPos);
    setMeanings((prev) => [
      {
        ...(prev[0] ?? createMeaning()),
        definition: fetchedDef || `Nghĩa của ${suggestedWord}`,
        // Leave it blank when the dictionary has no example — blank is what surfaces the AI button.
        examples: [fetchedExample],
      },
      ...prev.slice(1),
    ]);
    setLevel(fetchedLevel as LevelDifficulty);

    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 3000);
  };

  const isDefinitionPicked = (text: string) =>
    meanings.some(
      (m) => m.definition.trim().toLowerCase() === text.trim().toLowerCase(),
    );

  /** Tapping a looked-up definition adds it to / removes it from the meanings that will be saved. */
  const handleToggleDefinition = (option: DefinitionOption) => {
    soundFX.playPop();
    const key = option.definition.trim().toLowerCase();

    setMeanings((prev) => {
      const existingIdx = prev.findIndex(
        (m) => m.definition.trim().toLowerCase() === key,
      );
      if (existingIdx >= 0) {
        // Always keep at least one meaning field so the form is never completely empty.
        return prev.length === 1
          ? [createMeaning()]
          : prev.filter((_, i) => i !== existingIdx);
      }

      const filled = {
        definition: option.definition,
        examples: [option.example || ""],
      };
      const emptyIdx = prev.findIndex((m) => !m.definition.trim());
      if (emptyIdx >= 0) {
        return prev.map((m, i) => (i === emptyIdx ? { ...m, ...filled } : m));
      }
      return [...prev, { ...createMeaning(), ...filled }];
    });
  };

  const handleAddMeaning = () => {
    setMeanings((prev) => [...prev, createMeaning()]);
  };

  const handleRemoveMeaning = (meaningId: string) => {
    setMeanings((prev) =>
      prev.length > 1 ? prev.filter((m) => m.id !== meaningId) : prev,
    );
  };

  const handleMeaningDefinitionChange = (meaningId: string, value: string) => {
    setMeanings((prev) =>
      prev.map((m) => (m.id === meaningId ? { ...m, definition: value } : m)),
    );
  };

  const handleAddExample = (meaningId: string) => {
    setMeanings((prev) =>
      prev.map((m) =>
        m.id === meaningId ? { ...m, examples: [...m.examples, ""] } : m,
      ),
    );
  };

  const handleRemoveExample = (meaningId: string, exampleIndex: number) => {
    setMeanings((prev) =>
      prev.map((m) =>
        m.id === meaningId && m.examples.length > 1
          ? { ...m, examples: m.examples.filter((_, i) => i !== exampleIndex) }
          : m,
      ),
    );
  };

  const handleExampleChange = (
    meaningId: string,
    exampleIndex: number,
    value: string,
  ) => {
    setMeanings((prev) =>
      prev.map((m) =>
        m.id === meaningId
          ? {
              ...m,
              examples: m.examples.map((ex, i) =>
                i === exampleIndex ? value : ex,
              ),
            }
          : m,
      ),
    );
  };

  /** The button only shows when this meaning has no example at all — either the dictionary
   *  returned none, or the user cleared every field. */
  const handleGenerateExample = async (meaning: MeaningDraft) => {
    const targetWord = word.trim();
    if (!targetWord || generatingExampleId) return;

    // A definition sharpens the request but is not required. When this meaning has none, borrow
    // the first definition the lookup returned so `meaning` still says which sense to write for.
    const definition =
      meaning.definition.trim() ||
      definitionOptions
        .find((option) => option.definition.trim())
        ?.definition.trim() ||
      "";

    soundFX.playPop();
    setGeneratingExampleId(meaning.id);
    setExampleError(null);

    try {
      const example = await generateWordExample({
        word: targetWord.toLowerCase(),
        meaning: definition,
        partOfSpeech: fullPos(pos),
        cefrLevel: level,
      });

      if (!example) {
        setExampleError({
          meaningId: meaning.id,
          message: "AI chưa trả về câu ví dụ nào — thử lại nhé.",
        });
        return;
      }

      // Fill the first empty (or filler) example input; never overwrite a sentence the user typed.
      setMeanings((prev) =>
        prev.map((m) => {
          if (m.id !== meaning.id) return m;
          const emptyIdx = m.examples.findIndex((ex) =>
            isPlaceholderExample(ex, targetWord),
          );
          return emptyIdx >= 0
            ? {
                ...m,
                examples: m.examples.map((ex, i) =>
                  i === emptyIdx ? example : ex,
                ),
              }
            : { ...m, examples: [...m.examples, example] };
        }),
      );
    } catch (err) {
      console.warn("Generate example API error:", err);
      setExampleError({
        meaningId: meaning.id,
        // With no definition to send, a rejection is most likely the API refusing an empty
        // `meaning` — point at that instead of a dead-end "try again later".
        message: definition
          ? "Không tạo được câu ví dụ. Thử lại sau nhé."
          : "Nhập định nghĩa trước để AI viết được ví dụ đúng nghĩa nhé.",
      });
    } finally {
      setGeneratingExampleId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstDefinition = meanings[0]?.definition.trim();
    if (!word.trim() || !firstDefinition) return;

    setIsSubmitting(true);
    setError("");

    const firstExample = meanings[0]?.examples
      .map((ex) => ex.trim())
      .find((ex) => !isPlaceholderExample(ex, word));

    // Every meaning the form holds, so the review card can page through them
    // right away instead of waiting for the backend copy to come back.
    const wordMeanings: WordMeaning[] = meanings
      .filter((m) => m.definition.trim())
      .map((m) => ({
        pos: pos || "n.",
        definition: m.definition.trim(),
        example:
          m.examples
            .map((ex) => ex.trim())
            .find((ex) => !isPlaceholderExample(ex, word)) || "",
        translation: "",
      }));

    const newWordItem: Word = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: word.trim().toLowerCase(),
      ipa: ipa.trim() || `/${word.trim().toLowerCase()}/`,
      pos: pos || "n.",
      vietnamese: firstDefinition,
      example: firstExample || "",
      translation: `Ví dụ với ${word.trim()}.`,
      meanings: wordMeanings,
      level,
      category,
      mnemonic: mnemonic.trim() || undefined,
    };

    onAddWord(newWordItem);

    const definitions = meanings
      .filter((m) => m.definition.trim())
      .map((m) => {
        // Send only real sentences — filler stored on the account reads back as a genuine
        // example forever after, and hides the "generate with AI" button next time.
        const validExamples = m.examples
          .map((ex) => ex.trim())
          .filter((ex) => !isPlaceholderExample(ex, word));
        return {
          definition: m.definition.trim(),
          partOfSpeech: pos,
          examples: validExamples.map((example) => ({
            example,
            language: "en" as const,
          })),
        };
      });

    const userId = getCurrentUserId();

    try {
      // Without a numeric account id the word can only live locally — sending
      // the request anyway would file it under someone else's account.
      if (userId === null) throw new Error("No signed-in user id available");

      const request: AddWordRequest = {
        userId,
        headword: newWordItem.word,
        ipaPronunciation: newWordItem.ipa,
        definitions,
      };

      const addWordResponse = await addWord(request);
      if (addWordResponse?.word && addWordResponse?.userWord) {
        // The optimistic entry above carries a local-only id, so the backend's
        // id and `dueAt` have to replace it — otherwise the same word exists
        // twice (locally as `custom_…`, remotely as a number) and nothing that
        // keys off the backend id, review reminders included, can find it.
        onWordSynced?.(
          newWordItem.id,
          mapAddWordResponseToWord(addWordResponse, newWordItem),
          mapAddWordResponseToSRS(addWordResponse),
        );
      }
    } catch (err) {
      console.error("API addWord error:", err);
    }

    soundFX.playCorrect();

    setIsSubmitting(false);
    setError("");
    // Reset form
    setWord("");
    setIpa("");
    setDefinitionOptions([]);
    setLookedUpWord("");
    setMeanings([createMeaning()]);
    setCategory(FALLBACK_CATEGORY);
    setMnemonic("");
    handleModalClose();
  };

  // Parse uploaded Excel or CSV file
  const processFile = async (file: File) => {
    setExcelFile(file);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData: Record<string, any>[] =
        XLSX.utils.sheet_to_json(worksheet);

      const parsed: ParsedWordRow[] = rawData.map((row) => {
        const wordVal = getRowVal(row, [
          "word",
          "từ tiếng anh",
          "từ vựng",
          "tu tieng anh",
          "tu vung",
          "english",
        ]);
        const vnVal = getRowVal(row, [
          "vietnamese",
          "nghĩa tiếng việt",
          "nghĩa",
          "nghia",
          "meaning",
        ]);
        const defVal = getRowVal(row, [
          "definition",
          "định nghĩa",
          "dịnh nghĩa",
          "dinh nghia",
          "english definition",
          "diễn giải",
        ]);
        const ipaVal = getRowVal(row, ["ipa", "phiên âm", "phien am"]);
        const posVal = getRowVal(row, [
          "pos",
          "từ loại",
          "tu loai",
          "part of speech",
        ]);
        const exVal = getRowVal(row, [
          "example",
          "ví dụ",
          "vi du",
          "câu ví dụ",
        ]);
        const trVal = getRowVal(row, [
          "translation",
          "dịch",
          "dich",
          "dịch câu ví dụ",
        ]);
        const catVal = getRowVal(row, [
          "category",
          "bộ từ",
          "bo tu",
          "danh mục",
        ]);
        const lvlVal = getRowVal(row, [
          "level",
          "cấp độ",
          "cap do",
          "trình độ",
        ]);
        const mneVal = getRowVal(row, [
          "mnemonic",
          "mẹo nhớ",
          "meo nho",
          "ghi nhớ",
        ]);

        const isValidWord = wordVal.length > 0;
        const isValidVn = vnVal.length > 0;
        const isValid = isValidWord && isValidVn;

        let errorReason = "";
        if (!isValidWord && !isValidVn) {
          errorReason = "Thiếu cả từ tiếng Anh và Nghĩa tiếng Việt";
        } else if (!isValidWord) {
          errorReason = "Thiếu Từ tiếng Anh";
        } else if (!isValidVn) {
          errorReason = "Thiếu Nghĩa tiếng Việt";
        }

        // Validate Category — a name the account does not have falls back to Custom.
        let finalCat: WordCategory = FALLBACK_CATEGORY;
        const matchedCat = CATEGORIES.find(
          (c) => c.toLowerCase() === catVal.toLowerCase(),
        );
        if (matchedCat) finalCat = matchedCat;

        // Validate Level
        let finalLvl: LevelDifficulty = "B1";
        const matchedLvl = LEVELS.find(
          (l) => l.toLowerCase() === lvlVal.toLowerCase(),
        );
        if (matchedLvl) finalLvl = matchedLvl;

        return {
          raw: row,
          word: wordVal.toLowerCase(),
          vietnamese: vnVal,
          definition: defVal || undefined,
          ipa: ipaVal || `/${wordVal.toLowerCase()}/`,
          pos: posVal || "n.",
          example: exVal || "",
          translation: trVal || "",
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
      console.error("Error parsing Excel file:", err);
      alert("Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file!");
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
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 md:p-4">
        <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-800 rounded-[32px] p-5 md:p-7 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 space-y-4 animate-scaleUp max-h-[92dvh] overflow-y-auto overscroll-contain">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-600 border-clay border-blue-400 text-white shadow-clay">
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
          <div className="flex p-1 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border-clay border-blue-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab("single")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "single"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-clay-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Thêm 1 từ thủ công</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("excel")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "excel"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-clay-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Import từ Excel / CSV</span>
            </button>
          </div>

          {/* TAB 1: Single Word Form */}
          {activeTab === "single" && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              {/* Word Input & Smart Suggestions */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Từ Tiếng Anh (English Word){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {autoFilled && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                      <Check className="w-3.5 h-3.5" /> Đã tự động điền từ gợi
                      ý!
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={word}
                  onChange={(e) => {
                    setWord(e.target.value);
                    // The definition list belongs to the word that was looked up — drop it once
                    // the input moves to a different word.
                    if (
                      e.target.value.trim().toLowerCase() !==
                      lookedUpWord.toLowerCase()
                    ) {
                      setDefinitionOptions([]);
                      setLookedUpWord("");
                    }
                  }}
                  placeholder="ví dụ: teacher, doctor, innovate..."
                  className="w-full px-4 py-2.5 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-clay-inset text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Once a word is picked this panel replaces the suggestion list; typing a new word
                  brings the suggestions back. */}
                {definitionOptions.length > 0 ? (
                  <div className="p-3.5 rounded-2xl border-clay border-blue-300 dark:border-blue-800/60 bg-blue-50 dark:bg-slate-800 shadow-clay space-y-2.5 animate-slideUp">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                      <span className="flex items-center gap-1.5">
                        <span>
                          Định nghĩa của &ldquo;{lookedUpWord}&rdquo; — có thể
                          chọn nhiều nghĩa
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-extrabold">
                        {definitionOptions.length} nghĩa
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                      {definitionOptions.map((option) => {
                        const picked = isDefinitionPicked(option.definition);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleToggleDefinition(option)}
                            className={`w-full text-left px-3 py-2 rounded-xl border-clay text-xs transition-all duration-200 active:scale-[0.99] flex items-start gap-2 ${
                              picked
                                ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 shadow-clay-sm"
                                : "border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-clay-sm hover:border-blue-500 dark:hover:border-blue-400"
                            }`}
                          >
                            <span className="mt-0.5 shrink-0">
                              {picked ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 text-blue-500" />
                              )}
                            </span>
                            <span className="flex-1 space-y-0.5">
                              <span className="block font-medium leading-snug">
                                {option.definition}
                                {option.posLabel && (
                                  <span className="ml-1 font-extrabold text-blue-600 dark:text-blue-400">
                                    ({option.posLabel})
                                  </span>
                                )}
                              </span>
                              {option.example && (
                                <span className="block italic text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                  {option.example}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Datamuse API Smart Suggestions Chips */
                  suggestions.length > 0 && (
                    <div className="p-3.5 bg-blue-50 dark:bg-slate-800 rounded-2xl border-clay border-blue-300 dark:border-blue-800/60 shadow-clay space-y-2.5 animate-slideUp transition-all">
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          <span>Gợi ý từ Datamuse API (Gõ để tìm nhanh):</span>
                        </span>
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-extrabold">
                          {isLoadingSuggestions ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                          ) : (
                            `${suggestions.length} gợi ý`
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((sug, idx) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleSelectSuggestion(sug)}
                            disabled={isLoadingDetails}
                            style={{ animationDelay: `${idx * 40}ms` }}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border-clay border-blue-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:text-white transition-all duration-200 shadow-clay-sm hover:shadow-clay active:scale-95 disabled:opacity-50 animate-popIn flex items-center gap-1 group"
                          >
                            <span className="text-blue-500 group-hover:text-white transition-colors font-extrabold">
                              +
                            </span>
                            <span>{sug}</span>
                          </button>
                        ))}
                      </div>

                      {isLoadingDetails && (
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/40 p-2.5 rounded-xl border-clay border-blue-300 dark:border-blue-800 animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span>
                            Đang tự động tải Phiên âm (IPA), Từ loại & Định
                            nghĩa...
                          </span>
                        </div>
                      )}
                    </div>
                  )
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
                    className="w-full px-3 py-2 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-clay-inset text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Từ loại (POS)
                  </label>
                  <select
                    value={pos}
                    onChange={(e) => setPos(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-clay-inset text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    Định nghĩa (English Definition){" "}
                    <span className="text-red-500">*</span>
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
                    className="p-3 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-clay-inset space-y-2"
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
                      onChange={(e) =>
                        handleMeaningDefinitionChange(
                          meaning.id,
                          e.target.value,
                        )
                      }
                      placeholder="ví dụ: a person who teaches, especially in a school"
                      className="w-full px-3 py-2 rounded-lg border-clay border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="space-y-1.5">
                      {meaning.examples.map((ex, eIndex) => (
                        <div key={eIndex} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={ex}
                            onChange={(e) =>
                              handleExampleChange(
                                meaning.id,
                                eIndex,
                                e.target.value,
                              )
                            }
                            placeholder="Câu ví dụ Tiếng Anh..."
                            className="flex-1 px-3 py-1.5 rounded-lg border-clay border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {meaning.examples.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveExample(meaning.id, eIndex)
                              }
                              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* <button
                          type="button"
                          onClick={() => handleAddExample(meaning.id)}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          + Thêm câu ví dụ
                        </button> */}

                        {/* The dictionary returned no example for this meaning — ask AI for one.
                            Gated on the example alone: a definition improves the request but is
                            not required to offer it. */}
                        {!meaning.examples.some(
                          (ex) => !isPlaceholderExample(ex, word),
                        ) && (
                          <button
                            type="button"
                            onClick={() => handleGenerateExample(meaning)}
                            disabled={
                              generatingExampleId !== null || !word.trim()
                            }
                            className="px-2.5 py-1 rounded-lg border-clay border-clay-lilac dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-blue-700 dark:text-blue-300 shadow-clay-sm hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-1"
                          >
                            {generatingExampleId === meaning.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-amber-500" />
                            )}
                            <span>
                              {generatingExampleId === meaning.id
                                ? "Thinking..."
                                : "Tạo ví dụ bằng AI"}
                            </span>
                          </button>
                        )}
                      </div>

                      {exampleError?.meaningId === meaning.id && (
                        <p className="text-[11px] font-semibold text-red-500 dark:text-red-400">
                          {exampleError.message}
                        </p>
                      )}
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
                    onChange={(e) =>
                      setCategory(e.target.value as WordCategory)
                    }
                    className="w-full px-3 py-2 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-clay-inset text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} {cat === FALLBACK_CATEGORY ? "(Tự chọn)" : ""}
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
                    onChange={(e) =>
                      setLevel(e.target.value as LevelDifficulty)
                    }
                    className="w-full px-3 py-2 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-clay-inset text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 rounded-xl border-clay border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-clay-inset text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="flex-1 py-2.5 rounded-xl border-clay border-blue-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset text-white text-xs font-bold shadow-clay transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? "Đang lưu..." : "Lưu từ mới"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Excel Import Form */}
          {activeTab === "excel" && (
            <div className="space-y-4 pt-1">
              {/* Quick Action Bar & Guide Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border-clay border-emerald-300 dark:border-emerald-900/50 rounded-2xl">
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
                    <span>{showGuide ? "Ẩn hướng dẫn" : "Xem hướng dẫn"}</span>
                    {showGuide ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={downloadSampleExcel}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-clay-sm transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file mẫu Excel</span>
                  </button>
                </div>
              </div>

              {/* Instruction Guide Accordion */}
              {showGuide && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-clay border-blue-200 dark:border-slate-700 rounded-2xl space-y-3 animate-fadeIn text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>
                        Hướng dẫn định dạng file Excel / CSV chính xác
                      </span>
                    </h5>
                  </div>

                  <p className="leading-relaxed">
                    File Excel cần chứa dòng đầu tiên là{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      Tiêu đề cột (Header)
                    </span>
                    . Bạn có thể dùng tên cột tiếng Anh hoặc tiếng Việt (không
                    phân biệt chữ hoa/thường):
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border-clay border-blue-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <span className="text-red-500 font-bold">*</span> Word /
                        Từ tiếng Anh
                      </div>
                      <p className="text-slate-500">
                        Từ vựng cần học (Ví dụ:{" "}
                        <code className="text-blue-600 dark:text-blue-400">
                          opportunity
                        </code>
                        )
                      </p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border-clay border-blue-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <span className="text-red-500 font-bold">*</span>{" "}
                        Vietnamese / Nghĩa tiếng Việt
                      </div>
                      <p className="text-slate-500">
                        Nghĩa tiếng Việt (Ví dụ:{" "}
                        <code className="text-blue-600 dark:text-blue-400">
                          cơ hội
                        </code>
                        )
                      </p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border-clay border-blue-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Definition / Định nghĩa
                      </div>
                      <p className="text-slate-500">
                        Định nghĩa tiếng Anh (Không bắt buộc)
                      </p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border-clay border-blue-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        IPA / Phiên âm
                      </div>
                      <p className="text-slate-500">
                        Không bắt buộc (Tự tạo nếu trống)
                      </p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border-clay border-blue-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        POS / Từ loại
                      </div>
                      <p className="text-slate-500">
                        <code className="text-emerald-600">n.</code>,{" "}
                        <code className="text-emerald-600">v.</code>,{" "}
                        <code className="text-emerald-600">adj.</code>,{" "}
                        <code className="text-emerald-600">adv.</code>,{" "}
                        <code className="text-emerald-600">phrase</code>{" "}
                        (Default: n.)
                      </p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border-clay border-blue-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Example / Câu ví dụ
                      </div>
                      <p className="text-slate-500">Câu ví dụ tiếng Anh</p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border-clay border-blue-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Translation / Dịch câu ví dụ
                      </div>
                      <p className="text-slate-500">Bản dịch nghĩa câu ví dụ</p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border-clay border-blue-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Category / Bộ từ
                      </div>
                      <p className="text-slate-500">
                        IELTS, TOEIC, Daily Life, Academic, Custom...
                      </p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border-clay border-blue-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Level / Cấp độ & Mnemonic
                      </div>
                      <p className="text-slate-500">
                        A1, A2, B1, B2, C1 & Mẹo ghi nhớ từ
                      </p>
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
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 scale-[0.99]"
                      : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-blue-400"
                  }`}
                >
                  <div className="p-3.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-clay-sm">
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
                  <div className="px-3 py-1 bg-white dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-clay-sm">
                    Hỗ trợ: .xlsx, .xls, .csv
                  </div>
                </div>
              ) : (
                /* Selected File Summary & Re-upload */
                <div className="p-3.5 bg-slate-100 dark:bg-slate-900 border-clay border-blue-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {excelFile.name}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        {(excelFile.size / 1024).toFixed(1)} KB •{" "}
                        {parsedRows.length} dòng dữ liệu
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
                          <AlertCircle className="w-3 h-3" /> {invalidCount} lỗi
                          / bỏ qua
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Table Box */}
                  <div className="max-h-56 overflow-y-auto rounded-2xl border-clay border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900">
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
                                ? "bg-red-50/60 dark:bg-red-950/20 text-red-900 dark:text-red-300"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            }
                          >
                            <td className="py-2 px-3 font-medium text-slate-400">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                              {row.word || (
                                <span className="text-red-500 italic">
                                  (Trống)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-medium">
                              {row.vietnamese || (
                                <span className="text-red-500 italic">
                                  (Trống)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                              {row.pos}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border-clay border-blue-300 dark:border-blue-800">
                                {row.category}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Hợp
                                  lệ
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400"
                                  title={row.errorReason}
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />{" "}
                                  {row.errorReason}
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
                      Đang hiển thị xem trước 50 / {parsedRows.length} từ vựng.
                      Tất cả {validCount} từ hợp lệ sẽ được import.
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="flex-1 py-2.5 rounded-xl border-clay border-blue-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={validCount === 0}
                  onClick={handleBulkSubmit}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-clay transition-all flex items-center justify-center gap-1.5 ${
                    validCount > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 active:scale-98 cursor-pointer"
                      : "bg-slate-300 dark:bg-slate-700 opacity-60 cursor-not-allowed"
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
    </ModalPortal>
  );
};
