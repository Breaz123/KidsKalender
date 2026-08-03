import {
  ACTIVITIES,
  ACTIVITY_LABELS,
  CARE_LOCATIONS,
  COLOR_PRESETS,
  DAYTIME_LOCATION_LABELS,
  DEFAULT_SLEEP_PALETTES,
  EMPTY_DAY_COLOR,
  PERSON_LABELS,
  PERSON_OPTIONS,
  SLEEP_LOCATION_DESCRIPTIONS,
  SLEEP_LOCATION_LABELS,
  getColorPreset,
  resolvePaletteColors,
  type Activity,
  type ColorPresetId,
  type DaytimeLocation,
  type LocationColor,
  type PersonOption,
  type SleepLocation,
} from './constants.js';

export const DISPLAY_ICON_KEYS = [
  'sun',
  'moon',
  'home',
  'users',
  'heart',
  'baby',
  'school',
  'briefcase',
  'plane',
  'car',
  'mapPin',
  'star',
  'coffee',
  'tree',
  'building',
] as const;

export type DisplayIconKey = (typeof DISPLAY_ICON_KEYS)[number];

export interface SleepDisplayItem {
  label: string;
  description: string;
  /** Vaste WCAG-palet-id; tekst en rand volgen automatisch. */
  paletteId: ColorPresetId;
  icon: DisplayIconKey;
}

export interface DaytimeDisplayItem {
  label: string;
  icon: DisplayIconKey;
}

export interface ActivityDisplayItem {
  label: string;
  icon: DisplayIconKey;
}

export interface PersonDisplayItem {
  label: string;
  icon: DisplayIconKey;
}

export interface HouseholdDisplaySettings {
  sleep: Record<Exclude<SleepLocation, null>, SleepDisplayItem>;
  daytime: Record<DaytimeLocation, DaytimeDisplayItem>;
  activities: Record<Activity, ActivityDisplayItem>;
  persons: Record<PersonOption, PersonDisplayItem>;
}

const DEFAULT_SLEEP_ICONS: Record<Exclude<SleepLocation, null>, DisplayIconKey> = {
  papa: 'home',
  mama: 'heart',
  oma: 'users',
  omi: 'users',
  opi: 'users',
};

const DEFAULT_DAYTIME_ICONS: Record<DaytimeLocation, DisplayIconKey> = {
  papa: 'home',
  mama: 'heart',
  oma: 'users',
  omi: 'users',
  opi: 'users',
  andere: 'mapPin',
};

const DEFAULT_ACTIVITY_ICONS: Record<Activity, DisplayIconKey> = {
  vakantie: 'plane',
  school: 'school',
  krakkebol: 'baby',
  andere: 'star',
};

const DEFAULT_PERSON_ICONS: Record<PersonOption, DisplayIconKey> = {
  papa: 'home',
  mama: 'heart',
  trixie: 'car',
  oma: 'users',
  omi: 'users',
  opi: 'users',
  andere: 'star',
  nvt: 'moon',
};

const SLEEP_KEYS = ['papa', 'mama', 'oma', 'omi', 'opi'] as const;

function nearestPaletteId(bg: string | undefined): ColorPresetId {
  if (!bg) return 'blue';
  const exact = COLOR_PRESETS.find((p) => p.bg.toLowerCase() === bg.toLowerCase());
  if (exact) return exact.id;
  // Legacy mappings
  const legacy: Record<string, ColorPresetId> = {
    '#dbeafe': 'blue',
    '#fce7f3': 'pink',
    '#dcfce7': 'green',
    '#fef3c7': 'amber',
  };
  return legacy[bg.toLowerCase()] ?? 'blue';
}

export function createDefaultDisplaySettings(): HouseholdDisplaySettings {
  const sleep = {} as HouseholdDisplaySettings['sleep'];
  for (const key of SLEEP_KEYS) {
    sleep[key] = {
      label: SLEEP_LOCATION_LABELS[key],
      description: SLEEP_LOCATION_DESCRIPTIONS[key],
      paletteId: DEFAULT_SLEEP_PALETTES[key],
      icon: DEFAULT_SLEEP_ICONS[key],
    };
  }

  const daytime = {} as HouseholdDisplaySettings['daytime'];
  for (const key of CARE_LOCATIONS) {
    daytime[key] = {
      label: DAYTIME_LOCATION_LABELS[key],
      icon: DEFAULT_DAYTIME_ICONS[key],
    };
  }

  const activities = {} as HouseholdDisplaySettings['activities'];
  for (const key of ACTIVITIES) {
    activities[key] = {
      label: ACTIVITY_LABELS[key],
      icon: DEFAULT_ACTIVITY_ICONS[key],
    };
  }

  const persons = {} as HouseholdDisplaySettings['persons'];
  for (const key of PERSON_OPTIONS) {
    persons[key] = {
      label: PERSON_LABELS[key],
      icon: DEFAULT_PERSON_ICONS[key],
    };
  }

  return { sleep, daytime, activities, persons };
}

function mergeSleepItem(
  key: Exclude<SleepLocation, null>,
  incoming: Partial<SleepDisplayItem & { bg?: string; text?: string; border?: string }> | undefined,
  defaults: HouseholdDisplaySettings,
): SleepDisplayItem {
  const base = defaults.sleep[key];
  const paletteId =
    (incoming?.paletteId && getColorPreset(incoming.paletteId).id === incoming.paletteId
      ? incoming.paletteId
      : undefined) ??
    (incoming?.bg ? nearestPaletteId(incoming.bg) : undefined) ??
    base.paletteId;

  return {
    label: (incoming?.label?.trim() || base.label).slice(0, 40),
    description: (incoming?.description?.trim() || base.description).slice(0, 300),
    paletteId,
    icon:
      incoming?.icon && DISPLAY_ICON_KEYS.includes(incoming.icon)
        ? incoming.icon
        : base.icon,
  };
}

export function mergeDisplaySettings(
  stored: Partial<HouseholdDisplaySettings> | null | undefined,
): HouseholdDisplaySettings {
  const defaults = createDefaultDisplaySettings();
  if (!stored) return defaults;

  const sleep = {} as HouseholdDisplaySettings['sleep'];
  for (const key of SLEEP_KEYS) {
    // Migrate legacy oma_omi / vakantie keys if present in old settings
    const legacy =
      key === 'oma'
        ? (stored.sleep as Record<string, SleepDisplayItem> | undefined)?.oma_omi
        : undefined;
    sleep[key] = mergeSleepItem(
      key,
      (stored.sleep?.[key] as SleepDisplayItem | undefined) ?? legacy,
      defaults,
    );
  }

  const daytime = {} as HouseholdDisplaySettings['daytime'];
  for (const key of CARE_LOCATIONS) {
    const incoming = stored.daytime?.[key];
    const base = defaults.daytime[key];
    daytime[key] = {
      label: (incoming?.label?.trim() || base.label).slice(0, 40),
      icon:
        incoming?.icon && DISPLAY_ICON_KEYS.includes(incoming.icon)
          ? incoming.icon
          : base.icon,
    };
  }

  const activities = {} as HouseholdDisplaySettings['activities'];
  for (const key of ACTIVITIES) {
    const incoming = stored.activities?.[key];
    // Fall back to old daytime activity labels if migrating
    const legacyDaytime = (
      stored.daytime as Record<string, DaytimeDisplayItem> | undefined
    )?.[key];
    const base = defaults.activities[key];
    activities[key] = {
      label: (incoming?.label?.trim() || legacyDaytime?.label?.trim() || base.label).slice(
        0,
        40,
      ),
      icon:
        incoming?.icon && DISPLAY_ICON_KEYS.includes(incoming.icon)
          ? incoming.icon
          : legacyDaytime?.icon && DISPLAY_ICON_KEYS.includes(legacyDaytime.icon)
            ? legacyDaytime.icon
            : base.icon,
    };
  }

  const persons = {} as HouseholdDisplaySettings['persons'];
  for (const key of PERSON_OPTIONS) {
    const incoming = stored.persons?.[key];
    const base = defaults.persons[key];
    persons[key] = {
      label: (incoming?.label?.trim() || base.label).slice(0, 40),
      icon:
        incoming?.icon && DISPLAY_ICON_KEYS.includes(incoming.icon)
          ? incoming.icon
          : base.icon,
    };
  }

  return { sleep, daytime, activities, persons };
}

/**
 * Sync “bij wie”-labels (en iconen) naar overdag + brengen/ophalen (gedeelde keys),
 * zodat de UI maar één plek heeft om namen te beheren.
 */
export function applyCareLabelSync(
  settings: HouseholdDisplaySettings,
): HouseholdDisplaySettings {
  const daytime = { ...settings.daytime };
  const persons = { ...settings.persons };

  for (const key of SLEEP_KEYS) {
    const { label, icon } = settings.sleep[key];
    daytime[key] = { ...daytime[key], label, icon };
    persons[key] = { ...persons[key], label };
  }

  return { ...settings, daytime, persons };
}

export function getSleepColorFromSettings(
  location: SleepLocation | undefined,
  settings: HouseholdDisplaySettings,
): LocationColor {
  if (!location) return { ...EMPTY_DAY_COLOR };
  const item = settings.sleep[location];
  const colors = resolvePaletteColors(item.paletteId);
  return { ...colors, label: item.label };
}

export function getDaytimeCareColorFromSettings(
  location: DaytimeLocation | null | undefined,
  settings: HouseholdDisplaySettings,
): LocationColor | null {
  if (!location || location === 'andere') return null;
  return getSleepColorFromSettings(location, settings);
}

export function getDaytimeLabelFromSettings(
  location: DaytimeLocation | null | undefined,
  other: string | null | undefined,
  settings: HouseholdDisplaySettings,
): string {
  if (!location) return '—';
  if (location === 'andere' && other) return other;
  if (location !== 'andere' && settings.sleep[location]?.label) {
    return settings.sleep[location].label;
  }
  return settings.daytime[location].label;
}

export function getActivityLabelFromSettings(
  activity: Activity | null | undefined,
  other: string | null | undefined,
  settings: HouseholdDisplaySettings,
): string {
  if (!activity) return '—';
  if (activity === 'andere' && other) return other;
  return settings.activities[activity].label;
}

export function getPersonLabelFromSettings(
  person: PersonOption | null | undefined,
  other: string | null | undefined,
  settings: HouseholdDisplaySettings,
): string {
  if (!person || person === 'nvt') return '—';
  if (person === 'andere' && other) return other;
  if (
    person === 'papa' ||
    person === 'mama' ||
    person === 'oma' ||
    person === 'omi' ||
    person === 'opi'
  ) {
    return settings.sleep[person]?.label ?? settings.persons[person].label;
  }
  return settings.persons[person].label;
}

export function getSleepLabelFromSettings(
  location: SleepLocation | undefined,
  settings: HouseholdDisplaySettings,
): string {
  if (!location) return 'Niet ingevuld';
  return settings.sleep[location].label;
}

export function getDayCellBackgroundFromSettings(
  entry:
    | {
        daytimeLocation?: DaytimeLocation | null;
        sleepLocation?: SleepLocation;
      }
    | null
    | undefined,
  settings: HouseholdDisplaySettings,
) {
  const sleepColor = getSleepColorFromSettings(entry?.sleepLocation, settings);
  const daytimeCare = getDaytimeCareColorFromSettings(
    entry?.daytimeLocation ?? null,
    settings,
  );
  const daytimeBg = daytimeCare?.bg ?? EMPTY_DAY_COLOR.bg;
  const hasSleep = !!entry?.sleepLocation;
  const hasDaytimeCare = !!daytimeCare;

  if (hasDaytimeCare && hasSleep && daytimeCare.bg !== sleepColor.bg) {
    return {
      background: `linear-gradient(to bottom right, ${daytimeBg} 0%, ${daytimeBg} 49.5%, ${sleepColor.bg} 50.5%, ${sleepColor.bg} 100%)`,
      color: sleepColor.text,
      borderColor: sleepColor.border,
      isDiagonal: true,
      daytimeColor: daytimeCare,
      sleepColor,
    };
  }

  if (hasSleep) {
    return {
      background: sleepColor.bg,
      color: sleepColor.text,
      borderColor: sleepColor.border,
      isDiagonal: false,
      daytimeColor: daytimeCare,
      sleepColor,
    };
  }

  if (hasDaytimeCare) {
    return {
      background: daytimeCare.bg,
      color: daytimeCare.text,
      borderColor: daytimeCare.border,
      isDiagonal: false,
      daytimeColor: daytimeCare,
      sleepColor,
    };
  }

  return {
    background: EMPTY_DAY_COLOR.bg,
    color: EMPTY_DAY_COLOR.text,
    borderColor: EMPTY_DAY_COLOR.border,
    isDiagonal: false,
    daytimeColor: null as LocationColor | null,
    sleepColor,
  };
}
