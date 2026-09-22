// src/components/PartsSelectorModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { SparePartDTO } from '../types/parts';
import { partService } from '../services/partService';
import TextField from './ui/TextField';
import Button from './ui/Button';

// Modal de búsqueda de piezas para agregar a una orden (US-10). No descuenta
// stock: solo devuelve la selección al caller (la orden se descuenta al cerrarse).
type Props = {
  visible: boolean;
  onClose: () => void;
  onAddCatalog: (part: SparePartDTO, quantity: number) => void;
  onAddExternal: (name: string, partNumber: string, unitPrice: number, quantity: number) => void;
};

export default function PartsSelectorModal({ visible, onClose, onAddCatalog, onAddExternal }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SparePartDTO[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<SparePartDTO | null>(null);
  const [qty, setQty] = useState('1');

  const [extName, setExtName] = useState('');
  const [extNumber, setExtNumber] = useState('');
  const [extPrice, setExtPrice] = useState('');
  const [extQty, setExtQty] = useState('1');

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setQty('1');
    const t = setTimeout(() => {
      doSearch(search);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, visible]);

  const doSearch = async (term: string) => {
    setSearching(true);
    try {
      const data = await partService.listParts({ search: term.trim() || undefined });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const confirmCatalog = () => {
    if (!selected) return;
    const q = parseInt(qty, 10) || 1;
    const max = Math.max(1, selected.stock);
    onAddCatalog(selected, Math.min(q, max));
    setSelected(null);
    setQty('1');
  };

  const confirmExternal = () => {
    if (!extName.trim() && !extNumber.trim()) {
      Alert.alert('Atención', 'Ingresá al menos un nombre o número de parte.');
      return;
    }
    const q = parseInt(extQty, 10) || 1;
    const price = Number(extPrice) || 0;
    onAddExternal(extName.trim(), extNumber.trim(), price, q);
    setExtName('');
    setExtNumber('');
    setExtPrice('');
    setExtQty('1');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Agregar pieza</Text>

          <TextField
            placeholder="Buscar por nombre o N° parte..."
            value={search}
            onChangeText={setSearch}
            autoFocus={false}
          />

          {searching ? (
            <ActivityIndicator color={Colors.accent} style={{ marginVertical: Spacing.md }} />
          ) : selected ? (
            <View style={styles.qtyBlock}>
              <Text style={styles.selectedName}>{selected.name}</Text>
              <Text style={styles.selectedMeta}>Disponible: {selected.stock}</Text>
              <View style={styles.qtyRow}>
                <TextField
                  containerStyle={styles.qtyField}
                  label="Cantidad"
                  keyboardType="number-pad"
                  value={qty}
                  onChangeText={setQty}
                />
                <Button title="Agregar" onPress={confirmCatalog} style={styles.qtyBtn} />
              </View>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => String(item.id)}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const out = item.isOutOfStock;
                return (
                  <TouchableOpacity
                    style={styles.resultRow}
                    disabled={out}
                    onPress={() => { setSelected(item); setQty('1'); }}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultName, out && styles.resultNameDisabled]}>{item.name}</Text>
                      <Text style={styles.resultMeta}>{item.partNumber} · stock {item.stock}</Text>
                    </View>
                    {out ? <Text style={styles.outBadge}>Sin stock</Text> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>No encontramos piezas que coincidan</Text>}
            />
          )}

          <Text style={styles.subtitle}>Pieza externa (no está en el catálogo)</Text>
          <TextField placeholder="Nombre" value={extName} onChangeText={setExtName} />
          <TextField placeholder="N° de parte" value={extNumber} onChangeText={setExtNumber} />
          <View style={styles.qtyRow}>
            <TextField
              containerStyle={styles.qtyField}
              placeholder="Precio"
              keyboardType="decimal-pad"
              value={extPrice}
              onChangeText={setExtPrice}
            />
            <TextField
              containerStyle={styles.qtyField}
              placeholder="Cant."
              keyboardType="number-pad"
              value={extQty}
              onChangeText={setExtQty}
            />
          </View>
          <Button variant="secondary" title="+ Agregar pieza externa" onPress={confirmExternal} />
          <Button variant="ghost" title="Listo" onPress={onClose} style={styles.closeBtn} />
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
    backgroundColor: Colors.separator,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md },
  list: { maxHeight: 240 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  resultInfo: { flex: 1 },
  resultName: { ...Typography.subheadline, color: Colors.textPrimary },
  resultNameDisabled: { color: Colors.textTertiary },
  resultMeta: { ...Typography.caption1, color: Colors.textSecondary },
  outBadge: {
    ...Typography.caption2,
    color: Colors.onAccent,
    backgroundColor: Colors.statusFuera,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  empty: { ...Typography.subheadline, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.md },
  qtyBlock: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  selectedName: { ...Typography.headline, color: Colors.textPrimary },
  selectedMeta: { ...Typography.caption1, color: Colors.textSecondary, marginBottom: Spacing.sm },
  qtyRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  qtyField: { flex: 1, marginBottom: 0 },
  qtyBtn: { marginBottom: Spacing.md },
  subtitle: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  closeBtn: { marginTop: Spacing.sm },
});
