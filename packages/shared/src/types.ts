import type {
  DaytimeLocation,
  PersonOption,
  SleepLocation,
  UserRole,
} from './constants.js';
import type { HouseholdDisplaySettings } from './displaySettings.js';

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  id: string;
  name: string;
  displaySettings?: HouseholdDisplaySettings;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEntry {
  id: string;
  householdId: string;
  date: string;
  daytimeLocation: DaytimeLocation | null;
  daytimeLocationOther: string | null;
  activity: import('./constants.js').Activity | null;
  activityOther: string | null;
  sleepLocation: SleepLocation;
  broughtBy: PersonOption | null;
  broughtByOther: string | null;
  pickedUpBy: PersonOption | null;
  pickedUpByOther: string | null;
  note: string | null;
  isShared: boolean;
  ownerId?: string;
  title?: string | null;
  time?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  updatedByName?: string;
}

export interface AuditLogEntry {
  id: string;
  householdId: string;
  calendarEntryId: string | null;
  userId: string;
  action: string;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
  userName?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  householdId: string;
  householdName: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface VersionConflictDetails {
  currentEntry: CalendarEntry;
  updatedByName: string;
}

export interface SettingsResponse {
  user: AuthUser;
  household: Household;
  displaySettings: HouseholdDisplaySettings;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
}
