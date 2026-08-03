import { get, set } from 'idb-keyval';
import type { CalendarEntry } from '@kids-calendar/shared';

const CACHE_PREFIX = 'calendar-cache-';

export async function cacheCalendarMonth(
  year: number,
  month: number,
  entries: CalendarEntry[],
) {
  await set(`${CACHE_PREFIX}${year}-${month}`, {
    entries,
    cachedAt: new Date().toISOString(),
  });
}

export async function getCachedCalendarMonth(
  year: number,
  month: number,
): Promise<{ entries: CalendarEntry[]; cachedAt: string } | null> {
  return (await get(`${CACHE_PREFIX}${year}-${month}`)) ?? null;
}

export function useOnlineStatus() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
