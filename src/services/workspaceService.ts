// src/services/workspaceService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';

export interface Workspace {
  id: number;
  name: string;
  phone?: string;
  contactEmail?: string;
  address?: string;
  logoUrl?: string;
  currency?: string;
}

export interface QuoteDefaults {
  defaultEnergyPriceKwh: number;
  defaultOperatorHourlyRate: number;
  defaultDesignHourlyRate: number;
  defaultMarginPercent: number;
  quoteValidityDays: number;
}

const getMine = async (): Promise<Workspace> => {
  const response = await api.get<Workspace>(`${API_BASE_URL}/api/workspaces/me`);
  return response.data;
};

const updateMine = async (data: Partial<Workspace>): Promise<Workspace> => {
  const response = await api.put<Workspace>(`${API_BASE_URL}/api/workspaces/me`, data);
  return response.data;
};

// Logo del taller (PNG/JPG hasta 2 MB): aparece en el encabezado de los PDF.
const uploadLogo = async (file: File): Promise<Workspace> => {
  const form = new FormData();
  form.append('logo', file);
  return (await api.post<Workspace>(`${API_BASE_URL}/api/workspaces/me/logo`, form)).data;
};

const deleteLogo = async (): Promise<Workspace> => (await api.delete<Workspace>(`${API_BASE_URL}/api/workspaces/me/logo`)).data;

const getQuoteDefaults = async (): Promise<QuoteDefaults> => {
  const response = await api.get<QuoteDefaults>(`${API_BASE_URL}/api/workspaces/quote-defaults`);
  return response.data;
};

const updateQuoteDefaults = async (data: QuoteDefaults): Promise<QuoteDefaults> => {
  const response = await api.put<QuoteDefaults>(`${API_BASE_URL}/api/workspaces/quote-defaults`, data);
  return response.data;
};

// El código de invitación no vuelve a la app: le llega al técnico por email.
const invite = async (email: string): Promise<{ message: string; emailSent: boolean }> => {
  const response = await api.post<{ message: string; emailSent: boolean }>(
    `${API_BASE_URL}/api/workspaces/invites`,
    { email },
  );
  return response.data;
};

export const workspaceService = {
  getMine,
  updateMine,
  getQuoteDefaults,
  updateQuoteDefaults,
  invite, uploadLogo, deleteLogo };
