/* eslint-env jest */
import { PHOTO_PICKER_OPTIONS, photoPickerOptions } from '../src/constants/media';

describe('photo picker options', () => {
  it('caps resolution and keeps compression quality', () => {
    expect(PHOTO_PICKER_OPTIONS).toEqual({
      mediaType: 'photo',
      quality: 0.7,
      maxWidth: 1280,
      maxHeight: 1280,
    });
  });

  it('extends the shared options without mutating them', () => {
    expect(photoPickerOptions({ selectionLimit: 3 })).toEqual({ ...PHOTO_PICKER_OPTIONS, selectionLimit: 3 });
    expect(PHOTO_PICKER_OPTIONS).not.toHaveProperty('selectionLimit');
  });
});
