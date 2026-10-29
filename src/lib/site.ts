/**
 * Public identity of the site — what search engines and link previews see.
 * The canonical origin is fixed rather than read from the request, so every
 * deployment (preview, staging) points canonical URLs at production.
 */
export const SITE_URL = 'https://app.memoraise.pro.vn';

export const SITE_NAME = 'Memorize';

export const SITE_TITLE = 'Memorize - Học từ vựng tiếng Anh với Flashcard & Lặp lại ngắt quãng';

export const SITE_DESCRIPTION =
  'Học từ vựng tiếng Anh bằng flashcard, quiz và phương pháp lặp lại ngắt quãng (SRS). Phiên âm IPA, phát âm chuẩn, nhắc ôn tập đúng lúc — nhớ lâu chỉ với 5 phút mỗi ngày.';

export const SITE_KEYWORDS = [
  'học từ vựng tiếng Anh',
  'flashcard tiếng Anh',
  'lặp lại ngắt quãng',
  'spaced repetition',
  'SRS',
  'app học từ vựng',
  'từ vựng IELTS',
  'từ vựng TOEIC',
  'phiên âm IPA',
  'học tiếng Anh online',
];

/** Where every "start" button on the public pages leads. */
export const APP_PATH = '/app';
