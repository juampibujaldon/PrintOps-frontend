// src/utils/formatDate.ts

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// Formatea un timestamp ISO como "hoy HH:mm", "ayer HH:mm" o "lun d/M · HH:mm".
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  if (diffDays === 0) return `hoy ${time}`;
  if (diffDays === 1) return `ayer ${time}`;

  const weekday = WEEKDAYS[date.getDay()];
  return `${weekday} ${date.getDate()}/${date.getMonth() + 1} · ${time}`;
}
