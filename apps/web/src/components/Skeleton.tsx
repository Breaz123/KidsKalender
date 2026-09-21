import { cn } from '../lib/cn';

export function DayCardSkeleton({ size = 'large' }: { size?: 'large' | 'small' }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl border-2 border-gray-200 bg-gray-100',
        size === 'large' ? 'h-48' : 'h-32',
      )}
      role="status"
      aria-label="Laden"
    />
  );
}

export function CalendarGridSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1" role="status" aria-label="Kalender laden">
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[88px] animate-pulse rounded-lg bg-gray-100 sm:min-h-[100px]"
        />
      ))}
    </div>
  );
}
