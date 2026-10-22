export function money(v: number): string {
  return `$${v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

export function moneyExact(v: number): string {
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function shortMonth(month: string): string {
  const m = Number(month.split('-')[1]);
  return MONTHS[m - 1] ?? month;
}

