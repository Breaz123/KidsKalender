import type {
  ApiError,
  AuthUser,
  CalendarEntry,
  CalendarEntryInput,
  ImportResult,
  SettingsResponse,
} from '@kids-calendar/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiClientError(
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? 'Er is een fout opgetreden.',
      body?.error?.details,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ user: AuthUser }>('/api/auth/me'),

  getToday: () => request<{ today: string }>('/api/calendar/today'),

  getCalendar: (year: number, month: number) =>
    request<{ entries: CalendarEntry[] }>(
      `/api/calendar?year=${year}&month=${month}`,
    ),

  getEntry: (date: string) =>
    request<{ entry: CalendarEntry; entries: CalendarEntry[] }>(`/api/calendar/${date}`),

  getEntriesForDate: (date: string) =>
    request<{ entries: CalendarEntry[] }>(`/api/calendar/${date}/all`),

  upsertEntry: (date: string, data: CalendarEntryInput) =>
    request<{ entry: CalendarEntry }>(`/api/calendar/${date}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteEntry: (date: string, id?: string) =>
    request<{ success: boolean }>(
      `/api/calendar/${date}${id ? `?id=${encodeURIComponent(id)}` : ''}`,
      { method: 'DELETE' },
    ),

  bulkEntries: (
    startDate: string,
    endDate: string,
    entry: CalendarEntryInput,
    frequency: 'daily' | 'weekly' | 'biweekly' = 'daily',
  ) =>
    request<{ results: Array<{ date: string; entry: CalendarEntry | null }> }>(
      '/api/calendar/bulk',
      {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate, entry, frequency }),
      },
    ),

  copyEntry: (sourceDate: string, targetDate: string) =>
    request<{ entry: CalendarEntry }>(`/api/calendar/${sourceDate}/copy`, {
      method: 'POST',
      body: JSON.stringify({ targetDate }),
    }),

  getSettings: () => request<SettingsResponse>('/api/settings'),

  updateSettings: (body: {
    householdName?: string;
    displaySettings?: unknown;
  }) =>
    request<SettingsResponse>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    request<{ success: boolean; message: string }>('/api/settings/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    }),

  exportCsv: () =>
    fetch(`${API_BASE}/api/export/csv`, { credentials: 'include' }),

  exportJson: () =>
    fetch(`${API_BASE}/api/export/json`, { credentials: 'include' }),

  importJson: (data: unknown) =>
    request<ImportResult>('/api/import/json', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export { ApiClientError };
