import '../env.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is niet geconfigureerd.');
    process.exit(1);
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log('Migraties uitvoeren...');
  await migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  console.log('Migraties voltooid.');
  await client.end();
}

runMigrations().catch((err) => {
  console.error('Migratie mislukt:', err);
  process.exit(1);
});
