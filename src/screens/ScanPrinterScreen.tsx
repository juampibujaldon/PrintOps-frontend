// src/screens/ScanPrinterScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { scanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';
import { runOnJS } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { printerService } from '../services/printerService';
import { useCameraPermission } from '../hooks/useCameraPermission';

type Nav = NativeStackNavigationProp<TecnicoStackParamList, 'ScanPrinter'>;

export default function ScanPrinterScreen() {
  const navigation = useNavigation<Nav>();
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [checking, setChecking] = useState(true);
  const [handled, setHandled] = useState(false);
  const { requestCameraPermission } = useCameraPermission();

  useEffect(() => {
    (async () => {
      const ok = await requestCameraPermission();
      setHasPermission(ok);
      setChecking(false);
    })();
  }, []);

  // Se ejecuta en el thread JS cuando el frame processor detecta códigos.
  const handleScanned = (values: string[]) => {
    if (handled || values.length === 0) return;
    setHandled(true);

    const raw = values[0];
    const match = raw.match(/printops:\/\/printer\/(.+)$/);

    if (!match) {
      Alert.alert('QR no válido', 'Este código no corresponde a una impresora de PrintOps.', [
        { text: 'OK', onPress: () => setHandled(false) },
      ]);
      return;
    }

    const serial = decodeURIComponent(match[1]);
    printerService
      .getBySerialNumber(serial)
      .then(printer => navigation.replace('PrinterDetail', { printer }))
      .catch((e: any) => {
        Alert.alert('No encontrada', e?.response?.data?.message || 'No se encontró la impresora para ese código.', [
          { text: 'OK', onPress: () => setHandled(false) },
        ]);
      });
  };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const barcodes = scanBarcodes(frame, [BarcodeFormat.QR_CODE], { checkInverted: true });
    const values: string[] = [];
    for (const b of barcodes) {
      const v = (b as any).rawValue ?? (b as any).value ?? (b as any).displayValue ?? (b as any).content?.data;
      if (v) values.push(String(v));
    }
    if (values.length > 0) {
      runOnJS(handleScanned)(values);
    }
  }, [handled]);

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Sin permiso de cámara.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No se encontró cámara en este dispositivo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={frameProcessor}
      />
      <View style={styles.overlay}>
        <View style={styles.viewfinder} />
        <Text style={styles.hint}>Apuntá al QR pegado en la impresora</Text>
        <TouchableOpacity style={styles.close} onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 24 },
  text: { color: Colors.textPrimary, fontSize: 15, textAlign: 'center', marginBottom: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  viewfinder: { width: 240, height: 240, borderWidth: 2, borderColor: Colors.primary, borderRadius: 16 },
  hint: { color: '#fff', marginTop: 20, fontSize: 14 },
  close: { position: 'absolute', bottom: 48, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10 },
  closeText: { color: '#fff', fontWeight: '700' },
  button: { backgroundColor: Colors.primary, padding: 14, borderRadius: 10 },
  buttonText: { color: Colors.background, fontWeight: '700' },
});
