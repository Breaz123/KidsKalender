import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Sun, List, Settings, Plus } from 'lucide-react';
import { cn } from '../lib/cn';

interface BottomNavProps {
  onAddClick: () => void;
}

const navItems = [
  {
    to: '/',
    icon: Calendar,
    label: 'Kalender',
    match: (path: string) => path === '/' || path.startsWith('/mijn') || path.startsWith('/dag'),
  },
  { to: '/vandaag', icon: Sun, label: 'Vandaag', match: (path: string) => path.startsWith('/vandaag') },
  {
    to: '/overzicht',
    icon: List,
    label: 'Overzicht',
    match: (path: string) => path.startsWith('/overzicht'),
  },
  {
    to: '/instellingen',
    icon: Settings,
    label: 'Instellingen',
    match: (path: string) => path.startsWith('/instellingen'),
  },
];

export function BottomNav({ onAddClick }: BottomNavProps) {
  const location = useLocation();
  const onMineAgenda = location.pathname.startsWith('/mijn');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="Hoofdnavigatie"
    >
      <div className="relative mx-auto flex max-w-4xl items-end justify-around px-2 pt-1">
        {navItems.slice(0, 2).map(({ to, icon: Icon, label, match }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex min-h-touch min-w-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium',
              match(location.pathname) ? 'text-blue-600' : 'text-gray-500',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}

        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onAddClick}
            className={cn(
              '-mt-6 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              onMineAgenda
                ? 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-600'
                : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-600',
            )}
            aria-label={onMineAgenda ? 'Privé afspraak toevoegen' : 'Regeling toevoegen'}
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>

        {navItems.slice(2).map(({ to, icon: Icon, label, match }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex min-h-touch min-w-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium',
              match(location.pathname) ? 'text-blue-600' : 'text-gray-500',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
