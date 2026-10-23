import type { ComponentWear, FilamentType, Quote, WearResults } from '../types/quote';

// Estado del formulario de presupuesto (cadenas, como las escribe el usuario) y helpers puros.
export interface FormState {
  filamentGrams: string;
  filamentPricePerGram: string;
  filamentType: FilamentType;
  printerWatts: string;
  energyPriceKwh: string;
  printingHours: string;
  designHours: string;
  designHourlyRate: string;
  operatorHourlyRate: string;
  marginPercent: string;
  discountPercent: string;
  units: string;
  clientName: string;
  jobDescription: string;
  printerId: number | null;
  spoolId: number | null;
  extraCosts: ExtraCostRow[];
  draftWatermark: boolean;
}

// Fila editable de gasto extra (el importe como lo escribe el usuario).
export interface ExtraCostRow {
  key: string;
  description: string;
  amount: string;
}

let rowSeq = 0;
export const newExtraRow = (description = '', amount = ''): ExtraCostRow => ({
  key: `x${++rowSeq}`,
  description,
  amount,
});

type Action =
  | { type: 'SET'; field: keyof FormState; value: string }
  | { type: 'SET_PRINTER'; printerId: number | null }
  | { type: 'SET_SPOOL'; spoolId: number | null; pricePerGram?: number; filamentType?: FilamentType }
  | { type: 'SET_EXTRAS'; extraCosts: ExtraCostRow[] }
  | { type: 'SET_WATERMARK'; value: boolean }
  // Completa un campo solo si el usuario todavía no lo tocó (o tiene el valor inicial).
  | { type: 'PREFILL'; field: keyof FormState; value: string }
  | { type: 'LOAD'; quote: Quote };

export const initialState: FormState = {
  filamentGrams: '',
  filamentPricePerGram: '',
  filamentType: 'PLA',
  printerWatts: '',
  energyPriceKwh: '',
  printingHours: '',
  designHours: '',
  designHourlyRate: '',
  operatorHourlyRate: '',
  marginPercent: '30',
  discountPercent: '',
  units: '1',
  clientName: '',
  jobDescription: '',
  printerId: null,
  spoolId: null,
  extraCosts: [],
  draftWatermark: true,
};

export function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'SET_PRINTER':
      return { ...state, printerId: action.printerId };
    case 'SET_SPOOL':
      // Elegir una bobina trae su precio por gramo y su material.
      return {
        ...state,
        spoolId: action.spoolId,
        filamentPricePerGram: action.pricePerGram != null ? String(action.pricePerGram) : state.filamentPricePerGram,
        filamentType: action.filamentType ?? state.filamentType,
      };
    case 'SET_EXTRAS':
      return { ...state, extraCosts: action.extraCosts };
    case 'SET_WATERMARK':
      return { ...state, draftWatermark: action.value };
    case 'PREFILL':
      return state[action.field] === initialState[action.field] ? { ...state, [action.field]: action.value } : state;
    case 'LOAD':
      return {
        filamentGrams: String(action.quote.filamentGrams),
        filamentPricePerGram: String(action.quote.filamentPricePerGram),
        filamentType: action.quote.filamentType,
        printerWatts: String(action.quote.printerWatts),
        energyPriceKwh: String(action.quote.energyPriceKwh),
        printingHours: String(action.quote.printingHours),
        designHours: action.quote.designHours != null ? String(action.quote.designHours) : '',
        designHourlyRate: action.quote.designHourlyRate != null ? String(action.quote.designHourlyRate) : '',
        operatorHourlyRate: action.quote.operatorHourlyRate != null ? String(action.quote.operatorHourlyRate) : '',
        marginPercent: String(action.quote.marginPercent),
        discountPercent: action.quote.discountPercent != null ? String(action.quote.discountPercent) : '',
        units: String(action.quote.units),
        clientName: action.quote.clientName ?? '',
        jobDescription: action.quote.jobDescription ?? '',
        printerId: action.quote.printerId,
        spoolId: action.quote.spoolId ?? null,
        extraCosts: (action.quote.extraCosts ?? []).map((e) => newExtraRow(e.description, String(e.amount))),
        draftWatermark: action.quote.draftWatermark ?? true,
      };
  }
}

export const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? 0 : n;
};


export function criticalComponent(wear: WearResults | null): { name: string; percent: number } | null {
  if (!wear) return null;
  const entries: Array<[string, ComponentWear]> = [
    ['la boquilla', wear.nozzle],
    ['el hotend', wear.hotend],
    ['las correas', wear.belts],
    ['los rodamientos', wear.bearings],
    ['la cama caliente', wear.heatbed],
  ];
  const found = entries.find(([, w]) => w.critical);
  return found ? { name: found[0], percent: found[1].percent } : null;
}

