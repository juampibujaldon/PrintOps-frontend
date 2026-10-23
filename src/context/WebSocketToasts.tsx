// Puente WebSocket -> ToastContext: muestra un toast por cada notificación entrante. Los
// mensajes de datos en vivo (telemetría, cola de trabajos) traen otro "type" y no avisan.
import { useEffect } from 'react';
import { webSocketService } from '../services/webSocketService';
import { useToast } from './ToastContext';

export default function WebSocketToasts() {
  const { showToast } = useToast();
  useEffect(
    () =>
      webSocketService.subscribe((msg) => {
        if (msg.type && msg.type !== 'notification') return;
        showToast(msg.body || 'Tenés un nuevo mensaje.', {
          title: msg.title || 'Nueva notificación',
          type: 'info',
          durationMs: 4000,
        });
      }),
    [showToast],
  );
  return null;
}
