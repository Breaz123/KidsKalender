import { format, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useCalendarMonth } from '../hooks/useCalendar';
import { DayCard } from '../components/DayCard';

export function TodayPage() {
  const today = new Date();
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

  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  const todayEntry = entries.find((e) => e.date === todayStr)
    ?? tomorrowEntries.find((e) => e.date === todayStr);
  const tomorrowEntry = entries.find((e) => e.date === tomorrowStr)
    ?? tomorrowEntries.find((e) => e.date === tomorrowStr);

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="mb-1 text-2xl font-bold">Vandaag</h1>
      <p className="mb-6 text-gray-500 capitalize">
        {format(today, 'EEEE d MMMM yyyy', { locale: nl })}
      </p>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500" role="status">
          Laden…
        </div>
      ) : (
        <>
          <DayCard date={todayStr} entry={todayEntry} size="large" />

          <section className="mt-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
              Morgen
            </h2>
            <DayCard date={tomorrowStr} entry={tomorrowEntry} size="small" />
          </section>
        </>
      )}
    </div>
  );
}
