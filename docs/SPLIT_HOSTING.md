# Split hosting — Vercel web + VPS API

KidsKalender can run the PWA on Vercel and the API (plus Postgres) on a VPS with Docker. The browser then calls the API on a **different origin**, so session cookies are cross-site.

Same-origin Docker + Caddy (`DOMAIN`) does **not** need these settings. Keep the defaults.

## Why login breaks without this

The web client sends `credentials: 'include'`. Cross-origin cookies only work when:

1. The cookie is `SameSite=None` **and** `Secure`
2. CORS allows the **exact** Vercel origin and `credentials: true`

`SameSite=Lax` (the safe default) is correct for same-site hosting. Across `*.vercel.app` → `api.example.com` the browser will **not** store or send a Lax session cookie, so login appears to succeed then `/api/auth/me` returns 401.

## Vercel (web)

Set at **build time** (Vercel → Settings → Environment Variables):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | Public API origin, no trailing slash, e.g. `https://api.example.com` |

The frontend uses `VITE_API_URL` as the fetch base (`apps/web/src/lib/api.ts`). Empty means same-origin `/api/*` (Docker + Caddy).

Redeploy the web app after changing `VITE_API_URL`.

## VPS Docker (API + Postgres)

On the API host, set at least:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<min 32 random chars>

# Exact Vercel origin — no trailing slash, no wildcard
CORS_ORIGIN=https://your-app.vercel.app

# Cross-origin session cookie (browsers require Secure with None)
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

`CORS_ORIGIN` stays a single exact origin (the Fastify CORS config does not accept a list). Preview deployments on another `*.vercel.app` host need that preview origin here, or they cannot log in.

`docker-compose.yml` passes `COOKIE_SAMESITE` (default `lax`) and `CORS_ORIGIN` (default `https://${DOMAIN}`). For split hosting, put the values above in the VPS `.env` so compose picks them up.

Same-origin Caddy stack: omit `COOKIE_SAMESITE` or set `lax`, and keep `CORS_ORIGIN=https://${DOMAIN}`.

## Cookie / CORS checklist

- [ ] Web build has `VITE_API_URL=https://<api-host>` (HTTPS, no trailing slash)
- [ ] API `CORS_ORIGIN` equals the Vercel origin **exactly** (scheme + host, no path)
- [ ] API `COOKIE_SAMESITE=none`
- [ ] API `COOKIE_SECURE=true` (forced anyway when SameSite is `none`)
- [ ] API is served over HTTPS (Secure cookies are ignored on HTTP)
- [ ] Browser is not blocking third-party cookies for this site
- [ ] After login, DevTools → Application → Cookies on the **API** host shows `session` with `Secure` and `SameSite=None`
- [ ] A subsequent `GET /api/auth/me` from the Vercel origin includes the cookie (`credentials: include`)

Unknown `COOKIE_SAMESITE` values fall back to `lax` (fail closed / safe default).

## Do not

- Do not set `SameSite=None` without HTTPS.
- Do not use `CORS_ORIGIN=*`; credentialed CORS requires an exact origin.
- Do not deploy secrets (`SESSION_SECRET`, DB password) to Vercel — they belong on the VPS only.
