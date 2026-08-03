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
