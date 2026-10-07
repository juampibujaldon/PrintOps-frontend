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

const getQuoteDefaults = async (): Promise<QuoteDefaults> => {
  const response = await api.get<QuoteDefaults>(`${API_BASE_URL}/api/workspaces/quote-defaults`);
  return response.data;
};

const updateQuoteDefaults = async (data: QuoteDefaults): Promise<QuoteDefaults> => {
  const response = await api.put<QuoteDefaults>(`${API_BASE_URL}/api/workspaces/quote-defaults`, data);
  return response.data;
};

const invite = async (email: string): Promise<{ message: string; inviteToken?: string }> => {
  const response = await api.post<{ message: string; inviteToken?: string }>(
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
  invite,
};
