// src/services/quoteService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/api';
import api from './axiosInstance';
import {
  Quote,
  QuoteInputs,
  QuoteResults,
  QuoteStatus,
  WearResults,
} from '../types/quote';

interface CalculateResponse {
  filamentCost: number;
  energyCost: number;
  designCost: number;
  operatorCost: number;
  totalCost: number;
  unitPrice: number;
  totalPrice: number;
  totalProfit: number;
  roi: number;
  componentWear: WearResults;
}

// Payload común a /calculate, POST y PUT.
function buildPayload(inputs: QuoteInputs) {
  return {
    filamentGrams: inputs.filamentGrams,
    filamentPricePerGram: inputs.filamentPricePerGram,
    filamentType: inputs.filamentType,
    printerWatts: inputs.printerWatts,
    energyPriceKwh: inputs.energyPriceKwh,
    printingHours: inputs.printingHours,
    designHours: inputs.designHours ?? null,
    designHourlyRate: inputs.designHourlyRate ?? null,
    operatorHourlyRate: inputs.operatorHourlyRate ?? null,
    marginPercent: inputs.marginPercent,
    discountPercent: inputs.discountPercent ?? 0,
    units: inputs.units,
    printerId: inputs.printerId ?? null,
    clientName: inputs.clientName ?? null,
    jobDescription: inputs.jobDescription ?? null,
  };
}

const toResults = (data: CalculateResponse): { results: QuoteResults; wear: WearResults } => ({
  results: {
    filamentCost: data.filamentCost,
    energyCost: data.energyCost,
    designCost: data.designCost,
    operatorCost: data.operatorCost,
    totalCost: data.totalCost,
    unitPrice: data.unitPrice,
    totalPrice: data.totalPrice,
    totalProfit: data.totalProfit,
    roi: data.roi,
  },
  wear: data.componentWear,
});

// Cálculo en tiempo real sin persistir (usado para el desgaste).
const calculate = async (inputs: QuoteInputs) => {
  const { data } = await api.post<CalculateResponse>(
    `${API_BASE_URL}/api/quotes/calculate`,
    buildPayload(inputs),
  );
  return toResults(data);
};

const create = async (inputs: QuoteInputs): Promise<Quote> => {
  const { data } = await api.post<Quote>(`${API_BASE_URL}/api/quotes`, buildPayload(inputs));
  return data;
};

const update = async (id: number, inputs: QuoteInputs): Promise<Quote> => {
  const { data } = await api.put<Quote>(`${API_BASE_URL}/api/quotes/${id}`, buildPayload(inputs));
  return data;
};

interface ListParams {
  status?: QuoteStatus;
  clientName?: string;
  from?: string;
  to?: string;
  printerId?: number;
}

const list = async (params?: ListParams): Promise<Quote[]> => {
  const { data } = await api.get<Quote[]>(`${API_BASE_URL}/api/quotes`, { params });
  return data;
};

const get = async (id: number): Promise<Quote> => {
  const { data } = await api.get<Quote>(`${API_BASE_URL}/api/quotes/${id}`);
  return data;
};

const updateStatus = async (id: number, status: QuoteStatus): Promise<Quote> => {
  const { data } = await api.patch<Quote>(`${API_BASE_URL}/api/quotes/${id}/status`, { status });
  return data;
};

const duplicate = async (id: number): Promise<Quote> => {
  const { data } = await api.post<Quote>(`${API_BASE_URL}/api/quotes/${id}/duplicate`);
  return data;
};

const remove = async (id: number): Promise<void> => {
  await api.delete(`${API_BASE_URL}/api/quotes/${id}`);
};

// Descarga el PDF a la carpeta de caché y devuelve la ruta absoluta del archivo.
const downloadPdf = async (id: number, quoteNumber: string): Promise<string> => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/presupuesto-${quoteNumber}.pdf`;
  await ReactNativeBlobUtil.config({ path, fileCache: true }).fetch(
    'GET',
    `${API_BASE_URL}/api/quotes/${id}/pdf`,
    { Authorization: `Bearer ${token ?? ''}` },
  );
  return path;
};

export const quoteService = {
  calculate,
  create,
  update,
  list,
  get,
  updateStatus,
  duplicate,
  remove,
  downloadPdf,
};
