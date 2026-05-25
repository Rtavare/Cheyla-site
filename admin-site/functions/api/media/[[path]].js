/**
 * GET /api/media/:key
 * Proxy-serves files from the bound R2 bucket (MEDIA_BUCKET).
 *
 * NOTE: This endpoint is behind Cloudflare Zero Trust, so it is only
 * reachable from the admin site. It is useful for previewing uploads
 * in the CMS editor. To make media publicly accessible on the main site
 * set MEDIA_PUBLIC_URL (e.g. your R2 public bucket domain or r2.dev URL)
 * in the Pages project environment variables — the upload function will
 * then return those public URLs automatically.
 */

export async function onRequest(context) {
  const { params, env } = context;

  const BUCKET = env.MEDIA_BUCKET;
  if (!BUCKET) {
    return new Response("MEDIA_BUCKET binding not configured", { status: 500 });
  }

  // Reconstruct the key from wildcard path segments
  const key = Array.isArray(params.path)
    ? params.path.join("/")
    : (params.path || "");

  if (!key) return new Response("Not found", { status: 404 });

  const obj = await BUCKET.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "Content-Type":  obj.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": obj.size?.toString() ?? "",
    },
  });
}
