import { useRef, useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import { Button } from '../ui';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../services/authService';
import { workspaceService } from '../../services/workspaceService';
import type { Workspace } from '../../services/workspaceService';
import styles from './QuoteSidebar.module.css';
import { useUploadsEnabled } from '../../hooks/useUploadsEnabled';

interface Props {
  workspace: Workspace | null;
  canEdit: boolean;
  onChange: (w: Workspace) => void;
}

// Logo del taller para el encabezado de los PDF (PNG o JPG, hasta 2 MB).
export default function LogoUploader({ workspace, canEdit, onChange }: Props) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const logo = workspace?.logoUrl ?? null;
  const uploadsEnabled = useUploadsEnabled();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      showToast('El logo tiene que ser un PNG o JPG.', { type: 'error' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('El logo no puede superar los 2 MB.', { type: 'error' });
      return;
    }
    setUploading(true);
    try {
      onChange(await workspaceService.uploadLogo(file));
      showToast('Logo actualizado: aparece en todos los PDF del taller.', { type: 'success' });
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo subir el logo.'), { type: 'error' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async () => {
    try {
      onChange(await workspaceService.deleteLogo());
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo quitar el logo.'), { type: 'error' });
    }
  };

  if (!uploadsEnabled) return null;

  return (
    <div className={styles.logoRow}>
      <div className={styles.logoBox}>{logo ? <img src={logo} alt="Logo del taller" /> : <span>Sin logo</span>}</div>
      <div className={styles.logoText}>
        <strong>Logo del encabezado</strong>
        <span>PNG o JPG, hasta 2 MB. Es el mismo para todos los presupuestos.</span>
        {canEdit ? (
          <div className={styles.logoActions}>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => void upload(e.target.files?.[0])} />
            <Button title={logo ? 'Cambiar' : 'Subir logo'} size="sm" variant="tinted" fullWidth={false} loading={uploading}
              icon={<ImageUp size={16} aria-hidden="true" />} onPress={() => fileRef.current?.click()} />
            {logo && (
              <Button title="Quitar" size="sm" variant="ghost" fullWidth={false} icon={<Trash2 size={16} aria-hidden="true" />}
                onPress={() => void remove()} />
            )}
          </div>
        ) : (
          <span>Solo el supervisor puede cambiarlo.</span>
        )}
      </div>
    </div>
  );
}
