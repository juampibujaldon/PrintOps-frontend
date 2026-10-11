import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LucideIcon } from 'lucide-react-native';
import { Colors, Icons, Radius, Shadows, Spacing, Typography, tint } from '../../constants/theme';
import Button from '../ui/Button';

// Ítem de lista: texto simple o con una etiqueta en negrita ("Cámara: …").
export type LegalBullet = string | { label: string; text: string };

// Una sección se renderiza en orden: párrafos, lista y párrafos de cierre.
export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: LegalBullet[];
  closing?: string[];
}

interface Props {
  icon: LucideIcon;
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
  actionLabel?: string;
  onAction: () => void;
}

// Layout compartido de las pantallas legales: encabezado, secciones numeradas
// y una barra inferior fija con el botón de aceptar/volver.
export default function LegalDocument({
  icon: Icon,
  title,
  lastUpdated,
  intro,
  sections,
  actionLabel = 'Entendido',
  onAction,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator>
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <View style={styles.iconBadge}>
            <Icon color={Colors.primary} size={28} strokeWidth={Icons.strokeWidth} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.updated}>Última actualización: {lastUpdated}</Text>
        </Animated.View>

        {intro ? (
          <View style={styles.card}>
            <Text style={styles.intro}>{intro}</Text>
          </View>
        ) : null}

        {sections.map((section, i) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>{i + 1}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.paragraphs?.map((p, j) => (
              <Text key={`p${j}`} style={styles.paragraph}>{p}</Text>
            ))}
            {section.bullets && (
              <View style={styles.bulletList}>
                {section.bullets.map((b, j) => (
                  <View key={`b${j}`} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>
                      {typeof b === 'string' ? b : (
                        <>
                          <Text style={styles.bulletLabel}>{b.label}: </Text>
                          {b.text}
                        </>
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {section.closing?.map((p, j) => (
              <Text key={`c${j}`} style={styles.paragraph}>{p}</Text>
            ))}
          </View>
        ))}

        <Text style={styles.footerNote}>
          Si tiene dudas sobre este documento, consulte con el administrador de su taller.
        </Text>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Button title={actionLabel} onPress={onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },

  header: { alignItems: 'center', marginBottom: Spacing.xl },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    backgroundColor: tint(Colors.primary, 0.12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.title2, color: Colors.textPrimary, textAlign: 'center' },
  updated: { ...Typography.footnote, color: Colors.textTertiary, marginTop: Spacing.xs },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.cardLight,
  },
  intro: { ...Typography.callout, color: Colors.textSecondary, lineHeight: 24 },

  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionNumber: {
    ...Typography.footnote,
    ...Typography.tabular,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primaryTint,
    width: 24,
    height: 24,
    lineHeight: 24,
    textAlign: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: { ...Typography.headline, color: Colors.textPrimary, flex: 1 },
  // Línea ~1.6x y ancho acotado por el padding: lectura cómoda en textos largos.
  paragraph: { ...Typography.callout, color: Colors.textSecondary, lineHeight: 25, marginBottom: Spacing.sm },

  bulletList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: 6 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 9 },
  bulletText: { ...Typography.callout, color: Colors.textSecondary, lineHeight: 24, flex: 1 },
  bulletLabel: { fontWeight: '600', color: Colors.textPrimary },

  footerNote: { ...Typography.footnote, color: Colors.textTertiary, textAlign: 'center', lineHeight: 18 },

  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
});
