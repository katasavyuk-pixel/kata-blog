"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile widget. The script auto-renders elements with class
 * `cf-turnstile` and injects a hidden `cf-turnstile-response` input the form reads.
 *
 * `afterInteractive`, not `lazyOnload`: with the secret configured the server now
 * *requires* a token, so the window between the form being usable and the widget
 * being ready is a window in which a signup fails. lazyOnload waits for the load
 * event, which on a page with images and web fonts is long enough to
 * matter. The form also refuses to submit without a token rather than
 * sending a request that is certain to be rejected — see subscribe-form.
 */
export function TurnstileWidget({ siteKey }: { siteKey: string }) {
  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      {/* Dark, because the site has no light mode. `interaction-only` keeps the
          widget invisible while Cloudflare can verify in the background (the
          token is still issued); it only appears when a visitor must click.
          Shown permanently it was a grey box under the hero form. */}
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-theme="dark"
        data-appearance="interaction-only"
      />
    </div>
  );
}
