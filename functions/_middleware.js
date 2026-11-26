export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    return context.next();
  }

  const response = await context.next();
  const projectId = context.env.FIREBASE_PROJECT_ID;
  const dateParam = url.searchParams.get("d");
  if (!projectId || !dateParam) return response;

  try {
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/updates/${encodeURIComponent(dateParam)}`;
    const fsRes = await fetch(fsUrl);
    if (!fsRes.ok) return response;

    const doc = await fsRes.json();
    const fields = doc.fields || {};
    const title = fields.title?.stringValue || `NSTI Calicut updates : ${dateParam}`;
    const summary = fields.summary?.stringValue || "Official event highlights from NSTI Calicut.";
    const imgUrl = `${url.origin}/api/image?d=${encodeURIComponent(dateParam)}`;

    let html = await response.text();
    html = html
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/content="NSTI Calicut Updates"/, `content="${escapeHtml(title)}"`)
      .replace(/content="Official photo updates.*?"/, `content="${escapeHtml(summary)}"`)
      .replace(
        "</head>",
        `<meta property="og:image" content="${escapeHtml(imgUrl)}"><meta name="twitter:card" content="summary_large_image"></head>`
      );

    return new Response(html, {
      headers: { "content-type": "text/html;charset=UTF-8" }
    });
  } catch {
    return response;
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}