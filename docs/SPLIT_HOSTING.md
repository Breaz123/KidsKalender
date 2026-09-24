# Split hosting — Vercel web + VPS API

KidsKalender can run the PWA on Vercel and the API (plus Postgres) on a VPS with Docker.

There are **two supported modes**. Pick one and configure both sides consistently.

## Live hosts (this project)

| Role | URL |
|------|-----|
| Vercel web | `https://kids-kalender.vercel.app` |
| Docker web + API (Caddy) | `https://kalender.breaz-it.be` |
| Parent login | `papa@kindjes` / `mama@kindjes` (passwords from `PASSWORD_PAPA` / `PASSWORD_MAMA` on the VPS) |

## Mode A — Vercel rewrite (current `vercel.json`)

`vercel.json` proxies same-origin `/api/*` on Vercel to the VPS:

```json
{ "source": "/api/:path*", "destination": "https://kalender.breaz-it.be/api/:path*" }
```

Browser calls stay on `kids-kalender.vercel.app` → session cookie is **first-party**.

| Where | Variable | Value |
|-------|----------|--------|
| Vercel (build) | `VITE_API_URL` | **leave empty / unset** |
| VPS `.env` | `COOKIE_SAMESITE` | `lax` (default) |
| VPS `.env` | `COOKIE_SECURE` | `true` |
| VPS `.env` | `CORS_ORIGIN` | Prefer both frontends (see below) |

Do **not** set `VITE_API_URL` on Vercel while using this rewrite, or the browser will call the API cross-origin and Mode B rules apply.

## Mode B — Cross-origin (`VITE_API_URL`)

The web client sends `credentials: 'include'`. Cross-origin cookies only work when:

1. The cookie is `SameSite=None` **and** `Secure`
2. CORS allows the **exact** Vercel origin and `credentials: true`

`SameSite=Lax` (the safe default) is correct for same-site hosting (Docker + Caddy, or Mode A). Across `*.vercel.app` → `kalender.breaz-it.be` the browser will **not** store or send a Lax session cookie, so login appears to succeed then `/api/auth/me` returns 401.

### Vercel (web)

Set at **build time** (Vercel → Settings → Environment Variables), then redeploy:

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://kalender.breaz-it.be` (no trailing slash) |

If you use Mode B, remove or stop relying on the `/api` rewrite for auth (optional cleanup).

### VPS Docker (API + Postgres)

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<min 32 random chars>

# Comma-separated: Vercel PWA + Docker Caddy frontend
CORS_ORIGIN=https://kids-kalender.vercel.app,https://kalender.breaz-it.be

COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

`CORS_ORIGIN` accepts a **comma-separated list** of exact origins (no wildcards, no trailing slash). Preview deployments on another `*.vercel.app` host need that preview origin listed too.

`docker-compose.yml` passes `COOKIE_SAMESITE` (default `lax`) and `CORS_ORIGIN` (default `https://${DOMAIN}`). For split hosting, put the values above in the VPS `.env` so compose picks them up.

Same-origin Caddy-only stack: omit `COOKIE_SAMESITE` or set `lax`, and keep `CORS_ORIGIN=https://${DOMAIN}` (or the comma list if Vercel is also used).

## Why login breaks on Vercel but works on Docker

| Symptom | Likely cause |
|---------|----------------|
| Dutch “Onjuiste gebruikersnaam of wachtwoord” on **both** hosts | Wrong password for **production** DB (local Docker often has different `PASSWORD_PAPA`) |
| Login OK on `kalender.breaz-it.be`, fails / does not stick on Vercel | Mode B without `COOKIE_SAMESITE=none` + matching `CORS_ORIGIN`, or `VITE_API_URL` set while VPS still has `SameSite=Lax` |
| “Te veel inlogpogingen” / generic error after a few tries | Login rate limit (per client IP, 15 minutes) |
| Works after `npm run users:test` locally only | Production users not updated — run `create-test-users` on the VPS with production `.env` |

## Cookie / CORS checklist

- [ ] Decide Mode A (rewrite, empty `VITE_API_URL`) or Mode B (`VITE_API_URL` + `SameSite=None`)
- [ ] Mode A: Vercel rewrite destination matches the live API host
- [ ] Mode B: Web build has `VITE_API_URL=https://kalender.breaz-it.be`
- [ ] API `CORS_ORIGIN` includes every frontend origin you use (comma-separated)
- [ ] Mode B: API `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`
- [ ] API is served over HTTPS (Secure cookies are ignored on HTTP)
- [ ] After login, DevTools → Application → Cookies shows `session` on the host that answered `/api/auth/login`
- [ ] A subsequent `GET /api/auth/me` includes the cookie (`credentials: include`)

Unknown `COOKIE_SAMESITE` values fall back to `lax` (fail closed / safe default).

## Do not

- Do not set `SameSite=None` without HTTPS.
- Do not use `CORS_ORIGIN=*`; credentialed CORS requires exact origins.
- Do not deploy secrets (`SESSION_SECRET`, DB password, `PASSWORD_PAPA`) to Vercel — they belong on the VPS only.
- Do not mix Mode A and Mode B (non-empty `VITE_API_URL` **and** expecting Lax cookies via rewrite).
