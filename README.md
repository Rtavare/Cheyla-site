# cheyla-site

Source for [cheylajtavarez.com](https://cheylajtavarez.com) — a personal website with a WordPress CMS, self-hosted on a Raspberry Pi and exposed via Cloudflare Tunnel.

## Deploy

Push to `main` — the server auto-deploys via GitHub webhook within seconds.

```
git push origin main
```

## Stack

- **Frontend**: Static HTML/CSS at the root
- **CMS**: WordPress at `/wp`
- **Hosting**: Apache2 on Raspberry Pi
- **CDN / Security**: Cloudflare (WAF, DDoS, Tunnel)
- **Analytics**: Cloudflare Web Analytics

## Infrastructure

Server configuration, security hardening, and ops documentation live in the [homeserver repo](https://github.com/Rtavare/homeserver).
