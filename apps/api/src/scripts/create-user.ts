import '../env.js';
import * as readline from 'node:readline';
import { parseArgs } from 'node:util';
import { createUser } from '../services/auth.service.js';
import { closeDb } from '../db/index.js';
import type { UserRole } from '@kids-calendar/shared';

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(password);
      } else if (char === '\u0003') {
        process.exit(1);
      } else if (char === '\u007F' || char === '\b') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string', default: 'parent' },
      household: { type: 'string' },
    },
  });

  if (!values.email || !values.name) {
    console.error('Gebruik: npm run user:create -- --email gebruiker@example.com --name "Naam" [--role parent] [--household uuid]');
    process.exit(1);
  }

  const password = await promptHidden('Wachtwoord: ');
  const confirm = await promptHidden('Bevestig wachtwoord: ');

  if (password.length < 8) {
    console.error('Wachtwoord moet minimaal 8 tekens bevatten.');
    process.exit(1);
  }

  if (password !== confirm) {
    console.error('Wachtwoorden komen niet overeen.');
    process.exit(1);
  }

  const user = await createUser(
    values.email,
    values.name,
    password,
    values.role as UserRole,
    values.household,
  );

  console.log(`Gebruiker aangemaakt: ${user.email} (${user.id})`);
  await closeDb();
}

main().catch((err) => {
  console.error('Fout:', err.message);
  process.exit(1);
});
