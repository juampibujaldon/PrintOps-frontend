// src/components/CreateRuleBottomSheet.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';
import { TriggerType, MaintenanceType, CreateRuleInput, MaintenanceRuleDTO } from '../types/rules';
import { ruleService } from '../services/ruleService';

// Opciones de tipo de disparo (chips) con su unidad de umbral.
const TRIGGERS: { value: TriggerType; label: string; unit: string }[] = [
  { value: 'TIME_BASED', label: 'Por tiempo', unit: 'días' },
  { value: 'USAGE_HOURS', label: 'Por horas', unit: 'horas' },
  { value: 'FILAMENT_GRAMS', label: 'Por filamento', unit: 'gramos' },
];

const TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'PREVENTIVE', label: 'Preventivo' },
  { value: 'CORRECTIVE', label: 'Correctivo' },
  { value: 'CALIBRATION', label: 'Calibración' },
];

type Props = {
  visible: boolean;
  printerId: number;
  onClose: () => void;
  onCreated: (rule: MaintenanceRuleDTO) => void;
};

export default function CreateRuleBottomSheet({ visible, printerId, onClose, onCreated }: Props) {
  const [triggerType, setTriggerType] = useState<TriggerType>('TIME_BASED');
  const [triggerValue, setTriggerValue] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('PREVENTIVE');
  const [alertDays, setAlertDays] = useState('7');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(false);

  const unit = TRIGGERS.find(t => t.value === triggerType)?.unit ?? '';

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    setChecklist(prev => [...prev, text]);
    setNewItem('');
  };

  const removeItem = (index: number) => {
    setChecklist(prev => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setTriggerType('TIME_BASED');
    setTriggerValue('');
    setMaintenanceType('PREVENTIVE');
    setAlertDays('7');
    setChecklist([]);
    setNewItem('');
  };

  const submit = async () => {
    const value = Number(triggerValue);
    if (!value || value <= 0) {
      Alert.alert('Error', 'Ingresá un umbral válido mayor a 0.');
      return;
    }

    const payload: CreateRuleInput = {
      printerId,
      triggerType,
      triggerValue: value,
      alertDaysBefore: Number(alertDays) || 7,
      maintenanceType,
      checklistItems: checklist,
    };

    setLoading(true);
    try {
      const created = await ruleService.createRule(payload);
      onCreated(created);
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo crear la regla.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Nueva regla</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tipo de disparo */}
            <Text style={styles.label}>Disparador</Text>
            <View style={styles.chipRow}>
              {TRIGGERS.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, triggerType === t.value && styles.chipSelected]}
                  onPress={() => setTriggerType(t.value)}
                >
                  <Text style={[styles.chipText, triggerType === t.value && styles.chipTextSelected]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Umbral */}
            <Text style={styles.label}>Umbral ({unit})</Text>
            <TextInput
              style={styles.input}
              placeholder={`Cantidad de ${unit}`}
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              value={triggerValue}
              onChangeText={setTriggerValue}
            />

            {/* Tipo de mantenimiento */}
            <Text style={styles.label}>Tipo de mantenimiento</Text>
            <View style={styles.chipRow}>
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, maintenanceType === t.value && styles.chipSelected]}
                  onPress={() => setMaintenanceType(t.value)}
                >
                  <Text style={[styles.chipText, maintenanceType === t.value && styles.chipTextSelected]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Días de alerta previa */}
            <Text style={styles.label}>Días de alerta previa</Text>
            <TextInput
              style={styles.input}
              placeholder="7"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              value={alertDays}
              onChangeText={setAlertDays}
            />

            {/* Checklist */}
            <Text style={styles.label}>Checklist</Text>
            {checklist.map((item, index) => (
              <View key={index} style={styles.checklistItem}>
                <Text style={styles.checklistText}>{item}</Text>
                <TouchableOpacity onPress={() => removeItem(index)} hitSlop={8}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, styles.addInput]}
                placeholder="Nuevo ítem"
                placeholderTextColor={Colors.textSecondary}
                value={newItem}
                onChangeText={setNewItem}
                onSubmitEditing={addItem}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addItem}>
                <Text style={styles.addBtnText}>Agregar ítem</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabled]}
              onPress={submit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.submitText}>Crear regla</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: Colors.background },
  input: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.inputBackground,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.xs,
  },
  checklistText: { color: Colors.textPrimary, fontSize: 14, flex: 1 },
  removeText: { color: Colors.error, fontSize: 16, fontWeight: '700', marginLeft: Spacing.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addInput: { flex: 1 },
  addBtn: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.xs,
  },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  disabled: { opacity: 0.7 },
  submitText: { color: Colors.background, fontSize: 16, fontWeight: '800' },
});
