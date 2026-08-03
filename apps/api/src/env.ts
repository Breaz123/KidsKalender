import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Laad .env uit monorepo-root (apps/api/src/env -> ../../../.env)
config({ path: path.resolve(__dirname, '../../../.env') });
