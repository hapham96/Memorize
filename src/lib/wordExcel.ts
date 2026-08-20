import * as XLSX from 'xlsx';
import { SRSState, Word } from '@/types';

/**
 * The vocabulary sheet's column headers, shared by the import template and the
 * profile screen's export.
 *
 * They are kept in one place because the importer in `AddWordModal` matches
 * incoming columns against these same labels — an export written with different
 * headers would not survive a round trip back through import.
 */
export const VOCAB_HEADERS = {
  word: 'Từ tiếng Anh (Word)',
  vietnamese: 'Nghĩa tiếng Việt (Vietnamese)',
  definition: 'Định nghĩa (Definition)',
  ipa: 'Phiên âm (IPA)',
  pos: 'Từ loại (POS)',
  example: 'Ví dụ (Example)',
  translation: 'Dịch ví dụ (Translation)',
  category: 'Bộ từ (Category)',
  level: 'Cấp độ (Level)',
  mnemonic: 'Mẹo nhớ (Mnemonic)',
} as const;

/**
 * Columns the export adds on top of the template. The importer ignores them, so
 * an exported file can be edited and imported straight back.
 */
export const VOCAB_EXPORT_EXTRA_HEADERS = {
  state: 'Trạng thái (Status)',
  addedAt: 'Ngày thêm (Added)',
} as const;

/** Column widths, in the order the sheet writes them. */
const COLUMN_WIDTHS = [22, 32, 45, 18, 12, 42, 42, 16, 10, 40, 14, 14];

/** SRS status → the Vietnamese label the app shows for it. */
export const SRS_STATE_LABELS: Record<SRSState, string> = {
  new: 'Mới',
  learning: 'Đang học',
  review: 'Đang ôn',
  mastered: 'Đã thuộc',
};

export interface ExportableWord {
  word: Word;
  state?: SRSState;
  addedAt?: string;
}

/** `YYYY-MM-DD`, or an empty cell when the row carried no usable date. */
function formatDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/** One sheet row per word, keyed by the shared headers. */
export function wordsToSheetRows(items: ExportableWord[]): Record<string, string>[] {
  return items.map(({ word, state, addedAt }) => ({
    [VOCAB_HEADERS.word]: word.word ?? '',
    [VOCAB_HEADERS.vietnamese]: word.vietnamese ?? '',
    [VOCAB_HEADERS.definition]: word.definition ?? '',
    [VOCAB_HEADERS.ipa]: word.ipa ?? '',
    [VOCAB_HEADERS.pos]: word.pos ?? '',
    [VOCAB_HEADERS.example]: word.example ?? '',
    [VOCAB_HEADERS.translation]: word.translation ?? '',
    [VOCAB_HEADERS.category]: word.category ?? '',
    [VOCAB_HEADERS.level]: word.level ?? '',
    [VOCAB_HEADERS.mnemonic]: word.mnemonic ?? '',
    [VOCAB_EXPORT_EXTRA_HEADERS.state]: state ? SRS_STATE_LABELS[state] : '',
    [VOCAB_EXPORT_EXTRA_HEADERS.addedAt]: formatDate(addedAt),
  }));
}

/**
 * Builds the workbook and hands it to the browser as a download.
 *
 * A sheet is written even for an empty list — with the header row only — so the
 * file the user asked for always arrives; the caller decides whether an empty
 * library is worth offering at all.
 */
export function exportWordsToExcel(
  items: ExportableWord[],
  fileName = 'Memorize_Vocabulary.xlsx',
): void {
  const rows = wordsToSheetRows(items);
  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([
          [...Object.values(VOCAB_HEADERS), ...Object.values(VOCAB_EXPORT_EXTRA_HEADERS)],
        ]);

  worksheet['!cols'] = COLUMN_WIDTHS.map((wch) => ({ wch }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tu_Vung');
  XLSX.writeFile(workbook, fileName);
}