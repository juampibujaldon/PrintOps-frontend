// src/screens/PublicQuoteScreen.tsx — /q/:token (sin sesión)
// Presupuesto compartido con el cliente: lo ve, descarga el PDF y lo acepta o rechaza.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Download, Mail, MapPin, Phone, XCircle } from 'lucide-react';
import { Button, Card, Spinner, TextField } from '../components/ui';
import { publicQuoteService } from '../services/publicQuoteService';
import type { PublicQuote } from '../api/types';
import styles from './PublicQuoteScreen.module.css';

const money = (v: number, currency: string) =>
  `${currency === 'ARS' ? '$' : currency + ' '} ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PublicQuoteScreen() {
  const { token = '' } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState<'accept' | 'reject' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Presupuesto · PrintOps';
    publicQuoteService
      .get(token)
      .then((q) => {
        setQuote(q);
        setState('ready');
        if (q.workshop?.name) document.title = `Presupuesto ${q.quoteNumber} · ${q.workshop.name}`;
      })
      .catch((e) => setState((e as { response?: { status?: number } }).response?.status === 404 ? 'notfound' : 'error'));
  }, [token]);

  const decide = async (accept: boolean) => {
    setDeciding(accept ? 'accept' : 'reject');
    setActionError(null);
    try {
      const fn = accept ? publicQuoteService.accept : publicQuoteService.reject;
      setQuote(await fn(token, name.trim() || undefined, note.trim() || undefined));
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setActionError(err.response?.data?.message ?? 'No se pudo registrar tu respuesta. Probá de nuevo.');
    } finally {
      setDeciding(null);
    }
  };

  if (state === 'loading') {
    return (
      <main className={styles.page}>
        <Spinner label="Cargando presupuesto" />
      </main>
    );
  }
  if (state !== 'ready' || !quote) {
    return (
      <main className={styles.page}>
        <Card className={styles.card}>
          <h1 className={styles.title}>{state === 'notfound' ? 'Presupuesto no disponible' : 'No pudimos cargar el presupuesto'}</h1>
          <p className={styles.muted}>
            {state === 'notfound'
              ? 'El link no existe o el taller lo desactivó. Pedile uno nuevo a quien te lo envió.'
              : 'Revisá tu conexión y volvé a intentar.'}
          </p>
        </Card>
      </main>
    );
  }

  const w = quote.workshop;
  const decided = quote.status === 'ACCEPTED' || quote.status === 'PAID' || quote.status === 'REJECTED';
  const canDecide = quote.status === 'SENT' && !quote.expired;

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <header className={styles.header}>
          <div>
            <p className={styles.overline}>Presupuesto {quote.quoteNumber}</p>
            <h1 className={styles.title}>{w?.name ?? 'Impresión 3D'}</h1>
            {quote.clientName && <p className={styles.muted}>Para {quote.clientName}</p>}
          </div>
        </header>

        {quote.jobDescription && <p className={styles.description}>{quote.jobDescription}</p>}

        <dl className={styles.lines}>
          <div><dt>Cantidad</dt><dd>{quote.units} unidad{quote.units !== 1 ? 'es' : ''}</dd></div>
          <div><dt>Precio por unidad</dt><dd>{money(quote.unitPrice, quote.currency)}</dd></div>
          {quote.discountPercent > 0 && <div><dt>Descuento</dt><dd>{quote.discountPercent}%</dd></div>}
          {quote.validUntil && (
            <div><dt>Válido hasta</dt><dd>{new Date(quote.validUntil + 'T00:00').toLocaleDateString('es-AR')}</dd></div>
          )}
        </dl>

        <div className={styles.total}>
          <span>Total</span>
          <strong>{money(quote.totalPrice, quote.currency)}</strong>
        </div>

        <a className={styles.pdf} href={publicQuoteService.pdfUrl(token)} target="_blank" rel="noopener noreferrer">
          <Download size={18} aria-hidden="true" /> Descargar PDF
        </a>

        {decided ? (
          <div className={quote.status === 'REJECTED' ? styles.rejected : styles.accepted} role="status">
            {quote.status === 'REJECTED' ? <XCircle size={22} aria-hidden="true" /> : <CheckCircle2 size={22} aria-hidden="true" />}
            <span>
              {quote.status === 'REJECTED' ? 'Rechazaste este presupuesto.' : '¡Presupuesto aceptado! El taller ya fue notificado.'}
            </span>
          </div>
        ) : quote.expired ? (
          <p className={styles.expired}>Este presupuesto venció. Pedile uno actualizado al taller.</p>
        ) : canDecide ? (
          <section className={styles.decision} aria-label="Tu respuesta">
            <TextField label="Tu nombre (opcional)" value={name} onChangeText={setName} />
            <TextField multiline label="Comentario (opcional)" value={note} onChangeText={setNote} maxLength={500} />
            {actionError && <p className={styles.error} role="alert">{actionError}</p>}
            <div className={styles.buttons}>
              <Button title="Aceptar presupuesto" loading={deciding === 'accept'} disabled={deciding !== null} onPress={() => void decide(true)} />
              <Button title="Rechazar" variant="secondary" loading={deciding === 'reject'} disabled={deciding !== null} onPress={() => void decide(false)} />
            </div>
          </section>
        ) : null}

        {w && (w.email || w.phone || w.address) && (
          <footer className={styles.contact}>
            <p className={styles.overline}>Contacto</p>
            {w.phone && <a href={`tel:${w.phone}`}><Phone size={15} aria-hidden="true" /> {w.phone}</a>}
            {w.email && <a href={`mailto:${w.email}`}><Mail size={15} aria-hidden="true" /> {w.email}</a>}
            {w.address && <span><MapPin size={15} aria-hidden="true" /> {w.address}</span>}
          </footer>
        )}
      </Card>
      <p className={styles.powered}>Generado con PrintOps</p>
    </main>
  );
}
