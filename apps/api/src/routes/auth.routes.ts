import type { FastifyInstance } from 'fastify';
import {
  loginSchema,
  changePasswordSchema,
  settingsUpdateSchema,
  mergeDisplaySettings,
} from '@kids-calendar/shared';
import {
  authenticateUser,
  createSession,
  destroySession,
  getCookieOptions,
  SESSION_COOKIE,
  changeUserPassword,
  updateHouseholdSettings,
} from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { sendError } from '../lib/utils.js';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { households } from '../db/schema.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', {
    config: {
      rateLimit: {
        max: process.env.NODE_ENV === 'production' ? 5 : 30,
        timeWindow: '15 minutes',
      },
    },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Controleer de ingevulde gegevens.',
        { fields: parsed.error.flatten().fieldErrors },
      );
    }

    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return sendError(
        reply,
        401,
        'INVALID_CREDENTIALS',
        'Onjuist e-mailadres of wachtwoord.',
      );
    }

    const { token } = await createSession(
      user.id,
      request.ip,
      request.headers['user-agent'],
    );

    reply.setCookie(SESSION_COOKIE, token, getCookieOptions());

    const authUser = await import('../services/auth.service.js').then((m) =>
      m.getSessionUser(token),
    );

    return { user: authUser };
  });

  app.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) {
      await destroySession(token);
    }
    reply.clearCookie(SESSION_COOKIE, getCookieOptions());
    return { success: true };
  });

  app.get('/me', { preHandler: requireAuth }, async (request) => {
    return { user: request.user };
  });
}

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const db = getDb();
    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.id, request.user!.householdId))
      .limit(1);

    const displaySettings = mergeDisplaySettings(
      household.displaySettings as Parameters<typeof mergeDisplaySettings>[0],
    );

    return {
      user: request.user,
      household: {
        id: household.id,
        name: household.name,
        createdAt: household.createdAt.toISOString(),
        updatedAt: household.updatedAt.toISOString(),
      },
      displaySettings,
    };
  });

  app.put('/', async (request, reply) => {
    const parsed = settingsUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Controleer de ingevulde gegevens.',
        { fields: parsed.error.flatten().fieldErrors },
      );
    }

    if (!parsed.data.householdName && !parsed.data.displaySettings) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Geen wijzigingen opgegeven.',
      );
    }

    const db = getDb();
    const [current] = await db
      .select()
      .from(households)
      .where(eq(households.id, request.user!.householdId))
      .limit(1);

    const nextDisplay = parsed.data.displaySettings
      ? mergeDisplaySettings({
          ...(current.displaySettings as object),
          ...parsed.data.displaySettings,
          sleep: {
            ...((current.displaySettings as { sleep?: object } | null)?.sleep ?? {}),
            ...(parsed.data.displaySettings.sleep ?? {}),
          },
          daytime: {
            ...((current.displaySettings as { daytime?: object } | null)?.daytime ?? {}),
            ...(parsed.data.displaySettings.daytime ?? {}),
          },
          activities: {
            ...((current.displaySettings as { activities?: object } | null)?.activities ??
              {}),
            ...(parsed.data.displaySettings.activities ?? {}),
          },
          persons: {
            ...((current.displaySettings as { persons?: object } | null)?.persons ?? {}),
            ...(parsed.data.displaySettings.persons ?? {}),
          },
        } as Parameters<typeof mergeDisplaySettings>[0])
      : undefined;

    const household = await updateHouseholdSettings(request.user!.householdId, {
      name: parsed.data.householdName,
      displaySettings: nextDisplay,
    });

    const displaySettings = mergeDisplaySettings(
      household.displaySettings as Parameters<typeof mergeDisplaySettings>[0],
    );

    return {
      user: {
        ...request.user!,
        householdName: household.name,
      },
      household: {
        id: household.id,
        name: household.name,
        createdAt: household.createdAt.toISOString(),
        updatedAt: household.updatedAt.toISOString(),
      },
      displaySettings,
    };
  });

  app.post('/change-password', async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Controleer de ingevulde gegevens.',
        { fields: parsed.error.flatten().fieldErrors },
      );
    }

    const success = await changeUserPassword(
      request.user!.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );

    if (!success) {
      return sendError(
        reply,
        400,
        'INVALID_PASSWORD',
        'Het huidige wachtwoord is onjuist.',
      );
    }

    reply.clearCookie(SESSION_COOKIE, getCookieOptions());
    return { success: true, message: 'Wachtwoord gewijzigd. Log opnieuw in.' };
  });
}
