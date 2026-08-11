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

export type AddWordResponse = {};
