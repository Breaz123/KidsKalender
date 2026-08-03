#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = path.join(__dirname, '..', 'backups');

if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

const dbUrl = process.env.DATABASE_URL ?? 'postgresql://kidscalendar:change_me_strong_password@localhost:5432/kidscalendar';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename = `kidscalendar_${timestamp}.sql.gz`;
const filepath = path.join(backupDir, filename);

console.log(`Back-up starten: ${filename}`);

try {
  if (process.platform === 'win32') {
    console.log('Op Windows: gebruik Docker voor back-ups of installeer pg_dump.');
    console.log(`Voer uit: pg_dump "${dbUrl}" | gzip > "${filepath}"`);
    process.exit(0);
  }
  execSync(`pg_dump "${dbUrl}" | gzip > "${filepath}"`, { stdio: 'inherit' });
  console.log(`Back-up opgeslagen: ${filepath}`);
} catch (err) {
  console.error('Back-up mislukt:', err.message);
  process.exit(1);
}
