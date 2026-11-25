'use client';

import Script from 'next/script';
import { useReportWebVitals } from 'next/web-vitals';
import { GA_MEASUREMENT_ID, isAnalyticsEnabled, trackEvent } from '@/lib/analytics';

/**
 * Loads `gtag.js` and reports Core Web Vitals to GA4.
 *
 * Page views need no code here: the `config` call in the `<head>` bootstrap
 * sends the first one, and GA4's enhanced measurement ("page changes based on
 * browser history events", on by default) sends one per client navigation,
 * e.g. landing `/` → `/app`. Inside `/app` there is no routing — tabs are
 * reported as `app_screen_view` from `page.tsx`.
 */
export function Analytics() {
  useReportWebVitals((metric) => {
    // Follows Google's web-vitals → GA4 recipe: one event per metric, value as
    // an integer (CLS is unitless, so it is scaled ×1000 to keep precision),
    // `metric_id` to group the deltas of one page load.
    trackEvent(metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
      non_interaction: true,
    });
  });

  if (!isAnalyticsEnabled) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  );
}
