import { getAsync } from './client';

/** Datamuse-shaped suggestion row; `defs` is only present when the backend enriches the match. */
export interface WordSuggestion {
  word: string;
  tags?: string[];
  defs?: string[];
}

export interface DictionaryDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

/** dictionaryapi.dev-shaped entry. */
export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
  meanings?: DictionaryMeaning[];
}

/** Prefix autocomplete — proxies what used to be a direct `api.datamuse.com/words?sp=` call. */
export async function searchWordSuggestions(prefix: string): Promise<WordSuggestion[]> {
  return getAsync<WordSuggestion[]>(`/words/search?prefix=${encodeURIComponent(prefix)}`, {
    auth: true,
  });
}

/** IPA / POS / definition lookup — proxies what used to be a direct `api.dictionaryapi.dev` call. */
export async function fetchWordDictionary(word: string): Promise<DictionaryEntry[]> {
  return getAsync<DictionaryEntry[]>(`/words/dictionary/${encodeURIComponent(word)}`, {
    auth: true,
  });
}
