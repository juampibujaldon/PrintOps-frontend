// src/screens/InviteErrorScreen.tsx
// Recibe { code, email?, message? } por location.state; sin eso vuelve a /login.
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, MailX, TimerOff, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Colors, tint } from '../constants/theme';
import { Button } from '../components/ui';
import type { InviteErrorCode, InviteErrorState } from '../types/auth';
import styles from './InviteErrorScreen.module.css';

export type { InviteErrorCode };

interface Content {
  Icon: LucideIcon;
  color: string;
  title: string;
  description: (email?: string) => string;
  steps: string[];
  primary: 'retry' | 'login';
}

// Dónde genera el admin una invitación nueva (Impresoras → ícono "Invitar técnico").
const NEW_INVITE_STEP =
  'Pedile al administrador una invitación nueva: la genera desde Impresoras › ícono "Invitar técnico".';

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
    description: (email) =>
      `La invitación es personal y fue emitida para otra dirección${email ? `, no para ${email}` : ''}.`,
    steps: [
      'Registrate con el mismo email al que te llegó la invitación.',
      'Si querés usar otra dirección, pedile al administrador que te invite con ese email.',
    ],
    primary: 'retry',
  },
};

export default function InviteErrorScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = location.state as InviteErrorState | null;
  if (!params?.code) return <Navigate to="/login" replace />;

  const { code, email, message } = params;
  const content = CONTENT[code] ?? CONTENT.INVITE_NOT_FOUND;
  const { Icon } = content;
  const description = content.description(email);

  // Volver a revisar el código = regresar al formulario anterior (registro / onboarding).
  const retry = () => (location.key === 'default' ? navigate('/register') : navigate(-1));
  const login = () => navigate('/login');
  const createWorkshop = () => navigate('/register', { state: { mode: 'create' } });

  return (
    <main className={styles.root}>
      <div className={styles.column}>
        <section className={styles.hero}>
          <div className={styles.iconRing} style={{ backgroundColor: tint(content.color, 0.08) }}>
            <div className={styles.iconCircle} style={{ backgroundColor: tint(content.color, 0.16) }}>
              <Icon color={content.color} size={40} strokeWidth={1.75} aria-hidden="true" />
            </div>
          </div>
          <h1 className={styles.title}>{content.title}</h1>
          <p className={styles.description}>{description}</p>
          {/* Mensaje del servidor solo si aporta algo distinto al texto propio */}
          {message && !description.includes(message) ? <p className={styles.serverMessage}>{message}</p> : null}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Qué podés hacer</h2>
          <ol className={styles.steps}>
            {content.steps.map((step, i) => (
              <li key={i} className={styles.step}>
                <span className={styles.stepNumber} style={{ backgroundColor: tint(content.color, 0.14), color: content.color }}>
                  {i + 1}
                </span>
                <span className={styles.stepText}>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className={styles.actions}>
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
        </div>
      </div>
    </main>
  );
}
