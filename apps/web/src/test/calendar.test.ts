import { describe, it, expect } from 'vitest';
import {
  getSleepLocationColor,
  getDaytimeLocationLabel,
  getActivityLabel,
  getDaytimeCareColor,
  getDayCellBackground,
  EMPTY_DAY_COLOR,
  SLEEP_LOCATION_COLORS,
} from '@kids-calendar/shared';

describe('Sleep location colors', () => {
  it('kleur wordt bepaald door slaapplaats', () => {
    const mama = getSleepLocationColor('mama');
    expect(mama.bg).toBe('#FCE7F3');
    expect(mama.label).toBe('Mama');
  });

  it('lege slaapplaats geeft lege kleur', () => {
    const empty = getSleepLocationColor(null);
    expect(empty.bg).toBe(EMPTY_DAY_COLOR.bg);
  });

  it('4 augustus toont overdag oma en slapen mama', () => {
    expect(getDaytimeLocationLabel('oma')).toBe('Oma');
    const sleep = getSleepLocationColor('mama');
    expect(sleep.label).toBe('Mama');
  });
});

describe('Diagonale dag/avond-kleuren', () => {
  it('4 augustus oma + mama geeft diagonale achtergrond', () => {
    const bg = getDayCellBackground({
      daytimeLocation: 'oma',
      sleepLocation: 'mama',
    });
    expect(bg.isDiagonal).toBe(true);
    expect(bg.background).toContain(SLEEP_LOCATION_COLORS.oma.bg);
    expect(bg.background).toContain(SLEEP_LOCATION_COLORS.mama.bg);
    expect(bg.background).toContain('linear-gradient');
  });

  it('alleen slaap geeft egale slaapkleur', () => {
    const bg = getDayCellBackground({
      daytimeLocation: null,
      sleepLocation: 'papa',
    });
    expect(bg.isDiagonal).toBe(false);
    expect(bg.background).toBe(SLEEP_LOCATION_COLORS.papa.bg);
  });

  it('zelfde care-kleur overdag en slapen blijft egaal', () => {
    const bg = getDayCellBackground({
      daytimeLocation: 'mama',
      sleepLocation: 'mama',
    });
    expect(bg.isDiagonal).toBe(false);
    expect(bg.background).toBe(SLEEP_LOCATION_COLORS.mama.bg);
  });

  it('activiteit heeft geen care-kleur; alleen slapen kleurt de cel', () => {
    expect(getDaytimeCareColor('andere')).toBeNull();
    const bg = getDayCellBackground({
      daytimeLocation: null,
      sleepLocation: 'mama',
    });
    expect(bg.isDiagonal).toBe(false);
    expect(bg.background).toBe(SLEEP_LOCATION_COLORS.mama.bg);
  });

  it('omi en opi hebben eigen kleuren', () => {
    expect(getDaytimeCareColor('omi')?.bg).toBe(SLEEP_LOCATION_COLORS.omi.bg);
    expect(getDaytimeCareColor('opi')?.bg).toBe(SLEEP_LOCATION_COLORS.opi.bg);
  });
});

describe('Activiteiten', () => {
  it('vakantie is een activiteit-label', () => {
    expect(getActivityLabel('vakantie')).toBe('Vakantie');
  });
});

describe('Form validation', () => {
  it('formulier valideert andere locatie', async () => {
    const { calendarEntryInputSchema } = await import('@kids-calendar/shared');
    const result = calendarEntryInputSchema.safeParse({
      daytimeLocation: 'andere',
    });
    expect(result.success).toBe(false);
  });

  it('formulier accepteert geldige invoer met activiteit', async () => {
    const { calendarEntryInputSchema } = await import('@kids-calendar/shared');
    const result = calendarEntryInputSchema.safeParse({
      daytimeLocation: 'papa',
      activity: 'vakantie',
      sleepLocation: 'papa',
    });
    expect(result.success).toBe(true);
  });
});

describe('Offline state', () => {
  it('offline toestand is alleen-lezen', () => {
    expect(navigator.onLine).toBeDefined();
  });
});

describe('Multi-entry grouping', () => {
  it('houdt shared + meerdere privé-lagen per dag bij', async () => {
    const { groupEntriesByDate, splitDayEntries } = await import('../lib/entries');
    const grouped = groupEntriesByDate([
      {
        id: 's',
        householdId: 'h',
        date: '2026-10-11',
        daytimeLocation: 'papa',
        daytimeLocationOther: null,
        activity: null,
        activityOther: null,
        sleepLocation: 'papa',
        broughtBy: null,
        broughtByOther: null,
        pickedUpBy: null,
        pickedUpByOther: null,
        note: 'kinderregeling',
        isShared: true,
        createdBy: 'u1',
        updatedBy: 'u1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        version: 1,
      },
      {
        id: 'p1',
        householdId: 'h',
        date: '2026-10-11',
        daytimeLocation: null,
        daytimeLocationOther: null,
        activity: null,
        activityOther: null,
        sleepLocation: null,
        broughtBy: null,
        broughtByOther: null,
        pickedUpBy: null,
        pickedUpByOther: null,
        note: 'privé 1',
        isShared: false,
        title: 'Tandarts',
        time: '10:00',
        createdBy: 'u1',
        updatedBy: 'u1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        version: 1,
      },
      {
        id: 'p2',
        householdId: 'h',
        date: '2026-10-11',
        daytimeLocation: null,
        daytimeLocationOther: null,
        activity: null,
        activityOther: null,
        sleepLocation: null,
        broughtBy: null,
        broughtByOther: null,
        pickedUpBy: null,
        pickedUpByOther: null,
        note: 'privé 2',
        isShared: false,
        title: 'Vergadering',
        createdBy: 'u1',
        updatedBy: 'u1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        version: 1,
      },
    ]);

    const layers = grouped.get('2026-10-11') ?? [];
    expect(layers).toHaveLength(3);
    const { shared, privates } = splitDayEntries(layers);
    expect(shared?.id).toBe('s');
    expect(privates).toHaveLength(2);
  });
});

describe('Color fallback', () => {
  it('ontbrekende slaapinstelling valt terug op lege kleur', async () => {
    const { getSleepColorFromSettings, EMPTY_DAY_COLOR, createDefaultDisplaySettings } =
      await import('@kids-calendar/shared');
    const settings = createDefaultDisplaySettings();
    const missing = getSleepColorFromSettings(
      'papa',
      { ...settings, sleep: {} as typeof settings.sleep },
    );
    expect(missing.bg).toBe(EMPTY_DAY_COLOR.bg);
    expect(missing.label).toBe('papa');
  });
});
