// supabase/functions/whisper-transcribe/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log('[whisper-transcribe] boot. has OPENAI_API_KEY?', !!Deno.env.get('OPENAI_API_KEY'));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS },
    });
  }

  try {
    // Expect multipart/form-data with a "file"
    const inForm = await req.formData();
    const file = inForm.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS },
      });
    }

    // Build a fresh FormData for OpenAI
    const outForm = new FormData();
    outForm.append("file", file, file.name || "audio.m4a");
    // Use whichever model you prefer:
    // - "whisper-1" (legacy)
    // - "gpt-4o-mini-transcribe" (new)
    outForm.append("model", "gpt-4o-mini-transcribe");

    const oaiRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: outForm,
      },
    );

    if (!oaiRes.ok) {
      const txt = await oaiRes.text();
      return new Response(
        JSON.stringify({ error: "OpenAI error", detail: txt }),
        { status: oaiRes.status, headers: { "content-type": "application/json", ...CORS } },
      );
    }

    const data = await oaiRes.json();
    // OpenAI returns { text: "…" }
    return new Response(JSON.stringify({ text: data.text ?? "" }), {
      headers: { "content-type": "application/json", ...CORS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS },
    });
  }
});