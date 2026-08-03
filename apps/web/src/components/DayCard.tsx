import {
  getActivityLabelFromSettings,
  getDaytimeLabelFromSettings,
  getPersonLabelFromSettings,
  getSleepLabelFromSettings,
  getSleepColorFromSettings,
  getDaytimeCareColorFromSettings,
  EMPTY_DAY_COLOR,
  type CalendarEntry,
  type SleepLocation,
} from '@kids-calendar/shared';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { DisplayIcon } from '../lib/icons';
import { useDisplaySettings } from '../contexts/DisplaySettingsContext';

interface DayCardProps {
  entry?: CalendarEntry;
  date: string;
  size?: 'large' | 'small';
}

export function DayCard({ entry, date, size = 'large' }: DayCardProps) {
  const { displaySettings } = useDisplaySettings();
  const sleepColor = getSleepColorFromSettings(
    entry?.sleepLocation as SleepLocation | undefined,
    displaySettings,
  );
  const daytimeCare = getDaytimeCareColorFromSettings(
    entry?.daytimeLocation,
    displaySettings,
  );
  const isLarge = size === 'large';

  return (
    <article
      className="overflow-hidden rounded-xl border-2"
      style={{
        backgroundColor: sleepColor.bg,
        borderColor: sleepColor.border,
        color: sleepColor.text,
      }}
    >
      {entry?.daytimeLocation && (
        <div
          className={`flex items-start gap-2 border-b px-4 ${isLarge ? 'py-3' : 'py-2'}`}
          style={{
            backgroundColor: daytimeCare?.bg ?? EMPTY_DAY_COLOR.bg,
            borderColor: daytimeCare?.border ?? EMPTY_DAY_COLOR.border,
            color: daytimeCare?.text ?? EMPTY_DAY_COLOR.text,
          }}
        >
          <DisplayIcon
            name={displaySettings.daytime[entry.daytimeLocation].icon}
            className="mt-0.5 h-5 w-5 shrink-0 opacity-80"
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">Overdag</p>
            <p className={isLarge ? 'text-base font-medium' : 'text-sm'}>
              Bij{' '}
              {getDaytimeLabelFromSettings(
                entry.daytimeLocation,
                entry.daytimeLocationOther,
                displaySettings,
              ).toLowerCase()}
            </p>
          </div>
        </div>
      )}

      {entry?.activity && (
        <div
          className={`flex items-start gap-2 border-b border-black/10 bg-white/50 px-4 ${isLarge ? 'py-3' : 'py-2'}`}
        >
          <DisplayIcon
            name={displaySettings.activities[entry.activity].icon}
            className="mt-0.5 h-5 w-5 shrink-0 opacity-80"
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">Activiteit</p>
            <p className={isLarge ? 'text-base font-medium' : 'text-sm'}>
              {getActivityLabelFromSettings(
                entry.activity,
                entry.activityOther,
                displaySettings,
              )}
            </p>
          </div>
        </div>
      )}

      <div className={isLarge ? 'p-5' : 'p-3'}>
        <header className={isLarge ? 'mb-4' : 'mb-2'}>
          <p className={`font-semibold ${isLarge ? 'text-lg' : 'text-sm'}`}>
            {format(parseISO(date), 'EEEE d MMMM', { locale: nl })}
          </p>
        </header>

        {entry?.broughtBy && entry.broughtBy !== 'nvt' && (
          <div className={`mb-3 flex items-start gap-2 ${isLarge ? '' : 'mb-2'}`}>
            <DisplayIcon
              name="car"
              className="mt-0.5 h-5 w-5 shrink-0 opacity-80"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">Brengen</p>
              <p className={isLarge ? 'text-base' : 'text-sm'}>
                {getPersonLabelFromSettings(
                  entry.broughtBy,
                  entry.broughtByOther,
                  displaySettings,
                )}
              </p>
            </div>
          </div>
        )}

        {entry?.pickedUpBy && entry.pickedUpBy !== 'nvt' && (
          <div className={`mb-3 flex items-start gap-2 ${isLarge ? '' : 'mb-2'}`}>
            <DisplayIcon
              name="car"
              className="mt-0.5 h-5 w-5 shrink-0 opacity-80"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">Ophalen</p>
              <p className={isLarge ? 'text-base' : 'text-sm'}>
                {getPersonLabelFromSettings(
                  entry.pickedUpBy,
                  entry.pickedUpByOther,
                  displaySettings,
                )}
              </p>
            </div>
          </div>
        )}

        {entry?.sleepLocation && (
          <div className={`${isLarge ? 'mt-2 rounded-lg bg-white/40 p-3' : 'mt-2'}`}>
            <div className="flex items-start gap-2">
              <DisplayIcon
                name={displaySettings.sleep[entry.sleepLocation].icon}
                className={`shrink-0 ${isLarge ? 'h-6 w-6' : 'h-5 w-5'}`}
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                  {isLarge ? 'Vanavond slapen' : 'Slapen'}
                </p>
                <p className={`font-bold ${isLarge ? 'text-xl' : 'text-base'}`}>
                  Bij{' '}
                  {getSleepLabelFromSettings(
                    entry.sleepLocation,
                    displaySettings,
                  ).toLowerCase()}
                </p>
                {isLarge && (
                  <p className="mt-1 text-sm opacity-90">
                    {displaySettings.sleep[entry.sleepLocation].description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!entry && <p className="text-sm opacity-70">Geen regeling ingevuld.</p>}

        {entry?.note && (
          <p className={`mt-3 text-sm italic opacity-80 ${isLarge ? '' : 'mt-2'}`}>
            {entry.note}
          </p>
        )}
      </div>
    </article>
  );
}
