export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // --- Basic Rate Limiting ---
  // Limit to 15 requests per IP per minute
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
  const now = Date.now();
  
  if (!globalThis.rateLimits) {
    globalThis.rateLimits = new Map();
  }
  
  const userRate = globalThis.rateLimits.get(ip) || { count: 0, startTime: now };
  
  // Reset window every minute
  if (now - userRate.startTime > 60000) {
    userRate.count = 1;
    userRate.startTime = now;
  } else {
    userRate.count++;
  }
  
  globalThis.rateLimits.set(ip, userRate);
  
  if (userRate.count > 15) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a minute before making more AI requests.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  // ---------------------------

  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  
  if (!path) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const targetUrl = new URL(`https://api.openai.com/${path}`);

  const headers = new Headers(req.headers);
  headers.delete('host');
  // Avoid passing origin or referer which might cause issues
  headers.delete('referer');
  headers.delete('origin');
  headers.set('Authorization', `Bearer ${apiKey}`);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.body,
    });

    // Create response headers
    const resHeaders = new Headers();
    // Copy necessary headers
    if (response.headers.has('content-type')) {
      resHeaders.set('content-type', response.headers.get('content-type'));
    }

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to proxy request to OpenAI' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
