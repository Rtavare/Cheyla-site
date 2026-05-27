# Cheyla J Tavarez — Site Onboarding

## What This Project Is

Two Cloudflare Pages sites deployed from one GitHub repo (`Rtavare/Cheyla-site`):

| Site | URL | What it does |
|------|-----|-------------|
| Public site | `cheylajtavarez.com` | Lifestyle/motherhood brand site — renders from `content.json` |
| Admin CMS | `admin.cheylajtavarez.com` | Cheyla edits all content here; protected by Cloudflare Zero Trust OTP |

Push to `main` → both sites auto-deploy via Cloudflare Pages.

---

## Repo Layout

```
Cheyla-site/
├── index.html                   ← Public site (vanilla HTML/CSS/JS, no framework)
├── content.json                 ← Single source of truth for ALL site content
├── _headers                     ← Cloudflare security + cache headers (main site)
├── functions/api/
│   └── contact.js               ← POST /api/contact — server-side Web3Forms proxy
├── admin-site/
│   ├── index.html               ← Full CMS SPA (all JS inline, no framework)
│   ├── _headers                 ← Security headers (admin site)
│   └── functions/api/
│       ├── content.js           ← GET  /api/content   — reads content.json from GitHub
│       ├── publish.js           ← POST /api/publish   — commits content.json to GitHub
│       ├── draft.js             ← GET/POST/DELETE /api/draft — KV draft storage
│       ├── upload.js            ← POST /api/upload    — media → R2
│       └── media/[[path]].js    ← GET  /api/media/*   — R2 proxy (admin only)
├── STACK.md                     ← Full technical reference
└── CLAUDE.md                    ← Extended AI context (architecture, config, history)
```

---

## How Content Works

```
Cheyla edits in CMS
        ↓
auto-save every 3s → Cloudflare KV (cheyla-drafts) [PRIVATE]
        ↓
clicks Publish
        ↓
POST /api/publish → commits content.json to GitHub
        ↓
GitHub push triggers Cloudflare Pages rebuild (~30–60s)
        ↓
cheylajtavarez.com re-renders with new content
```

`content.json` in the repo root is the live content. Never manually edit it while the CMS is in use — the next Publish will overwrite your changes.

---

## content.json Shape

```json
{
  "meta":    { "title": "", "description": "" },
  "nav":     { "brand": "", "links": [{ "label": "", "href": "" }] },
  "hero":    { "eyebrow": "", "headline": "", "lead": "",
               "cta_primary": {}, "cta_secondary": {},
               "image": "",
               "card_title": "", "card_body": "" },
  "focus":   { "title": "", "intro": "", "cards": [{ "title": "", "body": "", "image": "" }] },
  "about":   { "quote": "", "title": "", "body": "" },
  "contact": { "title": "", "intro": "", "email": "", "instagram": "", "location": "" },
  "posts":   [{ "id": "", "title": "", "body": "", "image": "", "video_url": "",
                "category": "", "date": "", "published": false }]
}
```

---

## Cloudflare Infrastructure

| Resource | Name | Purpose |
|----------|------|---------|
| Pages project (main) | root `/` | `cheylajtavarez.com` |
| Pages project (admin) | `cheyla-admin` / `admin-site/` | `admin.cheylajtavarez.com` |
| R2 bucket | `cheyla-media` | Public media — images, videos |
| R2 custom domain | `media.cheylajtavarez.com` | CDN URL for all uploaded media |
| KV namespace | `cheyla-drafts` | Private CMS draft storage (no public URL) |
| Zero Trust | OTP on `admin.cheylajtavarez.com` | Auth — OTP to `cheylajtavarez@gmail.com` |

Account ID and all secret values are stored securely offline.

---

## Environment Variables

### Main site Pages project
| Variable | Purpose |
|----------|---------|
| `WEB3FORMS_KEY` | Contact form key — server-side only, never in browser |

### cheyla-admin Pages project
| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Classic PAT (`repo` scope) — reads/writes `content.json` via GitHub API |
| `MEDIA_BUCKET` | R2 binding → `cheyla-media` |
| `MEDIA_PUBLIC_URL` | `https://media.cheylajtavarez.com` |
| `DRAFT_KV` | KV binding → `cheyla-drafts` |

---

## Common Tasks

### Add a new CMS field

1. Add the field to `content.json` with an empty default value
2. In `admin-site/index.html`:
   - Add input HTML in the relevant section
   - Add `val("field-id", c.section?.field)` in `populateForms()`
   - Add `field: g("field-id")` in `collectContent()`
   - Add `field: ""` in `emptyContent()`
3. In `index.html`: update the `render(c)` function to display the new field

### Add a new Pages Function (admin site)

Create `admin-site/functions/api/yourname.js` and export `onRequestGet`, `onRequestPost`, etc.
It auto-routes to `/api/yourname`. Cloudflare Workers runtime — use `context.env` for bindings.

### Add a new Pages Function (main site)

Create `functions/api/yourname.js` at the repo root. Same pattern as admin functions.

### Update security headers

- Main site: `_headers` in repo root
- Admin site: `admin-site/_headers`

Cloudflare Pages `_headers` format — one header per line, indented under the path rule.

---

## Security Posture

| Layer | Mechanism |
|-------|-----------|
| Admin access | Cloudflare Zero Trust — OTP email, `cheylajtavarez@gmail.com` only |
| GitHub writes | `GITHUB_TOKEN` in Cloudflare env — never sent to browser |
| Form submissions | `WEB3FORMS_KEY` in Cloudflare env — proxied server-side via `/api/contact` |
| Draft storage | Cloudflare KV — no public URL, Workers-only access |
| Upload + publish CORS | Origin-checked — `admin.cheylajtavarez.com` or `localhost` only |
| Media (public) | `media.cheylajtavarez.com` — R2 public bucket, read-only by design |
| Analytics beacon | Cloudflare Web Analytics token in `index.html` — intentionally public (read-only) |

**What's NOT in this public repo:**
- Cloudflare account ID
- Any secret values
- Web3Forms key (moved from `content.json` to server-side env var)

All sensitive values are stored securely offline.

---

## Things to Watch Out For

- **Never commit secrets.** All credentials are Cloudflare Pages env vars. If you need a new secret, add it to the Pages project settings, not to any file.
- **`content.json` is overwritten on every Publish.** If you modify it locally for testing, that's fine — the next CMS publish will replace it.
- **The admin CMS is one large HTML file.** All JS is inline in `admin-site/index.html`. When making changes, search for the function name; don't assume where it is by section.
- **KV draft storage is private by design.** Do not add a custom domain to the `cheyla-drafts` KV namespace or expose it via a public endpoint.
- **Rotate `GITHUB_TOKEN` every 90 days.** Next rotation: ~August 2026. Update it in the `cheyla-admin` Pages project env vars.

---

## Local Development

```bash
# Test admin Pages Functions locally (requires wrangler)
wrangler pages dev admin-site

# Local secrets — create admin-site/.dev.vars
GITHUB_TOKEN=ghp_...
MEDIA_PUBLIC_URL=https://media.cheylajtavarez.com
# Add DRAFT_KV as a KV namespace binding in wrangler.toml for local KV testing
```

Push to deploy:
```bash
git push origin main
```

Full technical reference: [STACK.md](./STACK.md)
