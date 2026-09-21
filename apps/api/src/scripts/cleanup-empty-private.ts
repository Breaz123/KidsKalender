/**
 * Verwijder privé-afspraken zonder titel (bulk-artefacten) in een maand.
 *
 * Gebruik:
 *   npm run cleanup:empty-private -- --year=2026 --month=9 --dry-run
 *   npm run cleanup:empty-private -- --year=2026 --month=9
 *
 * Optioneel: --email=papa@kindjes om tot één owner te beperken.
 * Verwijdert nooit getitelde privé-afspraken of gedeelde kinderregelingen.
 */
import '../env.js';
import { parseArgs } from 'node:util';
import { and, eq, gte, lte, isNull, or, inArray, sql } from 'drizzle-orm';
import { getDb, closeDb } from '../db/index.js';
import { calendarEntries, users } from '../db/schema.js';

async function main() {
  const { values } = parseArgs({
    options: {
      year: { type: 'string' },
      month: { type: 'string' },
      email: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const year = parseInt(values.year ?? '', 10);
  const month = parseInt(values.month ?? '', 10);
  if (!year || !month || month < 1 || month > 12) {
    console.error('Gebruik: --year=2026 --month=9 [--email=papa@kindjes] [--dry-run]');
    process.exit(1);
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  const end = endDate.toISOString().slice(0, 10);
  const dryRun = Boolean(values['dry-run']);

  const db = getDb();

  let ownerId: string | undefined;
  if (values.email) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, values.email.toLowerCase().trim()))
      .limit(1);
    if (!user) {
      console.error(`Gebruiker niet gevonden: ${values.email}`);
      process.exit(1);
    }
    ownerId = user.id;
  }

  const conditions = [
    eq(calendarEntries.isShared, false),
    gte(calendarEntries.date, start),
    lte(calendarEntries.date, end),
    or(isNull(calendarEntries.title), eq(calendarEntries.title, ''), sql`trim(${calendarEntries.title}) = ''`),
  ];
  if (ownerId) {
    conditions.push(eq(calendarEntries.ownerId, ownerId));
  }

  const matches = await db
    .select({
      id: calendarEntries.id,
      date: calendarEntries.date,
      title: calendarEntries.title,
      ownerId: calendarEntries.ownerId,
      note: calendarEntries.note,
    })
    .from(calendarEntries)
    .where(and(...conditions))
    .orderBy(calendarEntries.date);

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Lege privé-afspraken ${start} t/m ${end}: ${matches.length}`,
  );
  for (const row of matches.slice(0, 20)) {
    console.log(`  ${row.date}  id=${row.id}  note=${row.note ?? '—'}`);
  }
  if (matches.length > 20) {
    console.log(`  … en ${matches.length - 20} meer`);
  }

  if (dryRun || matches.length === 0) {
    await closeDb();
    return;
  }

  const ids = matches.map((m) => m.id);
  await db.delete(calendarEntries).where(inArray(calendarEntries.id, ids));

  console.log(`Verwijderd: ${ids.length} lege privé-afspraken.`);
  await closeDb();
}

main().catch((err) => {
  console.error('Fout:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
