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

export function isValid(inputs: QuoteInputs): boolean {
  return (
    inputs.filamentGrams > 0 &&
    inputs.filamentPricePerGram > 0 &&
    inputs.printerWatts > 0 &&
    inputs.energyPriceKwh > 0 &&
    inputs.printingHours > 0 &&
    inputs.marginPercent >= 1 &&
    inputs.units >= 1
  );
}

// Hook: resultados locales (useMemo) + desgaste remoto con debounce de 300ms.
export function useQuoteCalculator(inputs: QuoteInputs) {
  const key = JSON.stringify(inputs);
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
  }, [key]);

  return { results, wear, isValid: isValid(inputs) };
}
