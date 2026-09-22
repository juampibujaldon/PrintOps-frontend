// src/components/CreateSparePartBottomSheet.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { CreateSparePartInput, SparePartDTO } from '../types/parts';
import { partService } from '../services/partService';
import TextField from './ui/TextField';
import Button from './ui/Button';

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  part?: SparePartDTO | null;
  onClose: () => void;
  onSaved: (part: SparePartDTO) => void;
};

export default function CreateSparePartBottomSheet({ visible, mode, part, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplierUrl, setSupplierUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && part) {
        setName(part.name);
        setPartNumber(part.partNumber);
        setDescription(part.description ?? '');
        setBrand(part.brand ?? '');
        setCategory(part.category ?? '');
        setStock(String(part.stock));
        setMinStock(String(part.minStock));
        setUnitPrice(String(part.unitPrice));
        setSupplierUrl(part.supplierUrl ?? '');
      } else {
        setName('');
        setPartNumber('');
        setDescription('');
        setBrand('');
        setCategory('');
        setStock('');
        setMinStock('');
        setUnitPrice('');
        setSupplierUrl('');
      }
    }
  }, [visible, mode, part]);

  const num = (v: string) => Number(v.replace(',', '.'));

  const save = async () => {
    if (!name.trim() || !partNumber.trim()) {
      Alert.alert('Atención', 'El nombre y el número de parte son obligatorios.');
      return;
    }
    const stockV = num(stock);
    const minV = num(minStock);
    const priceV = num(unitPrice);
    if (isNaN(stockV) || stockV < 0) {
      Alert.alert('Atención', 'Ingresá un stock válido.');
      return;
    }
    if (isNaN(minV) || minV <= 0) {
      Alert.alert('Atención', 'Ingresá un stock mínimo válido (mayor a 0).');
      return;
    }
    if (isNaN(priceV) || priceV <= 0) {
      Alert.alert('Atención', 'Ingresá un precio unitario válido.');
      return;
    }

    const payload: CreateSparePartInput = {
      name: name.trim(),
      partNumber: partNumber.trim(),
      description: description.trim() || null,
      brand: brand.trim() || null,
      category: category.trim() || null,
      stock: stockV,
      minStock: minV,
      unitPrice: priceV,
      supplierUrl: supplierUrl.trim() || null,
    };

    setSaving(true);
    try {
      const saved = mode === 'edit' && part ? await partService.updatePart(part.id, payload) : await partService.createPart(payload);
      onSaved(saved);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo guardar la pieza.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{mode === 'edit' ? 'Editar repuesto' : 'Nuevo repuesto'}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Boquilla 0.4mm" />
            <TextField label="N° de parte" value={partNumber} onChangeText={setPartNumber} placeholder="Ej: NOZ-04" />
            <TextField label="Descripción" value={description} onChangeText={setDescription} placeholder="Opcional" />
            <TextField label="Marca" value={brand} onChangeText={setBrand} placeholder="Opcional" />
            <TextField label="Categoría" value={category} onChangeText={setCategory} placeholder="Ej: Extrusión, Movimiento, Electrónica" />
            <TextField label="Stock inicial" value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="0" />
            <TextField label="Stock mínimo" value={minStock} onChangeText={setMinStock} keyboardType="numeric" placeholder="5" />
            <TextField label="Precio unitario ($)" value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" placeholder="0.00" />
            <TextField label="URL del proveedor" value={supplierUrl} onChangeText={setSupplierUrl} keyboardType="url" placeholder="Opcional" />

            <Button title="Guardar" onPress={save} loading={saving} style={styles.saveBtn} />
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
    backgroundColor: Colors.separator,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md },
  saveBtn: { marginTop: Spacing.md },
});
