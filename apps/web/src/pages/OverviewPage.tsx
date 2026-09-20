import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import {
  getActivityLabelFromSettings,
  getDaytimeLabelFromSettings,
  getSleepLabelFromSettings,
  getSleepColorFromSettings,
  type SleepLocation,
} from '@kids-calendar/shared';
import { Download, Upload, Printer } from 'lucide-react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useDisplaySettings } from '../contexts/DisplaySettingsContext';
import { EmptyState } from '../components/EmptyState';
import { EntryForm } from '../components/EntryForm';
import { useUpsertEntry, useBulkEntries } from '../hooks/useCalendar';
import type { CalendarEntryInput } from '@kids-calendar/shared';

export function OverviewPage() {
  const navigate = useNavigate();
  const { displaySettings } = useDisplaySettings();
  const [monthFilter, setMonthFilter] = useState('');
  const [sleepFilter, setSleepFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const upsert = useUpsertEntry();
  const bulk = useBulkEntries();

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-all'],
    queryFn: async () => {
      const now = new Date();
      const allEntries = [];
      for (let m = -6; m <= 12; m++) {
        const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
        const { entries } = await api.getCalendar(d.getFullYear(), d.getMonth() + 1);
        allEntries.push(...entries);
      }
      return allEntries.sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((e) => {
      if (monthFilter && !e.date.startsWith(monthFilter)) return false;
      if (sleepFilter && e.isShared && e.sleepLocation !== sleepFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${e.note ?? ''} ${e.title ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, monthFilter, sleepFilter, search]);

  const handleSave = async (
    date: string,
    formData: CalendarEntryInput,
    options?: { bulk?: boolean; endDate?: string },
  ) => {
    if (options?.bulk && options.endDate) {
      await bulk.mutateAsync({ startDate: date, endDate: options.endDate, entry: formData });
    } else {
      await upsert.mutateAsync({ date, data: formData });
    }
  };

  const months = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.map((e) => e.date.slice(0, 7)));
    return Array.from(set).sort();
  }, [data]);

  const handleExportCsv = async () => {
    const res = await api.exportCsv();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kalender-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = async () => {
    const res = await api.exportJson();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kalender-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const json = JSON.parse(text);
      const entries = json.entries ?? json;
      if (!confirm(`Importeer ${entries.length} regeling(en)? Bestaande dagen worden bijgewerkt.`)) return;
      const result = await api.importJson({ entries });
      alert(`Import voltooid: ${result.created} nieuw, ${result.updated} bijgewerkt, ${result.skipped} overgeslagen.`);
      window.location.reload();
    };
    input.click();
  };

  return (
    <div className="px-4 py-6 pb-24 print:pb-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">Overzicht</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="btn-touch p-2" aria-label="Afdrukken">
            <Printer className="h-5 w-5" />
          </button>
          <button type="button" onClick={handleExportCsv} className="btn-touch p-2" aria-label="Export CSV">
            <Download className="h-5 w-5" />
          </button>
          <button type="button" onClick={handleExportJson} className="btn-touch p-2" aria-label="Export JSON">
            <Download className="h-5 w-5" />
          </button>
          <button type="button" onClick={handleImport} className="btn-touch p-2" aria-label="Import JSON">
            <Upload className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-2 print:hidden">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          aria-label="Filter op maand"
        >
          <option value="">Alle maanden</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {format(parseISO(m + '-01'), 'MMMM yyyy', { locale: nl })}
            </option>
          ))}
        </select>
        <select
          value={sleepFilter}
          onChange={(e) => setSleepFilter(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          aria-label="Filter op slaapplaats"
        >
          <option value="">Alle slaapplaatsen</option>
          {Object.entries(displaySettings.sleep).map(([v, item]) => (
            <option key={v} value={v}>{item.label}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Zoeken in opmerkingen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      {isLoading && (
        <div className="py-12 text-center text-gray-500" role="status">Laden…</div>
      )}

      <ul className="space-y-2">
        {filtered.map((entry) => {
          const color = entry.isShared
            ? getSleepColorFromSettings(
                entry.sleepLocation as SleepLocation | undefined,
                displaySettings,
              )
            : { border: '#9333EA' };
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => navigate(`/dag/${entry.date}`)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-gray-50 print:border-gray-300"
                style={{ borderLeftWidth: 4, borderLeftColor: color.border }}
              >
                <div className="min-w-[80px] text-sm font-medium">
                  {format(parseISO(entry.date), 'd MMM', { locale: nl })}
                </div>
                <div className="flex-1 text-sm">
                  {entry.isShared ? (
                    <>
                      <span>
                        {getDaytimeLabelFromSettings(
                          entry.daytimeLocation,
                          entry.daytimeLocationOther,
                          displaySettings,
                        )}
                      </span>
                      {entry.activity && (
                        <>
                          <span className="mx-2 text-gray-400">·</span>
                          <span>
                            {getActivityLabelFromSettings(
                              entry.activity,
                              entry.activityOther,
                              displaySettings,
                            )}
                          </span>
                        </>
                      )}
                      <span className="mx-2 text-gray-400">·</span>
                      <span className="font-medium">
                        {getSleepLabelFromSettings(entry.sleepLocation, displaySettings)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{entry.title || 'Privé afspraak'}</span>
                      {entry.time && (
                        <>
                          <span className="mx-2 text-gray-400">·</span>
                          <span>{entry.time}</span>
                        </>
                      )}
                      <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                        Privé
                      </span>
                    </>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          title="Geen regelingen gevonden"
          description="Tik op + Regeling om een kinderregeling toe te voegen."
          onAction={() => setShowForm(true)}
        />
      )}

      <EntryForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      />
    </div>
  );
}
