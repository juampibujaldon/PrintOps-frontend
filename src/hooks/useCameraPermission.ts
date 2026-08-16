// src/hooks/useCameraPermission.ts
import { Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, type Permission } from 'react-native-permissions';

// Hook reutilizable (FIX 6): centraliza la verificación y solicitud de permisos
// de cámara y galería antes de usar launchCamera / launchImageLibrary.

type PermissionSource = 'camera' | 'library';

export function useCameraPermission() {
  const ensurePermission = async (source: PermissionSource): Promise<boolean> => {
    const isCamera = source === 'camera';
    const permission: Permission = isCamera ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.IOS.PHOTO_LIBRARY;
    const label = isCamera ? 'cámara' : 'galería';

    let status = await check(permission);

    // Si todavía no se pidió (DENIED), se solicita el permiso al usuario.
    if (status === RESULTS.DENIED) {
      status = await request(permission);
    }

    // Para la galería, "LIMITED" (fotos seleccionadas) también permite continuar.
    if (status === RESULTS.GRANTED || (status === RESULTS.LIMITED && !isCamera)) {
      return true;
    }

    // BLOCKED / UNAVAILABLE: el usuario lo rechazó de forma definitiva o el
    // permiso no está disponible; solo se puede desbloquear desde Ajustes.
    Alert.alert(
      `Permiso de ${label} bloqueado`,
      `Para continuar, habilitá el acceso a la ${label} desde los ajustes del sistema.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir configuración', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  };

  return {
    requestCameraPermission: () => ensurePermission('camera'),
    requestLibraryPermission: () => ensurePermission('library'),
  };
}
