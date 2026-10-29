/**
 * POST /api/publish
 * Receives the full content object from the CMS, base64-encodes it,
 * and commits it to content.json in the Cheyla-site repo via GitHub API.
 *
 * Required environment variable (set as a Cloudflare Pages secret):
 *   GITHUB_TOKEN  — a GitHub Personal Access Token with repo write access
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // ── CORS: only allow requests from the admin subdomain ──────────────────
  const origin = request.headers.get("Origin") || "";
  const allowed = origin === "https://admin.cheylajtavarez.com" ||
                  /^https?:\/\/localhost(:\d+)?$/.test(origin);
  if (!allowed) {
    return json({ error: "Forbidden" }, 403);
  }

  // ── Parse body ───────────────────────────────────────────────────────────
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

  // ── Server-side validation (the CMS UI checks are not a boundary) ──
  if (JSON.stringify(content).length > 1_000_000) {
    return json({ error: "Content is too large to publish (max 1 MB)." }, 413);
  }
  const validationError = validateContent(content);
  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const TOKEN = env.GITHUB_TOKEN;
  if (!TOKEN) {
    return json({ error: "GITHUB_TOKEN not configured" }, 500);
  }

  const REPO      = "Rtavare/Cheyla-site";
  const FILE_PATH = "content.json";
  const BRANCH    = "main";
  const API_BASE  = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
  const HEADERS   = {
    Authorization:  `token ${TOKEN}`,
    "User-Agent":   "cheyla-cms/1.0",
    Accept:         "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  // ── Get current file SHA (required by GitHub API for updates) ────────────
  const getRes = await fetch(API_BASE, { headers: HEADERS });
  if (!getRes.ok) {
    const err = await getRes.text();
    console.error("GitHub read error (GET sha):", err);
    return json({ error: "Could not read current content. Please try again." }, 502);
  }
  const { sha } = await getRes.json();

  // ── Encode content as base64 ──────────────────────────────────────────────
  const jsonString = JSON.stringify(content, null, 2);
  const encoded    = b64encode(jsonString);

  // ── Commit the update ─────────────────────────────────────────────────────
  const putRes = await fetch(API_BASE, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({
      message: `Update site content via Cheyla CMS [${new Date().toISOString()}]`,
      content: encoded,
      sha,
      branch: BRANCH,
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    console.error("GitHub write error (PUT content):", err);
    return json({ error: "Could not publish content. Please try again." }, 502);
  }

  const result = await putRes.json();
  return json({
    success: true,
    commit:  result.commit?.html_url || null,
  });
}

// ── Content validation ─────────────────────────────────────────────────────
// Slugs were previously only enforced by an oninput handler in the CMS
// UI (fix #9); a direct API call could publish any id. URL fields were
// likewise only scheme-checked in the rich-text toolbar. Enforce both
// here, where the write actually happens.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function isSafeHref(v) {
  return typeof v === "string" &&
    /^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(v.trim());
}
function isSafeSrc(v) {
  return typeof v === "string" &&
    /^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|gif|webp|avif);)/i.test(v.trim());
}
function validateContent(content) {
  const pages = Array.isArray(content.pages) ? content.pages : [];
  const seenSlugs = new Set();
  for (const page of pages) {
    const id = (page && page.id) || "";
    if (page && page.published && !SLUG_RE.test(id)) {
      return `Page "${page.title || id || "untitled"}" must have a valid slug (lowercase letters, numbers, hyphens) before it can be published.`;
    }
    if (id && !SLUG_RE.test(id)) {
      return `Invalid page slug: "${id}". Use lowercase letters, numbers and hyphens only.`;
    }
    if (id && seenSlugs.has(id)) {
      return `Duplicate page slug: "${id}". Each page needs its own slug.`;
    }
    if (id) seenSlugs.add(id);
  }
  const hrefFields = [];
  for (const l of content.nav?.links || []) hrefFields.push(["Navigation link", l.href]);
  if (content.hero?.cta_primary?.href) hrefFields.push(["Hero primary button", content.hero.cta_primary.href]);
  if (content.hero?.cta_secondary?.href) hrefFields.push(["Hero secondary button", content.hero.cta_secondary.href]);
  for (const post of content.posts || []) {
    if (post.link) hrefFields.push(["Post link", post.link]);
    if (post.video_url) hrefFields.push(["Post video URL", post.video_url]);
  }
  for (const [label, href] of hrefFields) {
    if (!isSafeHref(href)) return `${label} has an unsafe URL: "${href}". Only https://, http://, /, # , mailto: and tel: links are allowed.`;
  }
  const srcFields = [];
  if (content.hero?.image) srcFields.push(["Hero image", content.hero.image]);
  for (const card of content.focus?.cards || []) if (card.image) srcFields.push(["Highlight card image", card.image]);
  for (const post of content.posts || []) if (post.image) srcFields.push(["Post image", post.image]);
  for (const [label, src] of srcFields) {
    if (!isSafeSrc(src)) return `${label} has an unsafe image URL.`;
  }
  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function b64encode(str) {
  // Unicode-safe base64 encoding
  const bytes  = new TextEncoder().encode(str);
  let binary   = "";
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}
