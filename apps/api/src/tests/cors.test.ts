import { describe, expect, it } from 'vitest';
import { corsOriginDelegate, parseCorsOrigins } from '../lib/cors.js';

describe('parseCorsOrigins', () => {
  it('defaults to local Vite origin', () => {
    expect(parseCorsOrigins(undefined)).toEqual(['http://localhost:5173']);
    expect(parseCorsOrigins('')).toEqual(['http://localhost:5173']);
  });

  it('parses a single origin', () => {
    expect(parseCorsOrigins('https://kalender.breaz-it.be')).toEqual([
      'https://kalender.breaz-it.be',
    ]);
  });

  it('parses comma-separated origins and trims whitespace', () => {
    expect(
      parseCorsOrigins(
        'https://kids-kalender.vercel.app, https://kalender.breaz-it.be',
      ),
    ).toEqual([
      'https://kids-kalender.vercel.app',
      'https://kalender.breaz-it.be',
    ]);
  });
});

describe('corsOriginDelegate', () => {
  const allowed =
    'https://kids-kalender.vercel.app,https://kalender.breaz-it.be';

  it('allows requests with no Origin header', () => {
    let result: boolean | undefined;
    corsOriginDelegate(undefined, (_err, allow) => {
      result = allow;
    }, allowed);
    expect(result).toBe(true);
  });

  it('allows listed Vercel and Docker origins', () => {
    for (const origin of [
      'https://kids-kalender.vercel.app',
      'https://kalender.breaz-it.be',
    ]) {
      let result: boolean | undefined;
      corsOriginDelegate(origin, (_err, allow) => {
        result = allow;
      }, allowed);
      expect(result).toBe(true);
    }
  });

  it('rejects unknown origins', () => {
    let result: boolean | undefined;
    corsOriginDelegate('https://evil.example', (_err, allow) => {
      result = allow;
    }, allowed);
    expect(result).toBe(false);
  });
});
