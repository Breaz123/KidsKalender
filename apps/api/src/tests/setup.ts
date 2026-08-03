import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-at-least-32-characters-long';
process.env.COOKIE_SECURE = 'false';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    'postgresql://kidscalendar:change_me_strong_password@localhost:5433/kidscalendar';
}
