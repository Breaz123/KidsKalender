import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DISPLAY_ICON_KEYS,
  COLOR_PRESETS,
  createDefaultDisplaySettings,
  mergeDisplaySettings,
  applyCareLabelSync,
  resolvePaletteColors,
  type HouseholdDisplaySettings,
  type DisplayIconKey,
  type SleepDisplayItem,
  type ActivityDisplayItem,
  type ColorPresetId,
} from '@kids-calendar/shared';
import { ChevronDown, LogOut, Download, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { DisplayIcon, DISPLAY_ICON_LABELS } from '../lib/icons';
import { useDisplaySettings } from '../contexts/DisplaySettingsContext';
import { cn } from '../lib/cn';

type SleepKey = keyof HouseholdDisplaySettings['sleep'];
type ActivityKey = keyof HouseholdDisplaySettings['activities'];
type Section = 'places' | 'activities';

function IconPicker({
  value,
  onChange,
}: {
  value: DisplayIconKey;
  onChange: (v: DisplayIconKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DISPLAY_ICON_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'btn-touch flex h-10 w-10 items-center justify-center rounded-lg border',
            value === key
              ? 'border-blue-600 bg-blue-50 text-blue-900'
              : 'border-gray-200 bg-white text-gray-700',
          )}
          aria-label={DISPLAY_ICON_LABELS[key]}
          aria-pressed={value === key}
          title={DISPLAY_ICON_LABELS[key]}
        >
          <DisplayIcon name={key} className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}

function PalettePicker({
  value,
  onChange,
}: {
  value: ColorPresetId;
  onChange: (id: ColorPresetId) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {COLOR_PRESETS.map((preset) => {
        const selected = value === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            className={cn(
              'btn-touch h-9 rounded-lg border-2',
              selected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-transparent',
            )}
            style={{ backgroundColor: preset.bg }}
            aria-label={preset.label}
            aria-pressed={selected}
            title={preset.label}
          />
        );
      })}
    </div>
  );
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const { refetch: refetchDisplay } = useDisplaySettings();
  const [householdName, setHouseholdName] = useState('');
  const [draft, setDraft] = useState<HouseholdDisplaySettings>(
    createDefaultDisplaySettings(),
  );
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [section, setSection] = useState<Section>('places');
  const [openPlace, setOpenPlace] = useState<SleepKey | null>(null);
  const [openActivity, setOpenActivity] = useState<ActivityKey | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
    enabled: !!user,
  });

  useEffect(() => {
    if (settings?.displaySettings) {
      setDraft(applyCareLabelSync(mergeDisplaySettings(settings.displaySettings)));
    }
    if (settings?.household.name) {
      setHouseholdName(settings.household.name);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (body: {
      householdName?: string;
      displaySettings?: HouseholdDisplaySettings;
    }) => api.updateSettings(body),
    onSuccess: () => {
      setMessage('Opgeslagen voor iedereen in het huishouden.');
      qc.invalidateQueries({ queryKey: ['settings'] });
      refetchDisplay();
    },
    onError: (err: Error) => setError(err.message),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      api.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword,
      ),
    onSuccess: () => {
      setMessage('Wachtwoord gewijzigd. U wordt uitgelogd.');
      setTimeout(() => logout(), 2000);
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateSleep = (key: SleepKey, patch: Partial<SleepDisplayItem>) => {
    setDraft((prev) => {
      const nextSleep = { ...prev.sleep, [key]: { ...prev.sleep[key], ...patch } };
      return applyCareLabelSync({ ...prev, sleep: nextSleep });
    });
  };

  const updateActivity = (key: ActivityKey, patch: Partial<ActivityDisplayItem>) => {
    setDraft((prev) => ({
      ...prev,
      activities: {
        ...prev.activities,
        [key]: { ...prev.activities[key], ...patch },
      },
    }));
  };

  const updateTrixieLabel = (label: string) => {
    setDraft((prev) => ({
      ...prev,
      persons: {
        ...prev.persons,
        trixie: { ...prev.persons.trixie, label },
      },
    }));
  };

  const handleSaveAll = () => {
    setError('');
    setMessage('');
    updateSettings.mutate({
      householdName: householdName || settings?.household.name,
      displaySettings: applyCareLabelSync(draft),
    });
  };

  const handleResetDefaults = () => {
    setDraft(createDefaultDisplaySettings());
    setOpenPlace(null);
    setOpenActivity(null);
  };

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone));

  const sleepKeys = Object.keys(draft.sleep) as SleepKey[];
  const activityKeys = Object.keys(draft.activities) as ActivityKey[];

  return (
    <div className="px-4 py-6 pb-28">
      <h1 className="mb-6 text-2xl font-bold">Instellingen</h1>

      <section className="mb-8 space-y-1">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Account</h2>
        <p className="text-lg font-medium">{user?.name}</p>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
          Huishouden
        </h2>
        <input
          type="text"
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="Naam van het huishouden"
          aria-label="Naam van het huishouden"
        />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Weergave
          </h2>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="btn-touch flex items-center gap-1 text-sm text-gray-600 hover:bg-gray-100"
          >
            <RotateCcw className="h-4 w-4" /> Standaard
          </button>
        </div>
        <p className="mb-3 text-sm text-gray-500">Namen en kleuren voor de kalender.</p>

        <div className="mb-4 flex rounded-lg border border-gray-200 p-1">
          {(
            [
              ['places', 'Bij wie'],
              ['activities', 'Activiteiten'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={cn(
                'btn-touch flex-1 rounded-md px-3 py-2 text-sm font-medium',
                section === key ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {section === 'places' && (
          <ul className="space-y-2">
            {sleepKeys.map((key) => {
              const item = draft.sleep[key];
              const colors = resolvePaletteColors(item.paletteId);
              const isOpen = openPlace === key;
              return (
                <li
                  key={key}
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: colors.border }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenPlace(isOpen ? null : key)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                    aria-expanded={isOpen}
                  >
                    <DisplayIcon name={item.icon} className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border"
                      style={{ backgroundColor: colors.border, borderColor: colors.text }}
                      aria-hidden
                    />
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 opacity-70 transition-transform',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-black/5 bg-white p-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Naam
                        </label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateSleep(key, { label: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                          maxLength={40}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Uitleg bij slapen
                        </label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateSleep(key, { description: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                          rows={2}
                          maxLength={300}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Kleur
                        </label>
                        <PalettePicker
                          value={item.paletteId}
                          onChange={(paletteId) => updateSleep(key, { paletteId })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Icoon
                        </label>
                        <IconPicker
                          value={item.icon}
                          onChange={(icon) => updateSleep(key, { icon })}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}

            <li className="rounded-xl border border-gray-200 bg-white p-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Brengen/ophalen — Trixie
              </label>
              <input
                type="text"
                value={draft.persons.trixie.label}
                onChange={(e) => updateTrixieLabel(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                maxLength={40}
              />
            </li>
          </ul>
        )}

        {section === 'activities' && (
          <ul className="space-y-2">
            {activityKeys.map((key) => {
              const item = draft.activities[key];
              const isOpen = openActivity === key;
              return (
                <li key={key} className="overflow-hidden rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setOpenActivity(isOpen ? null : key)}
                    className="flex w-full items-center gap-3 bg-white px-3 py-3 text-left text-gray-900"
                    aria-expanded={isOpen}
                  >
                    <DisplayIcon name={item.icon} className="h-5 w-5 shrink-0 text-gray-600" />
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-gray-400 transition-transform',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-gray-100 bg-gray-50 p-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Naam
                        </label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateActivity(key, { label: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                          maxLength={40}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Icoon
                        </label>
                        <IconPicker
                          value={item.icon}
                          onChange={(icon) => updateActivity(key, { icon })}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={updateSettings.isPending}
          className="btn-touch mt-4 w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          {updateSettings.isPending ? 'Opslaan…' : 'Opslaan'}
        </button>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
          Wachtwoord
        </h2>
        <div className="space-y-2">
          <input
            type="password"
            placeholder="Huidig wachtwoord"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="password"
            placeholder="Nieuw wachtwoord"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="password"
            placeholder="Bevestig wachtwoord"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={() => changePassword.mutate()}
            className="btn-touch bg-blue-600 text-white hover:bg-blue-700"
          >
            Wachtwoord wijzigen
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
          Exporteren
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              const res = await api.exportCsv();
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'kalender-export.csv';
              a.click();
            }}
            className="btn-touch flex items-center gap-2 border border-gray-300 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            type="button"
            onClick={async () => {
              const res = await api.exportJson();
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'kalender-export.json';
              a.click();
            }}
            className="btn-touch flex items-center gap-2 border border-gray-300 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> JSON
          </button>
        </div>
      </section>

      <section className="mb-8 text-sm text-gray-500">
        <p>Appversie: 1.0.0</p>
        <p>PWA: {isStandalone ? 'Geïnstalleerd' : 'Niet geïnstalleerd'}</p>
      </section>

      {message && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <button
        type="button"
        onClick={() => logout()}
        className="btn-touch flex w-full items-center justify-center gap-2 border border-gray-300 text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" /> Uitloggen
      </button>
    </div>
  );
}
