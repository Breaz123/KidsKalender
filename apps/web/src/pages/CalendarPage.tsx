import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
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
import { EmptyState } from '../components/EmptyState';
import { CalendarGridSkeleton } from '../components/Skeleton';
import { groupEntriesByDate } from '../lib/entries';
import type { CalendarEntryInput } from '@kids-calendar/shared';
import { addDays, format as fmt } from 'date-fns';

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState<string>();
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [shouldFocusCell, setShouldFocusCell] = useState(false);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const { data: todayStr } = useToday();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: entries = [], isLoading, isError, error } = useCalendarMonth(year, month);
  const upsert = useUpsertEntry();
  const bulk = useBulkEntries();

  const entriesByDate = useMemo(() => groupEntriesByDate(entries), [entries]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPad = (getDay(monthStart) + 6) % 7;

  const firstDayStr = format(days[0], 'yyyy-MM-dd');
  const todayInMonth = Boolean(todayStr && days.some((d) => format(d, 'yyyy-MM-dd') === todayStr));

  useEffect(() => {
    setFocusDate(todayInMonth && todayStr ? todayStr : firstDayStr);
  }, [year, month, todayStr, todayInMonth, firstDayStr]);

  useEffect(() => {
    if (!shouldFocusCell || !focusDate) return;
    cellRefs.current.get(focusDate)?.focus();
    setShouldFocusCell(false);
  }, [shouldFocusCell, focusDate]);

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

  const moveFocus = (delta: number) => {
    const idx = days.findIndex((d) => format(d, 'yyyy-MM-dd') === focusDate);
    const nextIdx = Math.max(0, Math.min(days.length - 1, (idx < 0 ? 0 : idx) + delta));
    setFocusDate(format(days[nextIdx], 'yyyy-MM-dd'));
    setShouldFocusCell(true);
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (showForm) return;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(7);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(-7);
        break;
      case 'Home':
        event.preventDefault();
        setFocusDate(format(days[0], 'yyyy-MM-dd'));
        setShouldFocusCell(true);
        break;
      case 'End':
        event.preventDefault();
        setFocusDate(format(days[days.length - 1], 'yyyy-MM-dd'));
        setShouldFocusCell(true);
        break;
      case 'Enter':
      case ' ':
        if (focusDate) {
          event.preventDefault();
          navigate(`/dag/${focusDate}`);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="pb-24">
      <header className="sticky top-[var(--app-sticky-offset,0px)] z-10 border-b border-gray-200 bg-white px-4 py-3">
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
              className="btn-touch text-sm text-blue-600 hover:underline"
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
            className="min-h-touch rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
            className="min-h-touch rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
        {isError && (
          <div className="rounded-lg bg-red-50 p-4 text-center text-red-700" role="alert">
            {(error as Error)?.message ?? 'Kon kalender niet laden.'}
          </div>
        )}

        {!isError && (
          <>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1 text-center text-xs font-medium text-gray-500">
                  {d}
                </div>
              ))}
            </div>

            {isLoading ? (
              <CalendarGridSkeleton />
            ) : (
              <div
                role="grid"
                aria-label={`Kalender ${format(currentDate, 'MMMM yyyy', { locale: nl })}`}
                onKeyDown={handleGridKeyDown}
                className="grid grid-cols-7 gap-1"
              >
                {Array.from({ length: startPad }).map((_, i) => (
                  <div key={`pad-${i}`} role="presentation" />
                ))}
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isTodayDate = todayStr === dateStr;
                  return (
                    <div key={dateStr} role="gridcell">
                      <DayCell
                        ref={(el) => {
                          if (el) cellRefs.current.set(dateStr, el);
                          else cellRefs.current.delete(dateStr);
                        }}
                        day={day.getDate()}
                        date={day}
                        entries={entriesByDate.get(dateStr) ?? []}
                        isToday={isTodayDate}
                        tabIndex={focusDate === dateStr ? 0 : -1}
                        onClick={() => navigate(`/dag/${dateStr}`)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && entries.length === 0 && (
              <div className="mt-6">
                <EmptyState
                  title="Geen regelingen deze maand"
                  description="Tik op + Regeling om te beginnen."
                  onAction={() => {
                    setFormDate(todayStr);
                    setShowForm(true);
                  }}
                />
              </div>
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
