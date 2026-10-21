import { describe, expect, it } from 'vitest';
import { PHOTO_JPEG_QUALITY, PHOTO_MAX_DIMENSION } from '../src/constants/media';
import { computeTargetSize } from '../src/utils/image';

describe('photo constants', () => {
  it('caps resolution at 1280px and keeps compression quality', () => {
    expect(PHOTO_MAX_DIMENSION).toBe(1280);
    expect(PHOTO_JPEG_QUALITY).toBe(0.7);
  });
});

describe('computeTargetSize', () => {
  it('scales landscape photos down so the longest side is 1280', () => {
    expect(computeTargetSize(4000, 3000)).toEqual({ width: 1280, height: 960 });
  });

  it('scales portrait photos down keeping the aspect ratio', () => {
    expect(computeTargetSize(3000, 4000)).toEqual({ width: 960, height: 1280 });
  });

  it('never enlarges small images', () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('honors a custom max dimension', () => {
    expect(computeTargetSize(2000, 1000, 500)).toEqual({ width: 500, height: 250 });
  });

  it('returns 0x0 for invalid sizes', () => {
    expect(computeTargetSize(0, 100)).toEqual({ width: 0, height: 0 });
  });
});
