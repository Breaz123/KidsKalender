import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useOnline } from './contexts/OnlineContext';
import { BottomNav } from './components/BottomNav';
import { EntryForm } from './components/EntryForm';
import { CalendarPage } from './pages/CalendarPage';
import { TodayPage } from './pages/TodayPage';
import { OverviewPage } from './pages/OverviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { DayDetailPage } from './pages/DayDetailPage';
import { LoginPage } from './pages/LoginPage';
import { DisplaySettingsProvider } from './contexts/DisplaySettingsContext';
import { useUpsertEntry, useBulkEntries } from './hooks/useCalendar';
import type { CalendarEntryInput } from '@kids-calendar/shared';
import { WifiOff } from 'lucide-react';

function AppLayout() {
  const { user, loading } = useAuth();
  const { isOnline } = useOnline();
  const [showForm, setShowForm] = useState(false);
  const upsert = useUpsertEntry();
  const bulk = useBulkEntries();

  const handleSave = async (
    date: string,
    data: CalendarEntryInput,
    options?: { bulk?: boolean; endDate?: string },
  ) => {
    if (options?.bulk && options.endDate) {
      await bulk.mutateAsync({ startDate: date, endDate: options.endDate, entry: data });
    } else {
      await upsert.mutateAsync({ date, data });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Laden…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <DisplaySettingsProvider>
      <div className="mx-auto min-h-screen max-w-lg bg-gray-50">
        {!isOnline && (
          <div
            className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white"
            role="status"
          >
            <WifiOff className="h-4 w-4" aria-hidden />
            Offline — alleen bekijken
          </div>
        )}

        <main>
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/vandaag" element={<TodayPage />} />
            <Route path="/overzicht" element={<OverviewPage />} />
            <Route path="/instellingen" element={<SettingsPage />} />
            <Route path="/dag/:date" element={<DayDetailPage />} />
          </Routes>
        </main>

        <BottomNav onAddClick={() => setShowForm(true)} />

        <EntryForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      </div>
    </DisplaySettingsProvider>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  );
}
