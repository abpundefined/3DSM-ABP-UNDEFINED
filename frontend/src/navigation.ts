import type { IconName } from './components/common/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const publicItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'grid' },
  { to: '/ranking', label: 'Ranking', icon: 'bars' },
  { to: '/comparar', label: 'Comparar', icon: 'compare' },
  { to: '/mapa', label: 'Mapa', icon: 'map' },
  { to: '/metodologia', label: 'Metodologia', icon: 'book' },
];

const adminItem: NavItem = { to: '/admin', label: 'Admin', icon: 'shield' };

export function getNavItems(isAuthenticated: boolean): NavItem[] {
  return isAuthenticated ? [...publicItems, adminItem] : publicItems;
}
