import { useState, useEffect, useMemo } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
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
import { getDatesInRange, getWeeklyDatesInRange, getBiweeklyDatesInRange, type BulkFrequency } from '../lib/dates';

export type EntrySaveOptions = {
  nextDay?: boolean;
  copyTomorrow?: boolean;
  bulk?: boolean;
  endDate?: string;
  frequency?: BulkFrequency;
};

type PeriodMode = 'single' | 'consecutive' | 'weekly' | 'biweekly';

interface EntryFormProps {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
  initialData?: CalendarEntryInput & { version?: number; id?: string };
  defaultShared?: boolean;
  /** When true, hide Gedeeld/Privé toggle (create via dedicated + Regeling / + Privé). */
  lockVisibility?: boolean;
  onSave: (date: string, data: CalendarEntryInput, options?: EntrySaveOptions) => Promise<void>;
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
  title: null,
  time: null,
};

export function EntryForm({
  open,
  onClose,
  initialDate,
  initialData,
  defaultShared = true,
  lockVisibility = false,
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
  const [period, setPeriod] = useState<PeriodMode>('single');

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
      setForm(
        initialData
          ? { ...emptyForm, ...initialData }
          : { ...emptyForm, isShared: defaultShared },
      );
      setVersion(initialData?.version);
      setEndDate('');
      setPeriod('single');
      setError('');
    }
  }, [open, initialDate, initialData, defaultShared]);

  const update = <K extends keyof CalendarEntryInput>(
    key: K,
    value: CalendarEntryInput[K],
  ) => {
    setForm((prev: CalendarEntryInput) => ({ ...prev, [key]: value }));
  };

  const setShared = (isShared: boolean) => {
    update('isShared', isShared);
    if (!isShared) {
      setPeriod('single');
      setEndDate('');
    }
  };

  const weekdayLabel = useMemo(() => {
    try {
      return format(parseISO(date), 'EEEE', { locale: nl });
    } catch {
      return 'weekdag';
    }
  }, [date]);

  const bulkDates = useMemo(() => {
    if (!form.isShared || period === 'single' || !endDate || !date) return [];
    if (endDate < date) return [];
    if (period === 'weekly') return getWeeklyDatesInRange(date, endDate);
    if (period === 'biweekly') return getBiweeklyDatesInRange(date, endDate);
    return getDatesInRange(date, endDate);
  }, [form.isShared, period, date, endDate]);

  const useBulk = bulkDates.length > 0;
  const dayCount = bulkDates.length || 1;

  const frequencyForPeriod = (): BulkFrequency => {
    if (period === 'weekly') return 'weekly';
    if (period === 'biweekly') return 'biweekly';
    return 'daily';
  };

  const handleSave = async (options?: { nextDay?: boolean; copyTomorrow?: boolean }) => {
    if (!isOnline) {
      setError('U bent offline. Wijzigingen zijn pas mogelijk wanneer de verbinding hersteld is.');
      return;
    }

    if (form.isShared && period !== 'single') {
      if (!endDate) {
        setError('Kies een einddatum voor de periode.');
        return;
      }
      if (endDate < date) {
        setError('De einddatum moet op of na de startdatum liggen.');
        return;
      }
      if (bulkDates.length === 0) {
        setError('Geen dagen in deze periode.');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      if (useBulk) {
        // No id/version: bulk must upsert each date independently.
        const { id: _id, ...bulkForm } = form;
        void _id;
        await onSave(date, bulkForm, {
          bulk: true,
          endDate,
          frequency: frequencyForPeriod(),
        });
      } else if (options?.copyTomorrow) {
        const data = { ...form, version, id: initialData?.id };
        await onSave(date, data);
        const tomorrow = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
        await onSave(tomorrow, { ...data, version: undefined, id: undefined });
      } else {
        const data = { ...form, version, id: initialData?.id };
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
    if (useBulk && dayCount > 1) {
      if (period === 'biweekly') {
        return `Toepassen op ${dayCount}× ${weekdayLabel} (om de 2 weken)`;
      }
      if (period === 'weekly') {
        return `Toepassen op ${dayCount}× ${weekdayLabel}`;
      }
      return `Toepassen op ${dayCount} dagen`;
    }
    return 'Opslaan';
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === 'edit'
          ? form.isShared
            ? 'Regeling bewerken'
            : 'Privé afspraak bewerken'
          : form.isShared
            ? 'Regeling toevoegen'
            : 'Privé afspraak toevoegen'
      }
    >
      {!isOnline && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          U bent offline. Alleen bekijken is mogelijk.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="entry-date" className="mb-1 block text-sm font-medium text-gray-700">
            {period === 'weekly' || period === 'biweekly' ? 'Eerste dag' : 'Datum'}
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

        {mode === 'edit' || !lockVisibility ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Zichtbaarheid
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShared(true)}
                disabled={!isOnline || mode === 'edit'}
                className={`btn-touch flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  form.isShared
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Gedeeld
              </button>
              <button
                type="button"
                onClick={() => setShared(false)}
                disabled={!isOnline || mode === 'edit'}
                className={`btn-touch flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
                  <span className="font-medium">Kinderregeling (gedeeld):</span> Beide ouders kunnen dit zien en bewerken.
                </>
              ) : (
                <>
                  <span className="font-medium">Privé afspraak:</span> Alleen jij ziet dit — één dag, geen periode.
                </>
              )}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            {form.isShared ? (
              <>
                <span className="font-medium">Kinderregeling (gedeeld):</span> Beide ouders kunnen dit zien en bewerken.
              </>
            ) : (
              <>
                <span className="font-medium">Privé afspraak:</span> Alleen jij ziet dit — één dag, geen periode.
              </>
            )}
          </p>
        )}

        {form.isShared && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Periode</p>
            <div className="flex flex-col gap-2">
              {(
                [
                  { value: 'single' as const, label: 'Eén dag' },
                  { value: 'consecutive' as const, label: 'Opeenvolgende dagen' },
                  { value: 'weekly' as const, label: `Elke ${weekdayLabel}` },
                  { value: 'biweekly' as const, label: `Om de 2 weken (${weekdayLabel})` },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPeriod(opt.value);
                    if (opt.value === 'single') setEndDate('');
                  }}
                  disabled={!isOnline}
                  className={`btn-touch rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    period === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {mode === 'edit' && period !== 'single' && (
              <p className="mt-2 text-xs text-amber-700">
                Past deze regeling ook toe op de andere dagen in de periode (overschrijft bestaande
                regelingen op die dagen).
              </p>
            )}
            {period === 'weekly' && (
              <p className="mt-2 text-xs text-gray-500">
                Herhaalt op elke {weekdayLabel} van de startdatum tot en met de einddatum.
              </p>
            )}
            {period === 'biweekly' && (
              <p className="mt-2 text-xs text-gray-500">
                Herhaalt om de 2 weken op {weekdayLabel}, startend vanaf de gekozen datum.
              </p>
            )}
          </div>
        )}

        {form.isShared && period !== 'single' && (
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
            {endDate && dayCount > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {period === 'weekly'
                  ? `${dayCount}× ${weekdayLabel} in deze periode`
                  : period === 'biweekly'
                    ? `${dayCount}× ${weekdayLabel} (om de 2 weken)`
                    : `${dayCount} opeenvolgende dagen`}
              </p>
            )}
          </div>
        )}

        {form.isShared && (
          <>
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
          </>
        )}

        {!form.isShared && (
          <>
            <div>
              <label htmlFor="entry-title" className="mb-1 block text-sm font-medium text-gray-700">
                Titel <span className="text-red-600">*</span>
              </label>
              <input
                id="entry-title"
                type="text"
                value={form.title ?? ''}
                onChange={(e) => update('title', e.target.value || null)}
                disabled={!isOnline}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                maxLength={200}
                placeholder="Bijv. Tandarts afspraak"
                required
              />
            </div>

            <div>
              <label htmlFor="entry-time" className="mb-1 block text-sm font-medium text-gray-700">
                Tijd (optioneel)
              </label>
              <input
                id="entry-time"
                type="text"
                value={form.time ?? ''}
                onChange={(e) => update('time', e.target.value || null)}
                disabled={!isOnline}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                maxLength={50}
                placeholder="Bijv. 14:00 of 14:00-15:30"
              />
            </div>
          </>
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
          {mode === 'create' && period === 'single' && form.isShared && (
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
