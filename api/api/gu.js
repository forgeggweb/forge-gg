/**
 * /api/gu.js
 * Proxy serverless para la Gods Unchained API.
 * Uso: GET /api/gu?path=/user/4874297
 *      GET /api/gu?path=/match%3Fuser_id%3D4874297%26perPage%3D20%26page%3D1
 */

const GU_BASE = 'https://api.godsunchained.com/v0';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  const { path } = req.query;

  if (!path) {
    return res.status(400).json({ error: 'Missing ?path= parameter' });
  }

  // Validate: only allow calls to GU API paths (no SSRF)
  const cleanPath = decodeURIComponent(path);
  if (cleanPath.includes('..') || !cleanPath.startsWith('/')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const targetUrl = GU_BASE + cleanPath;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'forge-gg/1.0',
      },
      signal: AbortSignal.timeout(12000),
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const body = await upstream.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

    return res.status(upstream.status).send(body);

  } catch (err) {
    console.error('[gu-proxy] fetch error:', err.message);
    return res.status(502).json({
      error: 'Upstream request failed',
      details: err.message,
    });
  }
}
