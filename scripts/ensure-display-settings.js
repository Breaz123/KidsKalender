import postgres from 'postgres';

const url =
  process.env.DATABASE_URL ??
  'postgresql://kidscalendar:change_me_strong_password@localhost:5433/kidscalendar';

const sql = postgres(url, { max: 1, connect_timeout: 10 });

try {
  await sql`ALTER TABLE households ADD COLUMN IF NOT EXISTS display_settings jsonb`;
  const cols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'households'
    ORDER BY ordinal_position
  `;
  console.log('OK columns:', cols.map((c) => c.column_name).join(', '));
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
