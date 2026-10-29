import type { Metadata, Viewport } from 'next';
import { Baloo_2, Nunito } from 'next/font/google';
import './globals.css';
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';

// Rounded, friendly faces that carry the claymorphism look.
//
// Both MUST carry the `vietnamese` subset — the UI copy is Vietnamese and
// characters like ọ / ợ / ệ live only in that subset. Fredoka (the skill's
// first-choice display face) ships latin + latin-ext + hebrew only, so
// Vietnamese text silently fell back to a system font mid-word. Baloo 2 is
// the display face from the same family of pairings and has full Vietnamese
// coverage at every weight.
// No `weight` — Baloo 2 is a variable font, so this loads the whole 400-800
// axis and headings can use any weight without a faux-bold fallback.
const baloo = Baloo_2({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-display',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-nunito',
  display: 'swap',
});

// `metadataBase` turns every relative URL below (canonical, OG image) into an
// absolute production URL. Child routes override `title` through the template.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${baloo.variable} ${nunito.variable}`}>
      <body className="antialiased font-sans bg-blue-50 dark:bg-slate-950">
        {children}
      </body>
    </html>
  );
}
