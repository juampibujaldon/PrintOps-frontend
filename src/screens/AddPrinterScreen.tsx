// src/screens/AddPrinterScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/theme';
import { printerService, PrinterData, PrinterStatus } from '../services/printerService';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';

// FIX 5: helper para formatear Date -> YYYY-MM-DD antes de enviar al backend.
const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// FIX 5: convierte una fecha YYYY-MM-DD a Date para el DateTimePicker.
const parseDate = (value: string | undefined): Date => {
  if (value) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
};

const STATUS_OPTIONS: { value: PrinterStatus; label: string }[] = [
  { value: 'OPERATIVE', label: 'Operativa' },
  { value: 'MAINTENANCE', label: 'En mant.' },
  { value: 'OUT_OF_SERVICE', label: 'Fuera serv.' },
];

const schema = yup.object({
  name: yup.string().optional(),
  brand: yup.string().required('La marca es obligatoria'),
  model: yup.string().required('El modelo es obligatorio'),
  serialNumber: yup.string().required('El número de serie es obligatorio'),
  location: yup.string().optional(), // FIX 3
  purchaseDate: yup.string().required('La fecha de compra es obligatoria')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'El formato debe ser YYYY-MM-DD'),
  status: yup.mixed<PrinterStatus>()
    .oneOf(['OPERATIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'])
    .required('El estado es obligatorio'),
});

type Props = {
  navigation: NativeStackNavigationProp<TecnicoStackParamList, 'AddPrinter'>;
};

export default function AddPrinterScreen({ navigation }: Props) {
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // FIX 6: hook de permisos de cámara / galería.
  const { requestCameraPermission, requestLibraryPermission } = useCameraPermission();

  const { control, handleSubmit, formState: { errors } } = useForm<PrinterData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      brand: '',
      model: '',
      serialNumber: '',
      location: '',
      purchaseDate: formatDate(new Date()),
      status: 'OPERATIVE',
    }
  });

  const takePhoto = async () => {
    // FIX 6: verificar permiso de cámara antes de lanzar la cámara.
    const allowed = await requestCameraPermission();
    if (!allowed) return;

    const result = await launchCamera({ mediaType: 'photo', quality: 0.7 });
    if (result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0]);
    }
  };

  const pickImage = async () => {
    // FIX 6: verificar permiso de galería antes de lanzar la librería.
    const allowed = await requestLibraryPermission();
    if (!allowed) return;

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

      {/* FIX 7: feedback visual de que la foto es opcional */}
      <Text style={styles.photoLabel}>Foto (opcional)</Text>
      <View style={styles.photoContainer}>
        {photo?.uri ? (
          <View style={styles.photoPreviewWrapper}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.removePhotoButton} onPress={() => setPhoto(null)}>
              <Text style={styles.removePhotoText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderIcon}>📷</Text>
            <Text style={styles.photoPlaceholderText}>Sin foto — opcional</Text>
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
        <Text style={styles.helpText}>Podés agregar una foto después desde la ficha de la impresora</Text>
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

      {/* FIX 3: campo Ubicación */}
      <Controller control={control} name="location" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <TextInput style={[styles.input, errors.location && styles.inputError]} placeholder="Ubicación (opcional)" value={value} onChangeText={onChange} />
          {errors.location && <Text style={styles.errorText}>{errors.location.message}</Text>}
        </View>
      )} />

      {/* FIX 5: DateTimePicker nativo para la fecha de compra */}
      <Controller control={control} name="purchaseDate" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Fecha de compra</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={value ? styles.dateText : styles.datePlaceholder}>
              {value || 'Seleccionar fecha'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={parseDate(value)}
              mode="date"
              display="spinner"
              onChange={(event: DateTimePickerEvent, selected?: Date) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selected) {
                  onChange(formatDate(selected));
                }
              }}
            />
          )}
          {errors.purchaseDate && <Text style={styles.errorText}>{errors.purchaseDate.message}</Text>}
        </View>
      )} />

      <Controller control={control} name="status" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Estado inicial</Text>
          <View style={styles.statusGroup}>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.statusOption, value === option.value && styles.statusOptionSelected]}
                onPress={() => onChange(option.value)}
              >
                <Text style={[styles.statusText, value === option.value && styles.statusTextSelected]}>
                  {option.label}
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
  photoLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  photoContainer: { alignItems: 'center', marginBottom: 20 },
  photoPreviewWrapper: { position: 'relative', marginBottom: 10 },
  photoPreview: { width: 150, height: 150, borderRadius: 10 },
  removePhotoButton: {
    position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center',
  },
  removePhotoText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  photoPlaceholder: {
    width: 150, height: 150, borderRadius: 10, backgroundColor: Colors.inputBackground,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10, gap: 4,
  },
  photoPlaceholderIcon: { fontSize: 32 },
  photoPlaceholderText: { color: Colors.textSecondary, fontSize: 12 },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  helpText: { color: Colors.textSecondary, fontSize: 11, marginTop: 8, textAlign: 'center' },
  fieldContainer: { marginBottom: 16 },
  label: { color: Colors.textSecondary, marginBottom: 4, marginLeft: 4, fontSize: 12 },
  input: { borderWidth: 1, borderColor: 'transparent', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: Colors.inputBackground, color: Colors.textPrimary },
  inputError: { borderColor: Colors.error },
  dateButton: { borderWidth: 1, borderColor: 'transparent', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.inputBackground, justifyContent: 'center' },
  dateText: { fontSize: 16, color: Colors.textPrimary },
  datePlaceholder: { fontSize: 16, color: Colors.textSecondary },
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
