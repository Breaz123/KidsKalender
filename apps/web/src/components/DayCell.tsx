import { forwardRef } from 'react';
import {
  getActivityLabelFromSettings,
  getDaytimeLabelFromSettings,
  getPersonLabelFromSettings,
  getSleepLabelFromSettings,
  getDayCellBackgroundFromSettings,
  getDisplayIconFromSettings,
  type CalendarEntry,
} from '@kids-calendar/shared';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { DisplayIcon } from '../lib/icons';
import { cn } from '../lib/cn';
import { useDisplaySettings } from '../contexts/DisplaySettingsContext';
import { splitDayEntries } from '../lib/entries';

interface DayCellProps {
  day: number;
  date?: Date;
  entries?: CalendarEntry[];
  /** Single-entry fallback for tests; prefer `entries` so layers are not overwritten. */
  entry?: CalendarEntry;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  tabIndex?: number;
  onClick?: () => void;
}

export const DayCell = forwardRef<HTMLButtonElement, DayCellProps>(function DayCell({
  day,
  date,
  entries,
  entry,
  isToday,
  isCurrentMonth = true,
  tabIndex,
  onClick,
}, ref) {
  const { displaySettings } = useDisplaySettings();
  const { shared, privates } = splitDayEntries(entries ?? (entry ? [entry] : []));
  // Own private layers only — API never returns another parent's private.
  const ownPrivates = privates;
  const hasOwnPrivate = ownPrivates.length > 0;
  const cellBg = getDayCellBackgroundFromSettings(shared ?? undefined, displaySettings);

  const daytimeIcon = shared?.daytimeLocation
    ? getDisplayIconFromSettings(displaySettings.daytime[shared.daytimeLocation], 'sun')
    : 'sun';
  const activityIcon = shared?.activity
    ? getDisplayIconFromSettings(displaySettings.activities[shared.activity], 'star')
    : 'star';
  const sleepIcon = shared?.sleepLocation
    ? getDisplayIconFromSettings(displaySettings.sleep[shared.sleepLocation], 'moon')
    : 'moon';

  const ariaParts = [
    date
      ? format(date, 'd MMMM', { locale: nl })
      : `Dag ${day}`,
  ];
  if (shared?.daytimeLocation) {
    ariaParts.push(
      `overdag ${getDaytimeLabelFromSettings(shared.daytimeLocation, shared.daytimeLocationOther, displaySettings)}`,
    );
  }
  if (shared?.activity) {
    ariaParts.push(
      `activiteit ${getActivityLabelFromSettings(shared.activity, shared.activityOther, displaySettings)}`,
    );
  }
  if (shared?.sleepLocation) {
    ariaParts.push(
      `slapen bij ${getSleepLabelFromSettings(shared.sleepLocation, displaySettings)}`,
    );
  }
  if (!shared) {
    ariaParts.push('geen kinderregeling');
  }
  if (hasOwnPrivate) {
    ariaParts.push(
      ownPrivates.length === 1 ? '1 privé afspraak' : `${ownPrivates.length} privé afspraken`,
    );
  }

  const onlyOwnPrivate = !shared && hasOwnPrivate;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      tabIndex={tabIndex}
      className={cn(
        'flex min-h-[88px] w-full flex-col rounded-lg border p-1.5 text-left transition-colors sm:min-h-[100px] sm:p-2 relative',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1',
        !isCurrentMonth && 'opacity-40',
        isToday && 'ring-2 ring-blue-600 ring-offset-1',
        onlyOwnPrivate && 'border-dashed border-2 border-purple-400',
      )}
      style={{
        background: shared ? cellBg.background : 'white',
        borderColor: shared ? cellBg.borderColor : onlyOwnPrivate ? undefined : cellBg.borderColor,
        color: shared ? cellBg.color : '#6b7280',
      }}
      aria-label={ariaParts.join(', ')}
      aria-current={isToday ? 'date' : undefined}
      data-diagonal={shared ? (cellBg.isDiagonal ? 'true' : 'false') : 'false'}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="mb-1 text-sm font-bold leading-none">{day}</span>
        {hasOwnPrivate && (
          <span className="flex items-center gap-0.5" aria-hidden>
            <svg className="h-3 w-3 shrink-0 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {ownPrivates.length > 1 && (
              <span className="text-[10px] font-semibold text-purple-700">{ownPrivates.length}</span>
            )}
          </span>
        )}
      </div>

      {shared && (
        <>
          {shared.daytimeLocation && (
            <div className="mb-0.5 flex items-start gap-0.5 text-[10px] leading-tight sm:text-xs">
              <DisplayIcon name={daytimeIcon} className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">
                {getDaytimeLabelFromSettings(
                  shared.daytimeLocation,
                  shared.daytimeLocationOther,
                  displaySettings,
                )}
              </span>
            </div>
          )}

          {shared.activity && (
            <div className="mb-0.5 flex items-start gap-0.5 text-[10px] leading-tight sm:text-xs">
              <DisplayIcon name={activityIcon} className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">
                {getActivityLabelFromSettings(
                  shared.activity,
                  shared.activityOther,
                  displaySettings,
                )}
              </span>
            </div>
          )}

          {shared.pickedUpBy && shared.pickedUpBy !== 'nvt' && (
            <div className="mb-0.5 flex items-start gap-0.5 text-[10px] leading-tight sm:text-xs">
              <DisplayIcon name="car" className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">
                {getPersonLabelFromSettings(
                  shared.pickedUpBy,
                  shared.pickedUpByOther,
                  displaySettings,
                )}
              </span>
            </div>
          )}

          {shared.sleepLocation && (
            <div className="mt-auto flex items-center gap-0.5 text-[10px] font-semibold leading-tight sm:text-xs">
              <DisplayIcon name={sleepIcon} className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {getSleepLabelFromSettings(shared.sleepLocation, displaySettings)}
              </span>
            </div>
          )}

          {shared.broughtBy && shared.broughtBy !== 'nvt' && !shared.pickedUpBy && (
            <div className="flex items-start gap-0.5 text-[10px] leading-tight sm:text-xs">
              <DisplayIcon name="car" className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">
                {getPersonLabelFromSettings(
                  shared.broughtBy,
                  shared.broughtByOther,
                  displaySettings,
                )}
              </span>
            </div>
          )}
        </>
      )}

      {hasOwnPrivate && (
        <div className={cn('text-[10px] font-medium text-purple-600', shared ? 'mt-1' : 'mt-auto')}>
          {ownPrivates.length === 1
            ? (ownPrivates[0].title || 'Privé afspraak')
            : `${ownPrivates.length} privé`}
        </div>
      )}
    </button>
  );
});
