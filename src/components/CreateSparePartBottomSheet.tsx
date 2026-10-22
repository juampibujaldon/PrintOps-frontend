import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Modal, TextField } from './ui';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/authService';
import { partService } from '../services/partService';
import type { CreateSparePartInput, SparePartDTO } from '../types/parts';
import styles from './CreateSparePartBottomSheet.module.css';

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  part?: SparePartDTO | null;
  onClose: () => void;
  onSaved: (part: SparePartDTO) => void;
};

const FORM_ID = 'spare-part-form';

// Alta / edición de repuesto. En mobile el Modal se ve como hoja inferior.
export default function CreateSparePartBottomSheet({ visible, mode, part, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplierUrl, setSupplierUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const editing = mode === 'edit' && part;
    setName(editing ? part.name : '');
    setPartNumber(editing ? part.partNumber : '');
    setDescription(editing ? (part.description ?? '') : '');
    setBrand(editing ? (part.brand ?? '') : '');
    setCategory(editing ? (part.category ?? '') : '');
    setStock(editing ? String(part.stock) : '');
    setMinStock(editing ? String(part.minStock) : '');
    setUnitPrice(editing ? String(part.unitPrice) : '');
    setSupplierUrl(editing ? (part.supplierUrl ?? '') : '');
  }, [visible, mode, part]);

  const num = (v: string) => Number(v.replace(',', '.'));
  const warn = (message: string) => showToast(message, { type: 'error', title: 'Atención' });

  const save = async () => {
    if (!name.trim() || !partNumber.trim()) return warn('El nombre y el número de parte son obligatorios.');
    const stockV = num(stock);
    const minV = num(minStock);
    const priceV = num(unitPrice);
    if (isNaN(stockV) || stockV < 0) return warn('Ingresá un stock válido.');
    if (isNaN(minV) || minV <= 0) return warn('Ingresá un stock mínimo válido (mayor a 0).');
    if (isNaN(priceV) || priceV <= 0) return warn('Ingresá un precio unitario válido.');

    const payload: CreateSparePartInput = {
      name: name.trim(),
      partNumber: partNumber.trim(),
      description: description.trim() || null,
      brand: brand.trim() || null,
      category: category.trim() || null,
      stock: stockV,
      minStock: minV,
      unitPrice: priceV,
      supplierUrl: supplierUrl.trim() || null,
    };

    setSaving(true);
    try {
      const saved =
        mode === 'edit' && part ? await partService.updatePart(part.id, payload) : await partService.createPart(payload);
      onSaved(saved);
      onClose();
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo guardar la pieza.'), { type: 'error', title: 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void save();
  };

  return (
    <Modal
      open={visible}
      onClose={onClose}
      title={mode === 'edit' ? 'Editar repuesto' : 'Nuevo repuesto'}
      footer={<Button title="Guardar" type="submit" form={FORM_ID} loading={saving} />}
    >
      <form id={FORM_ID} className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Boquilla 0.4mm" data-autofocus />
        <TextField label="N° de parte" value={partNumber} onChangeText={setPartNumber} placeholder="Ej: NOZ-04" />
        <TextField label="Descripción" value={description} onChangeText={setDescription} placeholder="Opcional" />
        <TextField label="Marca" value={brand} onChangeText={setBrand} placeholder="Opcional" />
        <TextField
          label="Categoría"
          value={category}
          onChangeText={setCategory}
          placeholder="Ej: Extrusión, Movimiento, Electrónica"
        />
        <div className={styles.row}>
          <TextField label="Stock inicial" value={stock} onChangeText={setStock} inputMode="numeric" placeholder="0" />
          <TextField label="Stock mínimo" value={minStock} onChangeText={setMinStock} inputMode="numeric" placeholder="5" />
        </div>
        <TextField
          label="Precio unitario ($)"
          value={unitPrice}
          onChangeText={setUnitPrice}
          inputMode="decimal"
          placeholder="0.00"
        />
        <TextField
          label="URL del proveedor"
          type="url"
          value={supplierUrl}
          onChangeText={setSupplierUrl}
          placeholder="Opcional"
        />
      </form>
    </Modal>
  );
}
