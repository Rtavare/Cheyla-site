/**
 * POST /api/contact
 * Proxies contact form submissions to Web3Forms using a server-side key.
 * The WEB3FORMS_KEY env var is set in Cloudflare Pages — never exposed to browser.
 *
 * Required env var (Cloudflare Pages → main site project):
 *   WEB3FORMS_KEY — Web3Forms access key
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const KEY = env.WEB3FORMS_KEY;
  if (!KEY) {
    return json({ error: "Contact form is not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { name, email, message } = body;
  if (!name || !email || !message) {
    return json({ error: "Missing required fields." }, 400);
  }

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        access_key: KEY,
        name,
        email,
        message,
        subject:   "New message from cheylajtavarez.com",
        from_name: "Cheyla J Tavarez Website",
      }),
    });

    const result = await res.json();
    if (result.success) {
      return json({ success: true });
    } else {
      return json({ error: result.message || "Submission failed." }, 502);
    }
  } catch (e) {
    return json({ error: `Upstream error: ${e.message}` }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
