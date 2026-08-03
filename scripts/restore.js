#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('Gebruik: npm run restore -- bestand.sql.gz');
  process.exit(1);
}

const backupDir = path.join(__dirname, '..', 'backups');
const filepath = existsSync(backupFile)
  ? backupFile
  : path.join(backupDir, backupFile);

if (!existsSync(filepath)) {
  console.error(`Bestand niet gevonden: ${filepath}`);
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL ?? 'postgresql://kidscalendar:change_me_strong_password@localhost:5432/kidscalendar';

console.log('WAARSCHUWING: Dit overschrijft de huidige database!');
console.log(`Herstellen van: ${filepath}`);

try {
  if (process.platform === 'win32') {
    console.log(`Voer uit: gunzip -c "${filepath}" | psql "${dbUrl}"`);
    process.exit(0);
  }
  execSync(`gunzip -c "${filepath}" | psql "${dbUrl}"`, { stdio: 'inherit' });
  console.log('Herstel voltooid.');
} catch (err) {
  console.error('Herstel mislukt:', err.message);
  process.exit(1);
}
