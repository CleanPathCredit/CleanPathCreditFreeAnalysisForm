/**
 * Sentry Browser SDK — error monitoring + session replay
 * Privacy-first: all PII (text, inputs, media) is masked by default.
 */
(function() {
  // Bail if Sentry CDN didn't load (offline, adblocker, etc.)
  if (typeof Sentry === 'undefined') return;

  Sentry.init({
    dsn: 'https://6baffd8c86a8d76c0354c9ef17e8dc0f@o4511215057305600.ingest.us.sentry.io/4511215916154880',

    // Environment tagging — distinguishes prod traffic from preview deployments
    environment: location.hostname === 'form.cleanpathcredit.com' ? 'production' : 'preview',

    // Release tag — update this on each deploy for source map correlation
    release: 'cpc-form@1.0.0',

    // ── Performance Monitoring ──
    // 10% of transactions (page loads, navigations) — enough for trend data
    tracesSampleRate: 0.1,

    // ── Session Replay ──
    // Note: PostHog handles behavioral session recording. Sentry only records
    // sessions with errors to preserve error context without doubling storage.
    replaysSessionSampleRate: 0,      // No background replays (PostHog covers this)
    replaysOnErrorSampleRate: 1.0,    // 100% of sessions that hit an error

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Privacy: mask all text content (covers names, emails, phone numbers)
        maskAllText: true,
        // Privacy: mask all form input values
        maskAllInputs: true,
        // Privacy: block all media (images, videos) from replay
        blockAllMedia: true,
      }),
    ],

    // Do NOT send cookies, IP addresses, or user-agent by default
    sendDefaultPii: false,

    // Strip query params from URLs (the form passes ?name=xxx which is PII)
    beforeSend(event) {
      if (event.request && event.request.url) {
        event.request.url = event.request.url.split('?')[0];
      }
      return event;
    },

    // Ignore known benign errors
    ignoreErrors: [
      'ResizeObserver loop',   // Chrome benign warning
      'Non-Error promise rejection captured',
    ],
  });
})();
