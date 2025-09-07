// deno.json should map std@0.224.0 server import
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  try {
    const { method } = req;
    if (method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Expected application/json' }), { status: 415 });
    }
    const body = await req.json();
    // Basic shape: { events: [{ ts, level, message, extra, ctx }] }
    // You can store to DB or log to console for now:
    console.log('[client-log]', JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error('[client-log] error', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
});