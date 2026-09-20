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
        'flex min-h-[88px] w-full flex-col rounded-lg border p-1.5 text-left transition-colors sm:min-h-[100px] sm:p-2 relative',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1',
        !isCurrentMonth && 'opacity-40',
        isToday && 'ring-2 ring-blue-600 ring-offset-1',
        entry && !entry.isShared && 'border-dashed border-2 border-purple-400',
      )}
      style={{
        background: entry?.isShared ? cellBg.background : 'white',
        borderColor: entry?.isShared ? cellBg.borderColor : undefined,
        color: entry?.isShared ? cellBg.color : '#6b7280',
      }}
      aria-label={ariaParts.join(', ')}
      data-diagonal={cellBg.isDiagonal ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="mb-1 text-sm font-bold leading-none">{day}</span>
        {entry && !entry.isShared && (
          <svg className="h-3 w-3 shrink-0 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Only show details for SHARED entries */}
      {entry?.isShared && (
        <>
          {entry.daytimeLocation && (
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

          {entry.activity && (
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

          {entry.pickedUpBy && entry.pickedUpBy !== 'nvt' && (
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

          {entry.sleepLocation && (
            <div className="mt-auto flex items-center gap-0.5 text-[10px] font-semibold leading-tight sm:text-xs">
              <DisplayIcon name={sleepIcon} className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {getSleepLabelFromSettings(entry.sleepLocation, displaySettings)}
              </span>
            </div>
          )}

          {entry.broughtBy && entry.broughtBy !== 'nvt' && !entry.pickedUpBy && (
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
        </>
      )}

      {/* For PRIVATE entries, just show "Privé" text */}
      {entry && !entry.isShared && (
        <div className="mt-auto text-[10px] text-purple-600 font-medium">
          Privé afspraak
        </div>
      )}
    </button>
  );
}
