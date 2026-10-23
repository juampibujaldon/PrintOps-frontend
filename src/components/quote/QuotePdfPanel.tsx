import { Download, Eye, ExternalLink, FileText, Share2 } from 'lucide-react';
import { Button, Card, SwitchRow } from '../ui';
import type { Workspace } from '../../services/workspaceService';
import LogoUploader from './LogoUploader';
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

      <LogoUploader workspace={p.workspace} canEdit={p.canEditLogo} onChange={p.onWorkspaceChange} />

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
