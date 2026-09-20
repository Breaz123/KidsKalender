import {
  getActivityLabelFromSettings,
  getDaytimeLabelFromSettings,
  getPersonLabelFromSettings,
  getSleepLabelFromSettings,
  getSleepColorFromSettings,
  getDaytimeCareColorFromSettings,
  getDisplayIconFromSettings,
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

function PrivateBadge() {
  return (
    <div className="absolute top-2 right-2 z-10">
      <div className="flex items-center gap-1 rounded-full bg-purple-600 px-2 py-1 text-xs font-medium text-white shadow-sm">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Privé
      </div>
    </div>
  );
}

export function DayCard({ entry, date, size = 'large' }: DayCardProps) {
  const { displaySettings } = useDisplaySettings();
  const isLarge = size === 'large';

  if (entry && !entry.isShared) {
    return (
      <article className="relative overflow-hidden rounded-xl border-2 border-purple-300 bg-purple-50 text-purple-950">
        <PrivateBadge />
        <div className={isLarge ? 'p-5 pr-20' : 'p-3 pr-16'}>
          <header className={isLarge ? 'mb-3' : 'mb-2'}>
            <p className={`font-semibold capitalize ${isLarge ? 'text-lg' : 'text-sm'}`}>
              {format(parseISO(date), 'EEEE d MMMM', { locale: nl })}
            </p>
          </header>
          <h3 className={`font-bold ${isLarge ? 'text-xl' : 'text-base'}`}>
            {entry.title || 'Privé afspraak'}
          </h3>
          {entry.time && (
            <p className={`mt-1 font-medium text-purple-800 ${isLarge ? 'text-base' : 'text-sm'}`}>
              {entry.time}
            </p>
          )}
          {entry.note && (
            <p className={`mt-3 text-sm italic opacity-80 ${isLarge ? '' : 'mt-2'}`}>
              {entry.note}
            </p>
          )}
        </div>
      </article>
    );
  }

  const sleepColor = getSleepColorFromSettings(
    entry?.sleepLocation as SleepLocation | undefined,
    displaySettings,
  );
  const daytimeCare = getDaytimeCareColorFromSettings(
    entry?.daytimeLocation,
    displaySettings,
  );

  return (
    <article
      className="relative overflow-hidden rounded-xl border-2"
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
            name={getDisplayIconFromSettings(
              displaySettings.daytime[entry.daytimeLocation],
              'sun',
            )}
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
            name={getDisplayIconFromSettings(
              displaySettings.activities[entry.activity],
              'star',
            )}
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
          <p className={`font-semibold capitalize ${isLarge ? 'text-lg' : 'text-sm'}`}>
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
                name={getDisplayIconFromSettings(
                  displaySettings.sleep[entry.sleepLocation],
                  'moon',
                )}
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
                {isLarge && displaySettings.sleep[entry.sleepLocation]?.description && (
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
