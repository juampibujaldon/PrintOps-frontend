import { describe, expect, it } from 'vitest';
import { buildPrinterQrPayload, parsePrinterQrPayload, qrFileName } from './qr';

describe('parsePrinterQrPayload', () => {
  it('extrae el serial de printops://printer/<serial>', () => {
    expect(parsePrinterQrPayload('printops://printer/SN-123')).toBe('SN-123');
  });

  it('decodifica caracteres escapados', () => {
    expect(parsePrinterQrPayload('printops://printer/AB%2FC%20D')).toBe('AB/C D');
  });

  it('tolera secuencias % inválidas', () => {
    expect(parsePrinterQrPayload('printops://printer/50%')).toBe('50%');
  });

  it('acepta un serial suelto', () => {
    expect(parsePrinterQrPayload('  SN-999 ')).toBe('SN-999');
  });

  it('rechaza vacío y otros esquemas', () => {
    expect(parsePrinterQrPayload('')).toBeNull();
    expect(parsePrinterQrPayload('   ')).toBeNull();
    expect(parsePrinterQrPayload('https://example.com/x')).toBeNull();
    expect(parsePrinterQrPayload('printops://printer/')).toBeNull();
  });

  it('es inverso de buildPrinterQrPayload', () => {
    const serial = 'SN/1 2#3';
    expect(parsePrinterQrPayload(buildPrinterQrPayload(serial))).toBe(serial);
  });
});

describe('qrFileName', () => {
  it('sanea el serial', () => {
    expect(qrFileName('SN/1 2#3', 'png')).toBe('qr-SN_1_2_3.png');
    expect(qrFileName('///', 'svg')).toBe('qr-impresora.svg');
  });
});
