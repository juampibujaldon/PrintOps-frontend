import {
  Activity,
  BarChart3,
  Bell,
  Calculator,
  Cylinder,
  LayoutGrid,
  ListOrdered,
  Package,
  Printer,
  Settings,
  ShoppingCart,
  TrendingUp,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Prefijos adicionales que también marcan el ítem como activo. */
  alsoActiveFor?: string[];
  /** Solo visible para el supervisor (el backend también lo restringe). */
  managerOnly?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Producción',
    items: [
      { to: '/printers', label: 'Impresoras', icon: Printer, alsoActiveFor: ['/orders'] },
      { to: '/jobs', label: 'Cola de trabajos', icon: ListOrdered },
      { to: '/workshop', label: 'Taller', icon: LayoutGrid },
    ],
  },
  {
    title: 'Comercial',
    items: [{ to: '/quotes', label: 'Presupuestos', icon: Calculator }],
  },
  {
    title: 'Inventario',
    items: [
      { to: '/parts', label: 'Repuestos', icon: Package },
      { to: '/spools', label: 'Filamento', icon: Cylinder },
      { to: '/purchasing', label: 'Compras', icon: ShoppingCart, managerOnly: true },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
      { to: '/analytics', label: 'Análisis', icon: TrendingUp, managerOnly: true },
      { to: '/activity', label: 'Actividad', icon: Activity, managerOnly: true },
    ],
  },
  {
    items: [
      { to: '/notifications', label: 'Notificaciones', icon: Bell },
      { to: '/profile', label: 'Perfil', icon: User },
      { to: '/settings', label: 'Configuración', icon: Settings },
    ],
  },
];

// Lista plana (compatibilidad con quien la usa sin secciones).
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function visibleSections(role: string | undefined): NavSection[] {
  return NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => !i.managerOnly || role === 'MANAGER') })).filter(
    (s) => s.items.length > 0,
  );
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const prefixes = [item.to, ...(item.alsoActiveFor ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
