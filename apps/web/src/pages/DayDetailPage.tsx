import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import {
  getActivityLabelFromSettings,
  getDaytimeLabelFromSettings,
  getPersonLabelFromSettings,
  getSleepLabelFromSettings,
  getSleepColorFromSettings,
  type CalendarEntry,
  type CalendarEntryInput,
  type SleepLocation,
} from '@kids-calendar/shared';
import { Pencil, Copy, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  useCalendarDayEntries,
  useDeleteEntry,
  useUpsertEntry,
  useCopyEntry,
  useBulkEntries,
} from '../hooks/useCalendar';
import { EntryForm } from '../components/EntryForm';
import { EmptyState } from '../components/EmptyState';
import { DayCard } from '../components/DayCard';
import { useOnline } from '../contexts/OnlineContext';
import { useDisplaySettings } from '../contexts/DisplaySettingsContext';
import { splitDayEntries } from '../lib/entries';

export function DayDetailPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOnline } = useOnline();
  const { displaySettings } = useDisplaySettings();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formShared, setFormShared] = useState(true);
  const [editing, setEditing] = useState<CalendarEntry | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<CalendarEntry | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const { data: entries = [], isLoading, refetch } = useCalendarDayEntries(date ?? null);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDeleteTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteTarget]);

  const deleteEntry = useDeleteEntry();
  const upsert = useUpsertEntry();
  const bulk = useBulkEntries();
  const copyEntry = useCopyEntry();

  if (!date) return null;

  const { shared, privates } = splitDayEntries(entries);

  const sleepColor = getSleepColorFromSettings(
    shared?.sleepLocation as SleepLocation | undefined,
    displaySettings,
  );

  const openCreate = (sharedEntry: boolean) => {
    setFormMode('create');
    setFormShared(sharedEntry);
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (entry: CalendarEntry) => {
    setFormMode('edit');
    setFormShared(entry.isShared);
    setEditing(entry);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteEntry.mutateAsync({ date, id: deleteTarget.id });
    setDeleteTarget(null);
    refetch();
  };

  const handleSave = async (
    d: string,
    formData: CalendarEntryInput,
    options?: { nextDay?: boolean; bulk?: boolean; endDate?: string },
  ) => {
    if (options?.bulk && options.endDate) {
      const result = await bulk.mutateAsync({
        startDate: d,
        endDate: options.endDate,
        entry: formData,
      });
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      const count = result.results?.length ?? 0;
      setSaveMessage(
        count > 1
          ? `Opgeslagen voor ${count} dagen.`
          : 'Regeling opgeslagen.',
      );
      navigate('/');
      return;
    }

    await upsert.mutateAsync({ date: d, data: formData });
    await queryClient.invalidateQueries({ queryKey: ['calendar'] });
    refetch();
  };

  const handleCopy = async (entry: CalendarEntry) => {
    if (!entry.isShared) return;
    const target = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
    await copyEntry.mutateAsync({ sourceDate: date, targetDate: target });
    navigate(`/dag/${target}`);
  };

  return (
    <div className="px-4 py-6 pb-24">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="btn-touch mb-4 text-sm text-blue-600 hover:underline"
      >
        ← Kalender
      </button>

      <h1 className="mb-6 text-xl font-bold capitalize">
        {format(parseISO(date), 'EEEE d MMMM yyyy', { locale: nl })}
      </h1>

      {saveMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700" role="status">
          {saveMessage}
        </div>
      )}

      {isLoading && (
        <div className="py-12 text-center text-gray-500" role="status">
          Laden…
        </div>
      )}

      {!isLoading && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
              Kinderregeling
            </h2>
            {!shared ? (
              <EmptyState
                title="Geen regeling ingevuld voor deze dag."
                onAction={isOnline ? () => openCreate(true) : undefined}
              />
            ) : (
              <>
                <article
                  className="rounded-xl border-2 p-5"
                  style={{
                    backgroundColor: sleepColor.bg,
                    borderColor: sleepColor.border,
                    color: sleepColor.text,
                  }}
                >
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-xs font-medium uppercase opacity-70">Overdag</dt>
                      <dd className="text-lg">
                        {getDaytimeLabelFromSettings(
                          shared.daytimeLocation,
                          shared.daytimeLocationOther,
                          displaySettings,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase opacity-70">Activiteit</dt>
                      <dd className="text-lg">
                        {getActivityLabelFromSettings(
                          shared.activity,
                          shared.activityOther,
                          displaySettings,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase opacity-70">Brengen door</dt>
                      <dd>
                        {getPersonLabelFromSettings(
                          shared.broughtBy,
                          shared.broughtByOther,
                          displaySettings,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase opacity-70">Ophalen door</dt>
                      <dd>
                        {getPersonLabelFromSettings(
                          shared.pickedUpBy,
                          shared.pickedUpByOther,
                          displaySettings,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase opacity-70">Slapen bij</dt>
                      <dd className="text-xl font-bold">
                        {getSleepLabelFromSettings(shared.sleepLocation, displaySettings)}
                      </dd>
                    </div>
                    {shared.note && (
                      <div>
                        <dt className="text-xs font-medium uppercase opacity-70">Opmerking</dt>
                        <dd className="italic">{shared.note}</dd>
                      </div>
                    )}
                  </dl>

                  <footer className="mt-6 border-t border-current/20 pt-4 text-xs opacity-70">
                    Laatst gewijzigd door {shared.updatedByName ?? 'onbekend'} op{' '}
                    {format(parseISO(shared.updatedAt), 'd MMMM yyyy HH:mm', { locale: nl })}
                  </footer>
                </article>

                {isOnline && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(shared)}
                      className="btn-touch flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50"
                    >
                      <Pencil className="h-4 w-4" /> Bewerken
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(shared)}
                      className="btn-touch flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50"
                    >
                      <Copy className="h-4 w-4" /> Kopiëren
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(shared)}
                      className="btn-touch flex items-center gap-2 border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" /> Verwijderen
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                Jouw privé
              </h2>
              {isOnline && (
                <button
                  type="button"
                  onClick={() => openCreate(false)}
                  className="btn-touch text-sm text-purple-700 hover:underline"
                >
                  + Privé
                </button>
              )}
            </div>
            {privates.length === 0 ? (
              <p className="text-sm text-gray-500">Geen privé afspraken.</p>
            ) : (
              <div className="space-y-4">
                {privates.map((entry) => (
                  <div key={entry.id}>
                    <DayCard date={date} entry={entry} size="small" />
                    {isOnline && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="btn-touch flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50"
                        >
                          <Pencil className="h-4 w-4" /> Bewerken
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(entry)}
                          className="btn-touch flex items-center gap-2 border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" /> Verwijderen
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title" className="text-lg font-semibold">
              {deleteTarget.isShared ? 'Regeling verwijderen?' : 'Privé afspraak verwijderen?'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {deleteTarget.isShared
                ? 'Weet u zeker dat u de kinderregeling voor deze dag wilt verwijderen?'
                : 'Weet u zeker dat u deze privé afspraak wilt verwijderen?'}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="btn-touch flex-1 bg-red-600 text-white hover:bg-red-700"
              >
                Verwijderen
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-touch flex-1 border border-gray-300 hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      <EntryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialDate={date}
        initialData={
          editing
            ? { ...editing, version: editing.version, id: editing.id }
            : undefined
        }
        defaultShared={formShared}
        onSave={handleSave}
        mode={formMode}
      />
    </div>
  );
}
