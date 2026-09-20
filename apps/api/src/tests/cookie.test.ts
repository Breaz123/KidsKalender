import { afterEach, describe, expect, it } from 'vitest';
import {
  getCookieOptions,
  resolveCookieSameSite,
} from '../services/auth.service.js';

const original = {
  NODE_ENV: process.env.NODE_ENV,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
};

afterEach(() => {
  process.env.NODE_ENV = original.NODE_ENV;
  process.env.COOKIE_SECURE = original.COOKIE_SECURE;
  if (original.COOKIE_SAMESITE === undefined) {
    delete process.env.COOKIE_SAMESITE;
  } else {
    process.env.COOKIE_SAMESITE = original.COOKIE_SAMESITE;
  }
});

describe('COOKIE_SAMESITE', () => {
  it('defaults safely to lax', () => {
    delete process.env.COOKIE_SAMESITE;
    expect(resolveCookieSameSite()).toBe('lax');
    expect(resolveCookieSameSite('bogus')).toBe('lax');
  });

  it('accepts none, lax and strict (case-insensitive)', () => {
    expect(resolveCookieSameSite('None')).toBe('none');
    expect(resolveCookieSameSite('STRICT')).toBe('strict');
    expect(resolveCookieSameSite('lax')).toBe('lax');
  });

  it('SameSite=None forces Secure even when COOKIE_SECURE is false', () => {
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SECURE = 'false';
    process.env.COOKIE_SAMESITE = 'none';
    const opts = getCookieOptions();
    expect(opts.sameSite).toBe('none');
    expect(opts.secure).toBe(true);
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe('/');
  });

  it('COOKIE_SECURE=true works together with SameSite=None', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SECURE = 'true';
    process.env.COOKIE_SAMESITE = 'none';
    const opts = getCookieOptions();
    expect(opts.sameSite).toBe('none');
    expect(opts.secure).toBe(true);
  });

  it('keeps lax + insecure in local development', () => {
    process.env.NODE_ENV = 'test';
    process.env.COOKIE_SECURE = 'false';
    process.env.COOKIE_SAMESITE = 'lax';
    const opts = getCookieOptions();
    expect(opts.sameSite).toBe('lax');
    expect(opts.secure).toBe(false);
  });
});
