export const CARE_LOCATIONS = [
  'papa',
  'mama',
  'oma',
  'omi',
  'opi',
  'andere',
] as const;

export type CareLocation = (typeof CARE_LOCATIONS)[number];

/** Overdag: waar de kinderen zijn (geen activiteiten). */
export const DAYTIME_LOCATIONS = CARE_LOCATIONS;

export type DaytimeLocation = CareLocation;

/** Slapen: alleen verblijfplaats, geen activiteiten. */
export const SLEEP_LOCATIONS = [
  'papa',
  'mama',
  'oma',
  'omi',
  'opi',
  null,
] as const;

export type SleepLocation = (typeof SLEEP_LOCATIONS)[number];

/** Activiteiten los van verblijfplaats (bv. vakantie mét papa). */
export const ACTIVITIES = [
  'vakantie',
  'school',
  'krakkebol',
  'andere',
] as const;

export type Activity = (typeof ACTIVITIES)[number];

export const PERSON_OPTIONS = [
  'papa',
  'mama',
  'trixie',
  'oma',
  'omi',
  'opi',
  'andere',
  'nvt',
] as const;

export type PersonOption = (typeof PERSON_OPTIONS)[number];

export const USER_ROLES = ['parent', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type LocationColor = {
  bg: string;
  text: string;
  border: string;
  label: string;
};

/** Vaste WCAG AA-vriendelijke kleurenpaletten (tekst/rand volgen achtergrond). */
export const COLOR_PRESETS = [
  {
    id: 'blue',
    label: 'Blauw',
    bg: '#DBEAFE',
    text: '#1E3A8A',
    border: '#2563EB',
  },
  {
    id: 'pink',
    label: 'Roze',
    bg: '#FCE7F3',
    text: '#831843',
    border: '#DB2777',
  },
  {
    id: 'green',
    label: 'Groen',
    bg: '#DCFCE7',
    text: '#14532D',
    border: '#16A34A',
  },
  {
    id: 'teal',
    label: 'Zeegroen',
    bg: '#CCFBF1',
    text: '#134E4A',
    border: '#0D9488',
  },
  {
    id: 'purple',
    label: 'Paars',
    bg: '#F3E8FF',
    text: '#581C87',
    border: '#9333EA',
  },
  {
    id: 'amber',
    label: 'Amber',
    bg: '#FEF3C7',
    text: '#78350F',
    border: '#D97706',
  },
  {
    id: 'orange',
    label: 'Oranje',
    bg: '#FFEDD5',
    text: '#7C2D12',
    border: '#EA580C',
  },
  {
    id: 'red',
    label: 'Rood',
    bg: '#FEE2E2',
    text: '#7F1D1D',
    border: '#DC2626',
  },
  {
    id: 'sky',
    label: 'Hemelsblauw',
    bg: '#E0F2FE',
    text: '#0C4A6E',
    border: '#0284C7',
  },
  {
    id: 'lime',
    label: 'Limoen',
    bg: '#ECFCCB',
    text: '#365314',
    border: '#65A30D',
  },
  {
    id: 'slate',
    label: 'Grijs',
    bg: '#F1F5F9',
    text: '#1E293B',
    border: '#64748B',
  },
  {
    id: 'indigo',
    label: 'Indigo',
    bg: '#E0E7FF',
    text: '#312E81',
    border: '#4F46E5',
  },
] as const;

export type ColorPresetId = (typeof COLOR_PRESETS)[number]['id'];

export function getColorPreset(id: string | undefined | null) {
  return COLOR_PRESETS.find((p) => p.id === id) ?? COLOR_PRESETS[0];
}

export function resolvePaletteColors(paletteId: string | undefined | null): LocationColor {
  const preset = getColorPreset(paletteId);
  return {
    bg: preset.bg,
    text: preset.text,
    border: preset.border,
    label: preset.label,
  };
}

/** Default palette per sleep location. */
export const DEFAULT_SLEEP_PALETTES: Record<
  Exclude<SleepLocation, null>,
  ColorPresetId
> = {
  papa: 'blue',
  mama: 'pink',
  oma: 'green',
  omi: 'teal',
  opi: 'lime',
};

export const SLEEP_LOCATION_COLORS: Record<
  Exclude<SleepLocation, null>,
  LocationColor
> = {
  papa: { ...resolvePaletteColors('blue'), label: 'Papa' },
  mama: { ...resolvePaletteColors('pink'), label: 'Mama' },
  oma: { ...resolvePaletteColors('green'), label: 'Oma' },
  omi: { ...resolvePaletteColors('teal'), label: 'Omi' },
  opi: { ...resolvePaletteColors('lime'), label: 'Opi' },
};

export const EMPTY_DAY_COLOR: LocationColor = {
  bg: '#F9FAFB',
  text: '#374151',
  border: '#E5E7EB',
  label: 'Niet ingevuld',
};

export const DAYTIME_LOCATION_LABELS: Record<DaytimeLocation, string> = {
  papa: 'Papa',
  mama: 'Mama',
  oma: 'Oma',
  omi: 'Omi',
  opi: 'Opi',
  andere: 'Andere',
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  vakantie: 'Vakantie',
  school: 'School',
  krakkebol: 'Krakkebol',
  andere: 'Andere activiteit',
};

export const PERSON_LABELS: Record<PersonOption, string> = {
  papa: 'Papa',
  mama: 'Mama',
  trixie: 'Trixie',
  oma: 'Oma',
  omi: 'Omi',
  opi: 'Opi',
  andere: 'Andere',
  nvt: 'Niet van toepassing',
};

export const SLEEP_LOCATION_LABELS: Record<Exclude<SleepLocation, null>, string> = {
  papa: 'Papa',
  mama: 'Mama',
  oma: 'Oma',
  omi: 'Omi',
  opi: 'Opi',
};

export const SLEEP_LOCATION_DESCRIPTIONS: Record<
  Exclude<SleepLocation, null>,
  string
> = {
  papa: 'De kinderen slapen samen met papa in de woning in Wechelderzande.',
  mama: 'De kinderen slapen samen met mama in de woning in Wechelderzande.',
  oma: 'De kinderen slapen bij oma.',
  omi: 'De kinderen slapen bij omi.',
  opi: 'De kinderen slapen bij opi.',
};

export function getDaytimeLocationLabel(
  location: DaytimeLocation | null | undefined,
  other?: string | null,
): string {
  if (!location) return '—';
  if (location === 'andere' && other) return other;
  return DAYTIME_LOCATION_LABELS[location];
}

export function getActivityLabel(
  activity: Activity | null | undefined,
  other?: string | null,
): string {
  if (!activity) return '—';
  if (activity === 'andere' && other) return other;
  return ACTIVITY_LABELS[activity];
}

export function getPersonLabel(
  person: PersonOption | null | undefined,
  other?: string | null,
): string {
  if (!person || person === 'nvt') return '—';
  if (person === 'andere' && other) return other;
  return PERSON_LABELS[person];
}

export function getSleepLocationLabel(
  location: SleepLocation | undefined,
): string {
  if (!location) return 'Niet ingevuld';
  return SLEEP_LOCATION_LABELS[location];
}

export function getSleepLocationColor(location: SleepLocation | undefined) {
  if (!location) return EMPTY_DAY_COLOR;
  return SLEEP_LOCATION_COLORS[location];
}

/** Maps daytime care locations to sleep-equivalent colors. */
export function getDaytimeCareColor(
  location: DaytimeLocation | null | undefined,
): LocationColor | null {
  if (!location || location === 'andere') return null;
  return SLEEP_LOCATION_COLORS[location];
}

export interface DayCellBackground {
  background: string;
  color: string;
  borderColor: string;
  isDiagonal: boolean;
  daytimeColor: LocationColor | null;
  sleepColor: LocationColor;
}

export function getDayCellBackground(entry?: {
  daytimeLocation?: DaytimeLocation | null;
  sleepLocation?: SleepLocation;
} | null): DayCellBackground {
  const sleepColor = getSleepLocationColor(entry?.sleepLocation);
  const daytimeCare = getDaytimeCareColor(entry?.daytimeLocation ?? null);
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
    daytimeColor: null,
    sleepColor,
  };
}

export function getDayCellBackgroundWithNeutralDaytime(entry?: {
  daytimeLocation?: DaytimeLocation | null;
  sleepLocation?: SleepLocation;
} | null): DayCellBackground {
  return getDayCellBackground(entry);
}
