import type { CalendarEntry } from '@kids-calendar/shared';

export function entryToJson(entry: {
  id: string;
  householdId: string;
  date: string | Date;
  daytimeLocation: string | null;
  daytimeLocationOther: string | null;
  activity: string | null;
  activityOther: string | null;
  sleepLocation: string | null;
  broughtBy: string | null;
  broughtByOther: string | null;
  pickedUpBy: string | null;
  pickedUpByOther: string | null;
  note: string | null;
  isShared: boolean;
  ownerId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  updatedByName?: string | null;
}): CalendarEntry {
  return {
    id: entry.id,
    householdId: entry.householdId,
    date: formatDate(entry.date),
    daytimeLocation: entry.daytimeLocation as CalendarEntry['daytimeLocation'],
    daytimeLocationOther: entry.daytimeLocationOther,
    activity: entry.activity as CalendarEntry['activity'],
    activityOther: entry.activityOther,
    sleepLocation: entry.sleepLocation as CalendarEntry['sleepLocation'],
    broughtBy: entry.broughtBy as CalendarEntry['broughtBy'],
    broughtByOther: entry.broughtByOther,
    pickedUpBy: entry.pickedUpBy as CalendarEntry['pickedUpBy'],
    pickedUpByOther: entry.pickedUpByOther,
    note: entry.note,
    isShared: entry.isShared,
    ownerId: entry.ownerId ?? undefined,
    createdBy: entry.createdBy,
    updatedBy: entry.updatedBy,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    version: entry.version,
    updatedByName: entry.updatedByName ?? undefined,
  };
}

function formatDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function sendError(
  reply: import('fastify').FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  const body = {
    error: { code, message, ...(details ? { details } : {}) },
  };
  return reply.status(statusCode).send(body);
}

export function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
