# cheylajtavarez.com — Full Stack Reference

> Last updated: May 2026  
> Author: Ricardo Tavarez (rtavare)  
> Repo: [github.com/Rtavare/Cheyla-site](https://github.com/Rtavare/Cheyla-site)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Main Public Site](#main-public-site)
4. [Admin CMS](#admin-cms)
5. [Cloudflare Infrastructure](#cloudflare-infrastructure)
6. [Pages Functions (API)](#pages-functions-api)
7. [Content Flow](#content-flow)
8. [Security](#security)
9. [Environment Variables](#environment-variables)
10. [Repository Structure](#repository-structure)
11. [Local Development](#local-development)
12. [Roadmap](#roadmap)

---

## Overview

A two-part Cloudflare Pages deployment for Cheyla's personal brand site. The **main site** is a static HTML/CSS/JS page that renders content from a JSON file. The **admin CMS** is a protected single-page app where Cheyla can edit all site content and publish changes without touching code.

| Part | URL | Pages Project | Root Dir |
|------|-----|---------------|----------|
| Main site | `cheylajtavarez.com` | (main project) | `/` |
| Admin CMS | `admin.cheylajtavarez.com` | `cheyla-admin` | `/admin-site` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub (Rtavare/Cheyla-site)        │
│                                                         │
│  content.json ◄──── /api/publish (writes via API)      │
│       │                                                 │
│       └──── triggers Cloudflare Pages auto-deploy       │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │   Cloudflare Pages      │
          │                         │
          │  cheylajtavarez.com     │  ← fetch('/content.json') on load
          │  admin.cheylajtavarez  │  ← protected by Zero Trust Access
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │   Cloudflare R2         │
          │   Bucket: cheyla-media  │
          │                         │
          │  draft.json             │  ← auto-saved CMS drafts
          │  {timestamp}-image.jpg  │  ← uploaded media files
          └─────────────────────────┘
```

---

## Main Public Site

**Technology:** Vanilla HTML, CSS, JavaScript — no framework, no build step.

**File:** `index.html` (repo root)

**How it works:**
- On page load, JavaScript fetches `/content.json`
- The `render(c)` function populates all page sections from the JSON data
- Body starts at `opacity: 0` and transitions to `opacity: 1` on first render (prevents flash of empty content)
- If the fetch fails, the page becomes visible anyway (graceful degradation)

**Sections rendered from content.json:**

| Section | JSON Key | Notes |
|---------|----------|-------|
| Page meta | `meta.title`, `meta.description` | SEO title and description |
| Navigation | `nav.brand`, `nav.links[]` | Brand name + nav link array |
| Hero | `hero.*` | Headline, lead copy, CTA buttons |
| Hero image | `hero.image` | R2 public URL; falls back to placeholder card when empty |
| Focus cards | `focus.cards[]` | 3-column feature card grid |
| About | `about.quote`, `about.body` | Pull quote + bio text |
| Contact | `contact.email`, `contact.instagram`, `contact.location` | Contact details card |
| Posts | `posts[]` | Hidden when empty; shows published posts sorted by date |

**Hero image logic:**
- When `hero.image` is set: renders `<img>` inside a styled rounded container
- When empty: renders a placeholder "Suggested use" card with gradient background

**Cloudflare Analytics:** Cloudflare Web Analytics beacon included in `<head>` (token: `9c99492e5cde4b209022837c0a86fc36`).

---

## Admin CMS

**URL:** `admin.cheylajtavarez.com`  
**File:** `admin-site/index.html`  
**Protected by:** Cloudflare Zero Trust Access (OTP email, `cheylajtavarez@gmail.com` only)

A single-page CMS app. All JavaScript is inline in the HTML file. No framework, no build step, no npm.

### Layout

```
┌──────────────┬─────────────────────────────────┐
│  Dark        │  Top bar: Status · Save · Publish │
│  Sidebar     ├─────────────────────────────────┤
│  220px       │                                  │
│              │   Content editing area           │
│  • Site Info │   (cards per section)            │
│  • Navigation│                                  │
│  • Hero      │                                  │
│  • Highlights│                                  │
│  • About     │                                  │
│  • Contact   │                                  │
│  • Posts     │                                  │
└──────────────┴─────────────────────────────────┘
```

### State Management

```javascript
let content  = null;   // full content.json object in memory
let isDirty  = false;  // tracks unsaved changes
let autoSaveTimer;     // debounce handle for R2 auto-save
```

### Startup Sequence (`init()`)

1. Call `GET /api/draft` — if an R2 draft exists, load it and warn user
2. If no draft, call `GET /api/content` — load from GitHub
3. If both fail, load `emptyContent()` so the CMS is always usable
4. Populate all form fields from loaded data
5. Enable Save and Publish buttons

### Auto-Save Flow

```
User types → markDirty() → debounce 3s → saveDraft() → POST /api/draft → R2
```

- Draft persists across browsers and devices (stored in R2, not localStorage)
- Status badge shows: `Saved` / `Unsaved changes` / `Saving…` / `Error`

### Publish Flow

```
Click Publish → POST /api/publish → GitHub commit → DELETE /api/draft → R2 cleared
               ↓
         Cloudflare Pages auto-deploys main site (~30–60s)
```

### Editable Content Types

| Type | Fields |
|------|--------|
| **Site Info** | Page title, meta description |
| **Navigation** | Brand name, nav links (label + href, add/remove) |
| **Hero** | Eyebrow, headline, lead copy, CTA buttons, profile photo upload |
| **Focus Cards** | Up to 3 cards (title, body, image upload) |
| **About** | Pull quote, about body |
| **Contact** | Title, intro, email, Instagram handle, location |
| **Posts** | Title, excerpt, body (rich text), category, date, image upload, video URL, published toggle |

### Rich Text Editor

Post body fields use `contenteditable` divs instead of plain `<textarea>`.

Toolbar buttons: **Bold** (`<strong>`), *Italic* (`<em>`), **Link** (`<a href>`)

### Image Upload

Each post and focus card has a drag-and-drop upload zone.

- Click or drag a file onto the zone to upload
- Calls `POST /api/upload` with `multipart/form-data`
- On success: displays image preview, stores R2 public URL in a hidden input
- URL is saved into `content.json` on next Publish

### Hero Profile Photo Upload

Same upload mechanism as post images, wired into the Hero section.

- When `hero.image` is set: main site shows the photo in the hero
- When empty: main site shows the placeholder card
- Remove button clears the field and resets to placeholder on next Publish

---

## Cloudflare Infrastructure

### Cloudflare Account
- **Account ID:** `2284d3d1efba4925527ccb6c27474076`
- **Account name:** CheyJTavarez.com

### Pages Projects

| Project | Root | Domain |
|---------|------|--------|
| Main site | `/` | `cheylajtavarez.com` |
| `cheyla-admin` | `/admin-site` | `admin.cheylajtavarez.com` |

Both deploy from: `github.com/Rtavare/Cheyla-site` (branch: `main`)

### R2 Bucket: `cheyla-media`

| Property | Value |
|----------|-------|
| Bucket name | `cheyla-media` |
| Custom domain | `https://media.cheylajtavarez.com` |
| Binding name | `MEDIA_BUCKET` |
| Bound to | `cheyla-admin` Pages project |

**Files stored:**

| Key pattern | Purpose |
|-------------|---------|
| `draft.json` | CMS auto-save draft (overwritten each save, deleted on Publish) |
| `{timestamp}-{filename}` | Uploaded images and videos |

### Cloudflare Zero Trust Access

- **Policy:** `admin.cheylajtavarez.com` — OTP (One-Time PIN) email auth
- **Allowed email:** `cheylajtavarez@gmail.com`
- How it works: Cheyla visits the admin URL → Cloudflare intercepts → sends 6-digit OTP to her email → she enters it → 24-hour session

---

## Pages Functions (API)

All functions live in `admin-site/functions/api/` and run as Cloudflare Workers.

### `GET /api/content` — `content.js`

Reads `content.json` from GitHub via authenticated API.

- Uses `GITHUB_TOKEN` secret — works on private repos
- Decodes the base64-encoded file content GitHub returns
- Sets `Cache-Control: no-store` so CMS always gets fresh data

### `POST /api/publish` — `publish.js`

Commits `content.json` to GitHub.

1. CORS check — only `admin.cheylajtavarez.com` or `localhost`
2. Reads current file SHA from GitHub (required for updates)
3. Unicode-safe base64-encodes the new JSON content
4. PUTs to GitHub Contents API with commit message including timestamp
5. Returns `{ success: true, commit: "<commit_url>" }`

### `GET /api/draft` — `draft.js`

Reads `draft.json` from R2.

- Returns `{ draft: null }` if no draft exists
- Returns `{ draft: <content_object> }` if a draft is saved

### `POST /api/draft` — `draft.js`

Saves current CMS state to `draft.json` in R2.

- Called automatically every 3 seconds after any change
- Overwrites previous draft (only one draft at a time)

### `DELETE /api/draft` — `draft.js`

Removes `draft.json` from R2 after a successful Publish.

### `POST /api/upload` — `upload.js`

Uploads a media file to R2.

| Property | Detail |
|----------|--------|
| Input | `multipart/form-data` with `file` field |
| Accepted types | JPEG, PNG, WebP, GIF, SVG, MP4, WebM, QuickTime |
| Max size | 50 MB |
| Key format | `{Date.now()}-{sanitized-filename}` |
| Public URL | `https://media.cheylajtavarez.com/{key}` |
| Returns | `{ success, url, key }` |

### `GET /api/media/*` — `media/[[path]].js`

Proxies R2 files for admin-side preview only.

- Accessible only through Zero Trust (not public)
- Used for image previews in the CMS editor
- Public images use the R2 public dev URL directly (not this proxy)

---

## Content Flow

### Cheyla Makes a Change

```
1. Cheyla visits admin.cheylajtavarez.com
2. Cloudflare Zero Trust: OTP sent to cheylajtavarez@gmail.com
3. She enters OTP → 24-hour session granted
4. CMS init(): loads draft from R2, or falls back to content.json from GitHub
5. She edits content / uploads photos
6. Every 3 seconds of inactivity: auto-saved to R2 (draft.json)
7. She clicks Publish:
   a. POST /api/publish → GitHub API writes content.json → commit created
   b. DELETE /api/draft → R2 draft cleared
   c. GitHub push triggers Cloudflare Pages deploy
   d. Main site rebuilds (~30–60 seconds)
   e. cheylajtavarez.com now shows updated content
```

### Media Upload

```
1. Cheyla drags/drops or clicks to upload a photo in the CMS
2. POST /api/upload (multipart form)
3. File stored in R2: cheyla-media bucket
4. Public URL returned: https://media.cheylajtavarez.com/{key}
5. URL stored in content.json hero.image (or post.image, card.image)
6. On Publish: URL is committed to GitHub → main site renders the image
```

---

## Security

### Authentication

| Layer | Mechanism |
|-------|-----------|
| Admin CMS access | Cloudflare Zero Trust — OTP email auth |
| GitHub writes | `GITHUB_TOKEN` secret stored in Cloudflare Pages env (never exposed to browser) |
| Upload/publish CORS | Origin check: only `admin.cheylajtavarez.com` or `localhost` |

### HTTP Security Headers

**Main site (`_headers`):**

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

**Admin site (`admin-site/_headers`):**

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Cache-Control: no-store, no-cache, must-revalidate
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  connect-src 'self' https://raw.githubusercontent.com;
  img-src 'self' data:;
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

---

## Environment Variables

Set in Cloudflare Pages dashboard under the `cheyla-admin` project:

| Variable | Type | Value / Description |
|----------|------|---------------------|
| `GITHUB_TOKEN` | Secret | Classic PAT with `repo` scope — used to read/write `content.json` via GitHub API. Rotate periodically. |
| `MEDIA_BUCKET` | R2 Binding | R2 bucket `cheyla-media` — used for image uploads and draft storage |
| `MEDIA_PUBLIC_URL` | Plain text | `https://media.cheylajtavarez.com` — custom CDN domain for public R2 media links |

---

## Repository Structure

```
Cheyla-site/                          ← git root (github.com/Rtavare/Cheyla-site)
│
├── index.html                        ← Main public site (vanilla HTML/CSS/JS)
├── content.json                      ← Single source of truth for all site content
├── _headers                          ← Cloudflare cache + security headers (main site)
├── CLAUDE.md                         ← AI assistant context file
├── STACK.md                          ← This file
├── README.md
│
└── admin-site/                       ← Admin CMS (Cloudflare Pages project: cheyla-admin)
    ├── index.html                    ← CMS single-page app (all JS inline)
    ├── _headers                      ← Security headers for admin site
    └── functions/
        └── api/
            ├── content.js            ← GET  /api/content   (read content.json from GitHub)
            ├── publish.js            ← POST /api/publish   (commit content.json to GitHub)
            ├── draft.js              ← GET/POST/DELETE /api/draft (R2 draft storage)
            ├── upload.js             ← POST /api/upload    (upload media to R2)
            └── media/
                └── [[path]].js       ← GET  /api/media/*   (R2 proxy for admin preview)
```

---

## Local Development

**Repo location (Windows):**
```
C:\Users\produ\OneDrive - University of Phoenix\Desktop\Cheyla's Site\Cheyla-site
```

**Test Pages Functions locally:**
```bash
wrangler pages dev admin-site
```

**Local secrets (create `admin-site/.dev.vars`):**
```
GITHUB_TOKEN=ghp_...
MEDIA_PUBLIC_URL=https://pub-153d283cb1a74c218cdb02c2e811b18e.r2.dev
```

**Push to production:**
```bash
git push origin main
```
→ Cloudflare Pages auto-deploys both the main site and admin CMS.

**GitHub credentials:** stored in Windows Credential Manager via GitHub Desktop.

---

## Roadmap

### Active TODOs

- [ ] **Video full embeds** — render YouTube/Vimeo iframe on a dedicated post detail page (currently shows as a "Watch" link on cards — good enough until post pages exist)
- [ ] **Rotate GITHUB_TOKEN every 90 days** — next rotation due ~August 2026

### Completed

- [x] Cloudflare Zero Trust Access (OTP auth for admin)
- [x] Full CMS single-page app (edit all site content)
- [x] GitHub API publish flow (commit content.json from CMS)
- [x] R2 media upload (images, videos up to 50MB)
- [x] R2-backed draft auto-save (cross-device, 3-second debounce)
- [x] Hero profile photo upload (CMS → R2 → main site)
- [x] Rich text editor for post bodies (Bold, Italic, Link)
- [x] Dynamic posts grid on main site (hidden when empty)
- [x] Graceful degradation (site renders even if content.json fetch fails)
- [x] Post and focus card images render on main site
- [x] Contact form wired to Web3Forms (sends to inbox)
- [x] Custom media domain — `media.cheylajtavarez.com` (R2 custom domain, replaces r2.dev URL)
- [x] GITHUB_TOKEN rotated (May 2026)
