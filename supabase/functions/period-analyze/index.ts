// supabase/functions/period-analyze/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const VERSION = "period-analyze@v2-2p-enforced";

console.log(
  "[period-analyzer] boot",
  { hasKey: !!Deno.env.get("OPENAI_API_KEY"), VERSION },
);

const SYSTEM_PROMPT = `
You are a warm, insightful friend reviewing someone's journals. Your job is to reflect their period in a caring, conversational way.

NON-NEGOTIABLE VOICE RULES (SECOND PERSON):
- Address the user directly as "you" and "your" in EVERY sentence (bullets included).
- NEVER use third-person references like "the author", "the writer", "they", "this person", or impersonal narration like "the week centered around...".
- If any sentence is not in second person, REWRITE it to second person BEFORE returning your answer.

TONE:
- Supportive, specific, human. Celebrate small wins and acknowledge challenges with empathy.
- Reference concrete details from the entries (names, places, activities, phrases). Never invent facts.

STRICT OUTPUT FORMAT — return ONLY valid JSON:
{
  "title": "2–6 words, personal (e.g., 'You Kept Showing Up')",
  "summary": "2–4 sentences, second person, warm, specific.",
  "emotions": ["concise emotion words you saw evidence for"],
  "themes": ["short theme nouns"],
  "people": ["names mentioned"],
  "places": ["locations mentioned"],
  "activities": ["things you did"],
  "mood_trend": "improving|declining|stable|mixed",
  "insights": ["each bullet talks to 'you' and is specific"],
  "highlights": ["each bullet is positive and specific, to 'you'"],
  "challenges": ["each bullet names a difficulty with empathy, to 'you'"],
  "overall_sentiment": "very_positive|positive|neutral|negative|very_negative"
}

BANNED/IMPERSONAL (DO NOT USE):
- "The author demonstrates...", "This period shows...", "There is evidence of...",
- "The week centered around...", "The entries reveal..."

ACCEPTABLE EXAMPLES:
- "You kept your streak going even on low-energy days."
- "You leaned on routine, which helped you feel steadier."
- "You mentioned <NAME>, and it’s clear they matter to you."
If any sentence is not second person, rewrite it before returning the JSON.
`;

interface Entry {
  content: string;
  mood?: number;
  title?: string;
  createdAt: string;
  location?: string;
  tags?: string[];
}

interface AnalysisRequest {
  entries: Entry[];
  periodType: "day" | "week" | "month" | "custom";
  startDate: string;
  endDate: string;
}

function fmtEntries(entries: Entry[]) {
  return entries
    .map((entry, i) => {
      const d = new Date(entry.createdAt);
      const date = d.toLocaleDateString();
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return [
        `Entry ${i + 1} — ${date} ${time}`,
        entry.title ? `Title: ${entry.title}` : null,
        entry.mood != null ? `Mood: ${entry.mood}/5` : null,
        entry.location ? `Location: ${entry.location}` : null,
        entry.tags?.length ? `Tags: ${entry.tags.join(", ")}` : null,
        `Content: ${entry.content}`,
      ].filter(Boolean).join("\n");
    })
    .join("\n---\n");
}

function containsImpersonal(text: string): boolean {
  if (!text) return false;
  return /\b(the author|the writer|this person|the entries|the week centered|the month of|this period|the period)\b/i.test(
    text,
  );
}

function anyImpersonal(json: any): boolean {
  const fields: string[] = [];
  if (typeof json.summary === "string") fields.push(json.summary);
  for (const k of ["insights", "highlights", "challenges"]) {
    if (Array.isArray(json[k])) fields.push(json[k].join(" "));
  }
  return containsImpersonal(fields.join(" "));
}

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
    const { entries, periodType, startDate, endDate }: AnalysisRequest =
      await req.json();

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ error: "No entries provided" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS },
      });
    }

    const entryCount = entries.length;
    const entriesText = fmtEntries(entries);

    // Average mood if any
    const moodful = entries.filter((e) => e.mood != null);
    const avgMood =
      moodful.length > 0
        ? moodful.reduce((s, e) => s + (e.mood ?? 0), 0) / moodful.length
        : null;

    const periodLabel =
      periodType === "month"
        ? "this month"
        : periodType === "week"
        ? "this week"
        : periodType === "day"
        ? "today"
        : "this period";

    const userPrompt = `
You are analyzing the user's journals for ${periodLabel} (${startDate} to ${endDate}).
Entry count: ${entryCount}.
${avgMood != null ? `Average mood (if provided): ${avgMood.toFixed(1)}/5.` : ""}

JOURNAL ENTRIES:
---
${entriesText}
---

Write the JSON object exactly as specified in the system message.
IMPORTANT: Write EVERYTHING in second person ("you", "your"). Do not narrate about "the author", "they", "the entries", "this period", etc. If a sentence slips into third person, rewrite it to second person before returning the JSON.

Populate all fields honestly based on the entries. If a field has no evidence, return an empty array for that field. Do not fabricate details.
`;

    async function callOpenAI(messages: any[]) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 900,
          // JSON-only; many models support this flag on chat
          response_format: { type: "json_object" },
          messages,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[period-analyzer] OpenAI error:", txt);
        throw new Error(`OpenAI error: ${txt}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "{}";
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        console.error("[period-analyzer] JSON parse error:", e, content?.slice?.(0, 400));
        parsed = {};
      }
      return parsed;
    }

    // 1st pass
    let draft = await callOpenAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);

    // If model drifted into impersonal tone, request a rewrite once.
    if (anyImpersonal(draft)) {
      const rewritePrompt = `
Your previous draft used impersonal/third-person phrasing. Rewrite it to be 100% second person ("you", "your") in every sentence and bullet. Keep the same structure and facts. Return ONLY the JSON again with the same keys. Here is your draft JSON to rewrite:
${JSON.stringify(draft)}
`;
      draft = await callOpenAI([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rewritePrompt },
      ]);
    }

    // Shape + defaults
    const out = {
      title:
        typeof draft.title === "string" && draft.title.trim()
          ? draft.title
          : `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} Summary`,
      summary:
        typeof draft.summary === "string" && draft.summary.trim()
          ? draft.summary
          : "You showed up to journal this period.",
      emotions: Array.isArray(draft.emotions) ? draft.emotions : [],
      themes: Array.isArray(draft.themes) ? draft.themes : [],
      people: Array.isArray(draft.people) ? draft.people : [],
      places: Array.isArray(draft.places) ? draft.places : [],
      activities: Array.isArray(draft.activities) ? draft.activities : [],
      mood_trend:
        draft.mood_trend && ["improving", "declining", "stable", "mixed"].includes(draft.mood_trend)
          ? draft.mood_trend
          : "stable",
      insights: Array.isArray(draft.insights) ? draft.insights : [],
      highlights: Array.isArray(draft.highlights) ? draft.highlights : [],
      challenges: Array.isArray(draft.challenges) ? draft.challenges : [],
      overall_sentiment:
        draft.overall_sentiment &&
        ["very_positive", "positive", "neutral", "negative", "very_negative"].includes(draft.overall_sentiment)
          ? draft.overall_sentiment
          : "neutral",
      // metadata for client
      entry_count: entryCount,
      period_type: periodType,
      start_date: startDate,
      end_date: endDate,
      average_mood: avgMood,
      _meta: { VERSION },
    };

    // Final safety check (logs only)
    const blob =
      (out.summary ?? "") +
      " " + (out.insights ?? []).join(" ") +
      " " + (out.highlights ?? []).join(" ") +
      " " + (out.challenges ?? []).join(" ");
    if (containsImpersonal(blob)) {
      console.warn("[period-analyzer] Impersonal phrasing slipped through after rewrite.");
    }

    return new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json",
        ...CORS,
        "x-period-analyze-version": VERSION,
      },
    });
  } catch (err) {
    console.error("[period-analyzer] error:", err);
    return new Response(JSON.stringify({ error: String(err), VERSION }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS },
    });
  }
});