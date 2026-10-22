// src/screens/PrinterRulesScreen.tsx
import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Wrench } from 'lucide-react';
import { usePrinterById } from '../hooks/usePrinterById';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import type { MaintenanceRuleDTO } from '../types/rules';
import { ruleService } from '../services/ruleService';
import RuleProgressCard from '../components/RuleProgressCard';
import CreateRuleBottomSheet from '../components/CreateRuleBottomSheet';
import { Button, EmptyState, ErrorState, Modal, ScreenHeader, Skeleton } from '../components/ui';
import styles from './PrinterRulesScreen.module.css';

export default function PrinterRulesScreen() {
  const { printerId, printer } = usePrinterById();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [rules, setRules] = useState<MaintenanceRuleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuRule, setMenuRule] = useState<MaintenanceRuleDTO | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (printerId == null) {
        setError('No se encontró la impresora.');
        setLoading(false);
        return;
      }
      try {
        if (isRefresh) setRefreshing(true);
        setError(null);
        setRules(await ruleService.getRules(printerId));
      } catch {
        setError('No se pudieron cargar las reglas.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [printerId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (rule: MaintenanceRuleDTO, action: 'pause' | 'resume') => {
    setMenuRule(null);
    try {
      const updated = action === 'pause' ? await ruleService.pauseRule(rule.id) : await ruleService.resumeRule(rule.id);
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      showToast('No se pudo actualizar la regla.', { type: 'error', title: 'Error' });
    }
  };

  const remove = async (rule: MaintenanceRuleDTO) => {
    setMenuRule(null);
    const ok = await confirm({
      title: 'Eliminar regla',
      message: '¿Seguro que querés eliminar esta regla de mantenimiento?',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await ruleService.deleteRule(rule.id);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch {
      showToast('No se pudo eliminar la regla.', { type: 'error', title: 'Error' });
    }
  };

  const printerName = printer ? printer.name || printer.model : undefined;
  const backTo = printerId != null ? `/printers/${printerId}` : '/printers';

  const header = (
    <ScreenHeader
      title="Reglas de mantenimiento"
      subtitle={printerName}
      backTo={backTo}
      rightContent={
        <>
          <Button
            title="Actualizar"
            variant="secondary"
            size="sm"
            fullWidth={false}
            icon={<RefreshCw size={16} />}
            loading={refreshing}
            onPress={() => void load(true)}
          />
          {printerId != null ? (
            <Button
              title="Nueva regla"
              size="sm"
              fullWidth={false}
              icon={<Plus size={16} />}
              onPress={() => setSheetOpen(true)}
            />
          ) : null}
        </>
      }
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <div className={styles.grid} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={140} className={styles.skeleton} />
          ))}
        </div>
      </>
    );
  }

  if (error && rules.length === 0) {
    return (
      <>
        {header}
        <ErrorState
          error={error}
          onRetry={() => {
            setLoading(true);
            void load();
          }}
        />
      </>
    );
  }

  return (
    <>
      {header}

      {rules.length === 0 ? (
        <EmptyState
          icon={<Wrench size={40} strokeWidth={1.5} />}
          title="Sin reglas configuradas"
          description="Creá la primera regla para automatizar el mantenimiento de esta impresora."
          action={<Button title="Nueva regla" variant="tinted" fullWidth={false} onPress={() => setSheetOpen(true)} />}
        />
      ) : (
        <ul className={styles.grid}>
          {rules.map((rule) => (
            <li key={rule.id}>
              <RuleProgressCard rule={rule} onMenuPress={() => setMenuRule(rule)} />
            </li>
          ))}
        </ul>
      )}

      {printerId != null ? (
        <CreateRuleBottomSheet
          visible={sheetOpen}
          printerId={printerId}
          onClose={() => setSheetOpen(false)}
          onCreated={(created) => setRules((prev) => [...prev, created])}
        />
      ) : null}

      <Modal open={menuRule !== null} onClose={() => setMenuRule(null)} title="Regla de mantenimiento" size="sm">
        {menuRule ? (
          <div className={styles.menu}>
            {menuRule.active ? (
              <Button title="Pausar" variant="secondary" onPress={() => void toggle(menuRule, 'pause')} />
            ) : (
              <Button title="Reactivar" variant="secondary" onPress={() => void toggle(menuRule, 'resume')} />
            )}
            <Button title="Eliminar" variant="danger" onPress={() => void remove(menuRule)} />
            <Button title="Cancelar" variant="ghost" onPress={() => setMenuRule(null)} />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
