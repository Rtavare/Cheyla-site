/**
 * POST /api/publish
 * Receives the full content object from the CMS, base64-encodes it,
 * and commits it to content.json in the Cheyla-site repo via GitHub API.
 *
 * Required environment variable (set as a Cloudflare Pages secret):
 *   GITHUB_TOKEN  — a GitHub Personal Access Token with repo write access
 */

/** Preflight support for localhost dev */
export async function onRequestOptions(context) {
  const origin = context.request.headers.get("Origin") || "";
  if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // ── CORS: exact hostname match (substring check can be spoofed) ──────────
  const origin = request.headers.get("Origin") || "";
  if (!isAllowedOrigin(origin)) {
    return json({ error: "Forbidden" }, 403, "");
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  const { content } = body;
  if (!content || typeof content !== "object") {
    return json({ error: "Missing content field" }, 400, origin);
  }

  const TOKEN = env.GITHUB_TOKEN;
  if (!TOKEN) {
    return json({ error: "GITHUB_TOKEN not configured" }, 500, origin);
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
    return json({ error: `GitHub read error: ${err}` }, 502, origin);
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
    return json({ error: `GitHub write error: ${err}` }, 502, origin);
  }

  const result = await putRes.json();
  return json({
    success: true,
    commit:  result.commit?.html_url || null,
  }, 200, origin);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function isAllowedOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname === "admin.cheylajtavarez.com" || hostname === "localhost";
  } catch {
    return false;
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":  origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(origin ? corsHeaders(origin) : {}),
    },
  });
}

function b64encode(str) {
  // Unicode-safe base64 encoding (GitHub API requires base64)
  const bytes  = new TextEncoder().encode(str);
  let binary   = "";
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}
