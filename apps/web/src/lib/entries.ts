import type { CalendarEntry } from '@kids-calendar/shared';

/** Group every visible entry by date. Never overwrite layers with Map.set(date, one). */
export function groupEntriesByDate(entries: CalendarEntry[]): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date);
    if (list) list.push(entry);
    else map.set(entry.date, [entry]);
  }
  return map;
}

export function splitDayEntries(entries: CalendarEntry[] | undefined) {
  const list = entries ?? [];
  return {
    shared: list.find((e) => e.isShared) ?? null,
    privates: list.filter((e) => !e.isShared),
  };
}
