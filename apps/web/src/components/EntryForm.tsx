import { useState, useEffect, useMemo } from 'react';
import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns';
import {
  ACTIVITIES,
  DAYTIME_LOCATIONS,
  PERSON_OPTIONS,
  type Activity,
  type CalendarEntryInput,
  type DaytimeLocation,
  type SleepLocation,
} from '@kids-calendar/shared';
import { ChoiceButtonGroup } from './ChoiceButtonGroup';
import { Modal } from './Modal';
import { useOnline } from '../contexts/OnlineContext';
import { useDisplaySettings } from '../contexts/DisplaySettingsContext';
import { ApiClientError } from '../lib/api';

interface EntryFormProps {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
  initialData?: CalendarEntryInput & { version?: number };
  onSave: (date: string, data: CalendarEntryInput, options?: { nextDay?: boolean; copyTomorrow?: boolean; bulk?: boolean; endDate?: string }) => Promise<void>;
  mode?: 'create' | 'edit';
}

const emptyForm: CalendarEntryInput = {
  daytimeLocation: null,
  daytimeLocationOther: null,
  activity: null,
  activityOther: null,
  sleepLocation: null,
  broughtBy: null,
  broughtByOther: null,
  pickedUpBy: null,
  pickedUpByOther: null,
  note: null,
  isShared: true,
};

export function EntryForm({
  open,
  onClose,
  initialDate,
  initialData,
  onSave,
  mode = 'create',
}: EntryFormProps) {
  const { isOnline } = useOnline();
  const { displaySettings } = useDisplaySettings();
  const [date, setDate] = useState(initialDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [form, setForm] = useState<CalendarEntryInput>(emptyForm);
  const [version, setVersion] = useState<number | undefined>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [multiDay, setMultiDay] = useState(false);

  const daytimeOptions = useMemo(
    () =>
      DAYTIME_LOCATIONS.map((value) => ({
        value,
        label:
          value === 'andere'
            ? displaySettings.daytime.andere.label
            : displaySettings.sleep[value].label,
      })),
    [displaySettings],
  );

  const activityOptions = useMemo(
    () =>
      ACTIVITIES.map((value) => ({
        value,
        label: displaySettings.activities[value].label,
      })),
    [displaySettings],
  );

  const sleepOptions: { value: SleepLocation; label: string }[] = useMemo(
    () => [
      ...(['papa', 'mama', 'oma', 'omi', 'opi'] as const).map((value) => ({
        value: value as SleepLocation,
        label: displaySettings.sleep[value].label,
      })),
      { value: null, label: 'Niet ingevuld' },
    ],
    [displaySettings],
  );

  const personOptions = useMemo(
    () =>
      PERSON_OPTIONS.map((value) => {
        let label = displaySettings.persons[value].label;
        if (
          value === 'papa' ||
          value === 'mama' ||
          value === 'oma' ||
          value === 'omi' ||
          value === 'opi'
        ) {
          label = displaySettings.sleep[value].label;
        }
        return { value, label };
      }),
    [displaySettings],
  );

  useEffect(() => {
    if (open) {
      setDate(initialDate ?? format(new Date(), 'yyyy-MM-dd'));
      setForm(initialData ? { ...emptyForm, ...initialData } : emptyForm);
      setVersion(initialData?.version);
      setEndDate('');
      setMultiDay(false);
      setError('');
    }
  }, [open, initialDate, initialData]);

  const update = <K extends keyof CalendarEntryInput>(
    key: K,
    value: CalendarEntryInput[K],
  ) => {
    setForm((prev: CalendarEntryInput) => ({ ...prev, [key]: value }));
  };

  const dayCount = useMemo(() => {
    if (!multiDay || !endDate || !date) return 1;
    const days = differenceInCalendarDays(parseISO(endDate), parseISO(date)) + 1;
    return days > 0 ? days : 1;
  }, [multiDay, date, endDate]);

  const handleSave = async (options?: { nextDay?: boolean; copyTomorrow?: boolean }) => {
    if (!isOnline) {
      setError('U bent offline. Wijzigingen zijn pas mogelijk wanneer de verbinding hersteld is.');
      return;
    }

    if (multiDay) {
      if (!endDate) {
        setError('Kies een einddatum voor de periode.');
        return;
      }
      if (endDate < date) {
        setError('De einddatum moet op of na de startdatum liggen.');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      const data = { ...form, version };
      if (multiDay && endDate) {
        await onSave(date, data, { bulk: true, endDate });
      } else if (options?.copyTomorrow) {
        await onSave(date, data);
        const tomorrow = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
        await onSave(tomorrow, { ...data, version: undefined });
      } else {
        await onSave(date, data, options);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'VERSION_CONFLICT') {
          setError(`Conflict: ${err.details?.updatedByName ?? 'Iemand anders'} heeft deze dag gewijzigd. Vernieuw en probeer opnieuw.`);
        } else {
          setError(err.message);
        }
      } else {
        setError('Opslaan mislukt. Probeer het opnieuw.');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = (() => {
    if (saving) return 'Opslaan…';
    if (multiDay && endDate && dayCount > 1) {
      return `Toepassen op ${dayCount} dagen`;
    }
    return 'Opslaan';
  })();

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Regeling bewerken' : 'Regeling toevoegen'}>
      {!isOnline && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          U bent offline. Alleen bekijken is mogelijk.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="entry-date" className="mb-1 block text-sm font-medium text-gray-700">
            Datum
          </label>
          <input
            id="entry-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={mode === 'edit' || !isOnline}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Zichtbaarheid
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update('isShared', true)}
              disabled={!isOnline}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                form.isShared
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Gedeeld
            </button>
            <button
              type="button"
              onClick={() => update('isShared', false)}
              disabled={!isOnline}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                !form.isShared
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Privé
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {form.isShared ? (
              <>
                <span className="font-medium">Gedeeld:</span> Beide ouders kunnen dit zien en bewerken.
              </>
            ) : (
              <>
                <span className="font-medium">Privé:</span> Alleen jij kunt dit zien. De andere ouder ziet dit niet.
              </>
            )}
          </p>
        </div>

        {mode === 'create' && form.isShared && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={multiDay}
              onChange={(e) => setMultiDay(e.target.checked)}
              disabled={!isOnline}
              className="h-4 w-4 rounded border-gray-300"
            />
            Meerdere opeenvolgende dagen
          </label>
        )}

        {multiDay && (
          <div>
            <label htmlFor="entry-end-date" className="mb-1 block text-sm font-medium text-gray-700">
              Tot en met
            </label>
            <input
              id="entry-end-date"
              type="date"
              value={endDate}
              min={date}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!isOnline}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <ChoiceButtonGroup
          label="Overdag bij"
          options={[{ value: null as unknown as DaytimeLocation, label: '—' }, ...daytimeOptions]}
          value={form.daytimeLocation ?? null}
          onChange={(v) => update('daytimeLocation', v)}
          disabled={!isOnline}
        />

        {form.daytimeLocation === 'andere' && (
          <input
            type="text"
            placeholder="Locatie"
            value={form.daytimeLocationOther ?? ''}
            onChange={(e) => update('daytimeLocationOther', e.target.value)}
            disabled={!isOnline}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            maxLength={100}
          />
        )}

        <div>
          <ChoiceButtonGroup
            label="Activiteit (optioneel)"
            options={[{ value: null as unknown as Activity, label: '—' }, ...activityOptions]}
            value={form.activity ?? null}
            onChange={(v) => update('activity', v)}
            disabled={!isOnline}
          />
          <p className="mt-1 text-xs text-gray-500">
            Extra bij wie ze zijn — bv. vakantie mét papa (niet in plaats van slapen/overdag).
          </p>
        </div>

        {form.activity === 'andere' && (
          <input
            type="text"
            placeholder="Activiteit"
            value={form.activityOther ?? ''}
            onChange={(e) => update('activityOther', e.target.value)}
            disabled={!isOnline}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            maxLength={100}
          />
        )}

        <ChoiceButtonGroup
          label="Slapen bij"
          options={sleepOptions}
          value={form.sleepLocation ?? null}
          onChange={(v) => update('sleepLocation', v)}
          disabled={!isOnline}
        />

        <ChoiceButtonGroup
          label="Brengen door"
          options={personOptions}
          value={form.broughtBy ?? null}
          onChange={(v) => update('broughtBy', v)}
          disabled={!isOnline}
        />

        {form.broughtBy === 'andere' && (
          <input
            type="text"
            placeholder="Naam"
            value={form.broughtByOther ?? ''}
            onChange={(e) => update('broughtByOther', e.target.value)}
            disabled={!isOnline}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            maxLength={100}
          />
        )}

        <ChoiceButtonGroup
          label="Ophalen door"
          options={personOptions}
          value={form.pickedUpBy ?? null}
          onChange={(v) => update('pickedUpBy', v)}
          disabled={!isOnline}
        />

        {form.pickedUpBy === 'andere' && (
          <input
            type="text"
            placeholder="Naam"
            value={form.pickedUpByOther ?? ''}
            onChange={(e) => update('pickedUpByOther', e.target.value)}
            disabled={!isOnline}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            maxLength={100}
          />
        )}

        <div>
          <label htmlFor="entry-note" className="mb-1 block text-sm font-medium text-gray-700">
            Opmerking
          </label>
          <input
            id="entry-note"
            type="text"
            value={form.note ?? ''}
            onChange={(e) => update('note', e.target.value || null)}
            disabled={!isOnline}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            maxLength={500}
            placeholder="Optioneel"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || !isOnline}
            className="btn-touch w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {saveLabel}
          </button>
          {mode === 'create' && !multiDay && (
            <>
              <button
                type="button"
                onClick={() => handleSave({ nextDay: true })}
                disabled={saving || !isOnline}
                className="btn-touch w-full border border-gray-300 bg-white hover:bg-gray-50"
              >
                Opslaan en volgende dag
              </button>
              <button
                type="button"
                onClick={() => handleSave({ copyTomorrow: true })}
                disabled={saving || !isOnline}
                className="btn-touch w-full border border-gray-300 bg-white hover:bg-gray-50"
              >
                Kopiëren naar morgen
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn-touch w-full text-gray-600 hover:bg-gray-100"
          >
            Annuleren
          </button>
        </div>
      </div>
    </Modal>
  );
}
