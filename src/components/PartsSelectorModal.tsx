// src/components/PartsSelectorModal.tsx
import { useEffect, useState } from 'react';
import type { SparePartDTO } from '../types/parts';
import { partService } from '../services/partService';
import { useAlert } from '../context/ConfirmContext';
import { Button, Modal, Spinner, TextField } from './ui';
import styles from './PartsSelectorModal.module.css';

// Modal de búsqueda de piezas para agregar a una orden (US-10). No descuenta
// stock: solo devuelve la selección al caller (la orden se descuenta al cerrarse).
type Props = {
  visible: boolean;
  onClose: () => void;
  onAddCatalog: (part: SparePartDTO, quantity: number) => void;
  onAddExternal: (name: string, partNumber: string, unitPrice: number, quantity: number) => void;
};

export default function PartsSelectorModal({ visible, onClose, onAddCatalog, onAddExternal }: Props) {
  const alert = useAlert();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SparePartDTO[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<SparePartDTO | null>(null);
  const [qty, setQty] = useState('1');

  const [extName, setExtName] = useState('');
  const [extNumber, setExtNumber] = useState('');
  const [extPrice, setExtPrice] = useState('');
  const [extQty, setExtQty] = useState('1');

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setQty('1');
    let active = true;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await partService.listParts({ search: search.trim() || undefined });
        if (active) setResults(data);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search, visible]);

  const confirmCatalog = () => {
    if (!selected) return;
    const q = parseInt(qty, 10) || 1;
    const max = Math.max(1, selected.stock);
    onAddCatalog(selected, Math.min(q, max));
    setSelected(null);
    setQty('1');
  };

  const confirmExternal = () => {
    if (!extName.trim() && !extNumber.trim()) {
      void alert({ title: 'Atención', message: 'Ingresá al menos un nombre o número de parte.' });
      return;
    }
    const q = parseInt(extQty, 10) || 1;
    const price = Number(extPrice) || 0;
    onAddExternal(extName.trim(), extNumber.trim(), price, q);
    setExtName('');
    setExtNumber('');
    setExtPrice('');
    setExtQty('1');
  };

  return (
    <Modal
      open={visible}
      onClose={onClose}
      title="Agregar pieza"
      footer={<Button variant="ghost" title="Listo" fullWidth={false} onPress={onClose} />}
    >
      <TextField
        aria-label="Buscar pieza"
        type="search"
        placeholder="Buscar por nombre o N° parte..."
        value={search}
        onChangeText={setSearch}
        autoComplete="off"
      />

      {searching ? (
        <div className={styles.spinner}>
          <Spinner size={24} label="Buscando piezas" />
        </div>
      ) : selected ? (
        <div className={styles.qtyBlock}>
          <p className={styles.selectedName}>{selected.name}</p>
          <p className={styles.selectedMeta}>Disponible: {selected.stock}</p>
          <div className={styles.qtyRow}>
            <TextField
              containerClassName={styles.qtyField}
              label="Cantidad"
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(1, selected.stock)}
              value={qty}
              onChangeText={setQty}
            />
            <Button title="Agregar" fullWidth={false} onPress={confirmCatalog} className={styles.qtyBtn} />
          </div>
        </div>
      ) : (
        <ul className={styles.list}>
          {results.length === 0 ? <li className={styles.empty}>No encontramos piezas que coincidan</li> : null}
          {results.map((item) => {
            const out = item.isOutOfStock;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.resultRow}
                  disabled={out}
                  onClick={() => {
                    setSelected(item);
                    setQty('1');
                  }}
                >
                  <span className={styles.resultInfo}>
                    <span className={out ? styles.resultNameDisabled : styles.resultName}>{item.name}</span>
                    <span className={styles.resultMeta}>
                      {item.partNumber} · stock {item.stock}
                    </span>
                  </span>
                  {out ? <span className={styles.outBadge}>Sin stock</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className={styles.subtitle}>Pieza externa (no está en el catálogo)</h3>
      <TextField aria-label="Nombre" placeholder="Nombre" value={extName} onChangeText={setExtName} />
      <TextField aria-label="N° de parte" placeholder="N° de parte" value={extNumber} onChangeText={setExtNumber} />
      <div className={styles.qtyRow}>
        <TextField
          containerClassName={styles.qtyField}
          aria-label="Precio"
          placeholder="Precio"
          inputMode="decimal"
          value={extPrice}
          onChangeText={setExtPrice}
        />
        <TextField
          containerClassName={styles.qtyField}
          aria-label="Cantidad"
          placeholder="Cant."
          inputMode="numeric"
          value={extQty}
          onChangeText={setExtQty}
        />
      </div>
      <Button variant="secondary" title="+ Agregar pieza externa" onPress={confirmExternal} />
    </Modal>
  );
}
