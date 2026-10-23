import { useRef, useState } from 'react';
import { Download, Eye, ExternalLink, FileText, ImageUp, Share2, Trash2 } from 'lucide-react';
import { Button, Card, SwitchRow } from '../ui';
import { useToast } from '../../context/ToastContext';
import { workspaceService } from '../../services/workspaceService';
import type { Workspace } from '../../services/workspaceService';
import { apiErrorMessage } from '../../services/authService';
import styles from './QuoteSidebar.module.css';

interface Props {
  isDraft: boolean;
  watermark: boolean;
  readOnly: boolean;
  onWatermarkChange: (v: boolean) => void;
  workspace: Workspace | null;
  canEditLogo: boolean;
  onWorkspaceChange: (w: Workspace) => void;
  generating: boolean;
  pdfReady: boolean;
  shareable: boolean;
  onPreview: () => void;
  onGenerate: () => void;
  onDownload: () => void;
  onOpen: () => void;
  onShare: () => void;
}

// Opciones del PDF: marca de agua de borrador, logo del taller y generar/descargar.
export default function QuotePdfPanel(p: Props) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const logo = p.workspace?.logoUrl ?? null;

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
      p.onWorkspaceChange(await workspaceService.uploadLogo(file));
      showToast('Logo actualizado: aparece en todos los PDF del taller.', { type: 'success' });
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo subir el logo.'), { type: 'error' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    try {
      p.onWorkspaceChange(await workspaceService.deleteLogo());
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo quitar el logo.'), { type: 'error' });
    }
  };

  return (
    <Card className={styles.panel}>
      <h2 className={styles.panelTitle}>
        <FileText size={17} aria-hidden="true" /> PDF para el cliente
      </h2>

      <SwitchRow
        label="Marca de agua «BORRADOR»"
        description={p.isDraft ? 'Se imprime en diagonal mientras sea borrador.' : 'Solo aplica a borradores.'}
        value={p.watermark}
        disabled={p.readOnly}
        onValueChange={p.onWatermarkChange}
        isLast
      />

      <div className={styles.logoRow}>
        <div className={styles.logoBox} aria-label={logo ? 'Logo del taller' : 'Sin logo'}>
          {logo ? <img src={logo} alt="Logo del taller" /> : <span>Sin logo</span>}
        </div>
        <div className={styles.logoText}>
          <strong>Logo del encabezado</strong>
          <span>PNG o JPG, hasta 2 MB. Es el mismo para todos los presupuestos.</span>
          {p.canEditLogo && (
            <div className={styles.logoActions}>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                hidden
                onChange={(e) => void upload(e.target.files?.[0])}
              />
              <Button
                title={logo ? 'Cambiar' : 'Subir logo'}
                size="sm"
                variant="tinted"
                fullWidth={false}
                loading={uploading}
                icon={<ImageUp size={16} aria-hidden="true" />}
                onPress={() => fileRef.current?.click()}
              />
              {logo && (
                <Button
                  title="Quitar"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  icon={<Trash2 size={16} aria-hidden="true" />}
                  onPress={() => void removeLogo()}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.buttonGrid}>
        <Button title="Vista previa" variant="secondary" icon={<Eye size={17} aria-hidden="true" />} onPress={p.onPreview} />
        <Button title="Generar PDF" icon={<FileText size={17} aria-hidden="true" />} loading={p.generating} onPress={p.onGenerate} />
      </div>
      {p.pdfReady && (
        <div className={styles.buttonRow}>
          <Button title="Descargar" size="sm" variant="secondary" icon={<Download size={16} aria-hidden="true" />} onPress={p.onDownload} />
          <Button title="Abrir" size="sm" variant="secondary" icon={<ExternalLink size={16} aria-hidden="true" />} onPress={p.onOpen} />
          {p.shareable && (
            <Button title="Compartir" size="sm" variant="secondary" icon={<Share2 size={16} aria-hidden="true" />} onPress={p.onShare} />
          )}
        </div>
      )}
    </Card>
  );
}
