import '../env.js';
import { eq, inArray } from 'drizzle-orm';
import { getDb, closeDb } from '../db/index.js';
import { users, households, householdMembers } from '../db/schema.js';
import { createUser } from '../services/auth.service.js';
import { hashPassword } from '../lib/crypto.js';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} ontbreekt in .env`);
  }
  return value;
}

const USERS = [
  {
    email: 'papa@kindjes',
    legacyEmails: ['papa@example.com'],
    name: 'Siemon',
    password: requireEnv('PASSWORD_PAPA'),
  },
  {
    email: 'mama@kindjes',
    legacyEmails: ['mama@example.com'],
    name: 'Trixie',
    password: requireEnv('PASSWORD_MAMA'),
  },
];

async function main() {
  const db = getDb();

  let [household] = await db.select().from(households).limit(1);
  if (!household) {
    [household] = await db.insert(households).values({ name: 'Ons gezin' }).returning();
    console.log('Huishouden aangemaakt:', household.id);
  }

  for (const user of USERS) {
    const lookupEmails = [user.email, ...user.legacyEmails];
    const [existing] = await db
      .select()
      .from(users)
      .where(inArray(users.email, lookupEmails))
      .limit(1);

    if (existing) {
      const passwordHash = await hashPassword(user.password);
      await db
        .update(users)
        .set({
          email: user.email,
          name: user.name,
          passwordHash,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id));

      const [membership] = await db
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.userId, existing.id))
        .limit(1);

      if (!membership) {
        await db.insert(householdMembers).values({
          householdId: household.id,
          userId: existing.id,
          role: 'parent',
        });
      } else if (membership.householdId !== household.id) {
        await db
          .delete(householdMembers)
          .where(eq(householdMembers.userId, existing.id));
        await db.insert(householdMembers).values({
          householdId: household.id,
          userId: existing.id,
          role: 'parent',
        });
      }

      console.log(`Bijgewerkt: ${user.name} (${user.email})`);
      continue;
    }

    await createUser(
      user.email,
      user.name,
      user.password,
      'parent',
      household.id,
    );
    console.log(`Aangemaakt: ${user.name} (${user.email})`);
  }

  console.log('\nOuderaccounts (zelfde huishouden):');
  console.log('  Siemon — papa@kindjes (PASSWORD_PAPA)');
  console.log('  Trixie — mama@kindjes (PASSWORD_MAMA)');
  await closeDb();
}

main().catch((err) => {
  console.error('Fout:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
