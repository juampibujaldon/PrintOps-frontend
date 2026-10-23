import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/authService';
import { supplierService } from '../services/supplierService';
import type { Supplier } from '../api/types';
import type { SparePartDTO } from '../types/parts';
import styles from '../screens/FeatureScreens.module.css';

// Proveedor habitual del repuesto (se usa al sugerir órdenes de compra). Solo supervisor.
export default function SupplierPicker({ part, onChange }: { part: SparePartDTO; onChange: (p: SparePartDTO) => void }) {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supplierService.list().then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const change = async (value: string) => {
    setSaving(true);
    try {
      onChange(await supplierService.assignToPart(part.id, value ? Number(value) : null));
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo asignar el proveedor.'), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className={styles.select}>
      <span>Proveedor habitual</span>
      <select value={part.supplierId ?? ''} disabled={saving} onChange={(e) => void change(e.target.value)}>
        <option value="">Sin proveedor</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  );
}
