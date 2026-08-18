// src/components/home/PrinterCard.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { PrinterResponse } from '../../services/printerService';
import { PRINTER_STATUS, getMaintenanceBadge } from '../../constants/printers';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import PressableScale from '../ui/PressableScale';

type Props = {
  printer: PrinterResponse;
  index: number;
  onPress: () => void;
};

export default function PrinterCard({ printer, index, onPress }: Props) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, [index, translateY, opacity]);

  const status = PRINTER_STATUS[printer.status];
  const maintenanceBadge = getMaintenanceBadge(printer.nextMaintenanceDate);

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      <PressableScale onPress={onPress}>
        <Card padded={false} style={styles.card}>
          <View style={[styles.accentBar, { backgroundColor: status.color }]} />
          <View style={styles.thumbnailWrapper}>
            {printer.photoUrl ? (
              <Image source={{ uri: printer.photoUrl }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.printerIcon}>🖨️</Text>
              </View>
            )}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardModel} numberOfLines={1}>
              {printer.name || printer.model}
            </Text>
            <Text style={styles.cardBrand} numberOfLines={1}>
              {printer.brand}
            </Text>
            <Text style={styles.cardSerial} numberOfLines={1}>
              S/N: {printer.serialNumber}
            </Text>
            {!!printer.location && (
              <Text style={styles.cardLocation} numberOfLines={1}>
                📍 {printer.location}
              </Text>
            )}
            {!!printer.nextMaintenanceDate && (
              <Text style={styles.cardMaintenance} numberOfLines={1}>
                Mantenimiento: {printer.nextMaintenanceDate}
              </Text>
            )}
            <View style={styles.cardBadges}>
              <Badge label={status.label} color={status.color} pulse={printer.status === 'OPERATIVE'} />
              {maintenanceBadge && <Badge label={maintenanceBadge.label} color={maintenanceBadge.color} />}
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Card>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  thumbnailWrapper: {
    margin: Spacing.md,
    marginLeft: 12,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
  },
  thumbnailPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.separator,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerIcon: {
    fontSize: 30,
  },
  cardInfo: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.sm,
    gap: 3,
  },
  cardModel: {
    ...Typography.headline,
    color: Colors.textPrimary,
  },
  cardBrand: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  cardSerial: {
    ...Typography.caption2,
    color: Colors.textSecondary,
    fontFamily: 'Courier New',
  },
  cardLocation: {
    ...Typography.caption2,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardMaintenance: {
    ...Typography.caption2,
    color: Colors.textSecondary,
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  chevron: {
    fontSize: 22,
    color: Colors.separator,
    marginRight: 14,
    fontWeight: '300',
  },
});
