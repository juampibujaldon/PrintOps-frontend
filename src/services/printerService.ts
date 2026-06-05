// src/services/printerService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';

export interface PrinterData {
  name?: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string; // YYYY-MM-DD
  status: 'OPERATIVA' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO';
}

export interface PrinterResponse extends PrinterData {
  id: number;
  photoUrl: string | null;
  qrCodeData: string;
}

export interface PhotoAsset {
  uri: string;
  type: string;
  name: string;
}

const createPrinter = async (data: PrinterData, photo?: PhotoAsset): Promise<PrinterResponse> => {
  const formData = new FormData();
  
  // Agregar los datos del JSON como un blob o string para el @RequestPart("printer")
  formData.append('printer', {
    string: JSON.stringify(data),
    type: 'application/json',
  } as any);

  if (photo) {
    formData.append('photo', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || 'photo.jpg',
    } as any);
  }

  const response = await api.post<PrinterResponse>(`${API_BASE_URL}/api/printers`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

const getAllPrinters = async (): Promise<PrinterResponse[]> => {
  const response = await api.get<PrinterResponse[]>(`${API_BASE_URL}/api/printers`);
  return response.data;
};

export const printerService = {
  createPrinter,
  getAllPrinters,
};
