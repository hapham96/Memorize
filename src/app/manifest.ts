import type { MetadataRoute } from 'next';

// Home-screen / install icons. `icon.png`, `apple-icon.png` and `favicon.ico`
// next to this file are picked up by Next's file conventions automatically;
// PWA installs need the sizes declared explicitly, hence /public/icon-*.png.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Memorize - Học từ vựng tiếng Anh',
    short_name: 'Memorize',
    description:
      'Học từ vựng tiếng Anh với lặp lại ngắt quãng, flashcard 3D, quiz và phát âm chuẩn.',
    start_url: '/',
    display: 'standalone',
    background_color: '#EEF2FF', // blue-50, matches <body>
    theme_color: '#24292F', // the icon's backdrop
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
