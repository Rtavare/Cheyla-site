/**
 * /api/draft — R2-backed draft storage
 *
 * GET    /api/draft  → read draft.json from R2 (returns {draft:null} if none)
 * POST   /api/draft  → write content to draft.json in R2
 * DELETE /api/draft  → remove draft.json (called after successful publish)
 *
 * Requires binding: MEDIA_BUCKET (R2 bucket: cheyla-media)
 */

const DRAFT_KEY = "draft.json";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── GET — load draft ──────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const obj = await env.MEDIA_BUCKET.get(DRAFT_KEY);
    if (!obj) return json({ draft: null });

    const text = await obj.text();
    const data = JSON.parse(text);
    return json({ draft: data });
  } catch (e) {
    return json({ error: `Failed to read draft: ${e.message}` }, 500);
  }
}

// ── POST — save draft ─────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { content } = body;
  if (!content || typeof content !== "object") {
    return json({ error: "Missing content field" }, 400);
  }

  try {
    await env.MEDIA_BUCKET.put(
      DRAFT_KEY,
      JSON.stringify(content, null, 2),
      { httpMetadata: { contentType: "application/json" } }
    );
    return json({ success: true, savedAt: new Date().toISOString() });
  } catch (e) {
    return json({ error: `Failed to save draft: ${e.message}` }, 500);
  }
}

// ── DELETE — clear draft after publish ────────────────────────────────────────
export async function onRequestDelete(context) {
  const { env } = context;

  try {
    await env.MEDIA_BUCKET.delete(DRAFT_KEY);
    return json({ success: true });
  } catch (e) {
    return json({ error: `Failed to delete draft: ${e.message}` }, 500);
  }
}
