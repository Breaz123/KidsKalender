import type { LucideIcon } from 'lucide-react';
import {
  Sun,
  Moon,
  Home,
  Users,
  Heart,
  Baby,
  School,
  Briefcase,
  Plane,
  Car,
  MapPin,
  Star,
  Coffee,
  TreePine,
  Building2,
} from 'lucide-react';
import type { DisplayIconKey } from '@kids-calendar/shared';

export const DISPLAY_ICON_MAP: Record<DisplayIconKey, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  home: Home,
  users: Users,
  heart: Heart,
  baby: Baby,
  school: School,
  briefcase: Briefcase,
  plane: Plane,
  car: Car,
  mapPin: MapPin,
  star: Star,
  coffee: Coffee,
  tree: TreePine,
  building: Building2,
};

export const DISPLAY_ICON_LABELS: Record<DisplayIconKey, string> = {
  sun: 'Zon',
  moon: 'Maan',
  home: 'Huis',
  users: 'Personen',
  heart: 'Hart',
  baby: 'Kind',
  school: 'School',
  briefcase: 'Werk',
  plane: 'Vliegtuig',
  car: 'Auto',
  mapPin: 'Locatie',
  star: 'Ster',
  coffee: 'Koffie',
  tree: 'Boom',
  building: 'Gebouw',
};

export function DisplayIcon({
  name,
  className,
}: {
  name: DisplayIconKey;
  className?: string;
}) {
  const Icon = DISPLAY_ICON_MAP[name] ?? Sun;
  return <Icon className={className} aria-hidden />;
}
