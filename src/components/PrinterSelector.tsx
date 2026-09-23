// src/components/PrinterSelector.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { printerService, PrinterResponse, PrinterStatus } from '../services/printerService';

type Props = {
  selected: PrinterResponse | null;
  onSelect: (printer: PrinterResponse | null) => void;
};

const STATUS_LABELS: Record<PrinterStatus, string> = {
  OPERATIVE: 'Operativa',
  MAINTENANCE: 'En mantenimiento',
  OUT_OF_SERVICE: 'Fuera de servicio',
};

export default function PrinterSelector({ selected, onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    printerService
      .getAllPrinters()
      .then(setPrinters)
      .catch(() => setPrinters([]))
      .finally(() => setLoading(false));
  }, [visible]);

  return (
    <View>
      <Text style={styles.label}>Impresora (opcional)</Text>
      <TouchableOpacity style={styles.button} onPress={() => setVisible(true)}>
        <Text style={[styles.buttonText, !selected && styles.placeholder]}>
          {selected ? (selected.name || selected.model) : 'Sin impresora seleccionada'}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Seleccionar impresora</Text>

            {loading ? (
              <ActivityIndicator color={Colors.accent} style={styles.loading} />
            ) : (
              <FlatList
                data={printers}
                keyExtractor={item => String(item.id)}
                style={styles.list}
                renderItem={({ item }) => {
                  const selectable = item.status === 'OPERATIVE';
                  return (
                    <TouchableOpacity
                      style={[styles.row, !selectable && styles.rowDisabled]}
                      disabled={!selectable}
                      onPress={() => {
                        onSelect(item);
                        setVisible(false);
                      }}
                    >
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowName}>{item.name || item.model}</Text>
                        <Text style={styles.rowMeta}>
                          {item.brand} · {item.model}
                          {'\n'}Estado: {STATUS_LABELS[item.status]}
                          {' · '}
                          {item.totalPrintingHours != null ? `${item.totalPrintingHours} hs` : '0 hs'}
                        </Text>
                      </View>
                      <Text style={[styles.rowState, { color: item.status === 'OPERATIVE' ? Colors.statusOperativa : Colors.statusMantenim }]}>
                        {selectable ? '✓' : '✕'}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                onSelect(null);
                setVisible(false);
              }}
            >
              <Text style={styles.clearText}>Sin impresora</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={() => setVisible(false)}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  button: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  buttonText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  placeholder: {
    color: Colors.textTertiary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  title: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  loading: {
    marginVertical: Spacing.lg,
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  rowMeta: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  rowState: {
    ...Typography.title3,
  },
  clearButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  clearText: {
    ...Typography.subheadline,
    color: Colors.accent,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  closeText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
});
