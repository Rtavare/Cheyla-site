/**
 * /api/draft — KV-backed draft storage
 *
 * GET    /api/draft  → read draft from KV (returns {draft:null} if none)
 * POST   /api/draft  → write content to KV
 * DELETE /api/draft  → remove draft from KV (called after successful publish)
 *
 * Requires binding: DRAFT_KV (KV namespace: cheyla-drafts)
 * Bound to: cheyla-admin Pages project → Settings → Functions → KV namespace bindings
 *
 * Previously used MEDIA_BUCKET (R2) which made draft.json publicly accessible
 * at media.cheylajtavarez.com/draft.json. KV has no public URL — drafts are
 * now private and only reachable through this Pages Function.
 */

const DRAFT_KEY = "draft";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── GET — load draft ──────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DRAFT_KV) {
    return json({ error: "DRAFT_KV binding not configured" }, 500);
  }

  try {
    const data = await env.DRAFT_KV.get(DRAFT_KEY, { type: "json" });
    return json({ draft: data ?? null });
  } catch (e) {
    return json({ error: `Failed to read draft: ${e.message}` }, 500);
  }
}

// ── POST — save draft ─────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DRAFT_KV) {
    return json({ error: "DRAFT_KV binding not configured" }, 500);
  }

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
    await env.DRAFT_KV.put(DRAFT_KEY, JSON.stringify(content));
    return json({ success: true, savedAt: new Date().toISOString() });
  } catch (e) {
    return json({ error: `Failed to save draft: ${e.message}` }, 500);
  }
}

// ── DELETE — clear draft after publish ────────────────────────────────────────
export async function onRequestDelete(context) {
  const { env } = context;

  if (!env.DRAFT_KV) {
    return json({ error: "DRAFT_KV binding not configured" }, 500);
  }

  try {
    await env.DRAFT_KV.delete(DRAFT_KEY);
    return json({ success: true });
  } catch (e) {
    return json({ error: `Failed to delete draft: ${e.message}` }, 500);
  }
}
