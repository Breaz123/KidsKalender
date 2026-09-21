import {
  getActivityLabelFromSettings,
  getPersonLabelFromSettings,
  type Activity,
  type CalendarEntry,
  type DisplaySettings,
  type PersonOption,
} from '@kids-calendar/shared';

function personName(
  person: PersonOption | null | undefined,
  other: string | null | undefined,
  settings: DisplaySettings,
): string | null {
  if (!person || person === 'nvt') return null;
  return getPersonLabelFromSettings(person, other, settings);
}

/** Compacte maandcel: "Papa school brengen" i.p.v. alleen een naam. */
export function getBringLabel(
  entry: Pick<CalendarEntry, 'broughtBy' | 'broughtByOther' | 'activity' | 'activityOther'>,
  settings: DisplaySettings,
): string | null {
  const who = personName(entry.broughtBy, entry.broughtByOther, settings);
  if (!who) return null;

  if (entry.activity) {
    const activity = getActivityLabelFromSettings(
      entry.activity as Activity,
      entry.activityOther,
      settings,
    ).toLowerCase();
    return `${who} ${activity} brengen`;
  }

  return `${who} brengt`;
}

/** Compacte maandcel: "Mama haalt op". */
export function getPickupLabel(
  entry: Pick<CalendarEntry, 'pickedUpBy' | 'pickedUpByOther'>,
  settings: DisplaySettings,
): string | null {
  const who = personName(entry.pickedUpBy, entry.pickedUpByOther, settings);
  if (!who) return null;
  return `${who} haalt op`;
}

/** Activiteit apart tonen als die niet al in de breng-regel zit. */
export function showActivitySeparately(
  entry: Pick<CalendarEntry, 'broughtBy' | 'activity'>,
): boolean {
  if (!entry.activity) return false;
  // Bij brengen + activiteit staat de activiteit in "Papa school brengen".
  if (entry.broughtBy && entry.broughtBy !== 'nvt') return false;
  return true;
}
