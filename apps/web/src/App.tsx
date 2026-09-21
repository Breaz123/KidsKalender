import { useState, type CSSProperties } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const upsert = useUpsertEntry();
  const bulk = useBulkEntries();
  const fabShared = !location.pathname.startsWith('/mijn');

  const handleSave = async (
    date: string,
    data: CalendarEntryInput,
    options?: { bulk?: boolean; endDate?: string; frequency?: 'daily' | 'weekly' | 'biweekly' },
  ) => {
    if (options?.bulk && options.endDate) {
      await bulk.mutateAsync({
        startDate: date,
        endDate: options.endDate,
        entry: data,
        frequency: options.frequency ?? 'daily',
      });
      setShowForm(false);
      return;
    }
    await upsert.mutateAsync({ date, data });
    setShowForm(false);
    navigate(`/dag/${date}`, {
      state: { from: fabShared ? '/' : '/mijn' },
    });
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
      <div
        className="mx-auto min-h-screen max-w-4xl bg-gray-50 sm:shadow-sm"
        style={{ '--app-sticky-offset': isOnline ? '0px' : '40px' } as CSSProperties}
      >
        {!isOnline && (
          <div
            className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white"
            role="status"
          >
            <WifiOff className="h-4 w-4" aria-hidden />
            Offline — alleen bekijken
          </div>
        )}

        <main>
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/mijn" element={<CalendarPage />} />
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
          defaultShared={fabShared}
          lockVisibility
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
