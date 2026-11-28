'use client';

import Script from 'next/script';
import { GA_MEASUREMENT_ID, isAnalyticsEnabled } from '@/lib/analytics';

/**
 * Loads `gtag.js`.
 *
 * Page views need no code here: the `config` call in the `<head>` bootstrap
 * sends the first one, and GA4's enhanced measurement ("page changes based on
 * browser history events", on by default) sends one per client navigation,
 * e.g. landing `/` → `/app`.
 */
export function Analytics() {
  if (!isAnalyticsEnabled) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  );
}
