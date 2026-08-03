import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createDefaultDisplaySettings,
  mergeDisplaySettings,
  type HouseholdDisplaySettings,
} from '@kids-calendar/shared';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface DisplaySettingsContextValue {
  displaySettings: HouseholdDisplaySettings;
  isLoading: boolean;
  refetch: () => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextValue>({
  displaySettings: createDefaultDisplaySettings(),
  isLoading: false,
  refetch: () => {},
});

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
    enabled: !!user,
    staleTime: 30000,
  });

  const displaySettings = data?.displaySettings
    ? mergeDisplaySettings(data.displaySettings)
    : createDefaultDisplaySettings();

  return (
    <DisplaySettingsContext.Provider
      value={{ displaySettings, isLoading, refetch: () => { void refetch(); } }}
    >
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  return useContext(DisplaySettingsContext);
}
