// src/services/canvasService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';

export interface CanvasNode {
  printerId: number;
  x: number;
  y: number;
}

export interface CanvasEdge {
  id: string;
  fromId: number;
  toId: number;
}

export interface CanvasLayout {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const getCanvasLayout = async (): Promise<CanvasLayout> => {
  const response = await api.get<CanvasLayout | string>(`${API_BASE_URL}/api/workspaces/canvas`);
  if (typeof response.data === 'string') {
    try {
      return JSON.parse(response.data) as CanvasLayout;
    } catch {
      return { nodes: [], edges: [] };
    }
  }
  return response.data || { nodes: [], edges: [] };
};

const updateCanvasLayout = async (layout: CanvasLayout): Promise<CanvasLayout> => {
  const response = await api.put<CanvasLayout | string>(`${API_BASE_URL}/api/workspaces/canvas`, JSON.stringify(layout), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (typeof response.data === 'string') {
    return JSON.parse(response.data) as CanvasLayout;
  }
  return response.data;
};

export const canvasService = { getCanvasLayout, updateCanvasLayout };
