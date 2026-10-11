// src/components/QuotePdfPreview.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing, Typography } from '../constants/theme';
import { QuoteInputs, QuoteResults, QuoteStatus, QUOTE_STATUS_LABELS } from '../types/quote';

type Props = {
  inputs: QuoteInputs;
  results: QuoteResults;
  quoteNumber?: string;
  status?: QuoteStatus;
};

// Misma paleta que QuotePdfService en el backend: la vista previa tiene que
// parecerse al PDF que recibe el cliente.
const PDF = {
  celeste: '#29A8E0',
  celesteDark: '#0E6F9E',
  celesteLight: '#EAF6FC',
  celesteBorder: '#C7E6F5',
  ink: '#1F2D3A',
  muted: '#6B7C8A',
  white: '#FFFFFF',
};

const STATUS_COLOR: Record<QuoteStatus, string> = {
  DRAFT: '#8A97A3',
  SENT: PDF.celeste,
  ACCEPTED: '#2E9E5B',
  PAID: '#2E9E5B',
  REJECTED: '#D9483B',
};

const money = (v: number) =>
  `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v: number, decimals: number) => v.toLocaleString('es-AR', { maximumFractionDigits: decimals });

// Vista previa del presupuesto renderizada con componentes RN (sin WebView).
export default function QuotePdfPreview({ inputs, results, quoteNumber, status = 'DRAFT' }: Props) {
  const totalGrams = inputs.filamentGrams * inputs.units;
  const totalHours = inputs.printingHours * inputs.units;
  const subtotal = results.unitPrice * inputs.units;
  const discount = Math.max(0, subtotal - results.totalPrice);

  return (
    <View style={styles.paper}>
      <View style={styles.topBand} />
      {status === 'DRAFT' && (
        <Text style={styles.watermark}>BORRADOR</Text>
      )}

      <View style={styles.body}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>PrintOps</Text>
            <Text style={styles.tagline}>Impresión 3D a medida</Text>
          </View>
          <View style={styles.numberBox}>
            <Text style={styles.overline}>PRESUPUESTO</Text>
            <Text style={styles.number} numberOfLines={1}>{quoteNumber ?? 'Sin número'}</Text>
            <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[status] }]}>
              <Text style={styles.statusText}>{QUOTE_STATUS_LABELS[status].toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Cliente + especificaciones */}
        <View style={styles.cards}>
          <View style={styles.card}>
            <Text style={styles.overline}>CLIENTE</Text>
            <Text style={styles.client} numberOfLines={2}>{inputs.clientName || '-'}</Text>
            <Text style={styles.muted} numberOfLines={2}>{inputs.jobDescription || '-'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.overline}>ESPECIFICACIONES</Text>
            <Spec label="Material" value={inputs.filamentType} />
            <Spec label="Cantidad" value={`${inputs.units} u.`} />
            <Spec label="Filamento" value={`${num(totalGrams, 0)} g`} />
            <Spec label="Impresión" value={`${num(totalHours, 1)} h`} />
          </View>
        </View>

        {/* Detalle */}
        <Text style={[styles.overline, styles.sectionTitle]}>DETALLE</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.flex]}>Concepto</Text>
          <Text style={[styles.th, styles.qty]}>Cant.</Text>
          <Text style={[styles.th, styles.amount]}>Importe</Text>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.flex}>
            <Text style={styles.concept} numberOfLines={2}>
              Impresión 3D{inputs.jobDescription ? ` — ${inputs.jobDescription}` : ''}
            </Text>
            <Text style={styles.muted}>{money(results.unitPrice)} c/u</Text>
          </View>
          <Text style={[styles.td, styles.qty]}>{inputs.units}</Text>
          <Text style={[styles.td, styles.amount]}>{money(subtotal)}</Text>
        </View>

        {/* Totales */}
        <View style={styles.totals}>
          <SummaryRow label="Subtotal" value={money(subtotal)} />
          {discount > 0.004 && (
            <SummaryRow
              label={`Descuento${inputs.discountPercent ? ` (${num(inputs.discountPercent, 0)}%)` : ''}`}
              value={`− ${money(discount)}`}
            />
          )}
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue} adjustsFontSizeToFit numberOfLines={1}>{money(results.totalPrice)}</Text>
          </View>
        </View>

        {/* Pie */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Validez según configuración del taller · Generado con PrintOps</Text>
        </View>
      </View>
    </View>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.spec}>
      <Text style={styles.muted}>{label}: </Text>
      <Text style={styles.specValue}>{value}</Text>
    </Text>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  paper: {
    backgroundColor: PDF.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PDF.celesteBorder,
    shadowColor: '#0E6F9E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topBand: { height: 6, backgroundColor: PDF.celeste },
  watermark: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    fontSize: 56,
    fontWeight: '800',
    color: PDF.celesteLight,
    transform: [{ rotate: '-35deg' }],
  },
  body: { padding: Spacing.lg },

  header: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  brand: { flex: 1 },
  brandName: { fontSize: 22, fontWeight: '700', color: PDF.ink },
  tagline: { ...Typography.caption, color: PDF.celesteDark, marginTop: 2 },
  numberBox: {
    backgroundColor: PDF.celesteLight,
    borderWidth: 1,
    borderColor: PDF.celesteBorder,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    minWidth: 120,
  },
  overline: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, color: PDF.celesteDark },
  number: { fontSize: 16, fontWeight: '700', color: PDF.ink, marginTop: 2 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, marginTop: 6 },
  statusText: { fontSize: 9, fontWeight: '700', color: PDF.white, letterSpacing: 0.4 },

  cards: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  card: { flex: 1, backgroundColor: PDF.celesteLight, borderRadius: Radius.sm, padding: Spacing.sm, gap: 3 },
  client: { fontSize: 14, fontWeight: '700', color: PDF.ink },
  muted: { ...Typography.caption, color: PDF.muted },
  spec: { ...Typography.caption },
  specValue: { fontWeight: '700', color: PDF.ink },

  sectionTitle: { marginBottom: Spacing.xs },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PDF.celesteLight,
    borderBottomWidth: 1.5,
    borderBottomColor: PDF.celeste,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  th: { fontSize: 10, fontWeight: '700', color: PDF.celesteDark },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: PDF.celesteBorder,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  concept: { fontSize: 12, fontWeight: '700', color: PDF.ink },
  td: { fontSize: 12, color: PDF.ink },
  qty: { width: 40, textAlign: 'center' },
  amount: { width: 96, textAlign: 'right' },

  totals: { alignSelf: 'flex-end', width: '62%', marginTop: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8 },
  summaryLabel: { fontSize: 12, color: PDF.muted },
  summaryValue: { fontSize: 12, color: PDF.ink },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PDF.celeste,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 6,
    gap: Spacing.sm,
  },
  totalLabel: { fontSize: 12, fontWeight: '700', color: PDF.white },
  totalValue: { fontSize: 17, fontWeight: '800', color: PDF.white, flexShrink: 1 },

  footer: { marginTop: Spacing.lg, borderTopWidth: 1, borderTopColor: PDF.celesteBorder, paddingTop: Spacing.sm },
  footerText: { fontSize: 9, color: PDF.muted, textAlign: 'center' },
});
