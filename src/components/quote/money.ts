// Formato de moneda de los presupuestos (es-AR, 2 decimales).
export const formatMoney = (v: number) =>
  `$ ${(Number.isFinite(v) ? v : 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
