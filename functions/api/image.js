export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const dateParam = url.searchParams.get("d");
  const projectId = context.env.FIREBASE_PROJECT_ID;
  if (!dateParam || !projectId) {
    return new Response("Missing parameters", { status: 400 });
  }

  try {
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/updates/${encodeURIComponent(dateParam)}`;
    const res = await fetch(fsUrl);
    if (!res.ok) return new Response("Not found", { status: 404 });

    const doc = await res.json();
    const dataUrl = doc.fields?.collageData?.stringValue || "";
    const base64 = dataUrl.split(",")[1];
    if (!base64) return new Response("No image", { status: 404 });

    const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return new Response(binary, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}