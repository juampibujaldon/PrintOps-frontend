// src/hooks/useQuoteCalculator.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { quoteService } from '../services/quoteService';
import { QuoteInputs, QuoteResults, WearResults } from '../types/quote';

const round2 = (n: number) => Math.round(n * 100) / 100;

// Cálculo local e instantáneo de resultados (misma fórmula que el backend).
export function computeResults(inputs: QuoteInputs): QuoteResults {
  const filamentCost = inputs.filamentGrams * inputs.filamentPricePerGram;
  const energyCost = (inputs.printerWatts / 1000) * inputs.printingHours * inputs.energyPriceKwh;
  const designCost = (inputs.designHours ?? 0) * (inputs.designHourlyRate ?? 0);
  const operatorCost = inputs.printingHours * (inputs.operatorHourlyRate ?? 0);

  const totalCostUnit = filamentCost + energyCost + designCost + operatorCost;
  const unitPrice = totalCostUnit * (1 + inputs.marginPercent / 100);
  const discount = unitPrice * (inputs.discountPercent ?? 0) / 100;
  const finalUnitPrice = unitPrice - discount;

  const totalPrice = finalUnitPrice * inputs.units;
  const totalCost = totalCostUnit * inputs.units;
  const totalProfit = totalPrice - totalCost;
  const roi = totalCost !== 0 ? (totalProfit / totalCost) * 100 : 0;

  return {
    filamentCost: round2(filamentCost),
    energyCost: round2(energyCost),
    designCost: round2(designCost),
    operatorCost: round2(operatorCost),
    totalCost: round2(totalCost),
    unitPrice: round2(unitPrice),
    totalPrice: round2(totalPrice),
    totalProfit: round2(totalProfit),
    roi: round2(roi),
  };
}

// Problemas del formulario, con la etiqueta que ve el usuario. Replica las
// validaciones de CreateQuoteRequest en el backend: si algo pasa acá pero no
// allá, el POST responde 400.
export function missingFields(inputs: QuoteInputs): string[] {
  const problems: string[] = [];
  if (!(inputs.filamentGrams > 0)) problems.push('Filamento (gramos)');
  if (!(inputs.filamentPricePerGram > 0)) problems.push('Precio por gramo');
  if (!(inputs.printerWatts > 0)) problems.push('Potencia (watts)');
  if (!(inputs.energyPriceKwh > 0)) problems.push('Precio de energía (kWh)');
  if (!(inputs.printingHours > 0)) problems.push('Horas de impresión');
  if (!(inputs.marginPercent >= 1 && inputs.marginPercent <= 1000)) problems.push('Margen (%) entre 1 y 1000');
  if ((inputs.discountPercent ?? 0) < 0 || (inputs.discountPercent ?? 0) > 50) problems.push('Descuento (%) entre 0 y 50');
  if (!(inputs.units >= 1)) problems.push('Unidades');
  return problems;
}

export function isValid(inputs: QuoteInputs): boolean {
  return missingFields(inputs).length === 0;
}

// Hook: resultados locales (useMemo) + desgaste remoto con debounce de 300ms.
// `refreshKey` fuerza recalcular el desgaste sin cambiar los inputs (p. ej. al
// volver de ajustar la calidad o los reemplazos de los repuestos).
export function useQuoteCalculator(inputs: QuoteInputs, refreshKey = 0) {
  const key = JSON.stringify(inputs);
  // `key` (JSON de inputs) reemplaza a `inputs`: el objeto llega nuevo en cada render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const results = useMemo(() => computeResults(inputs), [key]);

  const [wear, setWear] = useState<WearResults | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    if (!isValid(inputs)) {
      setWear(null);
      return;
    }

    timer.current = setTimeout(async () => {
      try {
        const res = await quoteService.calculate(inputs);
        setWear(res.wear);
      } catch {
        setWear(null);
      }
    }, 300);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` cubre a `inputs` (ver arriba)
  }, [key, refreshKey]);

  return { results, wear, isValid: isValid(inputs) };
}
