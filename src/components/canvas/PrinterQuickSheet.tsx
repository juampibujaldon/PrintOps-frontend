import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CalendarClock, ClipboardList, MapPin, Printer, X } from 'lucide-react-native';
import { Colors, Icons, Radius, Spacing, Typography, tint } from '../../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../../constants/printers';
import { PrinterResponse } from '../../services/printerService';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface Props {
  printer: PrinterResponse | null;
  openOrders: number;
  canCreateOrder: boolean;
  onClose: () => void;
  onOpenDetail: (printer: PrinterResponse) => void;
  onCreateOrder: (printer: PrinterResponse) => void;
}

const maintenanceText = (days: number | null) => {
  if (days == null) return 'Sin fecha programada';
  if (days < 0) return `Vencido hace ${-days} ${-days === 1 ? 'día' : 'días'}`;
  if (days === 0) return 'Vence hoy';
  return `En ${days} ${days === 1 ? 'día' : 'días'}`;
};

// Ficha rápida de una impresora del plano: estado, mantenimiento y acciones,
// sin salir del Taller.
export default function PrinterQuickSheet({ printer, openOrders, canCreateOrder, onClose, onOpenDetail, onCreateOrder }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!printer} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Cerrar" />
      {printer && (() => {
        const status = PRINTER_STATUS[printer.status] ?? { label: 'Sin estado', color: Colors.statusUnknown };
        const days = daysUntilMaintenance(printer.nextMaintenanceDate);
        const urgent = days != null && days <= 7;
        const maintColor = days == null ? Colors.textSecondary : days < 0 ? Colors.statusFuera : urgent ? Colors.statusMantenim : Colors.textSecondary;

        return (
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              {printer.photoUrl ? (
                <Image source={{ uri: printer.photoUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: tint(status.color, 0.12) }]}>
                  <Printer color={status.color} size={26} strokeWidth={1.5} />
                </View>
              )}
              <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={1}>{printer.name || printer.model}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{printer.brand} · {printer.model}</Text>
                <View style={styles.badgeRow}>
                  <Badge label={status.label} color={status.color} pulse={printer.status === 'OPERATIVE'} />
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
                <X color={Colors.textSecondary} size={18} strokeWidth={2} />
              </Pressable>
            </View>

            <View style={styles.infoCard}>
              <InfoLine
                icon={urgent
                  ? <AlertTriangle color={maintColor} size={Icons.sm} strokeWidth={2} />
                  : <CalendarClock color={Colors.textSecondary} size={Icons.sm} strokeWidth={Icons.strokeWidth} />}
                label="Próximo mantenimiento"
                value={maintenanceText(days)}
                valueColor={maintColor}
              />
              <InfoLine
                icon={<ClipboardList color={Colors.textSecondary} size={Icons.sm} strokeWidth={Icons.strokeWidth} />}
                label="Órdenes abiertas"
                value={String(openOrders)}
              />
              {printer.location ? (
                <InfoLine
                  icon={<MapPin color={Colors.textSecondary} size={Icons.sm} strokeWidth={Icons.strokeWidth} />}
                  label="Ubicación"
                  value={printer.location}
                  isLast
                />
              ) : null}
            </View>

            <View style={styles.actions}>
              {canCreateOrder && (
                <Button title="Nueva orden" onPress={() => onCreateOrder(printer)} style={styles.flex} />
              )}
              <Button
                title="Ver detalle"
                variant={canCreateOrder ? 'tinted' : 'primary'}
                onPress={() => onOpenDetail(printer)}
                style={styles.flex}
              />
            </View>
          </View>
        );
      })()}
    </Modal>
  );
}

function InfoLine({ icon, label, value, valueColor, isLast }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoLine, !isLast && styles.separator]}>
      {icon}
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.separator,
    marginBottom: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  thumb: { width: 64, height: 64, borderRadius: Radius.lg },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1 },
  title: { ...Typography.title3, color: Colors.textPrimary },
  subtitle: { ...Typography.subheadline, color: Colors.textSecondary, marginTop: 1 },
  badgeRow: { flexDirection: 'row', marginTop: Spacing.xs },
  closeBtn: {
    alignSelf: 'flex-start',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.fill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingLeft: Spacing.lg, marginBottom: Spacing.lg },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 46, paddingRight: Spacing.lg },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  infoLabel: { ...Typography.subheadline, color: Colors.textPrimary, flex: 1 },
  infoValue: { ...Typography.subheadline, color: Colors.textSecondary, fontWeight: '500', flexShrink: 1 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
});
