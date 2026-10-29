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

// CORS: same exact-match rule as publish.js / upload.js. Mutating
// requests are rejected without an allowed Origin; reads only reject
// when an Origin is present and not allowed (non-browser and
// same-origin GET clients do not always send one, and every admin
// route is already behind Cloudflare Zero Trust).
function originAllowed(request, { mutating = false } = {}) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin === "https://admin.cheylajtavarez.com" ||
                  /^https?:\/\/localhost(:\d+)?$/.test(origin);
  if (allowed) return true;
  if (!origin && !mutating) return true;
  return false;
}


function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── GET — load draft ──────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  const { request, env } = context;

  if (!originAllowed(request)) {
    return json({ error: "Forbidden" }, 403);
  }

  if (!env.DRAFT_KV) {
    return json({ error: "DRAFT_KV binding not configured" }, 500);
  }

  try {
    const data = await env.DRAFT_KV.get(DRAFT_KEY, { type: "json" });
    return json({ draft: data ?? null });
  } catch (e) {
    console.error("Failed to read draft:", e);
    return json({ error: "Failed to read draft. Please try again." }, 500);
  }
}

// ── POST — save draft ─────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!originAllowed(request, { mutating: true })) {
    return json({ error: "Forbidden" }, 403);
  }

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
    console.error("Failed to save draft:", e);
    return json({ error: "Failed to save draft. Please try again." }, 500);
  }
}

// ── DELETE — clear draft after publish ────────────────────────────────────────
export async function onRequestDelete(context) {
  const { request, env } = context;

  if (!originAllowed(request, { mutating: true })) {
    return json({ error: "Forbidden" }, 403);
  }

  if (!env.DRAFT_KV) {
    return json({ error: "DRAFT_KV binding not configured" }, 500);
  }

  try {
    await env.DRAFT_KV.delete(DRAFT_KEY);
    return json({ success: true });
  } catch (e) {
    console.error("Failed to delete draft:", e);
    return json({ error: "Failed to delete draft. Please try again." }, 500);
  }
}
