/**
 * GET /api/content
 * Reads content.json from the Cheyla-site repo via GitHub API
 * using the stored GITHUB_TOKEN secret (works for private repos).
 */
export async function onRequestGet(context) {
  const { env } = context;

  const TOKEN = env.GITHUB_TOKEN;
  if (!TOKEN) {
    return json({ error: "GITHUB_TOKEN not configured" }, 500);
  }

  const res = await fetch(
    "https://api.github.com/repos/Rtavare/Cheyla-site/contents/content.json",
    {
      headers: {
        Authorization:  `token ${TOKEN}`,
        "User-Agent":   "cheyla-cms/1.0",
        Accept:         "application/vnd.github.v3+json",
        "Cache-Control": "no-cache",
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return json({ error: `GitHub API error: ${err}` }, 502);
  }

  const data = await res.json();

  // GitHub returns file content as base64 — decode it
  const decoded = atob(data.content.replace(/\n/g, ""));

  return new Response(decoded, {
    headers: {
      "Content-Type":  "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
