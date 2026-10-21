// src/services/printerService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';

export type PrinterStatus = 'OPERATIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

export interface PrinterData {
  name?: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string; // YYYY-MM-DD
  status: PrinterStatus;
  location?: string; // FIX 3
  nextMaintenanceDate?: string; // FIX 4 (YYYY-MM-DD, opcional al crear)
}

export interface PrinterResponse {
  id: number;
  name: string | null;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string; // YYYY-MM-DD
  status: PrinterStatus;
  location: string | null;
  nextMaintenanceDate: string | null;
  photoUrl: string | null;
  qrCodeData: string;
  totalPrintingHours: number | null;
  watts: number | null;
}

// En web una foto es un Blob/File (ver utils/image.ts: resizeImageToBlob).
export type PhotoAsset = Blob | File;

const createPrinter = async (data: PrinterData, photo?: PhotoAsset): Promise<PrinterResponse> => {
  const formData = new FormData();

  // Part "printer": JSON con Content-Type application/json.
  formData.append('printer', new Blob([JSON.stringify(data)], { type: 'application/json' }));

  if (photo) {
    const name = photo instanceof File && photo.name ? photo.name : 'photo.jpg';
    formData.append('photo', photo, name);
  }

  // NO seteamos Content-Type manualmente: el navegador genera el multipart con el boundary.
  const response = await api.post<PrinterResponse>(`${API_BASE_URL}/api/printers`, formData);

  return response.data;
};

// FIX 3: permite filtrar por ubicación en el servidor (query param ?location=).
const getAllPrinters = async (location?: string): Promise<PrinterResponse[]> => {
  const response = await api.get<PrinterResponse[]>(`${API_BASE_URL}/api/printers`, {
    params: location ? { location } : undefined,
  });
  return response.data;
};

const getById = async (id: number): Promise<PrinterResponse> => {
  const response = await api.get<PrinterResponse>(`${API_BASE_URL}/api/printers/${id}`);
  return response.data;
};

// Lookup por número de serie (usado por el lector de QR).
const getBySerialNumber = async (serialNumber: string): Promise<PrinterResponse> => {
  const response = await api.get<PrinterResponse>(
    `${API_BASE_URL}/api/printers/by-serial/${encodeURIComponent(serialNumber)}`
  );
  return response.data;
};

const updateStatus = async (id: number, status: PrinterStatus): Promise<PrinterResponse> => {
  const response = await api.patch<PrinterResponse>(`${API_BASE_URL}/api/printers/${id}/status`, { status });
  return response.data;
};

// FIX 4: actualiza la fecha del próximo mantenimiento (ej. al cerrar una orden).
const updateNextMaintenanceDate = async (
  id: number,
  nextMaintenanceDate: string
): Promise<PrinterResponse> => {
  const response = await api.patch<PrinterResponse>(
    `${API_BASE_URL}/api/printers/${id}/next-maintenance-date`,
    { nextMaintenanceDate }
  );
  return response.data;
};

export const printerService = {
  createPrinter,
  getAllPrinters,
  getById,
  getBySerialNumber,
  updateStatus,
  updateNextMaintenanceDate,
};
