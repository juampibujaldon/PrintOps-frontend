// src/components/QuotePdfPreview.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { QuoteInputs, QuoteResults } from '../types/quote';

type Props = {
  inputs: QuoteInputs;
  results: QuoteResults;
  quoteNumber?: string;
};

const money = (v: number) => `$${v.toFixed(2)}`;

// Vista previa del presupuesto renderizada con componentes RN (sin WebView).
export default function QuotePdfPreview({ inputs, results, quoteNumber }: Props) {
  const totalGrams = inputs.filamentGrams * inputs.units;
  const totalHours = inputs.printingHours * inputs.units;
  const subtotal = results.unitPrice * inputs.units;
  const discount = Math.max(0, subtotal - results.totalPrice);

  return (
    <View style={styles.paper}>
      {/* Encabezado */}
      <Text style={styles.appName}>PrintOps</Text>
      <Text style={styles.quoteNumber}>Presupuesto {quoteNumber ?? '-'}</Text>
      <View style={styles.separator} />

      {/* Datos del cliente */}
      <Text style={styles.section}>Datos del cliente</Text>
      <Row label="Cliente" value={inputs.clientName || '-'} />
      <Row label="Trabajo" value={inputs.jobDescription || '-'} />
      <Row label="Material" value={inputs.filamentType} />
      <Row label="Filamento total" value={`${totalGrams.toFixed(2)} g`} />
      <Row label="Tiempo estimado" value={`${totalHours.toFixed(2)} horas`} />

      {/* Tabla de precios */}
      <Text style={styles.section}>Detalle de precios</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.flex]}>Concepto</Text>
          <Text style={[styles.th, styles.num]}>Cant.</Text>
          <Text style={[styles.th, styles.num]}>Unitario</Text>
          <Text style={[styles.th, styles.num]}>Descuento</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, styles.flex]}>Impresión 3D</Text>
          <Text style={[styles.td, styles.num]}>{inputs.units}</Text>
          <Text style={[styles.td, styles.num]}>{money(results.unitPrice)}</Text>
          <Text style={[styles.td, styles.num]}>{money(discount)}</Text>
        </View>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalValue}>{money(results.totalPrice)}</Text>
      </View>

      {/* Pie */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Validez del presupuesto: 15 días</Text>
        <Text style={styles.footerText}>PrintOps — Gestión de Impresión 3D</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  appName: {
    ...Typography.title1,
    color: '#283618',
    fontWeight: '800',
  },
  quoteNumber: {
    ...Typography.subheadline,
    color: '#606c38',
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: '#283618',
    marginBottom: Spacing.md,
  },
  section: {
    ...Typography.labelUppercase,
    color: '#606c38',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rowLabel: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    width: 120,
  },
  rowValue: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    flex: 1,
  },
  table: {
    marginTop: Spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#606c38',
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  th: {
    ...Typography.caption1,
    color: '#ffffff',
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  td: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
  },
  flex: {
    flex: 1,
  },
  num: {
    width: 72,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  totalLabel: {
    ...Typography.title3,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  totalValue: {
    ...Typography.title2,
    color: '#283618',
    fontWeight: '800',
  },
  footer: {
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: Spacing.sm,
    gap: 2,
  },
  footerText: {
    ...Typography.caption2,
    color: Colors.textTertiary,
  },
});
