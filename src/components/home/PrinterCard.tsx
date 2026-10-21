// src/components/home/PrinterCard.tsx
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { PrinterResponse } from '../../services/printerService';
import { PRINTER_STATUS, getMaintenanceBadge } from '../../constants/printers';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import PressableScale from '../ui/PressableScale';
import { ChevronRight, MapPin, Printer } from 'lucide-react-native';

type Props = {
  printer: PrinterResponse;
  index: number;
  onPress: (printer: PrinterResponse) => void;
};

function PrinterCard({ printer, index, onPress }: Props) {
  const translateY = useRef(new Animated.Value(12)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  // La entrada escalonada depende del índice que tenía la tarjeta al montarse.
  const entranceDelay = useRef(Math.min(index, 8) * 50).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 420, delay: entranceDelay, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: entranceDelay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [entranceDelay, translateY, opacity]);

  const handlePress = useCallback(() => onPress(printer), [onPress, printer]);

  const status = PRINTER_STATUS[printer.status];
  const maintenanceBadge = getMaintenanceBadge(printer.nextMaintenanceDate);

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      <PressableScale onPress={handlePress}>
        <Card padded={false} style={styles.card}>
          <View style={styles.thumbnailWrapper}>
            {printer.photoUrl ? (
              <Image source={{ uri: printer.photoUrl }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Printer color={Colors.textTertiary} size={26} strokeWidth={1.5} />
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
              {printer.serialNumber}
            </Text>
            {!!printer.location && (
              <View style={styles.locationRow}>
                <MapPin color={Colors.textTertiary} size={12} />
                <Text style={styles.cardLocation} numberOfLines={1}>{printer.location}</Text>
              </View>
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
          <ChevronRight color={Colors.textTertiary} size={18} style={styles.chevron} />
        </Card>
      </PressableScale>
    </Animated.View>
  );
}

export default memo(PrinterCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  thumbnailWrapper: {
    margin: Spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.fill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.sm,
    gap: 2,
  },
  cardModel: {
    ...Typography.headline,
    color: Colors.textPrimary,
  },
  cardBrand: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
  cardSerial: {
    ...Typography.footnote,
    ...Typography.tabular,
    color: Colors.textTertiary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardLocation: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  cardMaintenance: {
    ...Typography.footnote,
    color: Colors.textSecondary,
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  chevron: {
    marginRight: Spacing.md,
  },
});
