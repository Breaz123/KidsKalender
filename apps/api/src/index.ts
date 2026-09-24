import './env.js';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authRoutes, settingsRoutes } from './routes/auth.routes.js';
import { calendarRoutes, exportRoutes, importRoutes } from './routes/calendar.routes.js';
import { cleanupExpiredSessions } from './services/auth.service.js';
import { closeDb } from './db/index.js';
import { corsOriginDelegate } from './lib/cors.js';

const PORT = parseInt(process.env.API_PORT ?? '3001', 10);
const HOST = process.env.API_HOST ?? '0.0.0.0';

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    bodyLimit: 1048576,
    // Honor X-Forwarded-For from Caddy / Vercel rewrites so login rate limits
    // key on the real client IP instead of a shared edge address.
    trustProxy: true,
  });

  await app.register(cors, {
    origin: (origin, cb) => corsOriginDelegate(origin, cb),
    credentials: true,
  });

  await app.register(cookie, {
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-production',
    parseOptions: {},
  });

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: {
        code: 'RATE_LIMITED',
        message: `Te veel verzoeken. Probeer het over ${Math.ceil(context.ttl / 1000)} seconden opnieuw.`,
      },
    }),
  });

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(calendarRoutes, { prefix: '/api/calendar' });
  await app.register(exportRoutes, { prefix: '/api/export' });
  await app.register(importRoutes, { prefix: '/api/import' });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Er is een onverwachte fout opgetreden.',
      },
    });
  });

  return app;
}

async function start() {
  const app = await buildApp();

  setInterval(() => {
    cleanupExpiredSessions().catch((err) => {
      app.log.error(err, 'Sessie-opruiming mislukt');
    });
  }, 60 * 60 * 1000);

  const shutdown = async () => {
    await app.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`API draait op http://${HOST}:${PORT}`);
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    console.error('Starten mislukt:', err);
    process.exit(1);
  });
}
