// src/screens/PrinterDetailScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { PRINTER_STATUS } from '../constants/printers';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'PrinterDetail'>;

export default function PrinterDetailScreen({ route, navigation }: Props) {
  const { printer } = route.params;
  const { user } = useAuth();
  const isTecnico = user?.role === 'TECNICO';
  const status = PRINTER_STATUS[printer.status];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Impresora</Text>

      <Card style={styles.card}>
        {printer.photoUrl && (
          <Image source={{ uri: printer.photoUrl }} style={styles.photo} />
        )}
        <Badge label={status.label} color={status.color} pulse={printer.status === 'OPERATIVE'} />
        {printer.name && <InfoRow label="Nombre" value={printer.name} />}
        <InfoRow label="Marca" value={printer.brand} />
        <InfoRow label="Modelo" value={printer.model} />
        <InfoRow label="N° Serie" value={printer.serialNumber} />
        {printer.location && <InfoRow label="Ubicación" value={printer.location} />}
        {printer.purchaseDate && <InfoRow label="Fecha de compra" value={printer.purchaseDate} />}
        {printer.nextMaintenanceDate && <InfoRow label="Próximo mantenimiento" value={printer.nextMaintenanceDate} />}

        <View style={styles.qrContainer}>
          <Text style={styles.qrText}>Escaneá este código para operar la máquina:</Text>
          <View style={styles.qrBox}>
            <QRCode value={printer.qrCodeData} size={150} />
          </View>
        </View>
      </Card>

      {isTecnico && (
        <Button
          title="+ Nueva orden de mantenimiento"
          onPress={() => navigation.navigate('CreateOrder', { printer })}
        />
      )}

      <Button
        variant="ghost"
        title="Volver al inicio"
        onPress={() => navigation.navigate('TecnicoHome')}
        style={styles.secondary}
      />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  title: {
    ...Typography.title2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  card: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    resizeMode: 'cover',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: 2,
  },
  infoLabel: {
    ...Typography.footnote,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  infoValue: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  qrContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  qrText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  qrBox: {
    padding: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: Radius.sm,
  },
  secondary: {
    marginTop: Spacing.sm,
  },
});
