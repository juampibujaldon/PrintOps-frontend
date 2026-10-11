import React, { useContext } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderShownContext } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { Colors, Icons, Spacing, Typography } from '../../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

// Encabezado con título grande (Large Title de iOS).
//
// Si la pantalla NO tiene header nativo (headerShown: false), este componente
// es lo primero que se dibuja bajo la barra de estado: aplica el inset superior
// (notch / Dynamic Island) y muestra una barra de 44pt con menú o volver a la
// izquierda y las acciones a la derecha, con el título grande debajo.
// Con header nativo visible no agrega inset (ya lo resuelve el header).
export default function ScreenHeader({ title, subtitle, showBack = false, rightContent }: Props) {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const nativeHeaderShown = useContext(HeaderShownContext);

  const navType = nav.getState?.()?.type;
  const showMenu = !nativeHeaderShown && !showBack && navType === 'drawer';
  const showBackBtn = showBack || (!nativeHeaderShown && navType === 'stack' && nav.canGoBack());
  const hasTopBar = !nativeHeaderShown && (showMenu || showBackBtn || !!rightContent);

  const leading = showBackBtn ? (
    <Pressable
      style={({ pressed }) => [styles.iconBtn, styles.backBtn, pressed && styles.pressed]}
      onPress={() => nav.goBack()}
      accessibilityRole="button"
      accessibilityLabel="Volver"
      hitSlop={8}
    >
      <ChevronLeft color={Colors.primary} size={28} strokeWidth={2} />
    </Pressable>
  ) : showMenu ? (
    <Pressable
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      onPress={() => nav.toggleDrawer()}
      accessibilityRole="button"
      accessibilityLabel="Abrir menú"
      hitSlop={8}
    >
      <Menu color={Colors.primary} size={22} strokeWidth={Icons.strokeWidth} />
    </Pressable>
  ) : null;

  return (
    <View style={[styles.container, { paddingTop: nativeHeaderShown ? Spacing.sm : insets.top }]}>
      {hasTopBar && (
        <View style={styles.topBar}>
          <View style={styles.topBarSide}>{leading}</View>
          <View style={[styles.topBarSide, styles.topBarRight]}>{rightContent}</View>
        </View>
      )}
      <View style={styles.titleRow}>
        {!hasTopBar && leading}
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {!hasTopBar && rightContent ? <View style={styles.right}>{rightContent}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.background },
  topBar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarSide: { flexDirection: 'row', alignItems: 'center', minWidth: 44 },
  topBarRight: { justifyContent: 'flex-end' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  titleBlock: { flex: 1 },
  iconBtn: { height: 44, minWidth: 32, justifyContent: 'center' },
  backBtn: { marginLeft: -Spacing.sm },
  pressed: { opacity: 0.4 },
  title: { ...Typography.display, color: Colors.textPrimary },
  subtitle: { ...Typography.subheadline, color: Colors.textSecondary, marginTop: 2 },
  right: { marginLeft: Spacing.sm },
});
