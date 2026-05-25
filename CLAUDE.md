# Cheyla-site — Project Context for Claude Code

## Project Overview

This is a two-part Cloudflare Pages project for **cheylajtavarez.com**:

| Part | Repo path | Live URL | Pages project |
|------|-----------|----------|---------------|
| Main public site | `Cheyla-site/` (root) | `cheylajtavarez.com` | — |
| Admin CMS | `Cheyla-site/admin-site/` | `admin.cheylajtavarez.com` | `cheyla-admin` |

**Cloudflare account:** `2284d3d1efba4925527ccb6c27474076` (CheyJTavarez.com)  
**GitHub repo:** `Rtavare/Cheyla-site`  
**Deployment:** Push to `main` → Cloudflare Pages auto-deploys both sites

---

## Architecture

### Main Site
- Static HTML/CSS/JS at repo root (`index.html`, etc.)
- Reads content from `content.json` at the repo root
- `_headers` file sets security/cache headers

### Admin CMS (`admin-site/`)
- Cloudflare Pages project `cheyla-admin`, root directory: `admin-site`
- Single-page app: `admin-site/index.html`
- Protected by **Cloudflare Zero Trust Access** (OTP login for `cheylajtavarez@gmail.com`)
- Pages Functions (Edge Workers) in `admin-site/functions/api/`

### Content Flow
1. Cheyla edits content in the CMS at `admin.cheylajtavarez.com`
2. Clicking **Publish** calls `POST /api/publish`
3. `/api/publish` commits `content.json` to GitHub via the `GITHUB_TOKEN` PAT
4. The GitHub push triggers a new Cloudflare Pages deployment of the main site
5. Main site re-renders with updated content

---

## CMS Features (as of May 2025)

### Content Types

**Posts** — fields: `id`, `title`, `excerpt`, `body` (HTML), `image` (R2 URL), `video_url`, `date`, `slug`

**Focus Cards** — fields: `id`, `title`, `body`, `image` (R2 URL)

**Hero** — fields: `headline`, `subheadline`, `cta`

**About** — fields: `bio`

### Rich Text Editor
- Body fields use `contenteditable` divs instead of plain `<textarea>`
- Toolbar buttons: **Bold**, *Italic*, **Link**
- `safeHtml()` bridges plain text ↔ HTML safely
- `rteValue()` reads `innerHTML` for save; `safeHtml()` restores on load

### Image Upload
- Upload zone on each post and focus card (click or drag-and-drop)
- `POST /api/upload` — uploads file to R2 bucket `cheyla-media`
- Returns public URL: `https://pub-153d283cb1a74c218cdb02c2e811b18e.r2.dev/{key}`
- Accepted types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`, `video/mp4`, `video/webm`, `video/quicktime`
- Max size: 50 MB

### Video Embed
- Posts have a `video_url` field (YouTube/Vimeo URL)
- Stored as a plain URL string in `content.json`
- Main site is responsible for rendering the embed

---

## Pages Functions (`admin-site/functions/api/`)

### `upload.js` — `POST /api/upload`
Handles media file uploads to R2.
- CORS: only allows `admin.cheylajtavarez.com` and `localhost`
- Validates MIME type and 50 MB size limit
- Generates key: `{timestamp}-{sanitized-filename}`
- Stores in `MEDIA_BUCKET` (R2 binding)
- Returns `{ success, url, key }`
- URL uses `MEDIA_PUBLIC_URL` env var if set, otherwise falls back to `/api/media/{key}`

### `media/[[path]].js` — `GET /api/media/*`
Proxy-serves files from R2 for admin-side preview.
- Admin-only (behind Zero Trust); not for public use
- Use the R2 public domain for main site images

### `publish.js` — `POST /api/publish`
Commits `content.json` to GitHub.
- CORS: only allows `admin.cheylajtavarez.com` and `localhost`
- Uses `GITHUB_TOKEN` env var (classic PAT, `repo` scope)
- Reads current file SHA, base64-encodes new content, pushes commit

---

## Cloudflare Configuration

### R2 Bucket: `cheyla-media`
- **Custom Domain:** `https://media.cheylajtavarez.com`
- Bound to `cheyla-admin` Pages project as `MEDIA_BUCKET`

### Pages Environment Variables (`cheyla-admin` project)
| Variable | Value |
|----------|-------|
| `MEDIA_BUCKET` | R2 binding → `cheyla-media` |
| `MEDIA_PUBLIC_URL` | `https://media.cheylajtavarez.com` |
| `GITHUB_TOKEN` | Classic PAT with `repo` scope (rotate every 90 days — next: ~Aug 2026) |

### Zero Trust Access
- Policy on `admin.cheylajtavarez.com` — OTP email authentication
- Allowed: `cheylajtavarez@gmail.com`

---

## Key Files

```
Cheyla-site/
├── CLAUDE.md                          ← this file
├── content.json                       ← CMS content (auto-updated by Publish)
├── index.html                         ← main public site
├── _headers                           ← Cloudflare cache/security headers
├── README.md
└── admin-site/
    ├── index.html                     ← CMS single-page app (all JS inline)
    └── functions/
        └── api/
            ├── upload.js              ← POST /api/upload (R2 file upload)
            ├── publish.js             ← POST /api/publish (commit content.json)
            └── media/
                └── [[path]].js        ← GET /api/media/* (R2 proxy, admin only)
```

---

## Local Development Notes

- Repo lives at: `C:\Users\produ\OneDrive - University of Phoenix\Desktop\Cheyla's Site\Cheyla-site`
- Use `wrangler pages dev admin-site` to test Pages Functions locally
- Set `MEDIA_BUCKET` and `MEDIA_PUBLIC_URL=https://media.cheylajtavarez.com` in `.dev.vars` for local R2 testing
- GitHub Desktop credentials: stored in Windows Credential Manager
- To push: `git push origin main` from the `Cheyla-site` directory

---

## TODO / Next Steps

- [ ] Add YouTube/Vimeo iframe embed on a dedicated post detail page (currently shows as a "Watch" link)
- [ ] Rotate `GITHUB_TOKEN` every 90 days — next rotation ~August 2026

## Recently Completed

- [x] Post and focus card images render on main site
- [x] Contact form wired to Web3Forms (submits to inbox)
- [x] Custom media domain — `media.cheylajtavarez.com` (replaces r2.dev URL)
- [x] GITHUB_TOKEN rotated (May 2026)
