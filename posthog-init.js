/**
 * PostHog — analytics, funnel tracking, session recording
 * Privacy-first: all form inputs masked in session replays.
 *
 * Exposes:
 *   window.posthog            — PostHog SDK (once loaded)
 *   window.trackQuizEvent(name, props)  — safe wrapper for custom events
 */

/* ── PostHog loader snippet (official) ─────────────── */
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

/* ── Init with privacy-first config ────────────────── */
posthog.init('phc_qkhqdgE8gx7kg3kv8NijeQmRuqULwB9YPwehQUaWxM4q', {
  api_host: 'https://us.i.posthog.com',

  // Auto-capture pageviews, clicks, form submits — no manual work needed
  autocapture: true,
  capture_pageview: true,
  capture_pageleave: true,  // Know exactly where users abandon

  // Only create person profiles when we explicitly identify (saves cost)
  person_profiles: 'identified_only',

  // ── Session Recording ──
  // Sample 15% of sessions for behavioral analysis
  session_recording: {
    maskAllInputs: true,          // Mask all form input values (PII)
    maskInputOptions: {
      password: true,
      email: true,
      tel: true,
      text: true,
    },
    // Only record on 15% of sessions to keep costs reasonable
  },
  disable_session_recording: false,

  // Don't record the exact pathname on results.html (has ?goal=x&name=y PII in URL)
  sanitize_properties: function(props) {
    if (props.$current_url) props.$current_url = props.$current_url.split('?')[0];
    if (props.$referrer)    props.$referrer    = props.$referrer.split('?')[0];
    if (props.$pathname)    props.$pathname    = props.$pathname.split('?')[0];
    return props;
  },

  // Don't identify the user automatically — we'll handle it explicitly
  loaded: function(ph) {
    // Tag this session with helpful context
    ph.register({
      app_version: 'cpc-form@1.0.0',
      environment: location.hostname === 'form.cleanpathcredit.com' ? 'production' : 'preview',
    });
  },
});

/* ── Safe quiz event helper ────────────────────────── */
// Wrapper so tracking calls never throw even if PostHog fails to load
window.trackQuizEvent = function(name, props) {
  try {
    if (window.posthog && typeof posthog.capture === 'function') {
      posthog.capture(name, props || {});
    }
  } catch (e) {
    // Silent fail — analytics should never break the user experience
  }
};
