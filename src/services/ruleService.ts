// src/services/ruleService.ts
import api from './axiosInstance';
import { CreateRuleInput, MaintenanceRuleDTO } from '../types/rules';

// Reglas de mantenimiento preventivo (US-06).
const getRules = async (printerId: number): Promise<MaintenanceRuleDTO[]> => {
  const { data } = await api.get<MaintenanceRuleDTO[]>('/api/rules', { params: { printerId } });
  return data;
};

const getRule = async (id: number): Promise<MaintenanceRuleDTO> => {
  const { data } = await api.get<MaintenanceRuleDTO>(`/api/rules/${id}`);
  return data;
};

const createRule = async (input: CreateRuleInput): Promise<MaintenanceRuleDTO> => {
  const { data } = await api.post<MaintenanceRuleDTO>('/api/rules', input);
  return data;
};

const pauseRule = async (id: number): Promise<MaintenanceRuleDTO> => {
  const { data } = await api.patch<MaintenanceRuleDTO>(`/api/rules/${id}/pause`);
  return data;
};

const resumeRule = async (id: number): Promise<MaintenanceRuleDTO> => {
  const { data } = await api.patch<MaintenanceRuleDTO>(`/api/rules/${id}/resume`);
  return data;
};

const deleteRule = async (id: number): Promise<void> => {
  await api.delete(`/api/rules/${id}`);
};

export const ruleService = {
  getRules,
  getRule,
  createRule,
  pauseRule,
  resumeRule,
  deleteRule,
};
