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

const PAPA_EMAIL = 'papa@example.com';
const MAMA_EMAIL = 'mama@example.com';
const TEST_PASSWORD = 'TestPassword123!';

let app: Awaited<ReturnType<typeof buildApp>>;
let householdId: string;
let papaId: string;
let mamaId: string;
let papaCookie: string;
let mamaCookie: string;
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
    console.warn('PostgreSQL niet beschikbaar — privacy-integratietests overgeslagen.');
    return;
  }

  const db = getDb();

  // Clean up test data
  for (const email of [PAPA_EMAIL, MAMA_EMAIL]) {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      await db.delete(auditLogs).where(eq(auditLogs.userId, existing.id));
      await db.delete(sessions).where(eq(sessions.userId, existing.id));
      await db.execute(
        sql`DELETE FROM calendar_entries WHERE created_by = ${existing.id} OR updated_by = ${existing.id} OR owner_id = ${existing.id}`,
      );
      await db.delete(householdMembers).where(eq(householdMembers.userId, existing.id));
      await db.delete(users).where(eq(users.id, existing.id));
    }
  }

  let [household] = await db.select().from(households).limit(1);
  if (!household) {
    [household] = await db.insert(households).values({ name: 'Privacy Test Huishouden' }).returning();
  }
  householdId = household.id;

  const papa = await createUser(PAPA_EMAIL, 'Papa', TEST_PASSWORD, 'parent', householdId);
  const mama = await createUser(MAMA_EMAIL, 'Mama', TEST_PASSWORD, 'parent', householdId);
  
  papaId = papa.id;
  mamaId = mama.id;

  const papaLogin = await login(PAPA_EMAIL, TEST_PASSWORD);
  papaCookie = papaLogin.cookie!;
  
  const mamaLogin = await login(MAMA_EMAIL, TEST_PASSWORD);
  mamaCookie = mamaLogin.cookie!;
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

describe('Privacy: Shared Entries', () => {
  it('shared entry is visible to both parents', async () => {
    if (!requireDb()) return;

    // Papa creates a shared entry
    const createRes = await app.inject({
      method: 'PUT',
      url: '/api/calendar/2026-09-20',
      cookies: { session: papaCookie },
      payload: {
        daytimeLocation: 'papa',
        sleepLocation: 'papa',
        note: 'Shared kinderregeling',
        isShared: true,
      },
    });
    expect(createRes.statusCode).toBe(200);
    const entry = createRes.json().entry;
    expect(entry.isShared).toBe(true);

    // Mama can see it
    const mamaGetRes = await app.inject({
      method: 'GET',
      url: '/api/calendar/2026-09-20',
      cookies: { session: mamaCookie },
    });
    expect(mamaGetRes.statusCode).toBe(200);
    expect(mamaGetRes.json().entry.note).toBe('Shared kinderregeling');

    // Mama can see it in month view
    const mamaMonthRes = await app.inject({
      method: 'GET',
      url: '/api/calendar?year=2026&month=9',
      cookies: { session: mamaCookie },
    });
    expect(mamaMonthRes.statusCode).toBe(200);
    const entries = mamaMonthRes.json().entries;
    const found = entries.find((e: { date: string; note?: string }) => e.date === '2026-09-20');
    expect(found).toBeDefined();
    expect(found.note).toBe('Shared kinderregeling');
  });

  it('shared entry can be edited by both parents', async () => {
    if (!requireDb()) return;

    // Get current version
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/calendar/2026-09-20',
      cookies: { session: mamaCookie },
    });
    const currentVersion = getRes.json().entry.version;

    // Mama edits the shared entry
    const updateRes = await app.inject({
      method: 'PUT',
      url: '/api/calendar/2026-09-20',
      cookies: { session: mamaCookie },
      payload: {
        daytimeLocation: 'papa',
        sleepLocation: 'papa',
        note: 'Shared kinderregeling - updated by Mama',
        isShared: true,
        version: currentVersion,
      },
    });
    expect(updateRes.statusCode).toBe(200);

    // Papa can see the update
    const papaGetRes = await app.inject({
      method: 'GET',
      url: '/api/calendar/2026-09-20',
      cookies: { session: papaCookie },
    });
    expect(papaGetRes.statusCode).toBe(200);
    expect(papaGetRes.json().entry.note).toBe('Shared kinderregeling - updated by Mama');
  });
});

describe('Privacy: Private Entries', () => {
  it('Papa can create a private entry', async () => {
    if (!requireDb()) return;

    const res = await app.inject({
      method: 'PUT',
      url: '/api/calendar/2026-09-21',
      cookies: { session: papaCookie },
      payload: {
        title: 'Tandarts',
        time: '14:00',
        note: 'Papa private dentist appointment',
        isShared: false,
      },
    });
    expect(res.statusCode).toBe(200);
    const entry = res.json().entry;
    expect(entry.isShared).toBe(false);
    expect(entry.ownerId).toBe(papaId);
  });

  it('Papa can see his own private entry', async () => {
    if (!requireDb()) return;

    // Get by date
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/calendar/2026-09-21',
      cookies: { session: papaCookie },
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().entry.note).toBe('Papa private dentist appointment');

    // Get in month view
    const monthRes = await app.inject({
      method: 'GET',
      url: '/api/calendar?year=2026&month=9',
      cookies: { session: papaCookie },
    });
    expect(monthRes.statusCode).toBe(200);
    const entries = monthRes.json().entries;
    const found = entries.find((e: { date: string; note?: string }) => e.date === '2026-09-21');
    expect(found).toBeDefined();
    expect(found.note).toBe('Papa private dentist appointment');
  });

  it('Mama CANNOT see Papa private entry via GET', async () => {
    if (!requireDb()) return;

    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar/2026-09-21',
      cookies: { session: mamaCookie },
    });
    
    // Should return 404 (entry doesn't exist for Mama)
    expect(res.statusCode).toBe(404);
  });

  it('Mama CANNOT see Papa private entry via month list', async () => {
    if (!requireDb()) return;

    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar?year=2026&month=9',
      cookies: { session: mamaCookie },
    });
    expect(res.statusCode).toBe(200);
    const entries = res.json().entries;
    
    // Should NOT contain Papa's private entry
    const papaPrivate = entries.find((e: { date: string; note?: string }) => 
      e.date === '2026-09-21' && e.note === 'Papa private dentist appointment'
    );
    expect(papaPrivate).toBeUndefined();
  });

  it('Mama CANNOT see Papa private entry via getAllEntries (export)', async () => {
    if (!requireDb()) return;

    const res = await app.inject({
      method: 'GET',
      url: '/api/export/json',
      cookies: { session: mamaCookie },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    
    // Should NOT contain Papa's private entry
    const papaPrivate = data.entries.find((e: { date: string; note?: string }) => 
      e.date === '2026-09-21' && e.note === 'Papa private dentist appointment'
    );
    expect(papaPrivate).toBeUndefined();
  });

  it('Mama CANNOT update Papa private entry', async () => {
    if (!requireDb()) return;

    // Mama tries to update Papa's private entry
    const res = await app.inject({
      method: 'PUT',
      url: '/api/calendar/2026-09-21',
      cookies: { session: mamaCookie },
      payload: {
        title: 'Mama hijack attempt',
        note: 'Mama trying to hijack Papa appointment',
        isShared: false,
      },
    });
    
    // This should create a NEW private entry for Mama, not update Papa's
    expect(res.statusCode).toBe(200);
    const entry = res.json().entry;
    expect(entry.ownerId).toBe(mamaId);
    expect(entry.note).toBe('Mama trying to hijack Papa appointment');

    // Papa's entry should still exist unchanged
    const papaRes = await app.inject({
      method: 'GET',
      url: '/api/calendar/2026-09-21',
      cookies: { session: papaCookie },
    });
    expect(papaRes.statusCode).toBe(200);
    expect(papaRes.json().entry.note).toBe('Papa private dentist appointment');
  });

  it('Mama CANNOT delete Papa private entry', async () => {
    if (!requireDb()) return;

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/calendar/2026-09-21',
      cookies: { session: mamaCookie },
    });
    
    // Should return 404 (cannot see entry to delete)
    expect(res.statusCode).toBe(404);

    // Papa's entry should still exist
    const papaRes = await app.inject({
      method: 'GET',
      url: '/api/calendar/2026-09-21',
      cookies: { session: papaCookie },
    });
    expect(papaRes.statusCode).toBe(200);
    expect(papaRes.json().entry.note).toBe('Papa private dentist appointment');
  });
});

describe('Privacy: Mixed Entries on Same Date', () => {
  it('both parents can have entries on the same date', async () => {
    if (!requireDb()) return;

    const testDate = '2026-09-22';

    // Papa creates shared entry
    const papaSharedRes = await app.inject({
      method: 'PUT',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
      payload: {
        daytimeLocation: 'papa',
        sleepLocation: 'papa',
        note: 'Shared kinderregeling',
        isShared: true,
      },
    });
    expect(papaSharedRes.statusCode).toBe(200);

    // Papa creates private entry (should fail - cannot have both shared and private)
    // Actually, let me think about this...
    // The schema should allow: 1 shared entry + N private entries (1 per user)
    
    // Let's test on a different date for Papa's private
    const papaPrivateDate = '2026-09-23';
    const papaPrivateRes = await app.inject({
      method: 'PUT',
      url: `/api/calendar/${papaPrivateDate}`,
      cookies: { session: papaCookie },
      payload: {
        title: 'Doctor appointment',
        note: 'Papa private meeting',
        isShared: false,
      },
    });
    expect(papaPrivateRes.statusCode).toBe(200);

    // Mama creates private entry on same date
    const mamaPrivateRes = await app.inject({
      method: 'PUT',
      url: `/api/calendar/${papaPrivateDate}`,
      cookies: { session: mamaCookie },
      payload: {
        title: 'Hair salon',
        note: 'Mama private appointment',
        isShared: false,
      },
    });
    expect(mamaPrivateRes.statusCode).toBe(200);

    // Papa sees only his own private entry
    const papaViewRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${papaPrivateDate}`,
      cookies: { session: papaCookie },
    });
    expect(papaViewRes.statusCode).toBe(200);
    expect(papaViewRes.json().entry.note).toBe('Papa private meeting');

    // Mama sees only her own private entry
    const mamaViewRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${papaPrivateDate}`,
      cookies: { session: mamaCookie },
    });
    expect(mamaViewRes.statusCode).toBe(200);
    expect(mamaViewRes.json().entry.note).toBe('Mama private appointment');
  });

  it('shared entry takes precedence in single-entry views', async () => {
    if (!requireDb()) return;

    const testDate = '2026-09-24';

    // Create shared entry first
    await app.inject({
      method: 'PUT',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
      payload: {
        daytimeLocation: 'papa',
        sleepLocation: 'papa',
        note: 'Shared kinderregeling for 24th',
        isShared: true,
      },
    });

    // Both parents should see the shared entry when querying by date
    const papaRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
    });
    expect(papaRes.statusCode).toBe(200);
    expect(papaRes.json().entry.note).toBe('Shared kinderregeling for 24th');

    const mamaRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${testDate}`,
      cookies: { session: mamaCookie },
    });
    expect(mamaRes.statusCode).toBe(200);
    expect(mamaRes.json().entry.note).toBe('Shared kinderregeling for 24th');
  });
});

describe('Privacy: History and Audit Logs', () => {
  it('history of private entry only visible to owner', async () => {
    if (!requireDb()) return;

    const testDate = '2026-09-25';

    // Papa creates private entry
    await app.inject({
      method: 'PUT',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
      payload: {
        title: 'Papa private v1',
        note: 'Papa private v1',
        isShared: false,
      },
    });

    // Papa updates it
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
    });
    const version = getRes.json().entry.version;

    await app.inject({
      method: 'PUT',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
      payload: {
        title: 'Papa private v2',
        note: 'Papa private v2',
        isShared: false,
        version,
      },
    });

    // Papa can see history
    const papaHistoryRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${testDate}/history`,
      cookies: { session: papaCookie },
    });
    expect(papaHistoryRes.statusCode).toBe(200);
    expect(papaHistoryRes.json().history.length).toBeGreaterThan(0);

    // Mama tries to see history - should get 404 (entry not found for her)
    const mamaHistoryRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${testDate}/history`,
      cookies: { session: mamaCookie },
    });
    expect(mamaHistoryRes.statusCode).toBe(404);
  });
});

describe('Privacy: Bulk Operations', () => {
  it('rejects bulk create for private entries', async () => {
    if (!requireDb()) return;

    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar/bulk',
      cookies: { session: papaCookie },
      payload: {
        startDate: '2026-09-26',
        endDate: '2026-09-28',
        entry: {
          title: 'Papa bulk private',
          note: 'Papa bulk private',
          isShared: false,
        },
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');

    const papaMonthRes = await app.inject({
      method: 'GET',
      url: '/api/calendar?year=2026&month=9',
      cookies: { session: papaCookie },
    });
    expect(papaMonthRes.statusCode).toBe(200);
    const papaBulk = papaMonthRes.json().entries.filter(
      (e: { date: string; note?: string }) =>
        e.note === 'Papa bulk private' &&
        ['2026-09-26', '2026-09-27', '2026-09-28'].includes(e.date),
    );
    expect(papaBulk).toHaveLength(0);
  });

  it('weekly bulk only creates matching weekdays', async () => {
    if (!requireDb()) return;

    // 2026-10-05 is a Monday; until 2026-10-26 → 4 Mondays
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar/bulk',
      cookies: { session: papaCookie },
      payload: {
        startDate: '2026-10-05',
        endDate: '2026-10-26',
        frequency: 'weekly',
        entry: {
          daytimeLocation: 'papa',
          sleepLocation: 'papa',
          note: 'Weekly monday test',
          isShared: true,
        },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().results).toHaveLength(4);
    expect(res.json().results.map((r: { date: string }) => r.date)).toEqual([
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
  });

  it('biweekly bulk creates every other matching weekday', async () => {
    if (!requireDb()) return;

    // 2026-10-05 is a Monday; until 2026-10-26 → Mondays every 2 weeks = 2 dates
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar/bulk',
      cookies: { session: papaCookie },
      payload: {
        startDate: '2026-10-05',
        endDate: '2026-10-26',
        frequency: 'biweekly',
        entry: {
          daytimeLocation: 'papa',
          sleepLocation: 'papa',
          note: 'Biweekly monday test',
          isShared: true,
        },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().results).toHaveLength(2);
    expect(res.json().results.map((r: { date: string }) => r.date)).toEqual([
      '2026-10-05',
      '2026-10-19',
    ]);
  });

  it('weekly bulk from edit still creates other weekdays when entry id is sent', async () => {
    if (!requireDb()) return;

    // Create a Tuesday entry first
    const createRes = await app.inject({
      method: 'PUT',
      url: '/api/calendar/2026-10-06',
      cookies: { session: papaCookie },
      payload: {
        daytimeLocation: 'mama',
        sleepLocation: 'mama',
        note: 'Edit then bulk',
        isShared: true,
      },
    });
    expect(createRes.statusCode).toBe(200);
    const entryId = createRes.json().entry.id as string;

    // Bulk weekly with the source entry id (bug: used to skip other dates)
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar/bulk',
      cookies: { session: papaCookie },
      payload: {
        startDate: '2026-10-06',
        endDate: '2026-10-27',
        frequency: 'weekly',
        entry: {
          id: entryId,
          daytimeLocation: 'mama',
          sleepLocation: 'mama',
          note: 'Edit then bulk',
          isShared: true,
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const dates = res.json().results.map((r: { date: string; entry: unknown }) => r.date);
    expect(dates).toEqual([
      '2026-10-06',
      '2026-10-13',
      '2026-10-20',
      '2026-10-27',
    ]);
    expect(res.json().results.every((r: { entry: unknown }) => r.entry != null)).toBe(true);
  });
});

describe('Privacy: Copy Operations', () => {
  it('copying private entry preserves privacy', async () => {
    if (!requireDb()) return;

    const sourceDate = '2026-09-29';
    const targetDate = '2026-09-30';

    // Papa creates private entry
    await app.inject({
      method: 'PUT',
      url: `/api/calendar/${sourceDate}`,
      cookies: { session: papaCookie },
      payload: {
        title: 'Papa private to copy',
        note: 'Papa private to copy',
        isShared: false,
      },
    });

    // Papa copies it
    const copyRes = await app.inject({
      method: 'POST',
      url: `/api/calendar/${sourceDate}/copy`,
      cookies: { session: papaCookie },
      payload: {
        targetDate,
      },
    });
    expect(copyRes.statusCode).toBe(200);
    expect(copyRes.json().entry.isShared).toBe(false);

    // Mama should not see either entry
    const mamaSourceRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${sourceDate}`,
      cookies: { session: mamaCookie },
    });
    expect(mamaSourceRes.statusCode).toBe(404);

    const mamaTargetRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${targetDate}`,
      cookies: { session: mamaCookie },
    });
    expect(mamaTargetRes.statusCode).toBe(404);
  });

  it('Mama cannot copy Papa private entry', async () => {
    if (!requireDb()) return;

    const sourceDate = '2026-09-29';
    const targetDate = '2026-10-01';

    // Mama tries to copy Papa's private entry
    const copyRes = await app.inject({
      method: 'POST',
      url: `/api/calendar/${sourceDate}/copy`,
      cookies: { session: mamaCookie },
      payload: {
        targetDate,
      },
    });
    
    // Should return 404 (source entry not found for Mama)
    expect(copyRes.statusCode).toBe(404);
  });
});

describe('Privacy: Multiple private entries per user/day', () => {
  it('Papa can create two private entries on the same day', async () => {
    if (!requireDb()) return;

    const testDate = '2026-10-10';

    const first = await app.inject({
      method: 'PUT',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
      payload: {
        title: 'Tandarts',
        time: '10:00',
        note: 'Eerste privé',
        isShared: false,
      },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().entry.isShared).toBe(false);

    const second = await app.inject({
      method: 'PUT',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
      payload: {
        title: 'Vergadering',
        time: '16:00',
        note: 'Tweede privé',
        isShared: false,
      },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().entry.id).not.toBe(first.json().entry.id);

    const allRes = await app.inject({
      method: 'GET',
      url: `/api/calendar/${testDate}/all`,
      cookies: { session: papaCookie },
    });
    expect(allRes.statusCode).toBe(200);
    const privates = allRes.json().entries.filter((e: { isShared: boolean }) => !e.isShared);
    expect(privates).toHaveLength(2);

    const monthRes = await app.inject({
      method: 'GET',
      url: '/api/calendar?year=2026&month=10',
      cookies: { session: papaCookie },
    });
    const monthPrivates = monthRes.json().entries.filter(
      (e: { date: string; isShared: boolean }) => e.date === testDate && !e.isShared,
    );
    expect(monthPrivates).toHaveLength(2);
  });

  it('same-day shared + private: owner sees both layers, other parent sees only shared', async () => {
    if (!requireDb()) return;

    const testDate = '2026-10-11';

    await app.inject({
      method: 'PUT',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
      payload: {
        daytimeLocation: 'papa',
        sleepLocation: 'papa',
        note: 'Gedeelde kinderregeling 11 okt',
        isShared: true,
      },
    });

    await app.inject({
      method: 'PUT',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
      payload: {
        title: 'Sportles',
        time: '18:00',
        note: 'Papa privé naast kinderregeling',
        isShared: false,
      },
    });

    const papaAll = await app.inject({
      method: 'GET',
      url: `/api/calendar/${testDate}/all`,
      cookies: { session: papaCookie },
    });
    expect(papaAll.statusCode).toBe(200);
    const papaEntries = papaAll.json().entries as Array<{ isShared: boolean; note: string }>;
    expect(papaEntries.some((e) => e.isShared && e.note === 'Gedeelde kinderregeling 11 okt')).toBe(true);
    expect(papaEntries.some((e) => !e.isShared && e.note === 'Papa privé naast kinderregeling')).toBe(true);

    const mamaAll = await app.inject({
      method: 'GET',
      url: `/api/calendar/${testDate}/all`,
      cookies: { session: mamaCookie },
    });
    expect(mamaAll.statusCode).toBe(200);
    const mamaEntries = mamaAll.json().entries as Array<{ isShared: boolean; note: string }>;
    expect(mamaEntries).toHaveLength(1);
    expect(mamaEntries[0].isShared).toBe(true);
    expect(mamaEntries[0].note).toBe('Gedeelde kinderregeling 11 okt');
    expect(mamaEntries.some((e) => e.note === 'Papa privé naast kinderregeling')).toBe(false);

    const mamaMonth = await app.inject({
      method: 'GET',
      url: '/api/calendar?year=2026&month=10',
      cookies: { session: mamaCookie },
    });
    const mamaMonthForDay = mamaMonth.json().entries.filter((e: { date: string }) => e.date === testDate);
    expect(mamaMonthForDay).toHaveLength(1);
    expect(mamaMonthForDay[0].isShared).toBe(true);
    expect(mamaMonthForDay[0].title).not.toBe('Sportles');
  });

  it('Mama cannot delete Papa private by id', async () => {
    if (!requireDb()) return;

    const testDate = '2026-10-12';
    const created = await app.inject({
      method: 'PUT',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
      payload: {
        title: 'Geheim',
        isShared: false,
      },
    });
    const id = created.json().entry.id as string;

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/calendar/${testDate}?id=${id}`,
      cookies: { session: mamaCookie },
    });
    expect(del.statusCode).toBe(404);

    const papaStill = await app.inject({
      method: 'GET',
      url: `/api/calendar/${testDate}`,
      cookies: { session: papaCookie },
    });
    expect(papaStill.statusCode).toBe(200);
    expect(papaStill.json().entry.id).toBe(id);
  });
});
