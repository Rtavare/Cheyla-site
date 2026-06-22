/**
 * POST /api/upload
 * Accepts multipart/form-data with a "file" field.
 * Stores the file in the bound R2 bucket (MEDIA_BUCKET).
 * Returns the public URL using MEDIA_PUBLIC_URL env var if set,
 * otherwise falls back to the /api/media/ proxy endpoint
 * (proxy is only accessible on the admin site — set MEDIA_PUBLIC_URL
 * to your R2 public domain so the main site can display images).
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS guard — only admin domain or localhost
  const origin = request.headers.get("Origin") || "";
  const allowed = origin === "https://admin.cheylajtavarez.com" ||
                  /^https?:\/\/localhost(:\d+)?$/.test(origin);
  if (!allowed) return json({ error: "Forbidden" }, 403);

  const BUCKET = env.MEDIA_BUCKET;
  if (!BUCKET) return json({ error: "MEDIA_BUCKET binding not configured" }, 500);

  // Parse multipart form
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Invalid form data" }, 400);
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return json({ error: "No file provided" }, 400);
  }

  // Allowed types
  const ALLOWED = [
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/gif", "image/svg+xml",
    "video/mp4", "video/webm", "video/quicktime",
  ];
  if (!ALLOWED.includes(file.type)) {
    return json({ error: `File type not allowed: ${file.type}` }, 400);
  }

  // 50 MB limit
  if (file.size > 50 * 1024 * 1024) {
    return json({ error: "File too large (max 50 MB)" }, 400);
  }

  // Build a unique, safe key
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase()
    .slice(0, 120);
  const key = `${Date.now()}-${safeName}`;

  // Upload to R2
  await BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  // Determine public URL
  const base = (env.MEDIA_PUBLIC_URL || "").replace(/\/$/, "");
  const url = base ? `${base}/${key}` : `/api/media/${key}`;

  return json({ success: true, url, key });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
