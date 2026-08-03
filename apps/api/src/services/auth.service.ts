import { eq, and, lt } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import {
  users,
  sessions,
  householdMembers,
  households,
} from '../db/schema.js';
import {
  generateSessionToken,
  hashSessionToken,
  verifyPassword,
  getSessionExpiry,
  hashPassword,
} from '../lib/crypto.js';
import type { UserRole } from '@kids-calendar/shared';

const SESSION_COOKIE = 'session';
const SESSION_DURATION_HOURS = parseInt(
  process.env.SESSION_DURATION_HOURS ?? '168',
  10,
);

export { SESSION_COOKIE };

export async function authenticateUser(email: string, password: string) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.isActive) return null;

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return null;

  return user;
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
) {
  const db = getDb();
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiry(SESSION_DURATION_HOURS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return { token, expiresAt };
}

export async function getSessionUser(token: string) {
  const db = getDb();
  const tokenHash = hashSessionToken(token);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
    }
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, session.userId), eq(users.isActive, true)))
    .limit(1);

  if (!user) return null;

  const [membership] = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      householdName: households.name,
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(eq(householdMembers.userId, user.id))
    .limit(1);

  if (!membership) return null;

  await db
    .update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, session.id));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: membership.role as UserRole,
    householdId: membership.householdId,
    householdName: membership.householdName,
  };
}

export async function destroySession(token: string) {
  const db = getDb();
  const tokenHash = hashSessionToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function destroyAllUserSessions(userId: string) {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function cleanupExpiredSessions() {
  const db = getDb();
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function createUser(
  email: string,
  name: string,
  password: string,
  role: UserRole = 'parent',
  householdId?: string,
) {
  const db = getDb();
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      name,
      passwordHash,
    })
    .returning();

  let targetHouseholdId = householdId;

  if (!targetHouseholdId) {
    const [household] = await db
      .insert(households)
      .values({ name: 'Ons gezin' })
      .returning();
    targetHouseholdId = household.id;
  }

  await db.insert(householdMembers).values({
    householdId: targetHouseholdId,
    userId: user.id,
    role,
  });

  return user;
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return false;

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) return false;

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await destroyAllUserSessions(userId);
  return true;
}

export async function updateHouseholdName(householdId: string, name: string) {
  const db = getDb();
  const [household] = await db
    .update(households)
    .set({ name, updatedAt: new Date() })
    .where(eq(households.id, householdId))
    .returning();
  return household;
}

export async function updateHouseholdSettings(
  householdId: string,
  updates: {
    name?: string;
    displaySettings?: unknown;
  },
) {
  const db = getDb();
  const patch: {
    name?: string;
    displaySettings?: unknown;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (updates.name) patch.name = updates.name;
  if (updates.displaySettings !== undefined) {
    patch.displaySettings = updates.displaySettings;
  }

  const [household] = await db
    .update(households)
    .set(patch)
    .where(eq(households.id, householdId))
    .returning();
  return household;
}

export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = process.env.COOKIE_SECURE === 'true' || isProduction;

  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
  };
}
