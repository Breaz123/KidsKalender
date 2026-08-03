import {
  getActivityLabelFromSettings,
  getDaytimeLabelFromSettings,
  getPersonLabelFromSettings,
  getSleepLabelFromSettings,
  getDayCellBackgroundFromSettings,
  type CalendarEntry,
} from '@kids-calendar/shared';
import { DisplayIcon } from '../lib/icons';
import { cn } from '../lib/cn';
import { useDisplaySettings } from '../contexts/DisplaySettingsContext';

interface DayCellProps {
  day: number;
  entry?: CalendarEntry;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  onClick?: () => void;
}

export function DayCell({
  day,
  entry,
  isToday,
  isCurrentMonth = true,
  onClick,
}: DayCellProps) {
  const { displaySettings } = useDisplaySettings();
  const cellBg = getDayCellBackgroundFromSettings(entry, displaySettings);

  const daytimeIcon = entry?.daytimeLocation
    ? displaySettings.daytime[entry.daytimeLocation].icon
    : 'sun';
  const activityIcon = entry?.activity
    ? displaySettings.activities[entry.activity].icon
    : 'star';
  const sleepIcon = entry?.sleepLocation
    ? displaySettings.sleep[entry.sleepLocation].icon
    : 'moon';
  const pickupIcon = 'car' as const;
  const bringIcon = 'car' as const;

  const ariaParts = [`Dag ${day}`];
  if (entry?.daytimeLocation) {
    ariaParts.push(
      `overdag ${getDaytimeLabelFromSettings(entry.daytimeLocation, entry.daytimeLocationOther, displaySettings)}`,
    );
  }
  if (entry?.activity) {
    ariaParts.push(
      `activiteit ${getActivityLabelFromSettings(entry.activity, entry.activityOther, displaySettings)}`,
    );
  }
  if (entry?.sleepLocation) {
    ariaParts.push(
      `slapen bij ${getSleepLabelFromSettings(entry.sleepLocation, displaySettings)}`,
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[88px] w-full flex-col rounded-lg border p-1.5 text-left transition-colors sm:min-h-[100px] sm:p-2',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1',
        !isCurrentMonth && 'opacity-40',
        isToday && 'ring-2 ring-blue-600 ring-offset-1',
      )}
      style={{
        background: cellBg.background,
        borderColor: cellBg.borderColor,
        color: cellBg.color,
      }}
      aria-label={ariaParts.join(', ')}
      data-diagonal={cellBg.isDiagonal ? 'true' : 'false'}
    >
      <span className="mb-1 text-sm font-bold leading-none">{day}</span>

      {entry?.daytimeLocation && (
        <div className="mb-0.5 flex items-start gap-0.5 text-[10px] leading-tight sm:text-xs">
          <DisplayIcon name={daytimeIcon} className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
          <span className="truncate">
            {getDaytimeLabelFromSettings(
              entry.daytimeLocation,
              entry.daytimeLocationOther,
              displaySettings,
            )}
          </span>
        </div>
      )}

      {entry?.activity && (
        <div className="mb-0.5 flex items-start gap-0.5 text-[10px] leading-tight sm:text-xs">
          <DisplayIcon name={activityIcon} className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
          <span className="truncate">
            {getActivityLabelFromSettings(
              entry.activity,
              entry.activityOther,
              displaySettings,
            )}
          </span>
        </div>
      )}

      {entry?.pickedUpBy && entry.pickedUpBy !== 'nvt' && (
        <div className="mb-0.5 flex items-start gap-0.5 text-[10px] leading-tight sm:text-xs">
          <DisplayIcon name={pickupIcon} className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
          <span className="truncate">
            {getPersonLabelFromSettings(
              entry.pickedUpBy,
              entry.pickedUpByOther,
              displaySettings,
            )}
          </span>
        </div>
      )}

      {entry?.sleepLocation && (
        <div className="mt-auto flex items-center gap-0.5 text-[10px] font-semibold leading-tight sm:text-xs">
          <DisplayIcon name={sleepIcon} className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {getSleepLabelFromSettings(entry.sleepLocation, displaySettings)}
          </span>
        </div>
      )}

      {entry?.broughtBy && entry.broughtBy !== 'nvt' && !entry.pickedUpBy && (
        <div className="flex items-start gap-0.5 text-[10px] leading-tight sm:text-xs">
          <DisplayIcon name={bringIcon} className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
          <span className="truncate">
            {getPersonLabelFromSettings(
              entry.broughtBy,
              entry.broughtByOther,
              displaySettings,
            )}
          </span>
        </div>
      )}
    </button>
  );
}
