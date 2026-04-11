/**
 * Vercel Serverless Function — proxies form submissions to GoHighLevel.
 * The webhook URL is stored in the Vercel environment variable GHL_WEBHOOK_URL.
 *
 * Set it in Vercel Dashboard → Settings → Environment Variables:
 *   GHL_WEBHOOK_URL = https://services.leadconnectorhq.com/hooks/da0KTegxFQ62eqS73TQv/webhook-trigger/73b8546c-54a7-491f-ae2c-8575e976fc34
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Origin check — only allow requests from our domains
  const origin = req.headers.origin || req.headers.referer || '';
  const allowed = [
    'form.cleanpathcredit.com',
    'clean-path-credit-free-analysis-for.vercel.app',
    'localhost',
  ];
  const isAllowed = allowed.some(d => origin.includes(d));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[CPC API] GHL_WEBHOOK_URL not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    return res.status(response.ok ? 200 : 502).json({
      success: response.ok,
      status: response.status,
    });
  } catch (err) {
    console.error('[CPC API] Webhook proxy error:', err);
    return res.status(502).json({ error: 'Failed to reach CRM' });
  }
}
