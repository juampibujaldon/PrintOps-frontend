// src/screens/CreateOrderScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Modal,
  FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { orderService, OrderType, ChecklistItemInput, PartInput } from '../services/orderService';
import { partService, Part } from '../services/partService';
import { useCameraPermission } from '../hooks/useCameraPermission';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import Card from '../components/ui/Card';
import PressableScale from '../components/ui/PressableScale';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'CreateOrder'>;

const MAX_PHOTOS = 5;

const TYPE_LABELS: Record<OrderType, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  CALIBRATION: 'Calibración',
};

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

  const [partsModalVisible, setPartsModalVisible] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<Part[]>([]);
  const [searchingParts, setSearchingParts] = useState(false);
  const [externalNumber, setExternalNumber] = useState('');
  const [externalQty, setExternalQty] = useState('1');

  const { requestCameraPermission, requestLibraryPermission } = useCameraPermission();

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
  }, [draftKey]);

  useEffect(() => {
    const id = setInterval(() => {
      AsyncStorage.setItem(draftKey, JSON.stringify({ type, description, checklist, parts, estimatedTime }));
    }, 30000);
    return () => clearInterval(id);
  }, [draftKey, type, description, checklist, parts, estimatedTime]);

  const selectType = (t: OrderType) => {
    if (forceCorrective && t !== 'CORRECTIVE') return;
    setType(t);
    setChecklist(prev => (prev.length === 0 ? DEFAULT_CHECKLISTS[t].map(text => ({ text, done: false, na: false })) : prev));
  };

  const canGoNext = () => {
    if (step === 1) {
      if (!type) return false;
      if (type === 'CORRECTIVE' && !description.trim()) return false;
    }
    return true;
  };

  const updateChecklistItem = (index: number, patch: Partial<ChecklistItemInput>) => {
    setChecklist(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const addChecklistItem = () => {
    setChecklist(prev => [...prev, { text: '', done: false, na: false }]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(prev => prev.filter((_, i) => i !== index));
  };

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
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
                  const selected = type === t;
                  return (
                    <PressableScale
                      key={t}
                      disabled={disabled}
                      style={[styles.typeOption, selected && styles.typeOptionSelected, disabled && styles.typeOptionDisabled]}
                      onPress={() => selectType(t)}
                    >
                      <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{TYPE_LABELS[t]}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              {type === 'CORRECTIVE' && (
                <TextField
                  label="Descripción del problema (obligatorio)"
                  multiline
                  placeholder="Describí el problema observado..."
                  value={description}
                  onChangeText={setDescription}
                  style={styles.multiline}
                />
              )}
            </View>
          )}

          {step === 2 && (
            <View>
              {type !== 'CORRECTIVE' && (
                <TextField
                  label="Descripción (opcional)"
                  multiline
                  placeholder="Detalle del trabajo a realizar..."
                  value={description}
                  onChangeText={setDescription}
                  style={styles.multiline}
                />
              )}

              <Text style={styles.stepTitle}>Checklist</Text>
              {checklist.map((item, index) => (
                <View key={index} style={styles.checklistItem}>
                  <PressableScale
                    style={[styles.checkToggle, item.done && styles.checkToggleDone]}
                    onPress={() => updateChecklistItem(index, { done: !item.done, na: false })}
                  >
                    <Text style={styles.checkToggleText}>{item.done ? '✓' : ''}</Text>
                  </PressableScale>
                  <TextField
                    containerStyle={styles.checklistField}
                    value={item.text}
                    onChangeText={t => updateChecklistItem(index, { text: t })}
                    placeholder="Ítem..."
                    style={[styles.checklistInput, (item.done || item.na) && styles.checklistTextMuted]}
                  />
                  <PressableScale
                    style={[styles.naToggle, item.na && styles.naToggleActive]}
                    onPress={() => updateChecklistItem(index, { na: !item.na, done: false })}
                  >
                    <Text style={[styles.naToggleText, item.na && styles.naToggleTextActive]}>N/A</Text>
                  </PressableScale>
                  <PressableScale onPress={() => removeChecklistItem(index)}>
                    <Text style={styles.removeText}>✕</Text>
                  </PressableScale>
                </View>
              ))}
              <PressableScale style={styles.addItemButton} onPress={addChecklistItem}>
                <Text style={styles.addItemText}>+ Agregar ítem</Text>
              </PressableScale>
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
                  <PressableScale onPress={() => removePart(index)}>
                    <Text style={styles.removeText}>✕</Text>
                  </PressableScale>
                </View>
              ))}
              <PressableScale style={styles.addItemButton} onPress={() => setPartsModalVisible(true)}>
                <Text style={styles.addItemText}>+ Agregar pieza del catálogo / externa</Text>
              </PressableScale>

              <Text style={styles.stepTitle}>Fotos ({photos.length}/{MAX_PHOTOS})</Text>
              <View style={styles.photoGrid}>
                {photos.map((p, index) => (
                  <View key={index} style={styles.photoTile}>
                    <Image source={{ uri: p.uri! }} style={styles.photo} />
                    <PressableScale style={styles.photoRemove} onPress={() => removePhoto(index)}>
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </PressableScale>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <PressableScale style={styles.photoAdd} onPress={pickPhoto}>
                    <Text style={styles.photoAddText}>＋</Text>
                  </PressableScale>
                )}
              </View>
              <View style={styles.photoActions}>
                <PressableScale style={styles.photoButton} onPress={takePhoto}>
                  <Text style={styles.photoButtonText}>Cámara</Text>
                </PressableScale>
                <PressableScale style={styles.photoButton} onPress={pickPhoto}>
                  <Text style={styles.photoButtonText}>Galería</Text>
                </PressableScale>
              </View>

              <TextField
                label="Tiempo estimado (minutos)"
                keyboardType="number-pad"
                placeholder="Ej: 45"
                value={estimatedTime}
                onChangeText={setEstimatedTime}
              />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 && (
            <Button variant="ghost" title="Anterior" onPress={() => setStep(step - 1)} style={styles.footerGhost} />
          )}
          {step < 3 ? (
            <Button
              title="Siguiente"
              onPress={() => setStep(step + 1)}
              disabled={!canGoNext()}
              style={styles.footerPrimary}
            />
          ) : (
            <Button title="Guardar" onPress={() => setShowSummary(true)} style={styles.footerPrimary} />
          )}
        </View>

        <Modal visible={partsModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Agregar pieza</Text>
              <View style={styles.searchRow}>
                <TextField
                  containerStyle={styles.flex}
                  placeholder="Buscar en catálogo..."
                  value={partSearch}
                  onChangeText={setPartSearch}
                />
                <PressableScale style={styles.searchButton} onPress={searchParts}>
                  <Text style={styles.searchButtonText}>Buscar</Text>
                </PressableScale>
              </View>
              {searchingParts ? (
                <ActivityIndicator color={Colors.accent} />
              ) : (
                <FlatList
                  data={catalogResults}
                  keyExtractor={item => String(item.id)}
                  style={styles.catalogList}
                  renderItem={({ item }) => (
                    <PressableScale style={styles.catalogRow} onPress={() => addCatalogPart(item)}>
                      <Text style={styles.catalogName}>{item.name}</Text>
                      <Text style={styles.catalogMeta}>{item.partNumber} · stock {item.stockQuantity}</Text>
                    </PressableScale>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>Sin resultados</Text>}
                />
              )}

              <Text style={styles.modalSubtitle}>Pieza externa (no está en el catálogo)</Text>
              <View style={styles.searchRow}>
                <TextField
                  containerStyle={styles.flex}
                  placeholder="Número de parte"
                  value={externalNumber}
                  onChangeText={setExternalNumber}
                />
                <TextField
                  containerStyle={styles.qtyInput}
                  keyboardType="number-pad"
                  placeholder="Cant."
                  value={externalQty}
                  onChangeText={setExternalQty}
                />
              </View>
              <PressableScale style={styles.addItemButton} onPress={addExternalPart}>
                <Text style={styles.addItemText}>+ Agregar pieza externa</Text>
              </PressableScale>

              <Button title="Listo" onPress={() => setPartsModalVisible(false)} style={styles.modalClose} />
            </Card>
          </View>
        </Modal>

        <Modal visible={showSummary} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirmar orden</Text>
              <Text style={styles.summaryLine}>Impresora: {printer.serialNumber}</Text>
              <Text style={styles.summaryLine}>Tipo: {type ? TYPE_LABELS[type] : '-'}</Text>
              <Text style={styles.summaryLine}>Ítems de checklist: {checklist.filter(it => it.text.trim()).length}</Text>
              <Text style={styles.summaryLine}>Piezas: {parts.length}</Text>
              <Text style={styles.summaryLine}>Fotos: {photos.length}</Text>
              <Text style={styles.summaryLine}>Tiempo estimado: {estimatedTime ? `${estimatedTime} min` : '-'}</Text>
              <View style={styles.summaryActions}>
                <Button variant="ghost" title="Volver" onPress={() => setShowSummary(false)} style={styles.footerGhost} />
                <Button title="Confirmar" onPress={handleSave} loading={saving} style={styles.footerPrimary} />
              </View>
            </Card>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  stepperStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepperDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperDotActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  stepperDotText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  stepperDotTextActive: {
    color: Colors.background,
  },
  stepperLabel: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  stepperLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  warning: {
    ...Typography.footnote,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  stepTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  typeGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  typeOptionSelected: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  typeOptionDisabled: {
    opacity: 0.4,
  },
  typeText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: Colors.background,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  checkToggle: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkToggleDone: {
    backgroundColor: Colors.statusOperativa,
    borderColor: Colors.statusOperativa,
  },
  checkToggleText: {
    color: Colors.onAccent,
    fontWeight: '700',
  },
  checklistField: {
    flex: 1,
    marginBottom: 0,
  },
  checklistInput: {
    paddingVertical: 8,
  },
  checklistTextMuted: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  naToggle: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  naToggleActive: {
    backgroundColor: Colors.statusMantenim,
    borderColor: Colors.statusMantenim,
  },
  naToggleText: {
    ...Typography.caption2,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  naToggleTextActive: {
    color: Colors.onAccent,
  },
  removeText: {
    color: Colors.error,
    fontSize: 16,
    padding: 4,
  },
  addItemButton: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  addItemText: {
    ...Typography.subheadline,
    color: Colors.accent,
    fontWeight: '600',
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  partRowText: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  photoTile: {
    position: 'relative',
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: Radius.sm,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  photoAdd: {
    width: 84,
    height: 84,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.separator,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddText: {
    fontSize: 30,
    color: Colors.textTertiary,
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  photoButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  photoButtonText: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
    alignItems: 'center',
  },
  footerPrimary: {
    flex: 1,
  },
  footerGhost: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    maxHeight: '80%',
  },
  modalTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalSubtitle: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
    marginBottom: 0,
  },
  qtyInput: {
    width: 70,
    marginBottom: 0,
  },
  searchButton: {
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    height: 50,
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  searchButtonText: {
    ...Typography.subheadline,
    color: Colors.background,
    fontWeight: '700',
  },
  catalogList: {
    maxHeight: 220,
    marginBottom: Spacing.xs,
  },
  catalogRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  catalogName: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
  },
  catalogMeta: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  emptyText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    paddingVertical: Spacing.sm,
    textAlign: 'center',
  },
  modalClose: {
    marginTop: Spacing.md,
  },
  summaryLine: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  summaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
});
