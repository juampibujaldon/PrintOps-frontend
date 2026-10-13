// src/constants/api.ts
import { Platform } from 'react-native';

// Backend local (Metro en modo debug). El emulador de Android llega al host por 10.0.2.2.
const LOCAL_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8083' : 'http://localhost:8083';

// URL pública del backend en Azure Container Apps (no es un secreto). Se obtiene con:
//   az containerapp show -n printops-backend -g <grupo> --query properties.configuration.ingress.fqdn -o tsv
// y se completa como 'https://<fqdn>'. Vacía: los builds de release también usan el backend local.
const AZURE_API_URL: string = 'https://printops-backend.purplemeadow-6cc5e29a.northcentralus.azurecontainerapps.io';

// Para probar contra Azure desde un build de debug, poner esto en true.
const USE_AZURE_IN_DEBUG = false;

const useAzure = AZURE_API_URL !== '' && (!__DEV__ || USE_AZURE_IN_DEBUG);

export const API_BASE_URL = useAzure ? AZURE_API_URL : LOCAL_API_URL;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@printops/access_token',
  REFRESH_TOKEN: '@printops/refresh_token',
  DEVICE_ID: '@printops/device_id',
  USER: '@printops/user',
} as const;
