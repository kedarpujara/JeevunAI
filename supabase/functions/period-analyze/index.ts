// supabase/functions/period-analyze/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log('[period-analyzer] boot. has OPENAI_API_KEY?', !!Deno.env.get('OPENAI_API_KEY'));

const SYSTEM_PROMPT = `You are an expert journal period analyzer. Analyze the given journal entries from a specific time period and provide comprehensive insights.

IMPORTANT: 
- Base your analysis ONLY on the actual content provided
- Write in second person (addressing "you" directly) as if speaking to the journal owner
- Use present tense when describing patterns and past tense for specific events
- Be supportive and encouraging while remaining accurate to the content

For periods with meaningful content:
- For single days with multiple entries: Focus on creating a cohesive narrative of the day, identifying themes, and capturing emotional arc
- For longer periods (weeks/months): Focus on major themes, emotional trends, key relationships, significant events, and personal development insights

For periods with little or no meaningful content:
- Acknowledge the limited data available
- Avoid negative assumptions about the person's life
- Focus on encouraging continued journaling
- Use neutral, supportive language

Return ONLY valid JSON in this format:
{
  "title": "Concise descriptive title (2-6 words)",
  "summary": "2-3 sentence narrative summary based on actual content",
  "emotions": ["emotions actually expressed in entries"],
  "themes": ["themes actually present in content"],
  "people": ["people actually mentioned"],
  "places": ["locations actually mentioned"],
  "activities": ["activities actually described"],
  "mood_trend": "improving|declining|stable|mixed",
  "insights": ["insights based on actual content"],
  "highlights": ["positive moments actually described"],
  "challenges": ["challenges actually mentioned"],
  "overall_sentiment": "very_positive|positive|neutral|negative|very_negative"
}`;


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
  periodType: 'day' | 'week' | 'month' | 'custom';
  startDate: string;
  endDate: string;
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
    const { entries, periodType, startDate, endDate }: AnalysisRequest = await req.json();

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ error: "No entries provided" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS },
      });
    }

    // Prepare the analysis prompt
    const periodDescription = `Period: ${periodType} from ${startDate} to ${endDate}`;
    const entryCount = entries.length;
    
    // Format entries for analysis
    const entriesText = entries.map((entry, index) => {
      const date = new Date(entry.createdAt).toLocaleDateString();
      const time = new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `Entry ${index + 1} (${date} at ${time}):
Title: ${entry.title || 'Untitled'}
${entry.mood ? `Mood: ${entry.mood}/5` : ''}
${entry.location ? `Location: ${entry.location}` : ''}
${entry.tags?.length ? `Tags: ${entry.tags.join(', ')}` : ''}
Content: ${entry.content}
---`;
    }).join('\n\n');

    const avgMood = entries
      .filter(e => e.mood)
      .reduce((sum, e) => sum + (e.mood || 0), 0) / entries.filter(e => e.mood).length;

    const userPrompt = `${periodDescription}
Total entries: ${entryCount}
${avgMood ? `Average mood: ${avgMood.toFixed(1)}/5` : ''}

Journal Entries:
${entriesText}

Please analyze this ${periodType} and provide comprehensive insights focusing on the overall narrative, emotional journey, and key themes.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 800, // More tokens for comprehensive analysis
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
    } catch (parseError) {
      console.log('JSON parse error:', parseError);
      parsed = {};
    }

    // Ensure we have valid defaults
    const out = {
      title: parsed.title || `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} Summary`,
      summary: parsed.summary || "A period of journaling and reflection.",
      emotions: Array.isArray(parsed.emotions) ? parsed.emotions : [],
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
      places: Array.isArray(parsed.places) ? parsed.places : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      mood_trend: parsed.mood_trend || "stable",
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
      overall_sentiment: parsed.overall_sentiment || "neutral",
      // Additional metadata
      entry_count: entryCount,
      period_type: periodType,
      start_date: startDate,
      end_date: endDate,
      average_mood: avgMood || null,
    };

    return new Response(JSON.stringify(out), {
      headers: { "content-type": "application/json", ...CORS },
    });
  } catch (err) {
    console.error('Period analysis error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS },
    });
  }
});