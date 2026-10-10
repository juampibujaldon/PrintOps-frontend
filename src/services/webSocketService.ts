import { Client } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Polyfill de TextEncoder: React Native no siempre lo trae.
import 'text-encoding';
import Toast from 'react-native-toast-message';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/api';

// Mismo host que la API (10.0.2.2 en el emulador Android, localhost en iOS).
const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws`;

class WebSocketService {
  private client: Client | null = null;
  private onMessageCallback: ((msg: any) => void) | null = null;

  connect(userId: number) {
    // Evita clientes duplicados si se llama a connect() más de una vez.
    this.disconnect();

    const client = new Client({
      brokerURL: WS_URL,
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      reconnectDelay: 5000,
      // El backend autentica el frame CONNECT con el JWT. Se lee en cada
      // (re)conexión para usar siempre el access token más reciente.
      beforeConnect: async () => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      onConnect: () => {
        client.subscribe(`/queue/user-${userId}`, message => {
          if (!message.body) {
            return;
          }
          let parsed: any;
          try {
            parsed = JSON.parse(message.body);
          } catch {
            return;
          }

          Toast.show({
            type: 'info',
            text1: parsed.title || 'Nueva notificación',
            text2: parsed.body || 'Tenés un nuevo mensaje.',
            position: 'top',
            visibilityTime: 4000,
          });

          this.onMessageCallback?.(parsed);
        });
      },
      onStompError: frame => {
        if (__DEV__) {
          console.warn('[WS] Error STOMP:', frame.headers.message);
        }
      },
      onWebSocketError: event => {
        if (__DEV__) {
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

  onMessage(callback: (msg: any) => void) {
    this.onMessageCallback = callback;
  }
}

export const webSocketService = new WebSocketService();
