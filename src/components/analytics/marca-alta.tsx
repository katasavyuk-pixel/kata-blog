"use client";

import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";

/**
 * One cookieless Web Analytics event when the confirmation page has really
 * confirmed a signup (not the error branch, not preview). Same `track` already
 * used by the calculator and the tools; no extra parameters.
 */
export function MarcaAlta() {
  const hecho = useRef(false);
  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    track("newsletter_alta");
  }, []);
  return null;
}
