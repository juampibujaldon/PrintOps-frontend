// src/components/QuotePdfPreview.tsx
import type { QuoteInputs, QuoteResults, QuoteStatus } from '../types/quote';
import { QUOTE_STATUS_LABELS } from '../types/quote';
import styles from './QuotePdfPreview.module.css';

type Props = {
  inputs: QuoteInputs;
  results: QuoteResults;
  quoteNumber?: string;
  status?: QuoteStatus;
  // Marca de agua "BORRADOR" (solo se ve mientras es borrador, como en el PDF real).
  watermark?: boolean;
  workshopName?: string | null;
  logoUrl?: string | null;
};

// Misma paleta que QuotePdfService en el backend: la vista previa tiene que
// parecerse al PDF que recibe el cliente.
const STATUS_COLOR: Record<QuoteStatus, string> = {
  DRAFT: '#8A97A3',
  SENT: '#29A8E0',
  ACCEPTED: '#2E9E5B',
  PAID: '#2E9E5B',
  REJECTED: '#D9483B',
};

const money = (v: number) =>
  `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v: number, decimals: number) => v.toLocaleString('es-AR', { maximumFractionDigits: decimals });

// Vista previa del presupuesto renderizada con HTML/CSS (sin iframe).
export default function QuotePdfPreview({
  inputs,
  results,
  quoteNumber,
  status = 'DRAFT',
  watermark = true,
  workshopName,
  logoUrl,
}: Props) {
  const totalGrams = inputs.filamentGrams * inputs.units;
  const totalHours = inputs.printingHours * inputs.units;
  const extras = (inputs.extraCosts ?? []).filter((e) => e.description.trim() !== '');
  const printSubtotal = results.unitPrice * inputs.units;
  const subtotal = printSubtotal + results.extraCostsTotal;
  const discount = Math.max(0, subtotal - results.totalPrice);

  return (
    <article className={styles.paper} aria-label="Vista previa del presupuesto">
      <div className={styles.topBand} />
      {status === 'DRAFT' && watermark && (
        <span className={styles.watermark} aria-hidden="true">
          BORRADOR
        </span>
      )}

      <div className={styles.body}>
        <header className={styles.header}>
          <div className={styles.brand}>
            {logoUrl && <img className={styles.logo} src={logoUrl} alt="" />}
            <p className={styles.brandName}>{workshopName || 'PrintOps'}</p>
            <p className={styles.tagline}>Impresión 3D a medida</p>
          </div>
          <div className={styles.numberBox}>
            <p className={styles.overline}>PRESUPUESTO</p>
            <p className={styles.number}>{quoteNumber ?? 'Sin número'}</p>
            <span className={styles.statusPill} style={{ background: STATUS_COLOR[status] }}>
              {QUOTE_STATUS_LABELS[status].toUpperCase()}
            </span>
          </div>
        </header>

        <div className={styles.cards}>
          <div className={styles.card}>
            <p className={styles.overline}>CLIENTE</p>
            <p className={styles.client}>{inputs.clientName || '-'}</p>
            <p className={styles.muted}>{inputs.jobDescription || '-'}</p>
          </div>
          <div className={styles.card}>
            <p className={styles.overline}>ESPECIFICACIONES</p>
            <Spec label="Material" value={inputs.filamentType} />
            <Spec label="Cantidad" value={`${inputs.units} u.`} />
            <Spec label="Filamento" value={`${num(totalGrams, 0)} g`} />
            <Spec label="Impresión" value={`${num(totalHours, 1)} h`} />
          </div>
        </div>

        <p className={`${styles.overline} ${styles.sectionTitle}`}>DETALLE</p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thLeft}>Concepto</th>
              <th className={styles.qty}>Cant.</th>
              <th className={styles.amount}>Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className={styles.concept}>
                  Impresión 3D{inputs.jobDescription ? ` — ${inputs.jobDescription}` : ''}
                </span>
                <span className={styles.muted}>{money(results.unitPrice)} c/u</span>
              </td>
              <td className={styles.qty}>{inputs.units}</td>
              <td className={styles.amount}>{money(printSubtotal)}</td>
            </tr>
            {extras.map((e, i) => (
              <tr key={`${e.description}-${i}`}>
                <td>
                  <span className={styles.concept}>{e.description}</span>
                  <span className={styles.muted}>Gasto adicional</span>
                </td>
                <td className={styles.qty}>1</td>
                <td className={styles.amount}>{money(e.amount || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.totals}>
          <SummaryRow label="Subtotal" value={money(subtotal)} />
          {discount > 0.004 && (
            <SummaryRow
              label={`Descuento${inputs.discountPercent ? ` (${num(inputs.discountPercent, 0)}%)` : ''}`}
              value={`− ${money(discount)}`}
            />
          )}
          <div className={styles.totalBox}>
            <span className={styles.totalLabel}>TOTAL</span>
            <span className={styles.totalValue}>{money(results.totalPrice)}</span>
          </div>
        </div>

        <footer className={styles.footer}>
          Validez según configuración del taller · Generado con PrintOps
        </footer>
      </div>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <p className={styles.spec}>
      <span className={styles.muted}>{label}: </span>
      <span className={styles.specValue}>{value}</span>
    </p>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  );
}
