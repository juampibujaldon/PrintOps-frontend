// src/utils/orderDate.ts

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Timestamp relativo para fechas recientes (< 30 días) y absoluto para antiguas.
export function formatOrderDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffDays = Math.round((now.getTime() - date.getTime()) / 86_400_000);

  if (diffDays <= 0) return 'hoy';
  if (diffDays === 1) return 'hace 1 día';
  if (diffDays < 30) return `hace ${diffDays} días`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

