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
  definition: 'Nghĩa của từ (Definition)',
  ipa: 'Phiên âm (IPA)',
  pos: 'Từ loại (POS)',
  example: 'Ví dụ (Example)',
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

/** Width per column, so the template and the export size them identically. */
const COLUMN_WIDTHS: Record<string, number> = {
  [VOCAB_HEADERS.word]: 22,
  [VOCAB_HEADERS.definition]: 45,
  [VOCAB_HEADERS.ipa]: 18,
  [VOCAB_HEADERS.pos]: 12,
  [VOCAB_HEADERS.example]: 42,
  [VOCAB_HEADERS.category]: 16,
  [VOCAB_HEADERS.level]: 10,
  [VOCAB_HEADERS.mnemonic]: 40,
  [VOCAB_EXPORT_EXTRA_HEADERS.state]: 14,
  [VOCAB_EXPORT_EXTRA_HEADERS.addedAt]: 14,
};

/** `!cols` for a sheet written in `headers` order. */
function columnWidths(headers: string[]): { wch: number }[] {
  return headers.map((header) => ({ wch: COLUMN_WIDTHS[header] ?? 20 }));
}

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
    [VOCAB_HEADERS.definition]: word.definition ?? '',
    [VOCAB_HEADERS.ipa]: word.ipa ?? '',
    [VOCAB_HEADERS.pos]: word.pos ?? '',
    [VOCAB_HEADERS.example]: word.example ?? '',
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
  const headers = [
    ...Object.values(VOCAB_HEADERS),
    ...Object.values(VOCAB_EXPORT_EXTRA_HEADERS),
  ];
  const rows = wordsToSheetRows(items);
  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows, { header: headers })
      : XLSX.utils.aoa_to_sheet([headers]);

  worksheet['!cols'] = columnWidths(headers);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tu_Vung');
  XLSX.writeFile(workbook, fileName);
}

/**
 * The rows the import template ships with — the same columns, in the same
 * order, as the export above, so a user can compare the two files side by side
 * (the export only appends the two read-only columns it owns).
 */
const TEMPLATE_ROWS: Record<string, string>[] = [
  {
    [VOCAB_HEADERS.word]: 'resilient',
    [VOCAB_HEADERS.definition]: 'kiên cường, phục hồi nhanh',
    [VOCAB_HEADERS.ipa]: '/rɪˈzɪl.jənt/',
    [VOCAB_HEADERS.pos]: 'adj.',
    [VOCAB_HEADERS.example]: 'He is resilient in the face of hardship.',
    [VOCAB_HEADERS.category]: 'IELTS',
    [VOCAB_HEADERS.level]: 'B2',
    [VOCAB_HEADERS.mnemonic]: 'Re + silient -> Lại nổi lên nhẹ nhàng',
  },
  {
    [VOCAB_HEADERS.word]: 'perseverance',
    [VOCAB_HEADERS.definition]: 'sự kiên trì, nhẫn nại',
    [VOCAB_HEADERS.ipa]: '/ˌpɜː.sɪˈvɪə.rəns/',
    [VOCAB_HEADERS.pos]: 'n.',
    [VOCAB_HEADERS.example]: 'Perseverance is key to success.',
    [VOCAB_HEADERS.category]: 'Academic',
    [VOCAB_HEADERS.level]: 'C1',
    [VOCAB_HEADERS.mnemonic]: 'Per + sever -> Vượt qua khó khăn bằng nhẫn nại',
  },
  {
    [VOCAB_HEADERS.word]: 'ubiquitous',
    [VOCAB_HEADERS.definition]: 'có mặt ở khắp nơi',
    [VOCAB_HEADERS.ipa]: '/juːˈbɪk.wɪ.təs/',
    [VOCAB_HEADERS.pos]: 'adj.',
    [VOCAB_HEADERS.example]: 'Smartphones are ubiquitous today.',
    [VOCAB_HEADERS.category]: 'TOEIC',
    [VOCAB_HEADERS.level]: 'C1',
    [VOCAB_HEADERS.mnemonic]: 'U + bi + qui -> Đi đâu cũng quẹo thấy',
  },
];

/**
 * Builds the import template and hands it to the browser as a download.
 *
 * It lives next to the export on purpose: both sheets are written from
 * `VOCAB_HEADERS`, so a column added or dropped here shows up in both files.
 */
export function downloadVocabTemplate(
  fileName = 'Memorize_Vocab_Template.xlsx',
): void {
  const headers = Object.values(VOCAB_HEADERS);
  const worksheet = XLSX.utils.json_to_sheet(TEMPLATE_ROWS, { header: headers });
  worksheet['!cols'] = columnWidths(headers);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Import_Tu_Vung');
  XLSX.writeFile(workbook, fileName);
}