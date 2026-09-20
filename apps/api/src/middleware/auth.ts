import type { FastifyRequest, FastifyReply } from 'fastify';
import { getCookieOptions, getSessionUser, SESSION_COOKIE } from '../services/auth.service.js';
import { sendError } from '../lib/utils.js';
import type { AuthUser } from '@kids-calendar/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) {
    return sendError(reply, 401, 'UNAUTHORIZED', 'U bent niet ingelogd.');
  }

  const user = await getSessionUser(token);
  if (!user) {
    reply.clearCookie(SESSION_COOKIE, getCookieOptions());
    return sendError(reply, 401, 'UNAUTHORIZED', 'Uw sessie is verlopen. Log opnieuw in.');
  }

  request.user = user;
}
