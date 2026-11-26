export async function onRequestPost(context) {
  const headers = { "Content-Type": "application/json" };

  try {
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is missing in Cloudflare Pages Settings → Environment variables (Production)." }),
        { status: 500, headers }
      );
    }

    const body = await context.request.json();
    const userPrompt = (body.prompt || "").trim();

    if (!userPrompt) {
      return new Response(
        JSON.stringify({ error: "Please enter instructions or points in the AI Prompt box first." }),
        { status: 400, headers }
      );
    }

    const fullPrompt = `You are drafting an official campus event update for National Skill Training Institute (NSTI) Calicut, Kozhikode, Kerala (under DGT, Ministry of Skill Development and Entrepreneurship, Government of India).

Write a clear, formal, and engaging description based strictly on the user's prompt below:
"${userPrompt}"

Rules:
- Keep it concise (2 to 4 sentences) and ready to publish on the institute portal and WhatsApp.
- Do not include hashtags, markdown symbols (like ** or #), or introductory filler.`;

    const models = ["gemini-flash-latest", "gemini-2.5-flash-lite"];
    let lastError = "Unknown Gemini API error";

    for (const model of models) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 300
            }
          })
        }
      );

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const caption = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (caption) {
          return new Response(JSON.stringify({ caption }), { status: 200, headers });
        }
      } else {
        const errData = await geminiRes.json().catch(() => ({}));
        lastError = errData?.error?.message || `HTTP ${geminiRes.status}`;
      }
    }

    return new Response(
      JSON.stringify({ error: `Gemini API failed: ${lastError}` }),
      { status: 502, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unexpected server error" }),
      { status: 500, headers }
    );
  }
}
