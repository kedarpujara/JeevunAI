// supabase/functions/journal-analyze/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log('[ai-analyzer] boot. has OPENAI_API_KEY?', !!Deno.env.get('OPENAI_API_KEY'));


const SYSTEM_PROMPT = `You are an expert journal analyzer. Analyze the given journal entry and provide:
1. A concise, meaningful title (2-4 words that capture the essence)
2. Up to 10 relevant tags for future analysis

Tags should cover:
- Emotions/feelings (happy, sad, anxious, grateful, etc.)
- Activities (work, exercise, social, travel, etc.)
- Themes (family, relationships, health, achievement, etc.)
- Time context (morning, evening, weekend, etc.)
- Topics (specific subjects mentioned)
- Sentiment (overall mood)

Return ONLY valid JSON in this format:
{
  "title": "Brief Title Here",
  "tags": ["tag1", "tag2", "tag3", ...],
  "sentiment": "positive|negative|neutral|mixed",
  "themes": ["theme1", "theme2"]
}`;

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
    const { content, mood, hasPhotos, location } = await req.json();

    const userPrompt =
      `Journal Entry: "${content ?? ""}"\n` +
      (mood ? `Mood Score: ${mood}/5\n` : "") +
      (hasPhotos ? `Includes photos\n` : "") +
      (location ? `Location: ${location}\n` : "");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Use a lightweight, inexpensive model:
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: "OpenAI error", detail: txt }), {
        status: res.status,
        headers: { "content-type": "application/json", ...CORS },
      });
    }

    const data = await res.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    const out = {
      title: parsed.title || "Daily Entry",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
      sentiment: parsed.sentiment || "neutral",
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    };

    return new Response(JSON.stringify(out), {
      headers: { "content-type": "application/json", ...CORS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS },
    });
  }
});