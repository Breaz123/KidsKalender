import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cacheCalendarMonth, getCachedCalendarMonth } from '../lib/offline';
import type { CalendarEntryInput } from '@kids-calendar/shared';

export function useToday() {
  return useQuery({
    queryKey: ['today'],
    queryFn: async () => {
      try {
        const data = await api.getToday();
        return data.today;
      } catch {
        const fallback = new Date().toLocaleString('en-CA', {
          timeZone: 'Europe/Brussels',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).slice(0, 10);
        return fallback;
      }
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
}

export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['calendar', year, month],
    queryFn: async () => {
      try {
        const data = await api.getCalendar(year, month);
        await cacheCalendarMonth(year, month, data.entries);
        return data.entries;
      } catch (err) {
        const cached = await getCachedCalendarMonth(year, month);
        if (cached) return cached.entries;
        throw err;
      }
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useCalendarEntry(date: string | null) {
  return useQuery({
    queryKey: ['calendar-entry', date],
    queryFn: () => api.getEntry(date!).then((r) => r.entry),
    enabled: !!date,
  });
}

export function useUpsertEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, data }: { date: string; data: CalendarEntryInput }) =>
      api.upsertEntry(date, data),
    onSuccess: (_data, vars) => {
      const [y, m] = vars.date.split('-').map(Number);
      qc.invalidateQueries({ queryKey: ['calendar', y, m] });
      qc.invalidateQueries({ queryKey: ['calendar-entry', vars.date] });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => api.deleteEntry(date),
    onSuccess: (_data, date) => {
      const [y, m] = date.split('-').map(Number);
      qc.invalidateQueries({ queryKey: ['calendar', y, m] });
      qc.invalidateQueries({ queryKey: ['calendar-entry', date] });
    },
  });
}

export function useBulkEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      startDate,
      endDate,
      entry,
    }: {
      startDate: string;
      endDate: string;
      entry: CalendarEntryInput;
    }) => api.bulkEntries(startDate, endDate, entry),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useCopyEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceDate,
      targetDate,
    }: {
      sourceDate: string;
      targetDate: string;
    }) => api.copyEntry(sourceDate, targetDate),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      qc.invalidateQueries({ queryKey: ['calendar-entry', vars.targetDate] });
    },
  });
}
