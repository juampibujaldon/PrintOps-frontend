// Alias legibles de los DTOs del backend, generados desde OpenAPI (src/api/schema.d.ts,
// `npm run gen:api`). Si el backend cambia un DTO, regenerar y el compilador marca los usos.
import type { components } from './schema';

type Schemas = components['schemas'];
// springdoc marca todos los componentes de un record como opcionales; las respuestas del
// backend siempre los traen (con null si no hay valor), así que se tratan como presentes.
type DeepRequired<T> = T extends (infer U)[]
  ? DeepRequired<U>[]
  : T extends object
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T;
type S = { [K in keyof Schemas]: DeepRequired<Schemas[K]> };
// Para los cuerpos de request se respeta la opcionalidad original.
type In = Schemas;

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type PrintJob = S['PrintJobDTO'];
export type PrintJobRequest = In['PrintJobRequest'];
export type PrintJobStatus = 'QUEUED' | 'PRINTING' | 'DONE' | 'FAILED' | 'CANCELLED';
export type FilamentSpool = S['FilamentSpoolDTO'];
export type SpoolRequest = In['SpoolRequest'];
export type Supplier = S['SupplierDTO'];
export type SupplierInput = In['SupplierDTO'];
export type PurchaseOrder = S['PurchaseOrderDTO'];
export type PurchaseOrderLine = S['OrderLine'];
export type PurchaseOrderLineInput = In['LineInput'];
export type PurchaseOrderRequest = In['PurchaseOrderRequest'];
export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';
export type FailurePrediction = S['FailurePredictionDTO'];
export type Profitability = S['ProfitabilityDTO'];
export type ProfitabilityRow = S['Row'];
export type ActivityItem = S['ActivityItemDTO'];
export type PrinterTelemetry = S['PrinterTelemetryDTO'];
export type Integration = S['IntegrationDTO'];
export type IntegrationType = 'OCTOPRINT' | 'MOONRAKER' | 'BAMBU' | 'OTHER';
export type PublicQuote = S['PublicQuoteDTO'];
export type ExtraCostItem = In['ExtraCostItem'];
