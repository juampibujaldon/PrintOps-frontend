// src/constants/media.ts
import type { CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';

// Las fotos de cámara pesan varios MB; para impresoras/órdenes alcanza con 1280px de lado.
export const PHOTO_MAX_DIMENSION = 1280;

export const PHOTO_PICKER_OPTIONS = {
  mediaType: 'photo',
  quality: 0.7,
  maxWidth: PHOTO_MAX_DIMENSION,
  maxHeight: PHOTO_MAX_DIMENSION,
} as const satisfies CameraOptions;

export const photoPickerOptions = (extra: Partial<ImageLibraryOptions> = {}) => ({
  ...PHOTO_PICKER_OPTIONS,
  ...extra,
});
