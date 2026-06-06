export async function onRequest(context) {
  const { request, env, params } = context;
  const slug = params.slug || "";

  // Fetch content.json from the Pages static assets
  let content;
  try {
    const res = await env.ASSETS.fetch(new Request(new URL("/content.json", request.url)));
    if (!res.ok) throw new Error("content fetch failed");
    content = await res.json();
  } catch {
    return htmlResponse(errorPage("Site Unavailable", "Could not load site content.", content), 503);
  }

  const pages = content.pages || [];
  const page  = pages.find(p => p.published && p.id === slug);

  if (!page) {
    return htmlResponse(renderPage(null, content, slug), 404);
  }

  return htmlResponse(renderPage(page, content, slug), 200);
}

// ── Render helpers ────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlResponse(html, status) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

function navHtml(nav) {
  const brand = esc(nav?.brand || "");
  const links = (nav?.links || []).map(l =>
    `<a href="${esc(l.href)}">${esc(l.label)}</a>`
  ).join("");
  return `
  <header>
    <div class="container nav-inner">
      <a href="/" class="brand">${brand}</a>
      <nav class="nav-links">${links}</nav>
    </div>
  </header>`;
}

function footerHtml(content) {
  const brand    = esc(content?.nav?.brand || "");
  const year     = new Date().getFullYear();
  const ig       = content?.contact?.instagram;
  const email    = content?.contact?.email;
  const igLink   = ig    ? `<a href="https://instagram.com/${esc(ig.replace("@",""))}" target="_blank" rel="noopener">${esc(ig)}</a>` : "";
  const emailLink= email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : "";
  const links    = [igLink, emailLink].filter(Boolean).join(" · ");
  return `
  <footer>
    <div class="container footer-inner">
      <span>© ${year} ${brand}. All rights reserved.</span>
      ${links ? `<div>${links}</div>` : ""}
    </div>
  </footer>`;
}

function renderPage(page, content, slug) {
  const title   = page ? esc(page.title)            : "Page Not Found";
  const metaDesc= page ? esc(page.meta_description) : "";
  const siteTitle = esc(content?.meta?.title || "Cheyla J Tavarez");
  const pageTitle = page ? `${title} — ${siteTitle}` : `Not Found — ${siteTitle}`;
  const body    = page ? (page.body || "") : `<p style="color:var(--muted)">The page <strong>/${slug}</strong> could not be found.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<!-- Cloudflare Web Analytics -->
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
data-cf-beacon='{"token":"9c99492e5cde4b209022837c0a86fc36"}'></script>
<!-- End Cloudflare Web Analytics -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageTitle}</title>
  ${metaDesc ? `<meta name="description" content="${metaDesc}" />` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg:         #f8f5f2;
      --surface:    #ffffff;
      --text:       #2f2a27;
      --muted:      #6b625d;
      --accent:     #b57f6d;
      --accent-dark:#8f5f4f;
      --line:       #e9dfd8;
      --max:        760px;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
    }
    a { color: inherit; text-decoration: none; }
    .container {
      width: min(100% - 2rem, var(--max));
      margin: 0 auto;
    }
    header {
      position: sticky; top: 0; z-index: 20;
      backdrop-filter: blur(10px);
      background: rgba(248,245,242,0.88);
      border-bottom: 1px solid var(--line);
    }
    .nav-inner {
      display: flex; align-items: center;
      justify-content: space-between;
      padding: 1rem 0; gap: 1rem;
    }
    .brand { font-weight: 700; letter-spacing: 0.04em; }
    .nav-links {
      display: flex; gap: 1.25rem; flex-wrap: wrap;
      color: var(--muted); font-size: 0.95rem;
    }
    .nav-links a { color: var(--muted); transition: color 0.15s; }
    .nav-links a:hover { color: var(--text); }
    main { padding: 4rem 0 5rem; }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: clamp(2.2rem, 5vw, 3.8rem);
      line-height: 1.1; margin: 0 0 2rem;
      font-weight: 600;
    }
    .page-body { font-size: 1.05rem; }
    .page-body p  { margin: 0 0 1.25rem; }
    .page-body h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.9rem; margin: 2rem 0 0.75rem; font-weight: 600; }
    .page-body h3 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; }
    .page-body a  { color: var(--accent-dark); text-decoration: underline; }
    .page-body img { max-width: 100%; border-radius: 16px; margin: 1.5rem 0; }
    .page-body ul, .page-body ol { padding-left: 1.5rem; margin-bottom: 1.25rem; }
    .back-link {
      display: inline-flex; align-items: center; gap: 0.35rem;
      color: var(--muted); font-size: 0.9rem;
      margin-bottom: 2.5rem;
      transition: color 0.15s;
    }
    .back-link:hover { color: var(--accent-dark); }
    footer {
      padding: 2rem 0 3rem;
      color: var(--muted);
      border-top: 1px solid var(--line);
      font-size: 0.92rem;
    }
    .footer-inner {
      display: flex; align-items: center;
      justify-content: space-between;
      flex-wrap: wrap; gap: 1rem;
    }
    .footer-inner a { color: var(--muted); transition: color 0.15s; }
    .footer-inner a:hover { color: var(--accent-dark); }
    @media (max-width: 600px) {
      .nav-inner, .footer-inner { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  ${navHtml(content?.nav)}
  <main>
    <div class="container">
      <a class="back-link" href="/">← Back to home</a>
      ${page
        ? `<h1>${title}</h1><div class="page-body">${body}</div>`
        : `<h1>Page Not Found</h1><div class="page-body">${body}</div>`
      }
    </div>
  </main>
  ${footerHtml(content)}
</body>
</html>`;
}

function errorPage(title, msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title></head>
<body style="font-family:sans-serif;padding:4rem;color:#333">
  <h1>${esc(title)}</h1><p>${esc(msg)}</p><a href="/">← Home</a>
</body></html>`;
}
