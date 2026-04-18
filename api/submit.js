/**
 * Vercel Serverless Function — proxies form submissions to the CRM.
 *
 * Hardened per audit finding C-4:
 *   1. Strict origin check. The previous `origin.includes(d)` was bypassable
 *      with crafted origins like https://evil.com/form.cleanpathcredit.com/
 *      or https://form.cleanpathcredit.com.evil.com/. Now we parse the Origin
 *      header as a URL and require an exact `hostname` match against an
 *      allowlist.
 *   2. Localhost only accepted when CORS_ALLOWED_DEV_ORIGIN is explicitly set.
 *      Previously any origin substring-matching "localhost" passed, including
 *      things like https://localhost.evil.com/.
 *   3. Server-side honeypot. Hidden form fields that real users never fill.
 *      If present on a submission we silently 200 (without forwarding to the
 *      CRM) so bots can't tell they were detected.
 *   4. Cloudflare Turnstile verification. When TURNSTILE_SECRET_KEY is set,
 *      every POST must include a cf_turnstile_token that validates against
 *      https://challenges.cloudflare.com/turnstile/v0/siteverify. When the
 *      secret is unset, Turnstile is skipped (backwards compatible).
 *   5. Origin-aware CORS preflight. OPTIONS requests echo Access-Control-
 *      Allow-Origin only when the origin passes the same allowlist.
 *
 * Follow-up (tracked as H — not in this PR): IP-based rate limiting via
 * @upstash/ratelimit + Vercel KV. Requires a KV store provisioned in the
 * Vercel project settings.
 *
 * Required env:
 *   GHL_WEBHOOK_URL           GoHighLevel inbound webhook URL
 * Optional env:
 *   TURNSTILE_SECRET_KEY      Cloudflare Turnstile server secret.
 *                             When set, cf_turnstile_token is REQUIRED in
 *                             the POST body. Leave unset to deploy the
 *                             backend hardening without the frontend widget.
 *   CORS_ALLOWED_ORIGINS      CSV of allowed hostnames (overrides defaults).
 *                             Example: "form.cleanpathcredit.com,preview.example.com"
 *   CORS_ALLOWED_DEV_ORIGIN   Single dev hostname to allow (e.g. "localhost").
 *                             Must be explicitly set; NOT enabled by default.
 */

const DEFAULT_ALLOWED_HOSTS = [
  'form.cleanpathcredit.com',
  'clean-path-credit-free-analysis-for.vercel.app',
];

// Fields we will forward to GoHighLevel. Anything else is stripped.
const ALLOWED_FIELDS = new Set([
  'first_name', 'last_name', 'full_name', 'email', 'phone',
  'goal', 'situation', 'score', 'timeline', 'blocker',
  'profile', 'painLevel', 'urgency',
  'leadScore', 'leadTier', 'recommendedOffer',
]);

// Hidden field names that real users never fill. Any non-empty value here
// means the submission came from a bot — silently accept and drop.
const HONEYPOT_FIELDS = ['website', 'company_website', 'fax'];

const MAX_BODY_SIZE = 4096; // bytes
const MAX_FIELD_LENGTH = 500; // chars per text field

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function getAllowedHosts() {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ALLOWED_HOSTS;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function isAllowedOrigin(originHeader) {
  if (!originHeader) return false;
  let hostname;
  try {
    hostname = new URL(originHeader).hostname;
  } catch {
    return false;
  }
  const allowedHosts = getAllowedHosts();
  if (allowedHosts.includes(hostname)) return true;

  const devOrigin = process.env.CORS_ALLOWED_DEV_ORIGIN;
  if (devOrigin) {
    // Compare hostname only (strip any :port the caller included).
    const devHost = devOrigin.split(':')[0];
    if (hostname === devHost) return true;
  }
  return false;
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const clean = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (typeof value === 'string') {
      clean[key] = value.slice(0, MAX_FIELD_LENGTH);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

function tripsHoneypot(body) {
  if (!body || typeof body !== 'object') return false;
  return HONEYPOT_FIELDS.some((f) => {
    const v = body[f];
    return typeof v === 'string' && v.trim().length > 0;
  });
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true }; // backwards-compatible
  if (!token || typeof token !== 'string') {
    return { ok: false, reason: 'missing_token' };
  }

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.append('remoteip', remoteIp);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (!data.success) {
      return { ok: false, reason: 'verify_failed', codes: data['error-codes'] };
    }
    return { ok: true };
  } catch (err) {
    console.error('[CPC API] Turnstile verify threw:', err?.message);
    return { ok: false, reason: 'verify_error' };
  }
}

function applyCorsHeaders(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  // --- CORS preflight ---
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      applyCorsHeaders(res, origin);
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    return res.status(204).end();
  }

  // --- Method allowlist ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Strict origin check ---
  const origin = req.headers.origin || '';
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  applyCorsHeaders(res, origin);

  // --- Payload size guard ---
  const rawBody = JSON.stringify(req.body || {});
  if (rawBody.length > MAX_BODY_SIZE) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  // --- Honeypot: silently drop bot submissions without revealing detection ---
  if (tripsHoneypot(req.body)) {
    console.log('[CPC API] Honeypot tripped from', getClientIp(req));
    return res.status(200).json({ success: true });
  }

  // --- Turnstile verification (if configured). Runs before sanitize so the
  //     token field isn't stripped. Token is NOT forwarded to the CRM. ---
  const turnstile = await verifyTurnstile(req.body?.cf_turnstile_token, getClientIp(req));
  if (!turnstile.ok) {
    console.error('[CPC API] Turnstile rejected:', turnstile.reason, turnstile.codes);
    return res.status(400).json({ error: 'Verification required' });
  }

  // --- Sanitize and validate ---
  const cleanBody = sanitizeBody(req.body);
  if (!cleanBody) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  if (!cleanBody.email || !cleanBody.email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // --- Fail closed on missing CRM webhook URL ---
  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[CPC API] GHL_WEBHOOK_URL not configured');
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  // --- Forward to CRM ---
  let webhookOk = false;
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanBody),
    });
    webhookOk = response.ok;
  } catch (err) {
    console.error('[CPC API] Proxy error:', err?.message);
    // Fall through to Supabase persist so the lead still lands somewhere.
  }

  // --- Persist to Supabase so the lead surfaces on the main-site admin
  //     dashboard's Leads tab alongside main-quiz submissions. Uses the
  //     PostgREST endpoint directly (no SDK dependency — this is a
  //     static/serverless project without a package.json). Best-effort:
  //     we don't fail the request if Supabase is down, since the webhook
  //     already delivered to GHL. ---
  persistToSupabase(cleanBody).catch((e) =>
    console.error('[CPC API] Supabase persist failed:', e?.message));

  if (!webhookOk) {
    return res.status(502).json({ error: 'Failed to reach CRM' });
  }
  return res.status(200).json({ success: true });
}

/** Map sibling form's leadTier ('cold/warm/hot/priority') to the
 *  main-site UrgencyTier ('low/moderate/elevated/urgent'). */
function mapLeadTier(siblingTier) {
  switch ((siblingTier || '').toLowerCase()) {
    case 'priority': return 'urgent';
    case 'hot':      return 'elevated';
    case 'warm':     return 'moderate';
    case 'cold':     return 'low';
    default:         return null;
  }
}

/** Map sibling form's free-form "situation" array into our obstacles
 *  keyword buckets. Falls back to the raw lowercased tokens so the
 *  admin still sees context even if we can't categorize them. */
function mapSituationsToObstacles(situation) {
  if (!situation) return [];
  const tokens = Array.isArray(situation)
    ? situation
    : String(situation).split(/[,;\n]/);
  const out = new Set();
  for (const raw of tokens) {
    const s = String(raw).toLowerCase().trim();
    if (!s) continue;
    if (s.includes('collect') || s.includes('medical'))      out.add('medical');
    else if (s.includes('late') || s.includes('missed'))     out.add('late');
    else if (s.includes('bankrupt') || s.includes('lien'))   out.add('bankruptcies');
    else if (s.includes('balance') || s.includes('utiliz'))  out.add('balances');
    else                                                      out.add('unsure');
  }
  return Array.from(out).slice(0, 10);
}

async function persistToSupabase(lead) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    // Not configured on this Vercel project — skip silently. Admin
    // dashboard will only show main-quiz leads until env is set.
    return;
  }

  const fullName =
    lead.full_name ||
    [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
    null;

  const obstacles = mapSituationsToObstacles(
    lead.situationArray || lead.situation,
  );

  const urgencyScore =
    typeof lead.leadScore === 'number' && Number.isFinite(lead.leadScore)
      ? Math.max(0, Math.min(100, Math.round(lead.leadScore)))
      : null;
  const urgencyTier = mapLeadTier(lead.leadTier);
  const recommendedOffer =
    ['diy', 'accelerated', 'executive'].includes(lead.recommendedOffer)
      ? lead.recommendedOffer
      : null;

  const row = {
    email:              lead.email,
    full_name:          fullName,
    phone:              lead.phone || null,
    goal:               lead.goal || null,
    obstacles,
    credit_score_range: lead.score    || null,
    income_range:       null,  // sibling form doesn't ask income
    ideal_score:        null,
    timeline:           lead.timeline || null,
    urgency_score:      urgencyScore,
    urgency_tier:       urgencyTier,
    recommended_offer:  recommendedOffer,
    source:             'form_funnel',
    ghl_delivery:       'webhook_fallback',
    consent:            true,  // form asks explicit consent before submit
  };

  const resp = await fetch(`${supabaseUrl}/rest/v1/lead_submissions`, {
    method: 'POST',
    headers: {
      apikey:          serviceKey,
      Authorization:   `Bearer ${serviceKey}`,
      'Content-Type':  'application/json',
      Prefer:          'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    console.error('[CPC API] Supabase insert failed',
      resp.status, text.slice(0, 300));
  }
}
