/** Alle datums van start t/m end (inclusief), lokaal middaguur. */
export function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  while (current <= end) {
    dates.push(toLocalIso(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Zelfde weekdag als startDate, tot en met endDate. */
export function getWeeklyDatesInRange(startDate: string, endDate: string): string[] {
  return getDatesInRange(startDate, endDate).filter((iso) => {
    const start = new Date(startDate + 'T12:00:00');
    const day = new Date(iso + 'T12:00:00');
    return day.getDay() === start.getDay();
  });
}

/** Elke 2 weken vanaf startDate (zelfde weekdag), tot en met endDate. */
export function getBiweeklyDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  if (current > end) return dates;

  while (current <= end) {
    dates.push(toLocalIso(current));
    current.setDate(current.getDate() + 14);
  }
  return dates;
}

export type BulkFrequency = 'daily' | 'weekly' | 'biweekly';
