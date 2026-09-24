import type { FastifyInstance } from 'fastify';
import {
  calendarEntryInputSchema,
  bulkCalendarSchema,
  copyCalendarSchema,
  importJsonSchema,
} from '@kids-calendar/shared';
import { requireAuth } from '../middleware/auth.js';
import { sendError, getDatesInRange, getWeeklyDatesInRange, getBiweeklyDatesInRange } from '../lib/utils.js';
import {
  getEntryByDate,
  getAllEntriesForDate,
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

    try {
      const entries = await getEntriesForMonth(
        request.user!.householdId,
        request.user!.id,
        y,
        m,
      );
      return { entries };
    } catch (err) {
      request.log.error(err, 'Kalender maand ophalen mislukt');
      return sendError(
        reply,
        500,
        'INTERNAL_ERROR',
        'Kon de kalender niet laden. Probeer het opnieuw.',
      );
    }
  });

  app.get('/:date/all', async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Ongeldige datum.');
    }

    const entries = await getAllEntriesForDate(
      request.user!.householdId,
      date,
      request.user!.id,
    );
    return { entries };
  });

  app.get('/:date', async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Ongeldige datum.');
    }

    const entries = await getAllEntriesForDate(
      request.user!.householdId,
      date,
      request.user!.id,
    );
    const entry = await getEntryByDate(request.user!.householdId, date, request.user!.id);
    if (!entry) {
      return sendError(reply, 404, 'NOT_FOUND', 'Geen regeling gevonden voor deze dag.');
    }
    return { entry, entries };
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

    if (!result.entry) {
      return sendError(reply, 404, 'NOT_FOUND', 'Geen regeling gevonden voor deze dag.');
    }

    return { entry: result.entry };
  });

  app.delete('/:date', async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Ongeldige datum.');
    }

    const { id } = request.query as { id?: string };
    const entryId =
      id && /^[0-9a-f-]{36}$/i.test(id) ? id : undefined;

    const deleted = await deleteEntry(
      request.user!.householdId,
      date,
      request.user!.id,
      entryId,
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

    // Privé blijft single-day: multi-day bulk is alleen voor gedeelde kinderregeling.
    if (parsed.data.entry.isShared === false) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Privé afspraken kunnen niet over meerdere dagen tegelijk worden aangemaakt.',
      );
    }

    const dates =
      parsed.data.frequency === 'weekly'
        ? getWeeklyDatesInRange(parsed.data.startDate, parsed.data.endDate)
        : parsed.data.frequency === 'biweekly'
          ? getBiweeklyDatesInRange(parsed.data.startDate, parsed.data.endDate)
          : getDatesInRange(parsed.data.startDate, parsed.data.endDate);

    if (dates.length === 0) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Geen dagen in deze periode. Controleer start- en einddatum.',
      );
    }

    if (dates.length > 366) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Periode is te lang (max. 366 dagen). Kies een kortere einddatum.',
      );
    }

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

    if (!result.entry) {
      return sendError(reply, 404, 'NOT_FOUND', 'Geen bronregeling gevonden.');
    }

    return { entry: result.entry };
  });

  app.get('/:date/history', async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Ongeldige datum.');
    }

    const visible = await getEntryByDate(
      request.user!.householdId,
      date,
      request.user!.id,
    );
    if (!visible) {
      return sendError(reply, 404, 'NOT_FOUND', 'Geen regeling gevonden voor deze dag.');
    }

    const history = await getEntryHistory(request.user!.householdId, date, request.user!.id);
    return { history };
  });
}

export async function exportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/csv', async (request, reply) => {
    const entries = await getAllEntries(request.user!.householdId, request.user!.id);
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
    const entries = await getAllEntries(request.user!.householdId, request.user!.id);
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
      const existing = await getEntryByDate(request.user!.householdId, item.date, request.user!.id);
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
