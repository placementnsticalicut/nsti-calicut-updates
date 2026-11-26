export async function onRequestPost(context) {
  try {
    const { intention, date, tone, useEmojis, images = [] } = await context.request.json();
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "GEMINI_API_KEY is not configured in Cloudflare." }, { status: 500 });
    }

    const emojiInstruction = useEmojis
      ? "Include 1–2 tasteful, relevant emojis in the summary and each caption."
      : "Do NOT include any emojis.";

    const toneInstruction = tone === "official"
      ? "Use formal, clear, institutional language appropriate for a Government of India (DGT/MSDE) training institute official group."
      : "Use warm, inspiring, community-friendly language.";

    const prompt = `You are writing social/group update copy for National Skill Training Institute (NSTI) Calicut for date ${date}.
Admin's event intention: "${intention}"
Number of photos uploaded: ${images.length}

Rules:
- ${toneInstruction}
- ${emojiInstruction}
- Write 1 concise event summary (2 sentences max) suitable for the top of the update page.
- Write 1 distinct, informative single-sentence caption for each of the ${images.length} photos based on what is visible in each photo and the event intention.
- Return ONLY valid JSON matching this schema:
{"summary": "...", "captions": ["caption 1", "caption 2"]}`;

    const parts = [{ text: prompt }];
    for (const b64 of images) {
      parts.push({
        inline_data: { mime_type: "image/jpeg", data: b64 }
      });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    const result = await geminiRes.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return Response.json({ error: "No response from Gemini API." }, { status: 502 });
    }

    const parsed = JSON.parse(rawText);
    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}