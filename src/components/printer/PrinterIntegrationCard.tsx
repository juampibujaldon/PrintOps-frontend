import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Plug, RefreshCw, Unplug } from 'lucide-react';
import { Button, SettingsSection } from '../ui';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../services/authService';
import { integrationService } from '../../services/integrationService';
import type { Integration, IntegrationType } from '../../api/types';
import styles from './PrinterIntegration.module.css';

const TYPES: Array<{ value: IntegrationType; label: string; hint: string }> = [
  { value: 'OCTOPRINT', label: 'OctoPrint', hint: 'URL de OctoPrint y su API key' },
  { value: 'MOONRAKER', label: 'Klipper (Moonraker)', hint: 'URL de Moonraker, p. ej. http://192.168.0.21:7125' },
  { value: 'BAMBU', label: 'Bambu Lab', hint: 'IP, número de serie y código de acceso LAN' },
];

// Vincula la impresora con el agente local (agent/ en el repo del backend): genera el token
// del dispositivo (se ve una sola vez) y muestra si el agente está reportando.
export default function PrinterIntegrationCard({ printerId, printerName }: { printerId: number; printerName: string }) {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [integration, setIntegration] = useState<Integration | null | undefined>(undefined);
  const [type, setType] = useState<IntegrationType>('OCTOPRINT');
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    integrationService
      .get(printerId)
      .then((i) => {
        setIntegration(i);
        if (i) setType(i.type as IntegrationType);
      })
      .catch(() => setIntegration(null));
  }, [printerId]);

  const generate = async () => {
    if (integration) {
      const ok = await confirm({
        title: 'Generar un token nuevo',
        message: 'El token actual deja de funcionar: vas a tener que actualizar la configuración del agente.',
        confirmLabel: 'Generar',
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const created = await integrationService.createOrRotate(printerId, type);
      setIntegration(created);
      setToken(created.token);
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo generar el token.'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    const ok = await confirm({
      title: 'Desvincular impresora',
      message: 'El agente deja de poder enviar datos de esta impresora.',
      confirmLabel: 'Desvincular',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await integrationService.remove(printerId);
      setIntegration(null);
      setToken(null);
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo desvincular.'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const snippet = token
    ? JSON.stringify(
        {
          name: printerName,
          type: type.toLowerCase(),
          token,
          ...(type === 'BAMBU'
            ? { host: '192.168.0.X', serial: 'NUMERO_DE_SERIE', accessCode: 'CODIGO_LAN' }
            : { url: type === 'MOONRAKER' ? 'http://192.168.0.X:7125' : 'http://192.168.0.X', ...(type === 'OCTOPRINT' ? { apiKey: 'API_KEY' } : {}) }),
        },
        null,
        2,
      )
    : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el usuario puede seleccionar el texto a mano */
    }
  };

  if (integration === undefined) return null;

  return (
    <SettingsSection
      title="Integración"
      footer="El agente local corre en una PC o Raspberry Pi del taller y envía estado, progreso y horas reales."
    >
      <div className={styles.integration}>
        {integration ? (
          <p className={styles.status} data-online={integration.online}>
            <span className={styles.dot} aria-hidden="true" />
            {integration.online ? 'Agente conectado' : integration.lastSeenAt ? 'Agente sin reportar' : 'Esperando al agente'}
            {integration.lastSeenAt ? ` · último dato ${new Date(integration.lastSeenAt).toLocaleString('es-AR')}` : ''}
            <span className={styles.hintInline}>Token {integration.tokenHint}</span>
          </p>
        ) : (
          <p className={styles.hint}>Conectá la impresora para ver su estado en vivo y registrar horas y gramos reales automáticamente.</p>
        )}

        <label className={styles.select}>
          <span>Tipo</span>
          <select value={type} onChange={(e) => setType(e.target.value as IntegrationType)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <p className={styles.hint}>{TYPES.find((t) => t.value === type)?.hint}</p>

        {token && (
          <div className={styles.tokenBox}>
            <p className={styles.tokenWarn}>
              <KeyRound size={15} aria-hidden="true" /> Copiá esta configuración ahora: el token no se vuelve a mostrar.
            </p>
            <pre className={styles.snippet}>{snippet}</pre>
            <Button title={copied ? 'Copiado' : 'Copiar configuración'} size="sm" variant="secondary" fullWidth={false}
              icon={copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} onPress={() => void copy()} />
          </div>
        )}

        <div className={styles.buttons}>
          <Button
            title={integration ? 'Generar token nuevo' : 'Vincular y generar token'}
            size="sm"
            fullWidth={false}
            variant={integration ? 'secondary' : 'primary'}
            icon={integration ? <RefreshCw size={15} aria-hidden="true" /> : <Plug size={15} aria-hidden="true" />}
            loading={busy}
            onPress={() => void generate()}
          />
          {integration && (
            <Button title="Desvincular" size="sm" variant="ghost" fullWidth={false} icon={<Unplug size={15} aria-hidden="true" />} onPress={() => void unlink()} />
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
