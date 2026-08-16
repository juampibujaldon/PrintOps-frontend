// src/screens/PrinterDetailScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'PrinterDetail'>;

export default function PrinterDetailScreen({ route, navigation }: Props) {
  const { printer } = route.params;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Impresora</Text>

      <View style={styles.card}>
        {printer.photoUrl && (
          <Image source={{ uri: printer.photoUrl }} style={styles.photo} />
        )}
        {printer.name && (
          <Text style={styles.infoText}><Text style={styles.label}>Nombre:</Text> {printer.name}</Text>
        )}
        <Text style={styles.infoText}><Text style={styles.label}>Marca:</Text> {printer.brand}</Text>
        <Text style={styles.infoText}><Text style={styles.label}>Modelo:</Text> {printer.model}</Text>
        <Text style={styles.infoText}><Text style={styles.label}>N° Serie:</Text> {printer.serialNumber}</Text>
        <Text style={styles.infoText}><Text style={styles.label}>Estado:</Text> {printer.status}</Text>
        {printer.location && (
          <Text style={styles.infoText}><Text style={styles.label}>Ubicación:</Text> {printer.location}</Text>
        )}
        {printer.purchaseDate && (
          <Text style={styles.infoText}><Text style={styles.label}>Fecha de compra:</Text> {printer.purchaseDate}</Text>
        )}
        {printer.nextMaintenanceDate && (
          <Text style={styles.infoText}><Text style={styles.label}>Próximo mantenimiento:</Text> {printer.nextMaintenanceDate}</Text>
        )}

        <View style={styles.qrContainer}>
          <Text style={styles.qrText}>Escaneá este código para operar la máquina:</Text>
          <View style={styles.qrBox}>
            <QRCode value={printer.qrCodeData} size={150} />
          </View>
        </View>
      </View>

      {/* US-04: acceso a la creación de una orden de mantenimiento */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('CreateOrder', { printer })}
      >
        <Text style={styles.primaryButtonText}>+ Nueva orden de mantenimiento</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('TecnicoHome')}>
        <Text style={styles.secondaryButtonText}>Volver al inicio</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: Colors.background },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.primary, marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: Colors.inputBackground, padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  photo: { width: '100%', height: 200, borderRadius: 10, marginBottom: 16, resizeMode: 'cover' },
  infoText: { fontSize: 16, color: Colors.textPrimary, marginBottom: 8, alignSelf: 'flex-start' },
  label: { fontWeight: 'bold' },
  qrContainer: { marginTop: 24, alignItems: 'center' },
  qrText: { color: Colors.textSecondary, marginBottom: 12, textAlign: 'center' },
  qrBox: { padding: 16, backgroundColor: 'white', borderRadius: 8 },
  primaryButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: Colors.background, fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  secondaryButtonText: { color: Colors.accent, fontSize: 16, fontWeight: '600' },
});
