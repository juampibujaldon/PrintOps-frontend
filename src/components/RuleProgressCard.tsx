// src/components/RuleProgressCard.tsx
import { useState } from 'react';
import { CheckSquare, ChevronDown, ChevronUp, Clock, Cog, Cylinder, MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MaintenanceRuleDTO, TriggerType } from '../types/rules';
import { cx } from '../utils/cx';
import styles from './RuleProgressCard.module.css';

// Metadatos por tipo de disparo: ícono y título dinámico.
const TRIGGER_META: Record<TriggerType, { Icon: LucideIcon; title: (v: number) => string }> = {
  TIME_BASED: { Icon: Clock, title: (v) => `Cada ${v} días` },
  USAGE_HOURS: { Icon: Cog, title: (v) => `Cada ${v} hs de uso` },
  FILAMENT_GRAMS: { Icon: Cylinder, title: (v) => `Cada ${v}g de filamento` },
};

const MAINTENANCE_LABEL: Record<string, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  CALIBRATION: 'Calibración',
};

// Color de la barra según el % de progreso.
function barColor(progress: number): string {
  if (progress >= 90) return '#FF3B30';
  if (progress >= 70) return '#FF9500';
  return '#34C759';
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso + 'T00:00:00').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

export default function RuleProgressCard({
  rule,
  onMenuPress,
}: {
  rule: MaintenanceRuleDTO;
  onMenuPress: () => void;
}) {
  const meta = TRIGGER_META[rule.triggerType];
  const progress = Math.max(0, Math.min(100, rule.progressPercent ?? 0));

  const remaining = rule.triggerType === 'TIME_BASED' ? daysUntil(rule.nextTriggerEstimate) : null;
  const showAlert = remaining !== null && remaining >= 0 && remaining <= (rule.alertDaysBefore ?? 7) && progress < 100;
  const triggered = progress >= 100;

  const progressText = (() => {
    switch (rule.triggerType) {
      case 'TIME_BASED':
        return rule.nextTriggerEstimate
          ? `Próximo: ${formatDate(rule.nextTriggerEstimate)} · en ${Math.max(0, remaining ?? 0)} días`
          : 'Sin fecha estimada';
      case 'USAGE_HOURS':
        return `Uso actual: ${Math.round(rule.currentValue ?? 0)}hs / ${rule.triggerValue}hs`;
      case 'FILAMENT_GRAMS':
        return `Consumido: ${Math.round(rule.currentValue ?? 0)}g / ${rule.triggerValue}g`;
      default:
        return '';
    }
  })();

  return (
    <article className={cx(styles.card, triggered && styles.cardTriggered, !rule.active && styles.cardPaused)}>
      <div className={styles.row}>
        <span className={styles.iconBox}>
          <meta.Icon size={18} aria-hidden="true" />
        </span>
        <div className={styles.info}>
          <h3 className={styles.title}>{meta.title(rule.triggerValue)}</h3>
          <p className={styles.progressText}>{progressText}</p>
          <p className={styles.typeText}>Tipo: {MAINTENANCE_LABEL[rule.maintenanceType] ?? rule.maintenanceType}</p>
        </div>
        <button type="button" className={styles.menuBtn} onClick={onMenuPress} aria-label="Opciones de la regla">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div
        className={styles.track}
        role="progressbar"
        aria-label="Progreso de la regla"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div className={styles.fill} style={{ width: `${progress}%`, backgroundColor: barColor(progress) }} />
      </div>

      <div className={styles.metaRow}>
        {showAlert ? <span className={styles.alert}>Próximo mantenimiento</span> : <span />}
        {!rule.active ? <span className={styles.paused}>Pausada</span> : null}
        <span className={styles.percent}>{Math.round(progress)}%</span>
      </div>

      {triggered ? <p className={styles.triggeredText}>Condición alcanzada. Generando orden…</p> : null}

      <ChecklistPreview items={rule.checklistItems ?? []} />
    </article>
  );
}

// Checklist que se copia a la orden generada por la regla; colapsable.
function ChecklistPreview({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) {
    return <p className={styles.checklistEmpty}>Sin checklist</p>;
  }
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <div className={styles.checklist}>
      <button type="button" className={styles.checklistHeader} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <CheckSquare size={14} aria-hidden="true" />
        <span className={styles.checklistTitle}>
          Checklist · {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
        </span>
        <Chevron size={16} aria-hidden="true" />
      </button>
      {open ? (
        <ul>
          {items.map((item, i) => (
            <li key={i} className={styles.checklistRow}>
              <span className={styles.checklistBullet} aria-hidden="true" />
              <span className={styles.checklistItem}>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
