// api/proxy.js
const UPSTREAM = 'https://script.google.com/macros/s/AKfycbwdsTMmq9coKSp73Nllb3O49_X5l1F9PA8ADY5tQiIGYnRWJJ45hXCjmwU70ycuwi0/exec';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Start with query params
    const params = { ...(req.query || {}) };
    // Merge POST body if present
    if (req.method === 'POST') {
      let bodyObj = {};
      if (req.body && typeof req.body === 'object') {
        bodyObj = req.body;
      } else if (typeof req.body === 'string') {
        const ctype = (req.headers['content-type'] || '').toLowerCase();
        if (ctype.includes('application/json')) {
          try { bodyObj = JSON.parse(req.body); } catch (_) { bodyObj = {}; }
        } else if (ctype.includes('application/x-www-form-urlencoded')) {
          const usp = new URLSearchParams(req.body);
          usp.forEach((v, k) => { bodyObj[k] = v; });
        }
      }
      Object.assign(params, bodyObj);
    }
    const query = new URLSearchParams(params).toString();
    const target = `${UPSTREAM}?${query}`;

    const upstreamRes = await fetch(target);
    const text = await upstreamRes.text();

    // Forward upstream status but always include CORS headers
    res.status(upstreamRes.status).send(text);
  } catch (err) {
    res.status(502).send('Proxy error');
  }
}