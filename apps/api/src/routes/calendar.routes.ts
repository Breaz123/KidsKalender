import type { FastifyInstance } from 'fastify';
import {
  calendarEntryInputSchema,
  bulkCalendarSchema,
  copyCalendarSchema,
  importJsonSchema,
} from '@kids-calendar/shared';
import { requireAuth } from '../middleware/auth.js';
import { sendError, getDatesInRange } from '../lib/utils.js';
import {
  getEntryByDate,
  getEntriesForMonth,
  getAllEntries,
  upsertEntry,
  deleteEntry,
  copyEntry,
  bulkUpsertEntries,
  getEntryHistory,
} from '../services/calendar.service.js';

export async function calendarRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/today', async () => {
    const today = new Date().toLocaleString('en-CA', {
      timeZone: 'Europe/Brussels',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).slice(0, 10);
    return { today };
  });

  app.get('/', async (request, reply) => {
    const { year, month } = request.query as { year?: string; month?: string };
    if (!year || !month) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Jaar en maand zijn verplicht.',
      );
    }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Ongeldige maand of jaar.');
    }

    const entries = await getEntriesForMonth(request.user!.householdId, y, m);
    return { entries };
  });

  app.get('/:date', async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Ongeldige datum.');
    }

    const entry = await getEntryByDate(request.user!.householdId, date);
    if (!entry) {
      return sendError(reply, 404, 'NOT_FOUND', 'Geen regeling gevonden voor deze dag.');
    }
    return { entry };
  });

  app.put('/:date', async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Ongeldige datum.');
    }

    const parsed = calendarEntryInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Controleer de ingevulde gegevens.',
        { fields: parsed.error.flatten().fieldErrors },
      );
    }

    const result = await upsertEntry(
      request.user!.householdId,
      date,
      request.user!.id,
      parsed.data,
    );

    if (result.conflict) {
      return sendError(reply, 409, 'VERSION_CONFLICT', 'Deze dag is intussen gewijzigd door iemand anders.', {
        currentEntry: result.currentEntry,
        updatedByName: result.updatedByName,
      });
    }

    return { entry: result.entry };
  });

  app.delete('/:date', async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Ongeldige datum.');
    }

    const deleted = await deleteEntry(
      request.user!.householdId,
      date,
      request.user!.id,
    );

    if (!deleted) {
      return sendError(reply, 404, 'NOT_FOUND', 'Geen regeling gevonden voor deze dag.');
    }

    return { success: true };
  });

  app.post('/bulk', async (request, reply) => {
    const parsed = bulkCalendarSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Controleer de ingevulde gegevens.',
        { fields: parsed.error.flatten().fieldErrors },
      );
    }

    const dates = getDatesInRange(parsed.data.startDate, parsed.data.endDate);
    const results = await bulkUpsertEntries(
      request.user!.householdId,
      dates,
      request.user!.id,
      parsed.data.entry,
    );

    return { results: results.map((r) => ({ date: r.date, entry: r.conflict ? null : r.entry })) };
  });

  app.post('/:date/copy', async (request, reply) => {
    const { date } = request.params as { date: string };
    const parsed = copyCalendarSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Controleer de ingevulde gegevens.',
        { fields: parsed.error.flatten().fieldErrors },
      );
    }

    const result = await copyEntry(
      request.user!.householdId,
      date,
      parsed.data.targetDate,
      request.user!.id,
    );

    if (!result) {
      return sendError(reply, 404, 'NOT_FOUND', 'Geen bronregeling gevonden.');
    }

    if (result.conflict) {
      return sendError(reply, 409, 'VERSION_CONFLICT', 'Doeldag is intussen gewijzigd.', {
        currentEntry: result.currentEntry,
        updatedByName: result.updatedByName,
      });
    }

    return { entry: result.entry };
  });

  app.get('/:date/history', async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Ongeldige datum.');
    }

    const history = await getEntryHistory(request.user!.householdId, date);
    return { history };
  });
}

export async function exportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/csv', async (request, reply) => {
    const entries = await getAllEntries(request.user!.householdId);
    const header = 'datum,overdag,activiteit,slapen,brengen,ophalen,opmerking';
    const rows = entries.map((e) =>
      [
        e.date,
        e.daytimeLocation ?? '',
        e.activity ?? '',
        e.sleepLocation ?? '',
        e.broughtBy ?? '',
        e.pickedUpBy ?? '',
        (String(e.note ?? '')).replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(','),
    );
    const csv = [header, ...rows].join('\n');

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="kalender-export.csv"');
    return csv;
  });

  app.get('/json', async (request, reply) => {
    const entries = await getAllEntries(request.user!.householdId);
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 'attachment; filename="kalender-export.json"');
    return { exportedAt: new Date().toISOString(), entries };
  });

}

export async function importRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.post('/json', async (request, reply) => {
    const parsed = importJsonSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Het importbestand is ongeldig.',
        { fields: parsed.error.flatten().fieldErrors },
      );
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of parsed.data.entries) {
      const existing = await getEntryByDate(request.user!.householdId, item.date);
      const { date, ...input } = item;
      void date;
      const result = await upsertEntry(
        request.user!.householdId,
        item.date,
        request.user!.id,
        input,
      );

      if (result.conflict) {
        skipped++;
      } else if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    return { created, updated, skipped };
  });
}
