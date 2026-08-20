import { getAsync, postAsync } from './client';

/** Datamuse-shaped suggestion row; `defs` is only present when the request sets `md=d`. */
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

/** IPA / POS / definition lookup — proxies what used to be a direct `api.dictionaryapi.dev` call. */
export async function fetchWordDictionary(word: string): Promise<DictionaryEntry[]> {
  return getAsync<DictionaryEntry[]>(`/words/dictionary/${encodeURIComponent(word)}`, {
    auth: true,
  });
}

/** Body of `POST /words/generate`. `cefrLevel` only steers the wording — it is optional. */
export interface GenerateWordRequest {
  headword: string;
  cefrLevel?: string;
}

/**
 * AI-written dictionary entry, for a headword `/words/dictionary/:word` does not know.
 * Answers the same shape as the dictionary lookup, so the same mappers read it.
 */
export async function generateWordEntry(
  payload: GenerateWordRequest,
): Promise<DictionaryEntry[]> {
  const data = await postAsync<DictionaryEntry[] | DictionaryEntry | null>(
    '/words/generate',
    payload,
    { auth: true },
  );
  if (Array.isArray(data)) return data;
  // A single entry instead of a one-item array is the same answer — normalize it.
  return data ? [data] : [];
}

/** Body of `POST /words/example`. `partOfSpeech` is the full form (`adjective`), not `adj.`. */
export interface GenerateExampleRequest {
  word: string;
  meaning: string;
  partOfSpeech: string;
  cefrLevel: string;
}

/** Response shape is not settled — accept a bare string as well as the several field names. */
type GenerateExampleResponse =
  | string
  | {
      example?: string;
      sentence?: string;
      examples?: string[];
      data?: { example?: string; sentence?: string; examples?: string[] };
    }
  | null;

const pickExample = (data: GenerateExampleResponse): string => {
  if (typeof data === 'string') return data.trim();
  if (!data) return '';

  const nested = data.data;
  const candidates = [
    data.example,
    data.sentence,
    data.examples?.[0],
    nested?.example,
    nested?.sentence,
    nested?.examples?.[0],
  ];
  return candidates.find((c) => typeof c === 'string' && c.trim())?.trim() ?? '';
};

/** AI-generated example sentence — used when `/words/dictionary/:word` returns no example. */
export async function generateWordExample(payload: GenerateExampleRequest): Promise<string> {
  const data = await postAsync<GenerateExampleResponse>('/words/example', payload, { auth: true });
  return pickExample(data);
}
