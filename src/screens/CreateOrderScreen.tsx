// src/screens/CreateOrderScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Image, Modal, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { orderService, OrderType, ChecklistItemInput, PartInput } from '../services/orderService';
import { partService, Part } from '../services/partService';
import { useCameraPermission } from '../hooks/useCameraPermission';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'CreateOrder'>;

const MAX_PHOTOS = 5;

const TYPE_LABELS: Record<OrderType, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  CALIBRATION: 'Calibración',
};

// Checklist por defecto según el tipo de orden (US-04).
const DEFAULT_CHECKLISTS: Record<OrderType, string[]> = {
  PREVENTIVE: [
    'Limpieza de boquilla y hotend',
    'Lubricación de ejes X, Y, Z',
    'Verificación de tensión de correas',
    'Nivelación de cama',
    'Inspección de cables y conexiones',
    'Actualización de firmware (si aplica)',
  ],
  CORRECTIVE: [
    'Diagnóstico inicial',
    'Piezas inspeccionadas',
    'Piezas reemplazadas',
    'Prueba de funcionamiento post-reparación',
  ],
  CALIBRATION: [
    'Calibración de extrusor (pasos/mm)',
    'Calibración de temperatura de boquilla',
    'Calibración de cama (mesh bed leveling)',
    'Impresión de prueba y medición',
    'Criterios de aceptación detallados',
  ],
};

export default function CreateOrderScreen({ route, navigation }: Props) {
  const { printer } = route.params;
  const forceCorrective = printer?.status === 'OUT_OF_SERVICE';
  const draftKey = `@printops/order_draft_${printer?.id ?? printer?.serialNumber ?? 'noid'}`;

  const [step, setStep] = useState(1);
  const [type, setType] = useState<OrderType | null>(forceCorrective ? 'CORRECTIVE' : null);
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItemInput[]>(
    forceCorrective ? DEFAULT_CHECKLISTS.CORRECTIVE.map(text => ({ text, done: false, na: false })) : []
  );
  const [parts, setParts] = useState<PartInput[]>([]);
  const [photos, setPhotos] = useState<Asset[]>([]);
  const [estimatedTime, setEstimatedTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Parts selector
  const [partsModalVisible, setPartsModalVisible] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<Part[]>([]);
  const [searchingParts, setSearchingParts] = useState(false);
  const [externalNumber, setExternalNumber] = useState('');
  const [externalQty, setExternalQty] = useState('1');

  const { requestCameraPermission, requestLibraryPermission } = useCameraPermission();

  // Restaurar borrador al montar
  useEffect(() => {
    AsyncStorage.getItem(draftKey).then(raw => {
      if (!raw) return;
      try {
        const d = JSON.parse(raw);
        if (d.type) setType(d.type);
        if (d.description) setDescription(d.description);
        if (Array.isArray(d.checklist) && d.checklist.length > 0) {
          setChecklist(d.checklist);
        } else if (d.type && DEFAULT_CHECKLISTS[d.type as OrderType]) {
          setChecklist(DEFAULT_CHECKLISTS[d.type as OrderType].map(text => ({ text, done: false, na: false })));
        }
        if (Array.isArray(d.parts)) setParts(d.parts);
        if (d.estimatedTime) setEstimatedTime(String(d.estimatedTime));
      } catch {
        // Borrador corrupto: se ignora.
      }
    });
  }, []);

  // Autosave del borrador cada 30 segundos (las fotos no se persisten).
  useEffect(() => {
    const id = setInterval(() => {
      AsyncStorage.setItem(draftKey, JSON.stringify({ type, description, checklist, parts, estimatedTime }));
    }, 30000);
    return () => clearInterval(id);
  }, [type, description, checklist, parts, estimatedTime]);

  const selectType = (t: OrderType) => {
    if (forceCorrective && t !== 'CORRECTIVE') return;
    setType(t);
    // Cargar checklist por defecto solo si todavía no hay ítems.
    setChecklist(prev => (prev.length === 0 ? DEFAULT_CHECKLISTS[t].map(text => ({ text, done: false, na: false })) : prev));
  };

  const canGoNext = () => {
    if (step === 1) {
      if (!type) return false;
      if (type === 'CORRECTIVE' && !description.trim()) return false;
    }
    return true;
  };

  // ── Checklist helpers ──
  const updateChecklistItem = (index: number, patch: Partial<ChecklistItemInput>) => {
    setChecklist(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const addChecklistItem = () => {
    setChecklist(prev => [...prev, { text: '', done: false, na: false }]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(prev => prev.filter((_, i) => i !== index));
  };

  // ── Parts helpers ──
  const searchParts = async () => {
    setSearchingParts(true);
    try {
      const results = await partService.listParts(partSearch.trim() || undefined);
      setCatalogResults(results);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo buscar el catálogo');
    } finally {
      setSearchingParts(false);
    }
  };

  const addCatalogPart = (part: Part) => {
    setParts(prev => [...prev, { partId: part.id, partNumber: part.partNumber, quantity: 1, external: false }]);
  };

  const addExternalPart = () => {
    if (!externalNumber.trim()) {
      Alert.alert('Atención', 'Ingresá el número de parte');
      return;
    }
    const qty = parseInt(externalQty, 10) || 1;
    setParts(prev => [...prev, { partNumber: externalNumber.trim(), quantity: qty, external: true }]);
    setExternalNumber('');
    setExternalQty('1');
  };

  const removePart = (index: number) => {
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  // ── Photos helpers ──
  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const allowed = await requestCameraPermission();
    if (!allowed) return;
    const result = await launchCamera({ mediaType: 'photo', quality: 0.7 });
    if (result.assets) setPhotos(prev => [...prev, ...result.assets!].slice(0, MAX_PHOTOS));
  };

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const allowed = await requestLibraryPermission();
    if (!allowed) return;
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7, selectionLimit: MAX_PHOTOS - photos.length });
    if (result.assets) setPhotos(prev => [...prev, ...result.assets!].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ── Save ──
  const handleSave = async () => {
    if (!type) return;
    setSaving(true);
    try {
      const data = {
        printerId: printer.id,
        type,
        description: description.trim() || null,
        estimatedTimeMinutes: estimatedTime ? parseInt(estimatedTime, 10) : null,
        checklistItems: checklist.filter(it => it.text.trim()).map(it => ({ ...it, text: it.text.trim() })),
        parts,
      };

      const photoAssets = photos.map(p => ({
        uri: p.uri!,
        type: p.type || 'image/jpeg',
        name: p.fileName || `photo_${Date.now()}.jpg`,
      }));

      const order = await orderService.createOrder(data, photoAssets);
      await AsyncStorage.removeItem(draftKey);
      navigation.replace('OrderDetail', { orderId: order.id });
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo crear la orden');
    } finally {
      setSaving(false);
      setShowSummary(false);
    }
  };

  // ─── Render ───
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Stepper */}
        <View style={styles.stepper}>
          {['Tipo', 'Checklist', 'Piezas/Fotos'].map((label, i) => (
            <View key={label} style={styles.stepperStep}>
              <View style={[styles.stepperDot, step >= i + 1 && styles.stepperDotActive]}>
                <Text style={[styles.stepperDotText, step >= i + 1 && styles.stepperDotTextActive]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepperLabel, step >= i + 1 && styles.stepperLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>

        {forceCorrective && (
          <Text style={styles.warning}>Impresora fuera de servicio: la orden será Correctivo.</Text>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>Tipo de orden</Text>
              <View style={styles.typeGroup}>
                {(Object.keys(TYPE_LABELS) as OrderType[]).map(t => {
                  const disabled = forceCorrective && t !== 'CORRECTIVE';
                  return (
                    <TouchableOpacity
                      key={t}
                      disabled={disabled}
                      style={[styles.typeOption, type === t && styles.typeOptionSelected, disabled && styles.typeOptionDisabled]}
                      onPress={() => selectType(t)}
                    >
                      <Text style={[styles.typeText, type === t && styles.typeTextSelected]}>{TYPE_LABELS[t]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {type === 'CORRECTIVE' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Descripción del problema (obligatorio)</Text>
                  <TextInput
                    style={styles.input}
                    multiline
                    placeholder="Describí el problema observado..."
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              )}
            </View>
          )}

          {step === 2 && (
            <View>
              {type !== 'CORRECTIVE' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Descripción (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    multiline
                    placeholder="Detalle del trabajo a realizar..."
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              )}

              <Text style={styles.stepTitle}>Checklist</Text>
              {checklist.map((item, index) => (
                <View key={index} style={styles.checklistItem}>
                  <TouchableOpacity
                    style={[styles.checkToggle, item.done && styles.checkToggleDone]}
                    onPress={() => updateChecklistItem(index, { done: !item.done, na: false })}
                  >
                    <Text style={styles.checkToggleText}>{item.done ? '✓' : ''}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.checklistText, (item.done || item.na) && styles.checklistTextMuted]}
                    value={item.text}
                    onChangeText={t => updateChecklistItem(index, { text: t })}
                    placeholder="Ítem..."
                  />
                  <TouchableOpacity
                    style={[styles.naToggle, item.na && styles.naToggleActive]}
                    onPress={() => updateChecklistItem(index, { na: !item.na, done: false })}
                  >
                    <Text style={[styles.naToggleText, item.na && styles.naToggleTextActive]}>N/A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeChecklistItem(index)}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addItemButton} onPress={addChecklistItem}>
                <Text style={styles.addItemText}>+ Agregar ítem</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.stepTitle}>Piezas reemplazadas</Text>
              {parts.map((p, index) => (
                <View key={index} style={styles.partRow}>
                  <Text style={styles.partRowText}>
                    {p.partNumber || `Pieza #${p.partId}`} × {p.quantity}{p.external ? ' (externa)' : ''}
                  </Text>
                  <TouchableOpacity onPress={() => removePart(index)}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addItemButton} onPress={() => setPartsModalVisible(true)}>
                <Text style={styles.addItemText}>+ Agregar pieza del catálogo / externa</Text>
              </TouchableOpacity>

              <Text style={styles.stepTitle}>Fotos ({photos.length}/{MAX_PHOTOS})</Text>
              <View style={styles.photoGrid}>
                {photos.map((p, index) => (
                  <View key={index} style={styles.photoTile}>
                    <Image source={{ uri: p.uri! }} style={styles.photo} />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(index)}>
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                    <Text style={styles.photoAddText}>＋</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Text style={styles.photoButtonText}>Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
                  <Text style={styles.photoButtonText}>Galería</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Tiempo estimado (minutos)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="Ej: 45"
                  value={estimatedTime}
                  onChangeText={setEstimatedTime}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Navegación */}
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(step - 1)}>
              <Text style={styles.secondaryButtonText}>Anterior</Text>
            </TouchableOpacity>
          )}
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.primaryButton, !canGoNext() && styles.disabled]}
              disabled={!canGoNext()}
              onPress={() => setStep(step + 1)}
            >
              <Text style={styles.primaryButtonText}>Siguiente</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowSummary(true)}>
              <Text style={styles.primaryButtonText}>Guardar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Parts selector modal */}
        <Modal visible={partsModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Agregar pieza</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Buscar en catálogo..."
                  value={partSearch}
                  onChangeText={setPartSearch}
                />
                <TouchableOpacity style={styles.searchButton} onPress={searchParts}>
                  <Text style={styles.searchButtonText}>Buscar</Text>
                </TouchableOpacity>
              </View>
              {searchingParts ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <FlatList
                  data={catalogResults}
                  keyExtractor={item => String(item.id)}
                  style={styles.catalogList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.catalogRow} onPress={() => addCatalogPart(item)}>
                      <Text style={styles.catalogName}>{item.name}</Text>
                      <Text style={styles.catalogMeta}>{item.partNumber} · stock {item.stockQuantity}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>Sin resultados</Text>}
                />
              )}

              <Text style={styles.modalSubtitle}>Pieza externa (no está en el catálogo)</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Número de parte"
                  value={externalNumber}
                  onChangeText={setExternalNumber}
                />
                <TextInput
                  style={[styles.input, styles.qtyInput]}
                  keyboardType="number-pad"
                  placeholder="Cant."
                  value={externalQty}
                  onChangeText={setExternalQty}
                />
              </View>
              <TouchableOpacity style={styles.addItemButton} onPress={addExternalPart}>
                <Text style={styles.addItemText}>+ Agregar pieza externa</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalClose} onPress={() => setPartsModalVisible(false)}>
                <Text style={styles.modalCloseText}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Resumen antes de guardar */}
        <Modal visible={showSummary} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirmar orden</Text>
              <Text style={styles.summaryLine}>Impresora: {printer.serialNumber}</Text>
              <Text style={styles.summaryLine}>Tipo: {type ? TYPE_LABELS[type] : '-'}</Text>
              <Text style={styles.summaryLine}>Ítems de checklist: {checklist.filter(it => it.text.trim()).length}</Text>
              <Text style={styles.summaryLine}>Piezas: {parts.length}</Text>
              <Text style={styles.summaryLine}>Fotos: {photos.length}</Text>
              <Text style={styles.summaryLine}>Tiempo estimado: {estimatedTime ? `${estimatedTime} min` : '-'}</Text>
              <View style={styles.summaryActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowSummary(false)}>
                  <Text style={styles.secondaryButtonText}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.primaryButtonText}>Confirmar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stepper: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  stepperStep: { alignItems: 'center', flex: 1 },
  stepperDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.inputBackground, justifyContent: 'center', alignItems: 'center' },
  stepperDotActive: { backgroundColor: Colors.primary },
  stepperDotText: { color: Colors.textSecondary, fontWeight: '700' },
  stepperDotTextActive: { color: Colors.background },
  stepperLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  stepperLabelActive: { color: Colors.primary, fontWeight: '700' },
  warning: { color: Colors.error, textAlign: 'center', marginBottom: 8, fontSize: 13, fontWeight: '600' },
  scrollContent: { padding: 20, paddingBottom: 20 },
  stepTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  typeGroup: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeOption: { flex: 1, paddingVertical: 14, backgroundColor: Colors.inputBackground, borderRadius: 10, alignItems: 'center' },
  typeOptionSelected: { backgroundColor: Colors.primary },
  typeOptionDisabled: { opacity: 0.4 },
  typeText: { color: Colors.textSecondary, fontWeight: '600' },
  typeTextSelected: { color: Colors.background },
  field: { marginBottom: 16 },
  label: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4, marginLeft: 4 },
  input: { borderWidth: 1, borderColor: 'transparent', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: Colors.inputBackground, color: Colors.textPrimary },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checkToggle: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  checkToggleDone: { backgroundColor: Colors.statusOperativa, borderColor: Colors.statusOperativa },
  checkToggleText: { color: Colors.background, fontWeight: '700' },
  checklistText: { flex: 1, borderWidth: 1, borderColor: 'transparent', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: Colors.inputBackground, color: Colors.textPrimary },
  checklistTextMuted: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  naToggle: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: Colors.surfaceBorder },
  naToggleActive: { backgroundColor: Colors.statusMantenim, borderColor: Colors.statusMantenim },
  naToggleText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  naToggleTextActive: { color: Colors.background },
  removeText: { color: Colors.error, fontSize: 16, padding: 4 },
  addItemButton: { borderWidth: 1, borderColor: Colors.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  addItemText: { color: Colors.accent, fontWeight: '600' },
  partRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  partRowText: { color: Colors.textPrimary, fontSize: 15 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  photoTile: { position: 'relative' },
  photo: { width: 84, height: 84, borderRadius: 8 },
  photoRemove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  photoAdd: { width: 84, height: 84, borderRadius: 8, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.inputBackground, justifyContent: 'center', alignItems: 'center' },
  photoAddText: { fontSize: 30, color: Colors.textSecondary },
  photoActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  photoButton: { flex: 1, backgroundColor: Colors.primaryGlow, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  photoButtonText: { color: Colors.primary, fontWeight: '700' },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  primaryButton: { flex: 1, backgroundColor: Colors.primary, padding: 16, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: Colors.background, fontWeight: '700', fontSize: 15 },
  secondaryButton: { padding: 16, borderRadius: 10, alignItems: 'center' },
  secondaryButtonText: { color: Colors.accent, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.background, borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  modalSubtitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginTop: 16, marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  flex: { flex: 1 },
  qtyInput: { width: 70 },
  searchButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  searchButtonText: { color: Colors.background, fontWeight: '700' },
  catalogList: { maxHeight: 220, marginBottom: 4 },
  catalogRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  catalogName: { color: Colors.textPrimary, fontSize: 15 },
  catalogMeta: { color: Colors.textSecondary, fontSize: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 14, paddingVertical: 8, textAlign: 'center' },
  modalClose: { backgroundColor: Colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  modalCloseText: { color: Colors.background, fontWeight: '700' },
  summaryLine: { color: Colors.textPrimary, fontSize: 15, marginBottom: 6 },
  summaryActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },
});
