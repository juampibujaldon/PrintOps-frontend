// src/screens/AddPrinterScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/theme';
import { printerService, PrinterData } from '../services/printerService';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';

const schema = yup.object({
  name: yup.string().optional(),
  brand: yup.string().required('La marca es obligatoria'),
  model: yup.string().required('El modelo es obligatorio'),
  serialNumber: yup.string().required('El número de serie es obligatorio'),
  purchaseDate: yup.string().required('La fecha de compra es obligatoria')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'El formato debe ser YYYY-MM-DD'),
  status: yup.mixed<'OPERATIVA' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO'>()
    .oneOf(['OPERATIVA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'])
    .required('El estado es obligatorio'),
});

type Props = {
  navigation: NativeStackNavigationProp<TecnicoStackParamList, 'AddPrinter'>;
};

export default function AddPrinterScreen({ navigation }: Props) {
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<PrinterData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      brand: '',
      model: '',
      serialNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      status: 'OPERATIVA',
    }
  });

  const takePhoto = async () => {
    const result = await launchCamera({ mediaType: 'photo', quality: 0.7 });
    if (result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0]);
    }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
    if (result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0]);
    }
  };

  const onSubmit = async (data: PrinterData) => {
    setLoading(true);
    try {
      let photoAsset = undefined;
      if (photo && photo.uri) {
        photoAsset = {
          uri: photo.uri,
          type: photo.type || 'image/jpeg',
          name: photo.fileName || `printer_${Date.now()}.jpg`
        };
      }
      
      const newPrinter = await printerService.createPrinter(data, photoAsset);
      navigation.replace('PrinterDetail', { printer: newPrinter });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo guardar la impresora');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registrar Impresora</Text>
      
      <View style={styles.photoContainer}>
        {photo?.uri ? (
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>Sin foto</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
            <Text style={styles.buttonText}>Cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            <Text style={styles.buttonText}>Galería</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <TextInput style={[styles.input, errors.name && styles.inputError]} placeholder="Nombre (Ej. PLA Rojo - opcional)" value={value} onChangeText={onChange} />
          {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
        </View>
      )} />

      <Controller control={control} name="brand" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <TextInput style={[styles.input, errors.brand && styles.inputError]} placeholder="Marca" value={value} onChangeText={onChange} />
          {errors.brand && <Text style={styles.errorText}>{errors.brand.message}</Text>}
        </View>
      )} />

      <Controller control={control} name="model" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <TextInput style={[styles.input, errors.model && styles.inputError]} placeholder="Modelo" value={value} onChangeText={onChange} />
          {errors.model && <Text style={styles.errorText}>{errors.model.message}</Text>}
        </View>
      )} />

      <Controller control={control} name="serialNumber" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <TextInput style={[styles.input, errors.serialNumber && styles.inputError]} placeholder="Número de serie" value={value} onChangeText={onChange} />
          {errors.serialNumber && <Text style={styles.errorText}>{errors.serialNumber.message}</Text>}
        </View>
      )} />

      <Controller control={control} name="purchaseDate" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Fecha de compra (YYYY-MM-DD)</Text>
          <TextInput style={[styles.input, errors.purchaseDate && styles.inputError]} placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} />
          {errors.purchaseDate && <Text style={styles.errorText}>{errors.purchaseDate.message}</Text>}
        </View>
      )} />

      <Controller control={control} name="status" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Estado inicial</Text>
          <View style={styles.statusGroup}>
            {['OPERATIVA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'].map((s) => (
              <TouchableOpacity key={s} style={[styles.statusOption, value === s && styles.statusOptionSelected]} onPress={() => onChange(s)}>
                <Text style={[styles.statusText, value === s && styles.statusTextSelected]}>
                  {s === 'OPERATIVA' ? 'Operativa' : s === 'EN_MANTENIMIENTO' ? 'En mant.' : 'Fuera serv.'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.status && <Text style={styles.errorText}>{errors.status.message}</Text>}
        </View>
      )} />

      <TouchableOpacity style={[styles.submitButton, loading && styles.buttonDisabled]} onPress={handleSubmit(onSubmit)} disabled={loading}>
        {loading ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.buttonText}>Guardar Impresora</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40, backgroundColor: Colors.background, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 20, textAlign: 'center' },
  photoContainer: { alignItems: 'center', marginBottom: 20 },
  photoPreview: { width: 150, height: 150, borderRadius: 10, marginBottom: 10 },
  photoPlaceholder: { width: 150, height: 150, borderRadius: 10, backgroundColor: Colors.inputBackground, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  photoPlaceholderText: { color: Colors.textSecondary },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  fieldContainer: { marginBottom: 16 },
  label: { color: Colors.textSecondary, marginBottom: 4, marginLeft: 4, fontSize: 12 },
  input: { borderWidth: 1, borderColor: 'transparent', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: Colors.inputBackground, color: Colors.textPrimary },
  inputError: { borderColor: Colors.error },
  errorText: { color: Colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 },
  statusGroup: { flexDirection: 'row', gap: 8 },
  statusOption: { flex: 1, paddingVertical: 10, backgroundColor: Colors.inputBackground, borderRadius: 8, alignItems: 'center' },
  statusOptionSelected: { backgroundColor: Colors.primary },
  statusText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  statusTextSelected: { color: Colors.background },
  submitButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.background, fontSize: 16, fontWeight: 'bold' }
});
