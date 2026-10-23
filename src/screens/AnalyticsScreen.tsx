// src/screens/AnalyticsScreen.tsx — /analytics (supervisor)
// Rentabilidad por impresora, predicción de fallas y exportación de datos para contabilidad.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Download, FileSpreadsheet } from 'lucide-react';
import { Badge, Button, Card, ErrorState, ScreenHeader, SegmentedControl, Skeleton } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { analyticsService } from '../services/analyticsService';
import type { ExportDataset } from '../services/analyticsService';
import { apiErrorMessage } from '../services/authService';
import type { FailurePrediction, Profitability } from '../api/types';
import { downloadBlob } from '../utils/download';
import styles from './FeatureScreens.module.css';

type Range = '30' | '90' | '365';
const money = (v: number) => `$ ${Math.round(v).toLocaleString('es-AR')}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const EXPORTS: Array<{ id: ExportDataset; label: string; description: string }> = [
  { id: 'quotes', label: 'Presupuestos', description: 'Clientes, precios, costos y ganancia' },
  { id: 'orders', label: 'Órdenes de mantenimiento', description: 'Tipo, estado, técnico y costo de repuestos' },
  { id: 'jobs', label: 'Trabajos de impresión', description: 'Horas y gramos estimados vs. reales' },
  { id: 'movements', label: 'Movimientos de stock', description: 'Compras, usos y ajustes' },
  { id: 'parts', label: 'Inventario de repuestos', description: 'Stock actual y valorizado' },
];

function riskColor(p: FailurePrediction): string {
  const r = Math.max(p.riskPercent ?? 0, p.worstComponentWear ?? 0);
  if (p.hasOpenPreventive) return '#8E8E93';
  if (r >= 100) return '#FF3B30';
  if (r >= 80) return '#FF9500';
  return '#34C759';
}

export default function AnalyticsScreen() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [range, setRange] = useState<Range>('30');
  const [profit, setProfit] = useState<Profitability | null>(null);
  const [predictions, setPredictions] = useState<FailurePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<number | null>(null);
  const [exporting, setExporting] = useState<ExportDataset | null>(null);

  const period = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - Number(range) + 1);
    return { from: iso(from), to: iso(to) };
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([analyticsService.profitability(period.from, period.to), analyticsService.predictions()]);
      setProfit(p);
      setPredictions(f);
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'No se pudo cargar el análisis.'));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const schedule = async (p: FailurePrediction) => {
    setScheduling(p.printerId);
    try {
      const { orderId } = await analyticsService.schedulePreventive(p.printerId);
      showToast(`Orden preventiva #${orderId} creada para ${p.printerName}.`, { type: 'success' });
      setPredictions(await analyticsService.predictions());
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo programar el preventivo.'), { type: 'error' });
    } finally {
      setScheduling(null);
    }
  };

  const exportCsv = async (d: ExportDataset) => {
    setExporting(d);
    try {
      const blob = await analyticsService.exportCsv(d, d === 'parts' ? undefined : period.from, d === 'parts' ? undefined : period.to);
      downloadBlob(blob, `printops-${d}-${period.to}.csv`);
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo exportar.'), { type: 'error' });
    } finally {
      setExporting(null);
    }
  };

  const atRisk = predictions.filter((p) => !p.hasOpenPreventive && Math.max(p.riskPercent ?? 0, p.worstComponentWear ?? 0) >= 80).length;

  return (
    <>
      <ScreenHeader title="Análisis" subtitle="Rentabilidad, fallas y exportaciones" />
      <div className={styles.toolbar}>
        <SegmentedControl<Range>
          ariaLabel="Período"
          value={range}
          onChange={setRange}
          options={[
            { value: '30', label: '30 días' },
            { value: '90', label: '90 días' },
            { value: '365', label: '12 meses' },
          ]}
        />
      </div>

      {loading ? (
        <>
          <div className={styles.kpis}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={84} />)}</div>
          <Skeleton height={260} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : (
        <>
          {profit && (
            <>
              <div className={styles.kpis}>
                <Card className={styles.kpi}><p className={styles.kpiLabel}>Ingresos</p><p className={styles.kpiValue}>{money(profit.totals.revenue)}</p></Card>
                <Card className={styles.kpi}><p className={styles.kpiLabel}>Costo de producción</p><p className={styles.kpiValue}>{money(profit.totals.productionCost)}</p></Card>
                <Card className={styles.kpi}><p className={styles.kpiLabel}>Mantenimiento</p><p className={styles.kpiValue}>{money(profit.totals.maintenanceCost)}</p></Card>
                <Card className={styles.kpi}>
                  <p className={styles.kpiLabel}>Ganancia neta{profit.totals.marginPercent != null ? ` · ${profit.totals.marginPercent}%` : ''}</p>
                  <p className={`${styles.kpiValue} ${profit.totals.profit >= 0 ? styles.good : styles.bad}`}>{money(profit.totals.profit)}</p>
                </Card>
              </div>

              <h2 className={styles.sectionTitle}>Rentabilidad por impresora</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Impresora</th>
                      <th className={styles.num}>Presupuestos</th>
                      <th className={styles.num}>Horas vendidas</th>
                      <th className={styles.num}>Ingresos</th>
                      <th className={styles.num}>Producción</th>
                      <th className={styles.num}>Energía</th>
                      <th className={styles.num}>Mantenimiento</th>
                      <th className={styles.num}>Ganancia</th>
                      <th className={styles.num}>Margen</th>
                      <th className={styles.num}>$/hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profit.printers.map((r) => (
                      <tr key={r.printerId ?? 'none'}>
                        <td>
                          {r.printerId != null ? (
                            <button type="button" className="linkButton" onClick={() => navigate(`/printers/${r.printerId}`)}>{r.printerName}</button>
                          ) : (
                            <span className={styles.muted}>{r.printerName}</span>
                          )}
                        </td>
                        <td className={styles.num}>{r.quotes}</td>
                        <td className={styles.num}>{r.hoursSold.toFixed(1)}</td>
                        <td className={styles.num}>{money(r.revenue)}</td>
                        <td className={styles.num}>{money(r.productionCost)}</td>
                        <td className={styles.num}>{money(r.energyCost)}</td>
                        <td className={styles.num}>{money(r.maintenanceCost)}</td>
                        <td className={`${styles.num} ${r.profit >= 0 ? styles.good : styles.bad}`}>{money(r.profit)}</td>
                        <td className={styles.num}>{r.marginPercent != null ? `${r.marginPercent}%` : '—'}</td>
                        <td className={styles.num}>{r.hoursSold > 0 ? money(r.profitPerHour) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={styles.hint} style={{ marginTop: 8 }}>
                Ingresos y costo de producción: presupuestos aceptados o cobrados del período. Mantenimiento: repuestos y mano de obra de órdenes completadas.
              </p>
            </>
          )}

          <h2 className={styles.sectionTitle}>
            Predicción de fallas {atRisk > 0 && <Badge label={`${atRisk} en riesgo`} color="#FF9500" />}
          </h2>
          <div className={styles.grid}>
            {predictions.map((p) => {
              const color = riskColor(p);
              const risk = p.riskPercent != null ? Math.min(150, p.riskPercent) : null;
              return (
                <Card key={p.printerId} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>{p.printerName}</h3>
                      <p className={styles.cardSub}>
                        {p.correctiveCount} falla{p.correctiveCount !== 1 ? 's' : ''} registrada{p.correctiveCount !== 1 ? 's' : ''}
                        {p.mtbfDays != null ? ` · una cada ${Math.round(p.mtbfDays)} días` : ''}
                      </p>
                    </div>
                    {(p.riskPercent ?? 0) >= 80 && !p.hasOpenPreventive ? <AlertTriangle size={20} color={color} aria-label="En riesgo" /> : null}
                  </div>
                  {risk != null && (
                    <>
                      <div className={styles.progress} role="progressbar" aria-label="Riesgo de falla" aria-valuenow={Math.round(risk)} aria-valuemin={0} aria-valuemax={100}>
                        <div className={styles.progressBar} style={{ width: `${Math.min(100, risk)}%`, background: color }} />
                      </div>
                      <p className={styles.live}>
                        <span>Riesgo {Math.round(p.riskPercent ?? 0)}%</span>
                        <span>{p.predictedNextFailure ? `próxima falla estimada: ${new Date(p.predictedNextFailure + 'T00:00').toLocaleDateString('es-AR')}` : ''}</span>
                      </p>
                    </>
                  )}
                  <p className={styles.meta}>
                    <span>{p.worstComponent}: {Math.round(p.worstComponentWear ?? 0)}% de su vida útil</span>
                  </p>
                  <p className={styles.hint}>{p.recommendation}</p>
                  {!p.hasOpenPreventive && ((p.riskPercent ?? 0) >= 80 || (p.worstComponentWear ?? 0) >= 85) && (
                    <div className={styles.actions}>
                      <Button title="Programar preventivo" size="sm" fullWidth={false} icon={<CalendarClock size={15} aria-hidden="true" />}
                        loading={scheduling === p.printerId} onPress={() => void schedule(p)} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <h2 className={styles.sectionTitle}>Exportar datos</h2>
          <p className={styles.hint} style={{ marginBottom: 12 }}>
            Archivos CSV listos para abrir en Excel o Google Sheets (separador «;» y coma decimal). Usan el período elegido arriba, salvo el inventario.
          </p>
          <div className={styles.grid}>
            {EXPORTS.map((e) => (
              <Card key={e.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}><FileSpreadsheet size={16} aria-hidden="true" /> {e.label}</h3>
                    <p className={styles.cardSub}>{e.description}</p>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Button title="Descargar CSV" size="sm" variant="secondary" fullWidth={false} icon={<Download size={15} aria-hidden="true" />}
                    loading={exporting === e.id} onPress={() => void exportCsv(e.id)} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
