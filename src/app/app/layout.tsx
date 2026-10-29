import type { Metadata } from 'next';

// The app itself is a sign-in wall followed by per-account data — nothing a
// search engine can rank. Keep it out of the index (links are still followed)
// so the landing page at `/` is the one result Google shows.
export const metadata: Metadata = {
  title: 'Ứng dụng',
  alternates: { canonical: '/app' },
  robots: { index: false, follow: true },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
