import { forwardRef } from 'react';
import {
  getActivityLabelFromSettings,
  getDaytimeLabelFromSettings,
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
import {
  getBringLabel,
  getPickupLabel,
  showActivitySeparately,
} from '../lib/transferLabels';

interface DayCellProps {
  day: number;
  date?: Date;
  entries?: CalendarEntry[];
  /** Single-entry fallback for tests; prefer `entries` so layers are not overwritten. */
  entry?: CalendarEntry;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  tabIndex?: number;
  /** When false (gedeelde kalender), hide private lock indicators. */
  showPrivate?: boolean;
  /** When > 0 on gedeelde agenda, show a lock hint that privé bestaat. */
  privateHintCount?: number;
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
  showPrivate = true,
  privateHintCount = 0,
  onClick,
}, ref) {
  const { displaySettings } = useDisplaySettings();
  const { shared, privates } = splitDayEntries(entries ?? (entry ? [entry] : []));
  // Own private layers only — API never returns another parent's private.
  const ownPrivates = showPrivate ? privates : [];
  const hasOwnPrivate = ownPrivates.length > 0;
  const hintCount = showPrivate ? 0 : privateHintCount;
  const showLockHint = hasOwnPrivate || hintCount > 0;
  const lockCount = hasOwnPrivate ? ownPrivates.length : hintCount;
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

  const bringLabel = shared ? getBringLabel(shared, displaySettings) : null;
  const pickupLabel = shared ? getPickupLabel(shared, displaySettings) : null;
  const showActivity = shared ? showActivitySeparately(shared) : false;

  const ariaParts = [
    date
      ? format(date, 'd MMMM', { locale: nl })
      : `Dag ${day}`,
  ];
  if (bringLabel) ariaParts.push(bringLabel);
  if (shared?.daytimeLocation) {
    ariaParts.push(
      `overdag ${getDaytimeLabelFromSettings(shared.daytimeLocation, shared.daytimeLocationOther, displaySettings)}`,
    );
  }
  if (showActivity && shared?.activity) {
    ariaParts.push(
      `activiteit ${getActivityLabelFromSettings(shared.activity, shared.activityOther, displaySettings)}`,
    );
  }
  if (pickupLabel) ariaParts.push(pickupLabel);
  if (shared?.sleepLocation) {
    ariaParts.push(
      `slapen bij ${getSleepLabelFromSettings(shared.sleepLocation, displaySettings)}`,
    );
  }
  if (!shared) {
    if (!hasOwnPrivate) ariaParts.push('geen kinderregeling');
  }
  if (hasOwnPrivate) {
    if (!shared) {
      for (const p of ownPrivates) {
        const bits = [p.title || 'Privé afspraak'];
        if (p.time) bits.push(p.time);
        ariaParts.push(bits.join(' '));
      }
    } else {
      ariaParts.push(
        ownPrivates.length === 1 ? '1 privé afspraak' : `${ownPrivates.length} privé afspraken`,
      );
    }
  } else if (hintCount > 0) {
    ariaParts.push(
      hintCount === 1 ? 'ook 1 privé afspraak' : `ook ${hintCount} privé afspraken`,
    );
  }

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
        !shared && hasOwnPrivate && 'border-purple-200 bg-purple-50',
      )}
      style={
        shared
          ? {
              background: cellBg.background,
              borderColor: cellBg.borderColor,
              color: cellBg.color,
            }
          : hasOwnPrivate
            ? undefined
            : {
                background: 'white',
                borderColor: cellBg.borderColor,
                color: '#6b7280',
              }
      }
      aria-label={ariaParts.join(', ')}
      aria-current={isToday ? 'date' : undefined}
      data-diagonal={shared ? (cellBg.isDiagonal ? 'true' : 'false') : 'false'}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            'mb-1 text-sm font-bold leading-none',
            !shared && hasOwnPrivate && 'text-purple-900',
          )}
        >
          {day}
        </span>
        {showLockHint && (
          <span
            className="flex items-center gap-0.5"
            title={
              hasOwnPrivate
                ? ownPrivates.length === 1
                  ? ownPrivates[0].title || '1 privé afspraak'
                  : `${ownPrivates.length} privé afspraken`
                : hintCount === 1
                  ? '1 privé afspraak — open de dag'
                  : `${hintCount} privé afspraken — open de dag`
            }
            aria-hidden
          >
            <svg className="h-3 w-3 shrink-0 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {lockCount > 1 && (
              <span className="text-[10px] font-semibold text-purple-700">{lockCount}</span>
            )}
          </span>
        )}
      </div>

      {shared && (
        <>
          {bringLabel && (
            <div
              className="mb-0.5 flex items-start gap-0.5 text-[10px] font-semibold leading-tight sm:text-xs"
              title={bringLabel}
            >
              <DisplayIcon name="car" className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{bringLabel}</span>
            </div>
          )}

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

          {showActivity && shared.activity && (
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

          {pickupLabel && (
            <div
              className="mb-0.5 flex items-start gap-0.5 text-[10px] font-semibold leading-tight sm:text-xs"
              title={pickupLabel}
            >
              <DisplayIcon name="car" className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{pickupLabel}</span>
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
        </>
      )}

      {!shared && hasOwnPrivate && (
        <div className="flex min-h-0 flex-1 flex-col gap-0.5">
          {ownPrivates.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-0.5 text-[10px] leading-tight text-purple-900 sm:text-xs"
              title={[p.title, p.time].filter(Boolean).join(' · ')}
            >
              <svg
                className="mt-0.5 h-3 w-3 shrink-0 text-purple-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="min-w-0 truncate font-medium">
                {p.time ? `${p.time} ` : ''}
                {p.title || 'Privé'}
              </span>
            </div>
          ))}
          {ownPrivates.length > 3 && (
            <span className="text-[10px] font-semibold text-purple-700">
              +{ownPrivates.length - 3} meer
            </span>
          )}
        </div>
      )}
    </button>
  );
});
