import { describe, expect, it } from 'vitest';
import { normalizeApiBaseUrl } from '../src/constants/api';

describe('normalizeApiBaseUrl', () => {
  it('defaults to the local backend', () => {
    expect(normalizeApiBaseUrl(undefined)).toBe('http://localhost:8083');
    expect(normalizeApiBaseUrl('  ')).toBe('http://localhost:8083');
  });

  it('adds https to a bare host (otherwise the browser treats it as a relative path)', () => {
    expect(normalizeApiBaseUrl('printops-backend-production-f98e.up.railway.app')).toBe(
      'https://printops-backend-production-f98e.up.railway.app',
    );
    expect(normalizeApiBaseUrl('//api.example.com/')).toBe('https://api.example.com');
  });

  it('uses http for local hosts', () => {
    expect(normalizeApiBaseUrl('localhost:8083')).toBe('http://localhost:8083');
    expect(normalizeApiBaseUrl('192.168.0.10:8083')).toBe('http://192.168.0.10:8083');
  });

  it('keeps an explicit protocol and strips trailing slashes', () => {
    expect(normalizeApiBaseUrl('https://api.example.com///')).toBe('https://api.example.com');
    expect(normalizeApiBaseUrl('http://localhost:8083/')).toBe('http://localhost:8083');
  });
});
