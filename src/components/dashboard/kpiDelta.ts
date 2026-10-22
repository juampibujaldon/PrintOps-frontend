export function computeDelta(current?: number | null, previous?: number | null, inPoints?: boolean) {
  if (current == null || previous == null) return null;
  if (inPoints) {
    const d = current - previous;
    return { value: d, text: `${d >= 0 ? '+' : ''}${d.toFixed(1)} pts` };
  }
  if (previous === 0) return current === 0 ? null : { value: 1, text: 'nuevo' };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { value: pct, text: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%` };
}

