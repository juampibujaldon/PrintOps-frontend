import { BarChart3, Bell, Calculator, LayoutGrid, Package, Printer, Settings, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Prefijos adicionales que también marcan el ítem como activo. */
  alsoActiveFor?: string[];
}

// Mismo orden que el drawer de la app RN (TecnicoDrawer).
export const NAV_ITEMS: NavItem[] = [
  { to: '/printers', label: 'Impresoras', icon: Printer, alsoActiveFor: ['/orders'] },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/parts', label: 'Repuestos', icon: Package },
  { to: '/quotes', label: 'Presupuestos', icon: Calculator },
  { to: '/workshop', label: 'Taller', icon: LayoutGrid },
  { to: '/notifications', label: 'Notificaciones', icon: Bell },
  { to: '/profile', label: 'Perfil', icon: User },
  { to: '/settings', label: 'Configuración', icon: Settings },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const prefixes = [item.to, ...(item.alsoActiveFor ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
