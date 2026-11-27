export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = (url.searchParams.get("id") || "").trim();
  const photoIdx = parseInt(url.searchParams.get("photo") || "0", 10) || 0;

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  try {
    const fsUrl = `https://firestore.googleapis.com/v1/projects/nsticalicuteventsupdate/databases/(default)/documents/updates/${encodeURIComponent(id)}`;
    const res = await fetch(fsUrl);
    if (!res.ok) {
      return new Response("Event not found", { status: 404 });
    }

    const doc = await res.json();
    const fields = doc.fields || {};
    const mainImg = fields.imageUrl?.stringValue || "";
    const rawPhotos = (fields.photos?.arrayValue?.values || [])
      .map((v) => v.stringValue || "")
      .filter(Boolean);

    const gallery = [];
    if (mainImg) gallery.push(mainImg);
    rawPhotos.forEach((src) => {
      if (src && src !== mainImg) gallery.push(src);
    });

    const selected = gallery[photoIdx] || gallery[0] || "";
    if (!selected) {
      return new Response("No image available", { status: 404 });
    }

    if (selected.startsWith("http")) {
      return Response.redirect(selected, 302);
    }

    const commaIdx = selected.indexOf(",");
    if (commaIdx === -1) {
      return new Response("Invalid image format", { status: 400 });
    }

    const meta = selected.slice(0, commaIdx);
    const b64 = selected.slice(commaIdx + 1);
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (err) {
    return new Response("Image error: " + err.message, { status: 500 });
  }
}
