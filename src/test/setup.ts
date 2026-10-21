import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// Node >= 22 trae un localStorage experimental que pisa al de jsdom y viene roto sin
// --localstorage-file: se reemplaza por una implementación en memoria.
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
  [name: string]: unknown;
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, name, { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, name, { value: storage, configurable: true, writable: true });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

// react-router (data routers) crea `new Request(url, { signal })` con el AbortSignal de jsdom, que el
// Request de Node (undici) rechaza. En tests alcanza con ignorar la señal.
const NodeRequest = globalThis.Request;
if (NodeRequest) {
  globalThis.Request = class extends NodeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (init?.signal) {
        const { signal: _signal, ...rest } = init;
        super(input, rest);
      } else {
        super(input, init);
      }
    }
  } as typeof Request;
}
