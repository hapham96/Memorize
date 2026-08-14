export type AddWordRequest = {
  userId: number;
  headword: string;
  ipaPronunciation: string;
  definitions: DefinitionRequest[];
};

export type DefinitionRequest = {
  definition: string;
  partOfSpeech: string;
  examples: ExamplesRequest[];
};

export type ExampleLanguage = 'en' | 'vi';

export type ExamplesRequest = {
  example: string;
  language: ExampleLanguage;
};

export type BackendWord = {
  id: number;
  headword: string;
  ipaPronunciation: string | null;
  audioUrl: string | null;
  cefrLevel: string | null;
  createdAt: string;
};

export type BackendUserWord = {
  id: number;
  userId: number;
  wordId: number;
  status: string;
  learningStep: number;
  easinessFactor: number;
  repetitions: number;
  interval: number;
  dueAt: string;
  isFavorite: boolean;
  createdAt: string;
};

export type AddWordResponse = {
  word: BackendWord;
  userWord: BackendUserWord;
};

export type ReviewQuality = 1 | 2 | 3 | 4 | 5;

export type ReviewWordRequest = {
  quality: ReviewQuality;
};

export type ReviewWordResponse = BackendUserWord;


