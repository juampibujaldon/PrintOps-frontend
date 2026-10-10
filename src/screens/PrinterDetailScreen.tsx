// src/screens/PrinterDetailScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeIn } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { History, Printer, Wrench } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { PRINTER_STATUS } from '../constants/printers';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { useAuth } from '../hooks/useAuth';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SettingsSection from '../components/ui/SettingsSection';
import SettingsRow from '../components/ui/SettingsRow';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'PrinterDetail'>;

export default function PrinterDetailScreen({ route, navigation }: Props) {
  const { printer } = route.params;
  const { user } = useAuth();
  const isTecnico = user?.role === 'TECNICO';
  const status = PRINTER_STATUS[printer.status];

  const info: { label: string; value: string | null | undefined }[] = [
    { label: 'Marca', value: printer.brand },
    { label: 'Modelo', value: printer.model },
    { label: 'N° de serie', value: printer.serialNumber },
    { label: 'Ubicación', value: printer.location },
    { label: 'Fecha de compra', value: printer.purchaseDate },
    { label: 'Próximo mantenimiento', value: printer.nextMaintenanceDate },
  ];
  const rows = info.filter(r => !!r.value);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.hero}>
        {printer.photoUrl ? (
          <Image source={{ uri: printer.photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Printer color={Colors.textTertiary} size={40} strokeWidth={1.5} />
          </View>
        )}
        <Text style={styles.title} numberOfLines={2}>{printer.name || printer.model}</Text>
        <Badge label={status.label} color={status.color} pulse={printer.status === 'OPERATIVE'} />
      </Animated.View>

      {isTecnico && (
        <Button
          title="Nueva orden de mantenimiento"
          onPress={() => navigation.navigate('CreateOrder', { printer })}
          style={styles.primaryAction}
        />
      )}

      <SettingsSection title="Información">
        {rows.map((r, i) => (
          <InfoRow key={r.label} label={r.label} value={r.value!} isLast={i === rows.length - 1} />
        ))}
      </SettingsSection>

      <SettingsSection title="Mantenimiento">
        <SettingsRow
          label="Reglas de mantenimiento"
          icon={<Wrench color={Colors.primary} size={20} strokeWidth={1.75} />}
          onPress={() => navigation.navigate('PrinterRules', { printer })}
        />
        <SettingsRow
          label="Historial"
          icon={<History color={Colors.primary} size={20} strokeWidth={1.75} />}
          onPress={() => navigation.navigate('PrinterHistory', { printer })}
          isLast
        />
      </SettingsSection>

      <SettingsSection title="Código QR" footer="Escaneá este código desde la app para abrir esta impresora.">
        <View style={styles.qrBox}>
          <QRCode value={printer.qrCodeData} size={160} backgroundColor="#FFFFFF" color="#1C1C1E" />
        </View>
      </SettingsSection>
    </ScrollView>
  );
}

function InfoRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoInner, !isLast && styles.separator]}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: Radius.xl,
    marginBottom: Spacing.sm,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: Radius.xl,
    backgroundColor: Colors.fill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.title2,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  primaryAction: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  infoRow: { paddingLeft: Spacing.lg },
  infoInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 46,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.lg,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  infoLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  qrBox: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: '#FFFFFF',
  },
});
