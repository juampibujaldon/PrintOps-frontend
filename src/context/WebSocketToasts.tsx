// Puente WebSocket -> ToastContext: muestra un toast por cada notificación entrante.
import { useEffect } from 'react';
import { webSocketService } from '../services/webSocketService';
import { useToast } from './ToastContext';

export default function WebSocketToasts() {
  const { showToast } = useToast();
  useEffect(
    () =>
      webSocketService.subscribe((msg) => {
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
