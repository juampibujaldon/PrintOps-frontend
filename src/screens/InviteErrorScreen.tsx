// src/screens/InviteErrorScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LucideIcon, KeyRound, MailX, TimerOff, UserCheck } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Radius, Shadows, Spacing, Typography, tint } from '../constants/theme';
import Button from '../components/ui/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteError'>;

export type InviteErrorCode = 'INVITE_NOT_FOUND' | 'INVITE_USED' | 'INVITE_EXPIRED' | 'INVITE_WRONG_EMAIL';

interface Content {
  Icon: LucideIcon;
  color: string;
  title: string;
  description: (email?: string) => string;
  steps: string[];
  primary: 'retry' | 'login';
}

// Dónde genera el admin una invitación nueva (HomeScreen → ícono "Invitar técnico").
const NEW_INVITE_STEP = 'Pedile al administrador una invitación nueva: la genera desde Impresoras › ícono "Invitar técnico".';

const CONTENT: Record<InviteErrorCode, Content> = {
  INVITE_NOT_FOUND: {
    Icon: KeyRound,
    color: Colors.statusMantenim,
    title: 'No encontramos ese código',
    description: () => 'El código de invitación no existe. Lo más común es que se haya copiado incompleto.',
    steps: [
      'Copiá el código completo desde el email o mensaje que te mandaron, sin espacios.',
      'Si lo escribiste a mano, revisá letras y números parecidos (0/O, 1/l).',
      NEW_INVITE_STEP,
    ],
    primary: 'retry',
  },
  INVITE_USED: {
    Icon: UserCheck,
    color: Colors.primary,
    title: 'Esta invitación ya se usó',
    description: () => 'Cada código sirve para crear una sola cuenta, y este ya se utilizó.',
    steps: [
      'Si ya te registraste con este código, iniciá sesión con tu email y contraseña.',
      'Si no recordás la contraseña, usá "¿Olvidaste tu contraseña?" en el inicio de sesión.',
      NEW_INVITE_STEP,
    ],
    primary: 'login',
  },
  INVITE_EXPIRED: {
    Icon: TimerOff,
    color: Colors.statusFuera,
    title: 'La invitación venció',
    description: () => 'Las invitaciones son válidas por 7 días y esta ya expiró.',
    steps: [NEW_INVITE_STEP, 'Cuando la recibas, registrate dentro de los 7 días.'],
    primary: 'retry',
  },
  INVITE_WRONG_EMAIL: {
    Icon: MailX,
    color: Colors.statusMantenim,
    title: 'El código es para otro email',
    description: email =>
      `La invitación es personal y fue emitida para otra dirección${email ? `, no para ${email}` : ''}.`,
    steps: [
      'Registrate con el mismo email al que te llegó la invitación.',
      'Si querés usar otra dirección, pedile al administrador que te invite con ese email.',
    ],
    primary: 'retry',
  },
};

export default function InviteErrorScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { code, email, message } = route.params;
  const content = CONTENT[code] ?? CONTENT.INVITE_NOT_FOUND;
  const { Icon } = content;

  const retry = () => navigation.goBack();
  const login = () => navigation.navigate('Login');
  const createWorkshop = () => navigation.navigate('Register', { mode: 'create' });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(350)} style={styles.hero}>
          <View style={[styles.iconRing, { backgroundColor: tint(content.color, 0.08) }]}>
            <View style={[styles.iconCircle, { backgroundColor: tint(content.color, 0.16) }]}>
              <Icon color={content.color} size={40} strokeWidth={1.75} />
            </View>
          </View>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.description}>{content.description(email)}</Text>
          {/* Mensaje del servidor solo si aporta algo distinto al texto propio */}
          {message && !content.description(email).includes(message) ? (
            <Text style={styles.serverMessage}>{message}</Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(350)} style={styles.card}>
          <Text style={styles.cardTitle}>Qué podés hacer</Text>
          {content.steps.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: tint(content.color, 0.14) }]}>
                <Text style={[styles.stepNumberText, { color: content.color }]}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        {content.primary === 'login' ? (
          <>
            <Button title="Iniciar sesión" onPress={login} />
            <Button title="Probar otro código" variant="tinted" onPress={retry} />
          </>
        ) : (
          <>
            <Button title={code === 'INVITE_WRONG_EMAIL' ? 'Cambiar email' : 'Revisar el código'} onPress={retry} />
            <Button title="Ir a iniciar sesión" variant="tinted" onPress={login} />
          </>
        )}
        <Button title="Crear mi propio taller" variant="ghost" onPress={createWorkshop} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xl },

  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center' },
  title: { ...Typography.title2, color: Colors.textPrimary, textAlign: 'center' },
  description: {
    ...Typography.callout,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  serverMessage: { ...Typography.footnote, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.cardLight,
  },
  cardTitle: { ...Typography.headline, color: Colors.textPrimary },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  stepNumber: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { ...Typography.footnote, fontWeight: '700' },
  stepText: { ...Typography.subheadline, color: Colors.textSecondary, flex: 1, lineHeight: 21, paddingTop: 2 },

  actions: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
    backgroundColor: Colors.background,
  },
});
