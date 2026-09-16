import { Word, WordMeaning } from '@/types';

/**
 * The senses a card should render, primary first.
 *
 * `Word.meanings` only exists on words that came back from the backend (or were
 * just added) with more than the flat fields — words stored before it existed,
 * and placeholders, have none. Those still have one sense, so it is rebuilt from
 * `definition` rather than leaving the card blank.
 */
export function getWordMeanings(word: Word): WordMeaning[] {
  const listed = (word.meanings ?? []).filter((m) => m.definition.trim());
  if (listed.length > 0) return listed;

  return [
    {
      pos: word.pos ?? '',
      definition: word.definition || '',
      example: word.example || '',
      translation: word.translation || '',
    },
  ];
}

/** A stored `Word` written before `vietnamese` was folded into `definition`. */
type LegacyWord = Word & { vietnamese?: string };

/**
 * Reads a stored word written by a build that still had `Word.vietnamese`.
 *
 * The meaning of a locally added word used to live *only* in `vietnamese` —
 * the add form never filled `definition` — so dropping the field without this
 * would blank the back of every card already on the device. The legacy value is
 * moved into `definition` — which is also what `getWordMeanings` rebuilds the
 * single sense from — and then discarded.
 *
 * Applied on read rather than as a one-off rewrite so a copy restored from an
 * older backup is migrated too.
 */
export function migrateStoredWord<T extends Word>(word: T): T {
  const { vietnamese, ...rest } = word as T & LegacyWord;
  if (!vietnamese) return rest as T;

  const migrated = { ...rest } as T;
  if (!migrated.definition?.trim()) migrated.definition = vietnamese;
  return migrated;
}