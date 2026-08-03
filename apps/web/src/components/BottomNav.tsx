import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Sun, List, Settings, Plus } from 'lucide-react';
import { cn } from '../lib/cn';

interface BottomNavProps {
  onAddClick: () => void;
}

const navItems = [
  { to: '/', icon: Calendar, label: 'Kalender' },
  { to: '/vandaag', icon: Sun, label: 'Vandaag' },
  { to: '/overzicht', icon: List, label: 'Overzicht' },
  { to: '/instellingen', icon: Settings, label: 'Instellingen' },
];

export function BottomNav({ onAddClick }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="Hoofdnavigatie"
    >
      <div className="relative mx-auto flex max-w-lg items-end justify-around px-2 pt-1">
        {navItems.slice(0, 2).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex min-h-touch min-w-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium',
              location.pathname === to ? 'text-blue-600' : 'text-gray-500',
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
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label="Regeling toevoegen"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>

        {navItems.slice(2).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex min-h-touch min-w-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium',
              location.pathname === to ? 'text-blue-600' : 'text-gray-500',
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
