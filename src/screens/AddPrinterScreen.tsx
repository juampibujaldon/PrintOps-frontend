// src/screens/AddPrinterScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { printerService, PrinterData, PrinterStatus } from '../services/printerService';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';
import PressableScale from '../components/ui/PressableScale';

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

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
  location: yup.string().optional(),
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
    const allowed = await requestCameraPermission();
    if (!allowed) return;

    const result = await launchCamera({ mediaType: 'photo', quality: 0.7 });
    if (result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0]);
    }
  };

  const pickImage = async () => {
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

      <Text style={styles.photoLabel}>Foto (opcional)</Text>
      <View style={styles.photoContainer}>
        {photo?.uri ? (
          <View style={styles.photoPreviewWrapper}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <PressableScale style={styles.removePhotoButton} onPress={() => setPhoto(null)}>
              <Text style={styles.removePhotoText}>✕</Text>
            </PressableScale>
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderIcon}>📷</Text>
            <Text style={styles.photoPlaceholderText}>Sin foto — opcional</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <PressableScale style={styles.photoButton} onPress={takePhoto}>
            <Text style={styles.photoButtonText}>Cámara</Text>
          </PressableScale>
          <PressableScale style={styles.photoButton} onPress={pickImage}>
            <Text style={styles.photoButtonText}>Galería</Text>
          </PressableScale>
        </View>
        <Text style={styles.helpText}>Podés agregar una foto después desde la ficha de la impresora</Text>
      </View>

      <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
        <TextField label="Nombre (opcional)" placeholder="Ej. PLA Rojo" value={value} onChangeText={onChange} error={errors.name?.message} />
      )} />

      <Controller control={control} name="brand" render={({ field: { onChange, value } }) => (
        <TextField label="Marca" placeholder="Ej. Prusa" value={value} onChangeText={onChange} error={errors.brand?.message} />
      )} />

      <Controller control={control} name="model" render={({ field: { onChange, value } }) => (
        <TextField label="Modelo" placeholder="Ej. i3 MK3S" value={value} onChangeText={onChange} error={errors.model?.message} />
      )} />

      <Controller control={control} name="serialNumber" render={({ field: { onChange, value } }) => (
        <TextField label="Número de serie" placeholder="Número de serie" value={value} onChangeText={onChange} error={errors.serialNumber?.message} />
      )} />

      <Controller control={control} name="location" render={({ field: { onChange, value } }) => (
        <TextField label="Ubicación (opcional)" placeholder="Ej. Laboratorio A" value={value} onChangeText={onChange} error={errors.location?.message} />
      )} />

      <Controller control={control} name="purchaseDate" render={({ field: { onChange, value } }) => (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Fecha de compra</Text>
          <PressableScale style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={value ? styles.dateText : styles.datePlaceholder}>
              {value || 'Seleccionar fecha'}
            </Text>
          </PressableScale>
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
            {STATUS_OPTIONS.map((option) => {
              const selected = value === option.value;
              return (
                <PressableScale
                  key={option.value}
                  style={[styles.statusOption, selected && styles.statusOptionSelected]}
                  onPress={() => onChange(option.value)}
                >
                  <Text style={[styles.statusText, selected && styles.statusTextSelected]}>
                    {option.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          {errors.status && <Text style={styles.errorText}>{errors.status.message}</Text>}
        </View>
      )} />

      <Button title="Guardar Impresora" onPress={handleSubmit(onSubmit)} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: 40,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  title: {
    ...Typography.title2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  photoLabel: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  photoPreviewWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  photoPreview: {
    width: 150,
    height: 150,
    borderRadius: Radius.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 4,
  },
  photoPlaceholderIcon: {
    fontSize: 32,
  },
  photoPlaceholderText: {
    ...Typography.caption1,
    color: Colors.textTertiary,
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photoButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  photoButtonText: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  helpText: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  dateButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  dateText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  datePlaceholder: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  errorText: {
    ...Typography.footnote,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: 2,
  },
  statusGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  statusOptionSelected: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  statusText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statusTextSelected: {
    color: Colors.background,
  },
});
