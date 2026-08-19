import { Word, WordMeaning } from '@/types';

/**
 * The senses a card should render, primary first.
 *
 * `Word.meanings` only exists on words that came back from the backend (or were
 * just added) with more than the flat fields — words stored before it existed,
 * and placeholders, have none. Those still have one sense, so it is rebuilt from
 * `vietnamese`/`definition` rather than leaving the card blank.
 */
export function getWordMeanings(word: Word): WordMeaning[] {
  const listed = (word.meanings ?? []).filter((m) => m.definition.trim());
  if (listed.length > 0) return listed;

  return [
    {
      pos: word.pos ?? '',
      definition: word.vietnamese || word.definition || '',
      example: word.example || '',
      translation: word.translation || '',
    },
  ];
}