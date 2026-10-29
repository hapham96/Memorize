import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// `/app` is not disallowed here on purpose: a blocked page cannot be crawled,
// so Google would never see its `noindex` and could still list the bare URL.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
