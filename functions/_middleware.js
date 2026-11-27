function escapeAttr(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\s+/g, " ")
    .trim();
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = (url.searchParams.get("id") || "").trim();

  if (url.pathname !== "/" || !id) {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  try {
    const fsUrl = `https://firestore.googleapis.com/v1/projects/nsticalicuteventsupdate/databases/(default)/documents/updates/${encodeURIComponent(id)}`;
    const fsRes = await fetch(fsUrl);
    if (!fsRes.ok) {
      return response;
    }

    const doc = await fsRes.json();
    const fields = doc.fields || {};
    const title = escapeAttr(fields.title?.stringValue || "NSTI Calicut — Campus Update");
    const desc = escapeAttr(
      (fields.description?.stringValue || "National Skill Training Institute Calicut, Kozhikode, Keralam/DGT/MSDE").slice(0, 220)
    );
    const photoIdx = parseInt(url.searchParams.get("photo") || "0", 10) || 0;
    const ogImage = `${url.origin}/api/og-image?id=${encodeURIComponent(id)}&photo=${photoIdx}`;
    const pageUrl = escapeAttr(url.toString());

    const ogTags = `
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="NSTI Calicut — Campus Updates & Events" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${ogImage}" />
</head>`;

    let html = await response.text();
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title} — NSTI Calicut</title>`);
    html = html.replace("</head>", ogTags);

    const newHeaders = new Headers(response.headers);
    newHeaders.delete("content-length");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (err) {
    return response;
  }
}
