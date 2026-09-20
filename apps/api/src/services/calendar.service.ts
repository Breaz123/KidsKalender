import { eq, and, gte, lte, desc, or } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import {
  calendarEntries,
  auditLogs,
  users,
} from '../db/schema.js';
import type { CalendarEntryInput } from '@kids-calendar/shared';
import { entryToJson } from '../lib/utils.js';

export async function getEntryByDate(householdId: string, date: string, userId: string) {
  const db = getDb();
  const entries = await db
    .select({
      id: calendarEntries.id,
      householdId: calendarEntries.householdId,
      date: calendarEntries.date,
      daytimeLocation: calendarEntries.daytimeLocation,
      daytimeLocationOther: calendarEntries.daytimeLocationOther,
      activity: calendarEntries.activity,
      activityOther: calendarEntries.activityOther,
      sleepLocation: calendarEntries.sleepLocation,
      broughtBy: calendarEntries.broughtBy,
      broughtByOther: calendarEntries.broughtByOther,
      pickedUpBy: calendarEntries.pickedUpBy,
      pickedUpByOther: calendarEntries.pickedUpByOther,
      note: calendarEntries.note,
      isShared: calendarEntries.isShared,
      ownerId: calendarEntries.ownerId,
      createdBy: calendarEntries.createdBy,
      updatedBy: calendarEntries.updatedBy,
      createdAt: calendarEntries.createdAt,
      updatedAt: calendarEntries.updatedAt,
      version: calendarEntries.version,
      updatedByName: users.name,
    })
    .from(calendarEntries)
    .leftJoin(users, eq(calendarEntries.updatedBy, users.id))
    .where(
      and(
        eq(calendarEntries.householdId, householdId),
        eq(calendarEntries.date, date),
        or(
          eq(calendarEntries.isShared, true),
          eq(calendarEntries.ownerId, userId),
        ),
      ),
    );

  if (entries.length === 0) return null;
  
  // Prioritize shared entries over private ones
  const sharedEntry = entries.find(e => e.isShared);
  if (sharedEntry) return entryToJson(sharedEntry);
  
  // Return user's private entry
  return entryToJson(entries[0]);
}

export async function getEntriesForMonth(
  householdId: string,
  userId: string,
  year: number,
  month: number,
) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const db = getDb();
  const entries = await db
    .select({
      id: calendarEntries.id,
      householdId: calendarEntries.householdId,
      date: calendarEntries.date,
      daytimeLocation: calendarEntries.daytimeLocation,
      daytimeLocationOther: calendarEntries.daytimeLocationOther,
      activity: calendarEntries.activity,
      activityOther: calendarEntries.activityOther,
      sleepLocation: calendarEntries.sleepLocation,
      broughtBy: calendarEntries.broughtBy,
      broughtByOther: calendarEntries.broughtByOther,
      pickedUpBy: calendarEntries.pickedUpBy,
      pickedUpByOther: calendarEntries.pickedUpByOther,
      note: calendarEntries.note,
      isShared: calendarEntries.isShared,
      ownerId: calendarEntries.ownerId,
      createdBy: calendarEntries.createdBy,
      updatedBy: calendarEntries.updatedBy,
      createdAt: calendarEntries.createdAt,
      updatedAt: calendarEntries.updatedAt,
      version: calendarEntries.version,
      updatedByName: users.name,
    })
    .from(calendarEntries)
    .leftJoin(users, eq(calendarEntries.updatedBy, users.id))
    .where(
      and(
        eq(calendarEntries.householdId, householdId),
        gte(calendarEntries.date, start),
        lte(calendarEntries.date, end),
        or(
          eq(calendarEntries.isShared, true),
          eq(calendarEntries.ownerId, userId),
        ),
      ),
    )
    .orderBy(calendarEntries.date);

  return entries.map(entryToJson);
}

export async function getAllEntries(householdId: string, userId: string) {
  const db = getDb();
  const entries = await db
    .select({
      id: calendarEntries.id,
      householdId: calendarEntries.householdId,
      date: calendarEntries.date,
      daytimeLocation: calendarEntries.daytimeLocation,
      daytimeLocationOther: calendarEntries.daytimeLocationOther,
      activity: calendarEntries.activity,
      activityOther: calendarEntries.activityOther,
      sleepLocation: calendarEntries.sleepLocation,
      broughtBy: calendarEntries.broughtBy,
      broughtByOther: calendarEntries.broughtByOther,
      pickedUpBy: calendarEntries.pickedUpBy,
      pickedUpByOther: calendarEntries.pickedUpByOther,
      note: calendarEntries.note,
      isShared: calendarEntries.isShared,
      ownerId: calendarEntries.ownerId,
      createdBy: calendarEntries.createdBy,
      updatedBy: calendarEntries.updatedBy,
      createdAt: calendarEntries.createdAt,
      updatedAt: calendarEntries.updatedAt,
      version: calendarEntries.version,
      updatedByName: users.name,
    })
    .from(calendarEntries)
    .leftJoin(users, eq(calendarEntries.updatedBy, users.id))
    .where(
      and(
        eq(calendarEntries.householdId, householdId),
        or(
          eq(calendarEntries.isShared, true),
          eq(calendarEntries.ownerId, userId),
        ),
      ),
    )
    .orderBy(calendarEntries.date);

  return entries.map(entryToJson);
}

function normalizeInput(input: CalendarEntryInput) {
  return {
    daytimeLocation: input.daytimeLocation ?? null,
    daytimeLocationOther: input.daytimeLocationOther ?? null,
    activity: input.activity ?? null,
    activityOther: input.activityOther ?? null,
    sleepLocation: input.sleepLocation ?? null,
    broughtBy: input.broughtBy ?? null,
    broughtByOther: input.broughtByOther ?? null,
    pickedUpBy: input.pickedUpBy ?? null,
    pickedUpByOther: input.pickedUpByOther ?? null,
    note: input.note ?? null,
    isShared: input.isShared ?? true,
  };
}

export async function upsertEntry(
  householdId: string,
  date: string,
  userId: string,
  input: CalendarEntryInput,
) {
  const db = getDb();
  const normalized = normalizeInput(input);
  const existing = await getEntryByDate(householdId, date, userId);

  if (existing) {
    if (input.version !== undefined && input.version !== existing.version) {
      const updater = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, existing.updatedBy))
        .limit(1);
      return {
        conflict: true as const,
        currentEntry: existing,
        updatedByName: updater[0]?.name ?? 'Onbekend',
      };
    }

    const previousValues = { ...existing };
    const [updated] = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(calendarEntries)
        .set({
          ...normalized,
          updatedBy: userId,
          updatedAt: new Date(),
          version: existing.version + 1,
        })
        .where(eq(calendarEntries.id, existing.id))
        .returning();

      await tx.insert(auditLogs).values({
        householdId,
        calendarEntryId: existing.id,
        userId,
        action: 'update',
        previousValues: previousValues as unknown as Record<string, unknown>,
        newValues: normalized as unknown as Record<string, unknown>,
      });

      return [row];
    });

    return { conflict: false as const, entry: await getEntryByDate(householdId, updated.date as string, userId) };
  }

  const [created] = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(calendarEntries)
      .values({
        householdId,
        date,
        ...normalized,
        ownerId: normalized.isShared ? null : userId,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      })
      .returning();

    await tx.insert(auditLogs).values({
      householdId,
      calendarEntryId: row.id,
      userId,
      action: 'create',
      previousValues: null,
      newValues: normalized as unknown as Record<string, unknown>,
    });

    return [row];
  });

  return { conflict: false as const, entry: await getEntryByDate(householdId, created.date as string, userId) };
}

export async function deleteEntry(
  householdId: string,
  date: string,
  userId: string,
) {
  const db = getDb();
  const existing = await getEntryByDate(householdId, date, userId);
  if (!existing) return null;

  await db.transaction(async (tx) => {
    await tx.insert(auditLogs).values({
      householdId,
      calendarEntryId: existing.id,
      userId,
      action: 'delete',
      previousValues: existing as unknown as Record<string, unknown>,
      newValues: null,
    });

    await tx
      .delete(calendarEntries)
      .where(eq(calendarEntries.id, existing.id));
  });

  return existing;
}

export async function copyEntry(
  householdId: string,
  sourceDate: string,
  targetDate: string,
  userId: string,
) {
  const source = await getEntryByDate(householdId, sourceDate, userId);
  if (!source) return null;

  const {
    version: _version,
    id: _id,
    date: _date,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    updatedByName: _updatedByName,
    isShared: _isShared,
    ownerId: _ownerId,
    ...rest
  } = source;
  void _version;
  void _id;
  void _date;
  void _createdAt;
  void _updatedAt;
  void _updatedByName;
  void _isShared;
  void _ownerId;
  return upsertEntry(householdId, targetDate, userId, { ...rest, isShared: source.isShared });
}

export async function bulkUpsertEntries(
  householdId: string,
  dates: string[],
  userId: string,
  input: CalendarEntryInput,
) {
  const results = [];
  for (const date of dates) {
    const result = await upsertEntry(householdId, date, userId, input);
    results.push({ date, ...result });
  }
  return results;
}

export async function getEntryHistory(householdId: string, date: string, userId: string) {
  const entry = await getEntryByDate(householdId, date, userId);
  if (!entry) return [];

  const db = getDb();
  const logs = await db
    .select({
      id: auditLogs.id,
      householdId: auditLogs.householdId,
      calendarEntryId: auditLogs.calendarEntryId,
      userId: auditLogs.userId,
      action: auditLogs.action,
      previousValues: auditLogs.previousValues,
      newValues: auditLogs.newValues,
      createdAt: auditLogs.createdAt,
      userName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(
      and(
        eq(auditLogs.householdId, householdId),
        eq(auditLogs.calendarEntryId, entry.id),
      ),
    )
    .orderBy(desc(auditLogs.createdAt));

  return logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));
}
