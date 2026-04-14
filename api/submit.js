/**
 * Vercel Serverless Function — proxies form submissions to CRM.
 * Set GHL_WEBHOOK_URL in Vercel Dashboard → Settings → Environment Variables.
 */

const ALLOWED_FIELDS = new Set([
  'first_name', 'last_name', 'full_name', 'email', 'phone',
  'goal', 'situation', 'score', 'timeline', 'blocker',
  'profile', 'painLevel', 'urgency',
  'leadScore', 'leadTier', 'recommendedOffer',
]);

const MAX_BODY_SIZE = 4096; // bytes

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const clean = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (typeof value === 'string') {
      clean[key] = value.slice(0, 500); // cap field length
    } else if (typeof value === 'number') {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Origin check — only allow requests from our domains
  const origin = req.headers.origin || '';
  const allowed = [
    'form.cleanpathcredit.com',
    'clean-path-credit-free-analysis-for.vercel.app',
  ];
  // Allow localhost in development
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  const isAllowed = allowed.some(d => origin.includes(d)) || isLocal;
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Validate body size
  const rawBody = JSON.stringify(req.body || {});
  if (rawBody.length > MAX_BODY_SIZE) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  // Validate and sanitize input
  const cleanBody = sanitizeBody(req.body);
  if (!cleanBody) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Require at minimum an email
  if (!cleanBody.email || !cleanBody.email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[CPC API] Webhook URL not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanBody),
    });

    return res.status(response.ok ? 200 : 502).json({
      success: response.ok,
    });
  } catch (err) {
    console.error('[CPC API] Proxy error:', err.message);
    return res.status(502).json({ error: 'Failed to reach CRM' });
  }
}
