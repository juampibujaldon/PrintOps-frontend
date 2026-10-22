// src/screens/ScanPrinterScreen.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { CameraOff, RefreshCw } from 'lucide-react';
import { printerService } from '../services/printerService';
import { parsePrinterQrPayload } from '../utils/qr';
import { useToast } from '../context/ToastContext';
import { useAlert } from '../context/ConfirmContext';
import { Button, ScreenHeader, Spinner, TextField } from '../components/ui';
import styles from './ScanPrinterScreen.module.css';

type CameraState = 'starting' | 'scanning' | 'denied' | 'no-camera' | 'insecure' | 'error';

const CAMERA_MESSAGES: Record<Exclude<CameraState, 'starting' | 'scanning'>, string> = {
  denied: 'Sin permiso de cámara. Habilitalo en el navegador o ingresá el número de serie manualmente.',
  'no-camera': 'No se encontró cámara en este dispositivo.',
  insecure: 'La cámara solo funciona en conexiones seguras (HTTPS). Ingresá el número de serie manualmente.',
  error: 'No se pudo iniciar la cámara.',
};

const SCAN_INTERVAL_MS = 150;
const MAX_SCAN_WIDTH = 640;

export default function ScanPrinterScreen() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const alert = useAlert();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  const [cameraState, setCameraState] = useState<CameraState>('starting');
  const [attempt, setAttempt] = useState(0);
  const [lookingUp, setLookingUp] = useState(false);
  const [manualSerial, setManualSerial] = useState('');

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  const lookupSerial = useCallback(
    async (serial: string) => {
      busyRef.current = true;
      setLookingUp(true);
      try {
        const printer = await printerService.getBySerialNumber(serial);
        stopCamera();
        navigate(`/printers/${printer.id}`, { replace: true, state: { printer } });
      } catch (e) {
        const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        showToast(message || 'No se encontró la impresora para ese código.', { type: 'error', title: 'No encontrada' });
        busyRef.current = false;
        if (mountedRef.current) setLookingUp(false);
      }
    },
    [navigate, showToast, stopCamera],
  );

  const handleScanned = useCallback(
    async (raw: string) => {
      busyRef.current = true;
      const serial = parsePrinterQrPayload(raw);
      if (!serial) {
        await alert({ title: 'QR no válido', message: 'Este código no corresponde a una impresora de PrintOps.', okLabel: 'OK' });
        busyRef.current = false;
        return;
      }
      await lookupSerial(serial);
    },
    [alert, lookupSerial],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Inicia la cámara trasera y escanea frames del <video> con jsQR.
  useEffect(() => {
    let cancelled = false;
    setCameraState('starting');

    const start = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setCameraState(window.isSecureContext ? 'no-camera' : 'insecure');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        if (cancelled) return;
        setCameraState('scanning');

        let last = 0;
        const tick = (now: number) => {
          if (cancelled) return;
          rafRef.current = requestAnimationFrame(tick);
          if (busyRef.current || now - last < SCAN_INTERVAL_MS) return;
          last = now;
          const v = videoRef.current;
          const canvas = canvasRef.current;
          if (!v || !canvas || v.readyState < 2 || !v.videoWidth) return;
          const scale = Math.min(1, MAX_SCAN_WIDTH / v.videoWidth);
          const w = Math.round(v.videoWidth * scale);
          const h = Math.round(v.videoHeight * scale);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(v, 0, 0, w, h);
          const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (code?.data) void handleScanned(code.data);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (cancelled) return;
        const name = (e as { name?: string })?.name;
        if (name === 'NotAllowedError' || name === 'SecurityError') setCameraState('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError')
          setCameraState('no-camera');
        else setCameraState('error');
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [attempt, handleScanned, stopCamera]);

  const onManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    const serial = parsePrinterQrPayload(manualSerial);
    if (!serial) {
      showToast('Ingresá el número de serie de la impresora.', { type: 'error' });
      return;
    }
    void lookupSerial(serial);
  };

  const cameraFailed = cameraState !== 'starting' && cameraState !== 'scanning';

  return (
    <>
      <ScreenHeader title="Escanear QR" subtitle="Apuntá al QR pegado en la impresora" backTo="/printers" />

      <div className={styles.layout}>
        <section className={styles.cameraSection} aria-label="Cámara">
          {cameraFailed ? (
            <div className={styles.cameraError} role="alert">
              <CameraOff size={36} strokeWidth={1.5} aria-hidden="true" />
              <p>{CAMERA_MESSAGES[cameraState]}</p>
              {cameraState !== 'insecure' ? (
                <Button
                  title="Reintentar"
                  variant="tinted"
                  fullWidth={false}
                  size="sm"
                  icon={<RefreshCw size={16} />}
                  onPress={() => setAttempt((n) => n + 1)}
                />
              ) : null}
            </div>
          ) : null}
          <div className={styles.viewport} hidden={cameraFailed}>
            <video ref={videoRef} className={styles.video} playsInline muted aria-label="Vista de la cámara" />
            <div className={styles.viewfinder} aria-hidden="true" />
            {cameraState === 'starting' ? (
              <div className={styles.starting}>
                <Spinner size={28} label="Iniciando cámara" />
              </div>
            ) : null}
            {lookingUp ? (
              <div className={styles.starting}>
                <Spinner size={28} label="Buscando impresora" />
              </div>
            ) : null}
          </div>
          <canvas ref={canvasRef} className={styles.hiddenCanvas} aria-hidden="true" />
        </section>

        <section className={styles.manualSection} aria-label="Entrada manual">
          <h2 className={styles.manualTitle}>¿No podés escanear?</h2>
          <p className={styles.manualHint}>Ingresá el número de serie de la impresora.</p>
          <form className={styles.manualForm} onSubmit={onManualSubmit}>
            <TextField
              label="Número de serie"
              placeholder="Número de serie"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              value={manualSerial}
              onChangeText={setManualSerial}
            />
            <Button title="Buscar impresora" type="submit" loading={lookingUp} disabled={!manualSerial.trim()} />
          </form>
        </section>
      </div>
    </>
  );
}
