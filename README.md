# Kinderregeling

Progressive Web App voor het beheren van een gedeelde kinderregeling tussen twee ouders.

Beide ouders hebben een eigen login en beheren dezelfde kalender. Per dag wordt vastgelegd waar de kinderen overdag zijn, wie ze brengt en ophaalt, en waar ze slapen. De dagregeling en slaapregeling zijn volledig onafhankelijk.

## Architectuur

```
┌─────────────┐     HTTPS      ┌─────────┐
│   Browser   │ ──────────────▶│  Caddy  │
│   (PWA)     │                └────┬────┘
└─────────────┘                     │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                    ┌──────────┐        ┌──────────┐
                    │   Web    │        │   API    │
                    │ (React)  │        │ (Fastify)│
                    └──────────┘        └────┬─────┘
                                             │
                                             ▼
                                      ┌────────────┐
                                      │ PostgreSQL │
                                      └────────────┘
```

**Monorepo-structuur:**

- `apps/web` — React + Vite + Tailwind PWA
- `apps/api` — Fastify REST API
- `packages/shared` — Gedeelde types en Zod-schema's

## Vereisten

- Node.js 20+
- npm 10+
- Docker & Docker Compose (voor database en productie)
- PostgreSQL-clienttools (optioneel, voor lokale back-ups)

## Lokaal starten

```bash
# 1. Dependencies installeren
npm install

# 2. Omgevingsvariabelen configureren
cp .env.example .env

# 3. PostgreSQL starten (alleen database)
docker compose -f docker-compose.dev.yml up -d

# 4. Database migreren
npm run db:migrate

# 5. Testdata seeden (augustus 2026)
npm run db:seed

# 6. Ouderaccounts aanmaken (PASSWORD_PAPA / PASSWORD_MAMA in .env)
npm run users:test

# 7. Development servers starten
npm run dev
```

De web-app is bereikbaar op http://localhost:5173, de API op http://localhost:3001.

## Docker starten (productie)

```bash
# .env configureren met DOMAIN, ACME_EMAIL, SESSION_SECRET, etc.
docker compose up -d --build
```

Caddy regelt automatisch HTTPS zodra `DOMAIN` naar uw server wijst.

Split hosting (Vercel-frontend + VPS-API): either keep the `vercel.json` `/api` rewrite with empty `VITE_API_URL`, or set `VITE_API_URL` + `COOKIE_SAMESITE=none` + `CORS_ORIGIN` (comma-separated origins allowed). Zie [docs/SPLIT_HOSTING.md](docs/SPLIT_HOSTING.md).

## Omgevingsvariabelen

| Variabele | Beschrijving | Voorbeeld |
|-----------|-------------|-----------|
| `POSTGRES_USER` | Databasegebruiker | `kidscalendar` |
| `POSTGRES_PASSWORD` | Databasewachtwoord | `change_me_strong_password` |
| `POSTGRES_DB` | Databasenaam | `kidscalendar` |
| `DATABASE_URL` | Volledige connection string | `postgresql://...` |
| `SESSION_SECRET` | Geheim voor sessiecookies (min. 32 tekens) | `change_me...` |
| `SESSION_DURATION_HOURS` | Sessieduur in uren (standaard 90 dagen) | `2160` |
| `COOKIE_SECURE` | Secure-cookie (`true` in productie) | `false` |
| `COOKIE_SAMESITE` | Cookie SameSite: `lax` (default), `strict`, of `none` | `lax` |
| `CORS_ORIGIN` | Toegestane frontend-origin(s), komma-gescheiden | `http://localhost:5173` |
| `DOMAIN` | Productiedomein voor Caddy | `kalender.example.com` |
| `ACME_EMAIL` | E-mail voor Let's Encrypt | `admin@example.com` |
| `VITE_API_URL` | API-URL voor frontend build | `http://localhost:3001` |
| `BACKUP_RETENTION_DAYS` | Bewaartermijn back-ups | `14` |

## Database migreren

```bash
npm run db:migrate
```

## Augustusdata seeden

```bash
npm run db:seed
```

Dit vult augustus 2026 met de vooraf gedefinieerde testdata.

## Gebruikers aanmaken

Er is geen openbare registratie. Ouderaccounts (Siemon / Trixie) vanuit `.env`:

```bash
# Zet PASSWORD_PAPA en PASSWORD_MAMA in .env
npm run users:test
```

Extra gebruikers via CLI:

```bash
npm run user:create -- --email gebruiker@example.com --name "Naam" --role parent
```

Het wachtwoord wordt veilig gevraagd (niet zichtbaar in de terminal).

Voor de tweede ouder, gebruik het `household`-id van de eerste gebruiker:

```bash
npm run user:create -- --email ouder2@example.com --name "Ouder 2" --household <uuid>
```

## Lege privé-bulk opruimen

Als een maand vol staat met lege “Privé afspraak”-cellen (zonder titel), ruim ze zo op tegen de database in `.env`:

```bash
# Eerst bekijken
npm run cleanup:empty-private -- --year=2026 --month=9 --dry-run

# Dan verwijderen (alleen privé zonder titel; getitelde privé en gedeelde regeling blijven)
npm run cleanup:empty-private -- --year=2026 --month=9

# Optioneel beperken tot één ouder
npm run cleanup:empty-private -- --year=2026 --month=9 --email=papa@kindjes
```

## Productie deployen

1. Server voorbereiden met Docker
2. `.env` invullen met productiewaarden
3. DNS instellen: `DOMAIN` → server-IP
4. Starten: `docker compose up -d --build`
5. Migreren: `docker compose exec api node apps/api/dist/db/migrate.js`
6. Seeden en gebruikers aanmaken

## Domein configureren

Stel in `.env`:

```
DOMAIN=kalender.uwdomein.be
ACME_EMAIL=admin@uwdomein.be
```

Caddy verkrijgt automatisch een Let's Encrypt-certificaat.

## HTTPS configureren

HTTPS werkt automatisch via Caddy zodra:
- Poorten 80 en 443 open zijn
- `DOMAIN` correct naar de server wijst
- `ACME_EMAIL` is ingevuld

## Back-ups maken

**Automatisch:** De backup-service maakt dagelijks een `pg_dump`.

**Handmatig:**

```bash
npm run backup
```

Back-ups worden opgeslagen in `backups/`.

> **Belangrijk:** Kopieer back-ups ook naar externe opslag (cloud, NAS, etc.).

## Back-ups terugzetten

```bash
npm run restore -- kidscalendar_20260803_120000.sql.gz
```

## PWA installeren op Android

1. Open de app in Chrome
2. Tik op het menu (⋮) → "Toevoegen aan startscherm"
3. Bevestig de installatie

## PWA installeren op iPhone

1. Open de app in Safari
2. Tik op het deel-icoon
3. Kies "Zoek op ons apparaat"
4. Bevestig

## Updates uitvoeren

```bash
git pull
docker compose up -d --build
docker compose exec api node apps/api/dist/db/migrate.js
```

## Veelvoorkomende problemen

**Kan niet inloggen**
- Controleer of de gebruiker bestaat (`npm run user:create`)
- Controleer DATABASE_URL en of PostgreSQL draait

**API niet bereikbaar**
- Controleer `docker compose ps`
- Bekijk logs: `docker compose logs api`

**HTTPS werkt niet**
- Controleer DNS en poorten 80/443
- Bekijk Caddy-logs: `docker compose logs caddy`

**Kalender laadt niet**
- Controleer CORS_ORIGIN
- Controleer of u ingelogd bent

## Ontwikkeling

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test        # Vitest
npm run build       # Productiebuild
```

## Licentie

Privé project — niet voor openbaar gebruik.
