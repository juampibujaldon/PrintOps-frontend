// src/types/parts.ts
export type MovementType = 'PURCHASE' | 'ORDER_USE' | 'ADJUSTMENT' | 'RETURN';

export interface SparePartDTO {
  id: number;
  name: string;
  partNumber: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  stock: number;
  minStock: number;
  unitPrice: number;
  supplierUrl: string | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface CreateSparePartInput {
  name: string;
  partNumber: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  stock: number;
  minStock: number;
  unitPrice: number;
  supplierUrl?: string | null;
}

export interface StockMovementDTO {
  id: number;
  type: MovementType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  note: string | null;
  performedByName: string | null;
  performedAt: string;
  orderNumber: string | null;
}
