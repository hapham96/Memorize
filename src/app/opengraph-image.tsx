import { ImageResponse } from 'next/og';

export const alt = 'Memorize - Học từ vựng tiếng Anh với Flashcard & Lặp lại ngắt quãng';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const HEADLINE = 'Học từ vựng tiếng Anh nhớ lâu';
const TAGLINE = 'Flashcard · Quiz · Lặp lại ngắt quãng (SRS) · Phát âm IPA';
const BRAND = 'Memorize';

/**
 * Baloo 2 subset to exactly the glyphs drawn here. The renderer's built-in font
 * has no Vietnamese coverage (ọ / ợ / ệ), and the layout's `next/font` files are
 * not reachable from an image route. Without a UA, Google serves TrueType,
 * which is the format the renderer reads. On failure the image still renders,
 * in the fallback face.
 */
async function loadDisplayFont(): Promise<ArrayBuffer | null> {
  try {
    const text = encodeURIComponent(`${HEADLINE}${TAGLINE}${BRAND}M`);
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Baloo+2:wght@700&text=${text}`
    ).then((res) => res.text());
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    return await fetch(src).then((res) => res.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await loadDisplayFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#EFF1FB',
          fontFamily: font ? 'Baloo 2' : 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: '#4F46E5',
              color: '#FFFFFF',
              fontSize: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            M
          </div>
          <div style={{ fontSize: 48, color: '#1E1B4B' }}>{BRAND}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.1, color: '#1E1B4B' }}>{HEADLINE}</div>
          <div style={{ fontSize: 36, color: '#4F46E5' }}>{TAGLINE}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: 'Baloo 2', data: font, weight: 700, style: 'normal' }] : undefined,
    }
  );
}
