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
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Only allow safe URL schemes. esc() does not block javascript: hrefs.
function safeHref(u, fallback) {
  const v = String(u || "").trim();
  if (/^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(v)) return v;
  return fallback !== undefined ? fallback : "#";
}
function safeSrc(u) {
  const v = String(u || "").trim();
  if (/^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|gif|webp|avif);)/i.test(v)) return v;
  return "";
}

// Allowlist HTML sanitizer for page.body rich text. The body is stored
// HTML by design (bold/italic/links from the CMS), so it cannot be
// esc()'d like other fields -- instead dangerous tags, event handlers,
// inline styles and unsafe URLs are stripped and only a small set of
// formatting tags/attributes survives.
const ALLOWED_TAGS = new Set(["a","p","br","hr","strong","b","em","i","u","s",
  "h1","h2","h3","h4","ul","ol","li","blockquote","img","div","span",
  "figure","figcaption","pre","code"]);
const VOID_TAGS = new Set(["br","hr","img"]);
function sanitizeHtml(html) {
  let out = String(html || "");
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  // Remove dangerous elements together with their contents.
  out = out.replace(/<(script|style|iframe|object|embed|form|textarea|select|button|input|link|meta|title|svg|math|template|noscript|video|audio|source|track)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  out = out.replace(/<(script|style|iframe|object|embed|form|textarea|select|button|input|link|meta|title|svg|math|template|noscript|video|audio|source|track)\b[^>]*\/?>/gi, "");
  // Rewrite every remaining tag through the allowlist.
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (m, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (m.startsWith("</")) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
    const attrs = [];
    const attrRe = /([a-zA-Z-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+))?/g;
    let a;
    while ((a = attrRe.exec(rawAttrs || "")) !== null) {
      const name = a[1].toLowerCase();
      const val = a[3] !== undefined ? a[3] : (a[4] !== undefined ? a[4] : (a[2] || ""));
      if (tag === "a" && name === "href") {
        const safe = safeHref(val, "");
        if (safe) attrs.push(`href="${esc(safe)}"`);
      } else if (tag === "a" && name === "title") {
        attrs.push(`title="${esc(val)}"`);
      } else if (tag === "a" && name === "target" && val === "_blank") {
        attrs.push('target="_blank"', 'rel="noopener"');
      } else if (tag === "img" && name === "src") {
        const safe = safeSrc(val);
        if (safe) attrs.push(`src="${esc(safe)}"`);
      } else if (tag === "img" && (name === "alt" || name === "width" || name === "height")) {
        attrs.push(`${name}="${esc(val)}"`);
      }
      // Everything else (on*, style, class, id, ...) is dropped.
    }
    const suffix = VOID_TAGS.has(tag) ? " /" : "";
    return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}${suffix}>`;
  });
  return out;
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
    `<a href="${esc(safeHref(l.href))}">${esc(l.label)}</a>`
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
  const policyPages = [["privacy-policy", "Privacy Policy"], ["terms-of-use", "Terms of Use"], ["data-retention-policy", "Data Retention"]];
  const publishedIds = new Set((content?.pages || []).filter(p => p.published).map(p => p.id));
  const policyLinks = policyPages.filter(([pid]) => publishedIds.has(pid)).map(([pid, label]) => `<a href="/p/${pid}">${label}</a>`);
  const links    = [igLink, emailLink, ...policyLinks, `<a href="#" id="cookie-choices">Cookie Choices</a>`].filter(Boolean).join(" · ");
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
  const body    = page ? sanitizeHtml(page.body || "") : `<p style="color:var(--muted)">The page <strong>/${esc(slug)}</strong> could not be found.</p>`;

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
    /* ── Cookie banner ── */
    .cookie-banner {
      position: fixed; left: 1rem; right: 1rem; bottom: 1rem; z-index: 1000;
      background: #ffffff; border: 1px solid #e9dfd8; border-radius: 14px;
      box-shadow: 0 12px 32px rgba(47,42,39,0.16);
      padding: 1rem 1.25rem; display: flex; gap: 1rem; align-items: center;
      justify-content: space-between; max-width: 860px; margin: 0 auto;
    }
    .cookie-banner[hidden] { display: none; }
    .cookie-banner p { margin: 0; font-size: 0.92rem; color: #6b625d; line-height: 1.55; }
    .cookie-banner a { color: #8f5f4f; text-decoration: underline; }
    .cookie-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
    .cookie-btn {
      font: inherit; font-size: 0.9rem; cursor: pointer; border-radius: 999px;
      padding: 0.55rem 1.1rem; border: 1px solid #b57f6d; background: transparent; color: #8f5f4f;
    }
    .cookie-btn-primary { background: #b57f6d; color: #fff; }
    .cookie-btn:hover { background: #8f5f4f; color: #fff; }
    @media (max-width: 640px) {
      .cookie-banner { flex-direction: column; align-items: stretch; }
      .cookie-actions { justify-content: flex-end; }
    }

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
  <div class="cookie-banner" id="cookie-banner" hidden>
      <p>We use cookies to keep this site working and secure. Optional cookies are used only with your permission. You can accept all cookies, or continue with only the necessary ones. <a href="/p/privacy-policy">Privacy Policy</a></p>
      <div class="cookie-actions">
        <button type="button" class="cookie-btn cookie-btn-primary" id="cookie-accept-all">Accept all</button>
        <button type="button" class="cookie-btn" id="cookie-necessary">Only necessary</button>
      </div>
    </div>
  <script>
    (function () {
      var KEY = 'cookieConsent';
      var banner = document.getElementById('cookie-banner');
      if (!banner) return;
      function show() { banner.hidden = false; }
      function hide() { banner.hidden = true; }
      function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
      var saved = null;
      try { saved = localStorage.getItem(KEY); } catch (e) {}
      if (!saved) show();
      document.getElementById('cookie-accept-all').addEventListener('click', function () { save('all'); hide(); });
      document.getElementById('cookie-necessary').addEventListener('click', function () { save('necessary'); hide(); });
      document.addEventListener('click', function (e) {
        if (e.target && e.target.id === 'cookie-choices') { e.preventDefault(); show(); }
      });
    })();
  </script>
</body>
</html>`;
}

function errorPage(title, msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title></head>
<body style="font-family:sans-serif;padding:4rem;color:#333">
  <h1>${esc(title)}</h1><p>${esc(msg)}</p><a href="/">← Home</a>
</body></html>`;
}
