import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getActivityLabelFromSettings,
  getDaytimeLabelFromSettings,
  getPersonLabelFromSettings,
  getSleepLabelFromSettings,
  getSleepColorFromSettings,
  type SleepLocation,
} from '@kids-calendar/shared';
import { Pencil, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import {
  useDeleteEntry,
  useUpsertEntry,
  useCopyEntry,
  useBulkEntries,
} from '../hooks/useCalendar';
import { EntryForm } from '../components/EntryForm';
import { useOnline } from '../contexts/OnlineContext';
import { useDisplaySettings } from '../contexts/DisplaySettingsContext';
import type { CalendarEntryInput } from '@kids-calendar/shared';

export function DayDetailPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOnline } = useOnline();
  const { displaySettings } = useDisplaySettings();
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['calendar-entry', date],
    queryFn: () => api.getEntry(date!).then((r) => r.entry),
    enabled: !!date,
    retry: false,
  });

  const deleteEntry = useDeleteEntry();
  const upsert = useUpsertEntry();
  const bulk = useBulkEntries();
  const copyEntry = useCopyEntry();

  if (!date) return null;

  const sleepColor = getSleepColorFromSettings(
    data?.sleepLocation as SleepLocation | undefined,
    displaySettings,
  );

  const handleDelete = async () => {
    await deleteEntry.mutateAsync(date);
    navigate('/');
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

  const handleCopy = async () => {
    const target = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
    await copyEntry.mutateAsync({ sourceDate: date, targetDate: target });
    navigate(`/dag/${target}`);
  };

  return (
    <div className="px-4 py-6 pb-24">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        ← Terug
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

      {isError && !isLoading && (
        <div className="space-y-4">
          <p className="text-gray-500">Geen regeling ingevuld voor deze dag.</p>
          {isOnline && (
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="btn-touch bg-blue-600 text-white hover:bg-blue-700"
            >
              Regeling toevoegen
            </button>
          )}
        </div>
      )}

      {data && (
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
                  data.daytimeLocation,
                  data.daytimeLocationOther,
                  displaySettings,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase opacity-70">Activiteit</dt>
              <dd className="text-lg">
                {getActivityLabelFromSettings(
                  data.activity,
                  data.activityOther,
                  displaySettings,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase opacity-70">Brengen door</dt>
              <dd>
                {getPersonLabelFromSettings(
                  data.broughtBy,
                  data.broughtByOther,
                  displaySettings,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase opacity-70">Ophalen door</dt>
              <dd>
                {getPersonLabelFromSettings(
                  data.pickedUpBy,
                  data.pickedUpByOther,
                  displaySettings,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase opacity-70">Slapen bij</dt>
              <dd className="text-xl font-bold">
                {getSleepLabelFromSettings(data.sleepLocation, displaySettings)}
              </dd>
            </div>
            {data.note && (
              <div>
                <dt className="text-xs font-medium uppercase opacity-70">Opmerking</dt>
                <dd className="italic">{data.note}</dd>
              </div>
            )}
          </dl>

          <footer className="mt-6 border-t border-current/20 pt-4 text-xs opacity-70">
            Laatst gewijzigd door {data.updatedByName ?? 'onbekend'} op{' '}
            {format(parseISO(data.updatedAt), 'd MMMM yyyy HH:mm', { locale: nl })}
          </footer>
        </article>
      )}

      {data && isOnline && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="btn-touch flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" /> Bewerken
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="btn-touch flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50"
          >
            <Copy className="h-4 w-4" /> Kopiëren
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-touch flex items-center gap-2 border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" /> Verwijderen
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Regeling verwijderen?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Weet u zeker dat u de regeling voor deze dag wilt verwijderen?
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
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-touch flex-1 border border-gray-300 hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      <EntryForm
        open={showEdit}
        onClose={() => setShowEdit(false)}
        initialDate={date}
        initialData={data ? { ...data, version: data.version } : undefined}
        onSave={handleSave}
        mode={data ? 'edit' : 'create'}
      />
    </div>
  );
}
