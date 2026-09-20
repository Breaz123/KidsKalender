import { useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useCalendarMonth, useToday, useUpsertEntry, useBulkEntries } from '../hooks/useCalendar';
import { DayCard } from '../components/DayCard';
import { EmptyState } from '../components/EmptyState';
import { DayCardSkeleton } from '../components/Skeleton';
import { EntryForm } from '../components/EntryForm';
import { splitDayEntries } from '../lib/entries';
import type { CalendarEntry, CalendarEntryInput } from '@kids-calendar/shared';

function DayLayers({
  date,
  entries,
  size,
  onAddShared,
  onAddPrivate,
}: {
  date: string;
  entries: CalendarEntry[];
  size: 'large' | 'small';
  onAddShared: () => void;
  onAddPrivate: () => void;
}) {
  const { shared, privates } = splitDayEntries(entries);

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
          Kinderregeling
        </h2>
        {shared ? (
          <DayCard date={date} entry={shared} size={size} />
        ) : (
          <EmptyState
            title="Geen regeling voor deze dag"
            description="Tik op + Regeling om een kinderregeling toe te voegen."
            onAction={onAddShared}
          />
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Jouw privé
          </h2>
          <button
            type="button"
            onClick={onAddPrivate}
            className="btn-touch text-sm text-purple-700 hover:underline"
          >
            + Privé
          </button>
        </div>
        {privates.length === 0 ? (
          <p className="text-sm text-gray-500">Geen privé afspraken.</p>
        ) : (
          <div className="space-y-3">
            {privates.map((entry) => (
              <DayCard key={entry.id} date={date} entry={entry} size={size} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function TodayPage() {
  const { data: todayStr, isLoading: todayLoading } = useToday();
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState<string>();
  const [formShared, setFormShared] = useState(true);
  const upsert = useUpsertEntry();
  const bulk = useBulkEntries();

  const today = todayStr ? parseISO(todayStr) : new Date();
  const tomorrow = addDays(today, 1);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const tomorrowYear = tomorrow.getFullYear();
  const tomorrowMonth = tomorrow.getMonth() + 1;

  const { data: entries = [], isLoading } = useCalendarMonth(year, month);
  const { data: tomorrowEntries = [] } = useCalendarMonth(
    tomorrowMonth !== month ? tomorrowYear : year,
    tomorrowMonth !== month ? tomorrowMonth : month,
  );

  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  const todayList = todayStr
    ? [...entries, ...tomorrowEntries].filter((e) => e.date === todayStr)
    : [];
  const tomorrowList = [...entries, ...tomorrowEntries].filter((e) => e.date === tomorrowStr);

  const openForm = (date: string, shared: boolean) => {
    setFormDate(date);
    setFormShared(shared);
    setShowForm(true);
  };

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

  if (todayLoading || !todayStr) {
    return (
      <div className="px-4 py-6 pb-24">
        <h1 className="mb-1 text-2xl font-bold">Vandaag</h1>
        <div className="mt-6 space-y-4">
          <DayCardSkeleton size="large" />
          <DayCardSkeleton size="small" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="mb-1 text-2xl font-bold">Vandaag</h1>
      <p className="mb-6 text-gray-500 capitalize">
        {format(today, 'EEEE d MMMM yyyy', { locale: nl })}
      </p>

      {isLoading ? (
        <div className="space-y-4">
          <DayCardSkeleton size="large" />
          <DayCardSkeleton size="small" />
        </div>
      ) : (
        <>
          <DayLayers
            date={todayStr}
            entries={todayList}
            size="large"
            onAddShared={() => openForm(todayStr, true)}
            onAddPrivate={() => openForm(todayStr, false)}
          />

          <section className="mt-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
              Morgen
            </h2>
            <DayLayers
              date={tomorrowStr}
              entries={tomorrowList}
              size="small"
              onAddShared={() => openForm(tomorrowStr, true)}
              onAddPrivate={() => openForm(tomorrowStr, false)}
            />
          </section>
        </>
      )}

      <EntryForm
        open={showForm}
        onClose={() => setShowForm(false)}
        initialDate={formDate}
        defaultShared={formShared}
        onSave={handleSave}
      />
    </div>
  );
}
