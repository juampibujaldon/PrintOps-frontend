import axios from 'axios';
import type { PublicQuote } from '../api/types';

// Página pública del presupuesto (sin sesión): axios plano, sin interceptores de auth.
const enc = encodeURIComponent;
const get = async (token: string): Promise<PublicQuote> => (await axios.get<PublicQuote>(`/api/public/quotes/${enc(token)}`)).data;
const accept = async (token: string, name?: string, note?: string) =>
  (await axios.post<PublicQuote>(`/api/public/quotes/${enc(token)}/accept`, { name, note })).data;
const reject = async (token: string, name?: string, note?: string) =>
  (await axios.post<PublicQuote>(`/api/public/quotes/${enc(token)}/reject`, { name, note })).data;
const pdfUrl = (token: string) => `/api/public/quotes/${enc(token)}/pdf`;

export const publicQuoteService = { get, accept, reject, pdfUrl };
