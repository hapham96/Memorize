/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

/** Origin of the backend (REST + the `/battles` socket), plus its websocket twin. */
function apiOrigins() {
  try {
    const { protocol, host } = new URL(process.env.NEXT_PUBLIC_API_URL || '');
    const ws = protocol === 'https:' ? 'wss:' : 'ws:';
    return [`${protocol}//${host}`, `${ws}//${host}`];
  } catch {
    return [];
  }
}

// Next injects inline bootstrap scripts, so `script-src` needs 'unsafe-inline'
// (a nonce would force every page to render dynamically). The rest of the policy
// still blocks foreign scripts, framing, plugins and form posts elsewhere.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // Avatars are data: SVGs; word audio is whatever recording URL the backend returns.
  "img-src 'self' data: blob:",
  "media-src 'self' https: blob: data:",
  "font-src 'self' data:",
  // Datamuse autocomplete is called straight from the browser.
  `connect-src 'self' ${['https://api.datamuse.com', ...apiOrigins()].join(' ')}${isDev ? ' ws: wss:' : ''}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Only meaningful over HTTPS; browsers ignore it on plain HTTP.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Emits a self-contained server in .next/standalone for the Docker image.
  output: 'standalone',
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
