import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '../db/migrations');

describe('Private-entry unique constraint (Gap4)', () => {
  it('0003 originally created one-private-per-user-per-day unique index', () => {
    const sql = readFileSync(join(migrationsDir, '0003_private_agenda.sql'), 'utf8');
    expect(sql).toMatch(/CREATE UNIQUE INDEX calendar_entries_household_date_user_idx/);
  });

  it('0004 did not drop the private unique index', () => {
    const sql = readFileSync(join(migrationsDir, '0004_private_entry_fields.sql'), 'utf8');
    expect(sql).not.toMatch(/DROP INDEX.*calendar_entries_household_date_user_idx/);
  });

  it('0005 drops the one-private-per-user-per-day unique index', () => {
    const sql = readFileSync(join(migrationsDir, '0005_drop_private_unique.sql'), 'utf8');
    expect(sql).toMatch(/DROP INDEX IF EXISTS calendar_entries_household_date_user_idx/);
    expect(sql).not.toMatch(/CREATE UNIQUE INDEX calendar_entries_household_date_user_idx/);
  });

  it('drizzle schema does not reintroduce a private unique index', () => {
    const schema = readFileSync(join(here, '../db/schema.ts'), 'utf8');
    expect(schema).not.toMatch(/household_date_user/);
    expect(schema).toMatch(/calendar_entries_household_date_shared_idx/);
  });
});
