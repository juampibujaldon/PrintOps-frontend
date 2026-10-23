import { Client } from '@stomp/stompjs';
import { wsUrl } from '../constants/api';
import { refreshAccessToken } from './axiosInstance';
import { getAccessToken } from './storage';

const isDev = import.meta.env.DEV && import.meta.env.MODE !== 'test';

export interface WsNotification {
  title?: string;
  body?: string;
  [key: string]: unknown;
}

type Listener = (msg: WsNotification) => void;

// Mismo host que la página (nginx/Vite hacen proxy de /ws al backend).

// Segundos que le quedan al JWT (null si no se puede leer). Margen para no
// conectar con un token que vence en el medio del handshake.
function secondsToExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')));
    return typeof exp === 'number' ? exp - Date.now() / 1000 : null;
  } catch {
    return null;
  }
}

class WebSocketService {
  private client: Client | null = null;
  private onMessageCallback: Listener | null = null;
  private listeners = new Set<Listener>();
  // El servidor rechazó el token (vencido/revocado): refrescar antes de reintentar.
  private forceRefresh = false;
  // Rechazos seguidos aun después de refrescar: la sesión no es recuperable.
  private authFailures = 0;

  connect(userId: number) {
    // Evita clientes duplicados si se llama a connect() más de una vez.
    this.disconnect();
    this.forceRefresh = false;
    this.authFailures = 0;

    const client = new Client({
      brokerURL: wsUrl(),
      reconnectDelay: 5000,
      // El backend autentica el frame CONNECT con el JWT. Antes se reconectaba cada
      // 5 s con el access token guardado aunque hubiera vencido (dura 15 min y solo
      // se renovaba si alguna request HTTP daba 401): el error se repetía para siempre.
      beforeConnect: async () => {
        let token = getAccessToken();
        const remaining = token ? secondsToExpiry(token) : null;
        if (!token || this.forceRefresh || (remaining != null && remaining < 30)) {
          try {
            token = await refreshAccessToken();
            this.forceRefresh = false;
          } catch {
            // Sesión vencida o sin red: no seguir reintentando con un token inválido.
            // Al volver a iniciar sesión, AuthContext vuelve a llamar a connect().
            if (isDev) {
              console.warn('[WS] No se pudo renovar el token; WebSocket desconectado.');
            }
            this.disconnect();
            return;
          }
        }
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      onConnect: () => {
        this.authFailures = 0;
        client.subscribe(`/queue/user-${userId}`, message => {
          if (!message.body) {
            return;
          }
          let parsed: WsNotification;
          try {
            parsed = JSON.parse(message.body);
          } catch {
            return;
          }

          // Los listeners (p. ej. el puente a ToastContext) muestran el aviso.
          this.listeners.forEach(l => l(parsed));
          this.onMessageCallback?.(parsed);
        });
      },
      onStompError: frame => {
        const message = frame.headers.message ?? '';
        if (/token|autentic/i.test(message)) {
          // Token rechazado: el próximo intento refresca primero. Si sigue fallando
          // tras refrescar, se corta para no reintentar cada 5 s indefinidamente.
          this.authFailures += 1;
          this.forceRefresh = true;
          if (this.authFailures >= 3) {
            if (isDev) {
              console.warn('[WS] Token rechazado repetidamente; WebSocket desconectado.');
            }
            this.disconnect();
            return;
          }
        }
        if (isDev) {
          console.warn('[WS] Error STOMP:', message);
        }
      },
      onWebSocketError: event => {
        if (isDev) {
          console.warn('[WS] Error de conexión:', event);
        }
      },
    });

    this.client = client;
    client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  /** Un único callback "principal" (lo usa la pantalla de notificaciones). Devuelve cómo quitarlo. */
  onMessage(callback: Listener | null): () => void {
    this.onMessageCallback = callback;
    return () => {
      if (this.onMessageCallback === callback) this.onMessageCallback = null;
    };
  }

  /** Suscripción múltiple a notificaciones entrantes. Devuelve la función para cancelar. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const webSocketService = new WebSocketService();
