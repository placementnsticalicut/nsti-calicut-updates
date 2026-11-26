export async function onRequestPost(context) {
  try {
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured in Cloudflare Pages." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await context.request.json();
    const title = (body.title || "").trim();
    const notes = (body.notes || "").trim();

    if (!title && !notes) {
      return new Response(
        JSON.stringify({ error: "Title or notes required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = `Write a concise, formal, and engaging 2-to-3 sentence campus event update caption for National Skill Training Institute (NSTI) Calicut, Kozhikode, Kerala (under DGT, Ministry of Skill Development and Entrepreneurship, Government of India).
Event Title: ${title || "Campus Event"}
Brief Notes: ${notes || "None provided"}

Rules:
- Keep it clear, respectful, and suitable for sharing on the institute website and WhatsApp.
- Do not include hashtags, markdown formatting, or introductory labels.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 220
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: `Gemini API error (${geminiRes.status}): ${errText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await geminiRes.json();
    const caption = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return new Response(
      JSON.stringify({ caption }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unexpected server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
