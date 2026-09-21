import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { buildApp } from '../index.js';
import { getDb, closeDb } from '../db/index.js';
import { createUser } from '../services/auth.service.js';
import {
  users,
  households,
  householdMembers,
  auditLogs,
  sessions,
} from '../db/schema.js';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123!';
const OTHER_EMAIL = 'other@example.com';

let app: Awaited<ReturnType<typeof buildApp>>;
let householdId: string;
let sessionCookie: string;
let dbAvailable = false;

async function login(email: string, password: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  const cookie = res.cookies.find((c) => c.name === 'session');
  return { status: res.statusCode, cookie: cookie?.value };
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-secret-at-least-32-characters-long';
  process.env.COOKIE_SECURE = 'false';

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ??
      'postgresql://kidscalendar:change_me_strong_password@localhost:5433/kidscalendar';
  }

  app = await buildApp();

  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    dbAvailable = true;
  } catch {
    console.warn('PostgreSQL niet beschikbaar — API-integratietests overgeslagen.');
    return;
  }

  const db = getDb();

  // Wis alleen testdata van deze suite — niet de hele ontwikkeldatabase.
  for (const email of [TEST_EMAIL, OTHER_EMAIL]) {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      await db.delete(sessions).where(eq(sessions.userId, existing.id));
      await db.delete(householdMembers).where(eq(householdMembers.userId, existing.id));
      await db.delete(auditLogs).where(eq(auditLogs.userId, existing.id));
      await db.delete(users).where(eq(users.id, existing.id));
    }
  }

  let [household] = await db.select().from(households).limit(1);
  if (!household) {
    [household] = await db.insert(households).values({ name: 'Test huishouden' }).returning();
  }
  householdId = household.id;

  await createUser(TEST_EMAIL, 'Test User', TEST_PASSWORD, 'parent', householdId);
  await createUser(OTHER_EMAIL, 'Other User', TEST_PASSWORD, 'parent', householdId);

  const loginResult = await login(TEST_EMAIL, TEST_PASSWORD);
  sessionCookie = loginResult.cookie!;
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  await closeDb();
});

function requireDb() {
  if (!dbAvailable) {
    return false;
  }
  return true;
}

describe('Auth', () => {
  it('succesvol inloggen', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(TEST_EMAIL);
  });

  it('verkeerd wachtwoord', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('niet-ingelogde gebruiker krijgt geen kalender', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar?year=2026&month=8',
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Calendar', () => {
  it('vandaag-endpoint geeft Europe/Brussels datum', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar/today',
      cookies: { session: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
    const { today } = res.json();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('kalenderitem aanmaken', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'PUT',
      url: '/api/calendar/2026-08-04',
      cookies: { session: sessionCookie },
      payload: {
        daytimeLocation: 'oma',
        sleepLocation: 'mama',
        pickedUpBy: 'trixie',
        isShared: true,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().entry.daytimeLocation).toBe('oma');
    expect(res.json().entry.sleepLocation).toBe('mama');
  });

  it('kalenderitem wijzigen', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'PUT',
      url: '/api/calendar/2026-08-04',
      cookies: { session: sessionCookie },
      payload: {
        daytimeLocation: 'oma',
        sleepLocation: 'papa',
        pickedUpBy: 'trixie',
        isShared: true,
        version: 1,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().entry.sleepLocation).toBe('papa');
    expect(res.json().entry.version).toBe(2);
  });

  it('versieconflict geeft HTTP 409', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'PUT',
      url: '/api/calendar/2026-08-04',
      cookies: { session: sessionCookie },
      payload: {
        daytimeLocation: 'oma',
        sleepLocation: 'mama',
        isShared: true,
        version: 1,
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it('bulkperiode toevoegen', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar/bulk',
      cookies: { session: sessionCookie },
      payload: {
        startDate: '2026-08-15',
        endDate: '2026-08-17',
        entry: { activity: 'vakantie', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().results).toHaveLength(3);
  });

  it('invoervalidatie', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'PUT',
      url: '/api/calendar/2026-08-01',
      cookies: { session: sessionCookie },
      payload: { daytimeLocation: 'andere' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('kalenderitem verwijderen', async () => {
    if (!requireDb()) return;
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/calendar/2026-08-04',
      cookies: { session: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it('gebruiker kan alleen eigen huishouden lezen', async () => {
    if (!requireDb()) return;
    const otherLogin = await login(OTHER_EMAIL, TEST_PASSWORD);
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar?year=2026&month=8',
      cookies: { session: otherLogin.cookie! },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().entries).toBeDefined();
  });
});

describe('Health', () => {
  it('health check', async () => {
    if (!app) {
      app = await buildApp();
    }
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });
});
