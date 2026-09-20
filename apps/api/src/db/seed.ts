import '../env.js';
import { eq } from 'drizzle-orm';
import { getDb, closeDb } from './index.js';
import { users, households, householdMembers } from './schema.js';
import { hashPassword } from '../lib/crypto.js';
import { upsertEntry } from '../services/calendar.service.js';
import type { CalendarEntryInput } from '@kids-calendar/shared';

type SeedEntry = CalendarEntryInput & { date: string };

const august2026Data: SeedEntry[] = [
  { date: '2026-08-02', daytimeLocation: 'papa', sleepLocation: 'oma', note: 'Daarna naar oma', isShared: true },
  { date: '2026-08-03', daytimeLocation: 'oma', sleepLocation: 'oma', isShared: true },
  { date: '2026-08-04', daytimeLocation: 'oma', pickedUpBy: 'trixie', sleepLocation: 'mama', isShared: true },
  { date: '2026-08-05', daytimeLocation: 'mama', sleepLocation: 'mama', isShared: true },
  { date: '2026-08-06', daytimeLocation: 'omi', broughtBy: 'papa', pickedUpBy: 'mama', sleepLocation: 'mama', isShared: true },
  { date: '2026-08-07', activity: 'krakkebol', broughtBy: 'papa', pickedUpBy: 'mama', sleepLocation: 'mama', isShared: true },
  { date: '2026-08-08', daytimeLocation: 'mama', sleepLocation: 'papa', note: "Papa komt 's avonds", isShared: true },
  { date: '2026-08-09', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
  { date: '2026-08-10', daytimeLocation: 'oma', broughtBy: 'papa', pickedUpBy: 'mama', sleepLocation: 'mama', isShared: true },
  { date: '2026-08-11', daytimeLocation: 'mama', sleepLocation: 'mama', isShared: true },
  { date: '2026-08-12', activity: 'krakkebol', broughtBy: 'papa', sleepLocation: 'omi', isShared: true },
  { date: '2026-08-13', daytimeLocation: 'omi', pickedUpBy: 'papa', sleepLocation: 'papa', isShared: true },
  { date: '2026-08-14', daytimeLocation: 'mama', sleepLocation: 'mama', isShared: true },
  // Vakantie met papa: activiteit + slapen bij papa
  { date: '2026-08-15', activity: 'vakantie', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
  { date: '2026-08-16', activity: 'vakantie', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
  { date: '2026-08-17', activity: 'vakantie', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
  { date: '2026-08-18', activity: 'vakantie', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
  { date: '2026-08-19', activity: 'vakantie', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
  { date: '2026-08-20', daytimeLocation: 'mama', sleepLocation: 'mama', isShared: true },
  { date: '2026-08-21', daytimeLocation: 'mama', sleepLocation: 'mama', isShared: true },
  { date: '2026-08-22', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
  { date: '2026-08-23', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
  { date: '2026-08-29', daytimeLocation: 'mama', sleepLocation: 'mama', note: 'Terug naar mama', isShared: true },
  { date: '2026-08-30', daytimeLocation: 'mama', sleepLocation: 'mama', isShared: true },
  { date: '2026-08-31', daytimeLocation: 'papa', sleepLocation: 'papa', isShared: true },
];

async function seed() {
  const db = getDb();

  let [household] = await db.select().from(households).limit(1);

  if (!household) {
    [household] = await db
      .insert(households)
      .values({ name: 'Ons gezin' })
      .returning();
    console.log('Huishouden aangemaakt.');
  }

  let [seedUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'seed@example.com'))
    .limit(1);

  if (!seedUser) {
    const passwordHash = await hashPassword('SeedPassword123!');
    [seedUser] = await db
      .insert(users)
      .values({
        email: 'seed@example.com',
        name: 'Seed Gebruiker',
        passwordHash,
      })
      .returning();

    await db.insert(householdMembers).values({
      householdId: household.id,
      userId: seedUser.id,
      role: 'parent',
    });
    console.log('Seed-gebruiker aangemaakt (seed@example.com).');
  }

  for (const entry of august2026Data) {
    const { date, ...data } = entry;
    await upsertEntry(household.id, date, seedUser.id, data);
  }

  console.log(`${august2026Data.length} kalenderitems voor augustus 2026 toegevoegd.`);
  await closeDb();
}

seed().catch((err) => {
  console.error('Seed mislukt:', err);
  process.exit(1);
});
