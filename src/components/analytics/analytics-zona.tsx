"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { BASE_PATH } from "@/config/base-path";
import { propsAnalytics, urlEnZona } from "@/config/analytics";

const PROPS = propsAnalytics(BASE_PATH);

function conBasePath(evento: BeforeSendEvent): BeforeSendEvent {
  return { ...evento, url: urlEnZona(evento.url, BASE_PATH) };
}

/**
 * Cookieless, no-PII page analytics for the /blog zone: script and endpoints
 * through /blog/_m/…, and page URLs with /blog (src/config/analytics.ts).
 */
export function AnalyticsZona() {
  return <Analytics {...PROPS} beforeSend={conBasePath} />;
}
