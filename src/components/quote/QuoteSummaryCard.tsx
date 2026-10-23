import { AlertTriangle } from 'lucide-react';
import { Card } from '../ui';
import type { QuoteResults } from '../../types/quote';
import { formatMoney } from './money';
import styles from './QuoteSidebar.module.css';

interface Props {
  results: QuoteResults;
  units: number;
  marginPercent: number;
  discountPercent: number;
  critical: { name: string; percent: number } | null;
  missing: string[];
  onShowWear: () => void;
}

// Precio final en vivo con su desglose completo (costos, extras, ganancia y ROI).
export default function QuoteSummaryCard({ results, units, marginPercent, discountPercent, critical, missing, onShowWear }: Props) {
  const printSubtotal = results.unitPrice * units;
  const discount = Math.max(0, printSubtotal + results.extraCostsTotal - results.totalPrice);
  return (
    <Card className={styles.summary}>
      <p className={styles.overline}>Precio final</p>
      <p className={styles.price} aria-live="polite">{formatMoney(results.totalPrice)}</p>
      <p className={styles.priceHint}>
        {units} unidad{units !== 1 ? 'es' : ''} · {formatMoney(results.unitPrice)} c/u · margen {Math.round(marginPercent)}%
      </p>

      {missing.length > 0 && (
        <p className={styles.missing}>Para calcular completá: {missing.join(', ')}.</p>
      )}

      {critical && (
        <button type="button" className={styles.critical} onClick={onShowWear}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {critical.name} llegará al {Math.round(critical.percent)}% de su vida útil.
          </span>
        </button>
      )}

      <dl className={styles.breakdown}>
        <Row label="Filamento" value={results.filamentCost * units} />
        <Row label="Energía" value={results.energyCost * units} />
        {results.designCost > 0 && <Row label="Diseño" value={results.designCost * units} />}
        {results.operatorCost > 0 && <Row label="Operador" value={results.operatorCost * units} />}
        {results.extraCostsTotal > 0 && <Row label="Gastos extra (a costo)" value={results.extraCostsTotal} />}
        <Row label="Costo total" value={results.totalCost} strong />
        {discount > 0.004 && <Row label={`Descuento (${Math.round(discountPercent)}%)`} value={-discount} />}
        <Row label="Ganancia" value={results.totalProfit} positive={results.totalProfit >= 0} />
        <div className={styles.row}>
          <dt>ROI</dt>
          <dd>{results.roi.toFixed(1)}%</dd>
        </div>
      </dl>
    </Card>
  );
}

function Row({ label, value, strong, positive }: { label: string; value: number; strong?: boolean; positive?: boolean }) {
  return (
    <div className={`${styles.row} ${strong ? styles.rowStrong : ''}`}>
      <dt>{label}</dt>
      <dd className={positive === undefined ? undefined : positive ? styles.good : styles.bad}>{formatMoney(value)}</dd>
    </div>
  );
}
