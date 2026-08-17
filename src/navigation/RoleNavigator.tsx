// src/navigation/RoleNavigator.tsx
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import TecnicoDrawer from './TecnicoDrawer';
import { authService } from '../services/authService';

// MANAGER y TECNICO comparten la navegación: la diferencia de permisos se
// resuelve dentro de cada pantalla según el rol (ej. aprobar órdenes).
export default function RoleNavigator() {
  useEffect(() => {
    checkAndPromptBiometrics();
  }, []);

  const checkAndPromptBiometrics = async () => {
    try {
      const biometricsEnabled = await AsyncStorage.getItem('BIOMETRICS_ENABLED');
      if (biometricsEnabled === null) {
        const rnBiometrics = new ReactNativeBiometrics();
        const { available } = await rnBiometrics.isSensorAvailable();
        if (available) {
          Alert.alert(
            'Activar Biometría',
            '¿Deseas habilitar el inicio de sesión automático con Face ID / Touch ID para futuras ocasiones?',
            [
              { text: 'No, gracias', onPress: () => AsyncStorage.setItem('BIOMETRICS_ENABLED', 'false'), style: 'cancel' },
              { text: 'Sí, activar', onPress: async () => {
                  await authService.enableBiometrics();
                }
              }
            ]
          );
        } else {
          // Si no está disponible, marcamos como false para no volver a consultar
          await AsyncStorage.setItem('BIOMETRICS_ENABLED', 'false');
        }
      }
    } catch (e) {
      console.log('Error checking biometrics on RoleNavigator', e);
    }
  };

  return <TecnicoDrawer />;
}
