import '../env.js';
import { eq } from 'drizzle-orm';
import { getDb, closeDb } from '../db/index.js';
import { users, households, householdMembers } from '../db/schema.js';
import { createUser } from '../services/auth.service.js';
import { hashPassword } from '../lib/crypto.js';

const TEST_USERS = [
  { email: 'papa@example.com', name: 'Papa', password: 'TestPassword123!' },
  { email: 'mama@example.com', name: 'Mama', password: 'TestPassword123!' },
];

async function main() {
  const db = getDb();

  let [household] = await db.select().from(households).limit(1);
  if (!household) {
    [household] = await db.insert(households).values({ name: 'Ons gezin' }).returning();
    console.log('Huishouden aangemaakt:', household.id);
  }

  for (const testUser of TEST_USERS) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, testUser.email))
      .limit(1);

    if (existing) {
      const passwordHash = await hashPassword(testUser.password);
      await db
        .update(users)
        .set({ passwordHash, isActive: true, updatedAt: new Date() })
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

      console.log(`Bijgewerkt: ${testUser.email}`);
      continue;
    }

    await createUser(
      testUser.email,
      testUser.name,
      testUser.password,
      'parent',
      household.id,
    );
    console.log(`Aangemaakt: ${testUser.email}`);
  }

  console.log('\nTestgebruikers (zelfde huishouden):');
  console.log('  papa@example.com / TestPassword123!');
  console.log('  mama@example.com / TestPassword123!');
  await closeDb();
}

main().catch((err) => {
  console.error('Fout:', err.message);
  process.exit(1);
});
