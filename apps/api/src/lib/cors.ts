/**
 * Parse CORS_ORIGIN as a single origin or a comma-separated list.
 * Example: https://kids-kalender.vercel.app,https://kalender.breaz-it.be
 */
export function parseCorsOrigins(
  raw: string | undefined = process.env.CORS_ORIGIN,
): string[] {
  const value = (raw ?? 'http://localhost:5173').trim();
  if (!value) return ['http://localhost:5173'];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

type CorsOriginCallback = (
  err: Error | null,
  origin: boolean | string | RegExp,
) => void;

/**
 * @fastify/cors origin callback — reflects the request Origin when allowed.
 * Requests without an Origin header (curl, server-to-server, some same-origin
 * cases) are allowed so health checks and reverse proxies keep working.
 */
export function corsOriginDelegate(
  origin: string | undefined,
  callback: CorsOriginCallback,
  raw: string | undefined = process.env.CORS_ORIGIN,
): void {
  if (!origin) {
    callback(null, true);
    return;
  }

  const allowed = parseCorsOrigins(raw);
  callback(null, allowed.includes(origin));
}
