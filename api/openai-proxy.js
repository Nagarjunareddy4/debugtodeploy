export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Auth check: require a valid Supabase user token ---
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing authentication token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  // Verify token with Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let userId = null;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session. Please log in again.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = await userRes.json();
    userId = userData?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Could not identify user.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (authErr) {
    console.error('Auth check failed:', authErr);
    return new Response(JSON.stringify({ error: 'Authentication service unavailable. Please try again.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Path validation ---
  const url = new URL(req.url);
  const path = url.searchParams.get('path');

  if (!path || !['v1/chat/completions'].includes(path)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing path parameter.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Body validation: only allow safe models ---
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body. Expected JSON.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o'];
  if (!ALLOWED_MODELS.includes(body?.model)) {
    return new Response(JSON.stringify({ error: `Model '${body?.model}' is not permitted.` }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- OpenAI API Key ---
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error: Missing API key.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetUrl = `https://api.openai.com/${path}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', 'application/json');
    resHeaders.set('Access-Control-Allow-Origin', '*');

    const responseBody = await response.text();

    return new Response(responseBody, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (error) {
    console.error('OpenAI proxy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to reach AI service. Please try again in a moment.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
