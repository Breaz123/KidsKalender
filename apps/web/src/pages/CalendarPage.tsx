import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCalendarMonth, useUpsertEntry, useBulkEntries, useToday } from '../hooks/useCalendar';
import { DayCell } from '../components/DayCell';
import { EntryForm } from '../components/EntryForm';
import type { CalendarEntryInput } from '@kids-calendar/shared';
import { addDays, format as fmt } from 'date-fns';

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState<string>();
  const { data: todayStr } = useToday();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: entries = [], isLoading, isError, error } = useCalendarMonth(year, month);
  const upsert = useUpsertEntry();
  const bulk = useBulkEntries();

  const entryMap = new Map(entries.map((e) => [e.date, e]));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPad = (getDay(monthStart) + 6) % 7;

  const handleSave = async (
    date: string,
    data: CalendarEntryInput,
    options?: { nextDay?: boolean; bulk?: boolean; endDate?: string },
  ) => {
    if (options?.bulk && options.endDate) {
      await bulk.mutateAsync({ startDate: date, endDate: options.endDate, entry: data });
    } else {
      await upsert.mutateAsync({ date, data });
      if (options?.nextDay) {
        const next = fmt(addDays(parseISO(date), 1), 'yyyy-MM-dd');
        setFormDate(next);
        return;
      }
    }
  };

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="btn-touch rounded-lg p-2 hover:bg-gray-100"
            aria-label="Vorige maand"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: nl })}
            </h1>
            <button
              type="button"
              onClick={() => {
                if (todayStr) {
                  const today = parseISO(todayStr);
                  setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                } else {
                  setCurrentDate(new Date());
                }
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Naar vandaag
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="btn-touch rounded-lg p-2 hover:bg-gray-100"
            aria-label="Volgende maand"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2">
          <select
            value={month}
            onChange={(e) =>
              setCurrentDate(new Date(year, parseInt(e.target.value, 10) - 1, 1))
            }
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            aria-label="Maand kiezen"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {format(new Date(2024, i, 1), 'MMMM', { locale: nl })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) =>
              setCurrentDate(new Date(parseInt(e.target.value, 10), month - 1, 1))
            }
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            aria-label="Jaar kiezen"
          >
            {Array.from({ length: 11 }, (_, i) => year - 5 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="p-2 sm:p-4">
        {isLoading && (
          <div className="py-12 text-center text-gray-500" role="status">
            Kalender laden…
          </div>
        )}

        {isError && (
          <div className="rounded-lg bg-red-50 p-4 text-center text-red-700" role="alert">
            {(error as Error)?.message ?? 'Kon kalender niet laden.'}
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1 text-center text-xs font-medium text-gray-500">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isTodayDate = todayStr === dateStr;
                return (
                  <DayCell
                    key={dateStr}
                    day={day.getDate()}
                    entry={entryMap.get(dateStr)}
                    isToday={isTodayDate}
                    onClick={() => navigate(`/dag/${dateStr}`)}
                  />
                );
              })}
            </div>

            {entries.length === 0 && (
              <p className="mt-6 text-center text-sm text-gray-500">
                Geen regelingen deze maand. Tik op + om te beginnen.
              </p>
            )}
          </>
        )}
      </div>

      <EntryForm
        open={showForm}
        onClose={() => setShowForm(false)}
        initialDate={formDate}
        onSave={handleSave}
      />
    </div>
  );
}

export function useCalendarAddForm() {
  const [showForm, setShowForm] = useState(false);
  const upsert = useUpsertEntry();
  const bulk = useBulkEntries();

  const handleSave = async (
    date: string,
    data: CalendarEntryInput,
    options?: { nextDay?: boolean; bulk?: boolean; endDate?: string },
  ) => {
    if (options?.bulk && options.endDate) {
      await bulk.mutateAsync({ startDate: date, endDate: options.endDate, entry: data });
    } else {
      await upsert.mutateAsync({ date, data });
    }
  };

  return { showForm, setShowForm, handleSave };
}
