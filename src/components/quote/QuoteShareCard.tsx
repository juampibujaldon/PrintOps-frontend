import { Check, Copy, Link2, MessageCircle, Unlink } from 'lucide-react';
import { useState } from 'react';
import { Button, Card } from '../ui';
import type { Quote } from '../../types/quote';
import styles from './QuoteSidebar.module.css';

interface Props {
  quote: Pick<Quote, 'publicUrl' | 'status' | 'clientName' | 'quoteNumber' | 'clientDecisionAt' | 'clientDecisionNote'> | null;
  busy: boolean;
  onShare: () => void;
  onUnshare: () => void;
}

// Link público: el cliente ve el presupuesto, descarga el PDF y lo acepta o rechaza sin cuenta.
export default function QuoteShareCard({ quote, busy, onShare, onUnshare }: Props) {
  const [copied, setCopied] = useState(false);
  // El link se arma con el origen de esta página (siempre el dominio real del front), sin
  // depender de que FRONTEND_URL esté bien configurado en el backend.
  const token = quote?.publicUrl?.split('/q/')[1] ?? null;
  const url = token ? `${window.location.origin}/q/${token}` : null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copiá el link:', url);
    }
  };

  const whatsapp = () => {
    if (!url) return;
    const text = `Hola${quote?.clientName ? ' ' + quote.clientName : ''}, te paso el presupuesto ${quote?.quoteNumber ?? ''}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={styles.panel}>
      <h2 className={styles.panelTitle}>
        <Link2 size={17} aria-hidden="true" /> Link para el cliente
      </h2>

      {quote?.clientDecisionAt && (
        <p className={quote.status === 'ACCEPTED' || quote.status === 'PAID' ? styles.decisionOk : styles.decisionNo}>
          {quote.status === 'REJECTED' ? 'El cliente lo rechazó' : 'El cliente lo aceptó'} el{' '}
          {new Date(quote.clientDecisionAt).toLocaleDateString('es-AR')}
          {quote.clientDecisionNote ? ` · «${quote.clientDecisionNote}»` : ''}
        </p>
      )}

      {url ? (
        <>
          <div className={styles.linkBox}>
            <input readOnly value={url} aria-label="Link público del presupuesto" onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div className={styles.buttonRow}>
            <Button
              title={copied ? 'Copiado' : 'Copiar'}
              size="sm"
              variant="secondary"
              icon={copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              onPress={() => void copy()}
            />
            <Button title="WhatsApp" size="sm" variant="secondary" icon={<MessageCircle size={16} aria-hidden="true" />} onPress={whatsapp} />
            <Button title="Desactivar" size="sm" variant="ghost" icon={<Unlink size={16} aria-hidden="true" />} loading={busy} onPress={onUnshare} />
          </div>
        </>
      ) : (
        <>
          <p className={styles.panelText}>
            El cliente lo abre desde el celular, descarga el PDF y lo acepta con un click. Al aceptarlo entra solo a
            la cola de impresión.
            {quote?.status === 'DRAFT' ? ' Compartir un borrador lo marca como enviado.' : ''}
          </p>
          <Button title="Crear link" variant="tinted" icon={<Link2 size={17} aria-hidden="true" />} loading={busy} onPress={onShare} />
        </>
      )}
    </Card>
  );
}
