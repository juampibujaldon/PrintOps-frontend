// src/components/StockAdjustmentModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { MovementType, SparePartDTO } from '../types/parts';
import { partService } from '../services/partService';
import TextField from './ui/TextField';
import Button from './ui/Button';

const OPTIONS: { type: MovementType; label: string }[] = [
  { type: 'PURCHASE', label: 'Compra' },
  { type: 'RETURN', label: 'Devolución' },
  { type: 'ADJUSTMENT', label: 'Ajuste manual' },
];

type Props = {
  visible: boolean;
  part: SparePartDTO | null;
  initialType?: MovementType;
  onClose: () => void;
  onAdjusted: (part: SparePartDTO) => void;
};

export default function StockAdjustmentModal({ visible, part, initialType = 'PURCHASE', onClose, onAdjusted }: Props) {
  const [type, setType] = useState<MovementType>('PURCHASE');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setType(initialType);
      setQuantity('');
      setNote('');
    }
  }, [visible, initialType]);

  if (!part) return null;

  const qty = Number(quantity) || 0;
  const isAdjustment = type === 'ADJUSTMENT';
  const newStock = isAdjustment ? qty : part.stock + qty;

  const confirm = async () => {
    if (qty <= 0) {
      Alert.alert('Atención', 'Ingresá una cantidad mayor a 0.');
      return;
    }
    if (isAdjustment && !note.trim()) {
      Alert.alert('Atención', 'La nota es obligatoria para un ajuste manual.');
      return;
    }
    setSaving(true);
    try {
      const updated = await partService.updateStock(part.id, type, qty, note.trim() || undefined);
      onAdjusted(updated);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo ajustar el stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Ajustar stock</Text>
          <Text style={styles.partName}>{part.name}</Text>

          <Text style={styles.label}>Tipo de movimiento</Text>
          <View style={styles.optionRow}>
            {OPTIONS.map(o => (
              <TouchableOpacity
                key={o.type}
                style={[styles.option, type === o.type && styles.optionSelected]}
                onPress={() => setType(o.type)}
              >
                <Text style={[styles.optionText, type === o.type && styles.optionTextSelected]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextField
            label={isAdjustment ? 'Nuevo stock' : 'Cantidad a ingresar'}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="0"
          />

          <TextField
            label={isAdjustment ? 'Nota (obligatoria)' : 'Nota (opcional)'}
            value={note}
            onChangeText={setNote}
            placeholder="Motivo del ajuste..."
          />

          <Text style={styles.preview}>
            Stock actual: {part.stock} → Stock nuevo: {newStock}
          </Text>

          <View style={styles.actions}>
            <Button variant="ghost" title="Cancelar" onPress={onClose} style={styles.actionBtn} />
            <Button title="Confirmar" onPress={confirm} loading={saving} style={styles.actionBtn} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.lg },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  title: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.xs },
  partName: { ...Typography.footnote, color: Colors.textSecondary, marginBottom: Spacing.md },
  label: { ...Typography.footnote, color: Colors.textSecondary, fontWeight: '600', marginBottom: Spacing.xs },
  optionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    alignItems: 'center',
  },
  optionSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  optionText: { ...Typography.footnote, color: Colors.textSecondary, fontWeight: '600' },
  optionTextSelected: { color: Colors.onAccent },
  preview: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    fontWeight: '700',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1 },
});
