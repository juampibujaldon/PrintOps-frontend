// src/screens/HomeScreen.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Printer, QrCode, RefreshCw, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useAlert } from '../context/ConfirmContext';
import { printerService } from '../services/printerService';
import type { PrinterResponse } from '../services/printerService';
import { workspaceService } from '../services/workspaceService';
import PrinterCard from '../components/home/PrinterCard';
import SummaryBar from '../components/home/SummaryBar';
import FiltersBar from '../components/home/FiltersBar';
import type { StatusFilter } from '../components/home/FiltersBar';
import { Button, EmptyState, IconButton, Modal, ScreenHeader, Skeleton, TextField } from '../components/ui';
import styles from './HomeScreen.module.css';

function errorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const alert = useAlert();

  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

  const loadPrinters = useCallback(async () => {
    try {
      const data = await printerService.getAllPrinters();
      setPrinters(data);
    } catch (error) {
      showToast(errorMessage(error, 'Revisá tu conexión e intentá de nuevo.'), {
        type: 'error',
        title: 'No se pudieron cargar las impresoras',
      });
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    loadPrinters().finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [loadPrinters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrinters();
    setRefreshing(false);
  };

  const filteredPrinters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return printers.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (!q) return true;
      return [p.name, p.brand, p.model, p.serialNumber, p.location].some((field) =>
        (field ?? '').toLowerCase().includes(q),
      );
    });
  }, [printers, statusFilter, search]);

  const handleOpenPrinter = useCallback(
    (printer: PrinterResponse) => navigate(`/printers/${printer.id}`, { state: { printer } }),
    [navigate],
  );

  const handleInvite = () => {
    setInviteEmail('');
    setInviteVisible(true);
  };

  const sendInvite = async (e?: FormEvent) => {
    e?.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteSending(true);
    try {
      const res = await workspaceService.invite(email);
      setInviteVisible(false);
      await alert({ title: res.emailSent ? 'Invitación enviada' : 'No se pudo enviar el email', message: res.message });
    } catch (error) {
      showToast(errorMessage(error, 'No se pudo invitar'), { type: 'error', title: 'Error' });
    } finally {
      setInviteSending(false);
    }
  };

  const rightContent = (
    <>
      <IconButton icon={<ClipboardList size={22} />} label="Órdenes" onPress={() => navigate('/orders')} />
      {user?.role === 'MANAGER' ? (
        <IconButton icon={<UserPlus size={22} />} label="Invitar técnico" onPress={handleInvite} />
      ) : null}
      <IconButton icon={<QrCode size={22} />} label="Escanear QR" onPress={() => navigate('/printers/scan')} />
      <IconButton icon={<Plus size={22} />} label="Nueva impresora" onPress={() => navigate('/printers/new')} />
    </>
  );

  return (
    <>
      <ScreenHeader title="Impresoras" rightContent={rightContent} />

      <SummaryBar printers={printers} />

      <div className={styles.toolbar}>
        <FiltersBar
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          search={search}
          onSearch={setSearch}
        />
        <Button
          title="Actualizar"
          variant="secondary"
          fullWidth={false}
          size="sm"
          icon={<RefreshCw size={16} />}
          loading={refreshing}
          onPress={onRefresh}
          className={styles.refresh}
        />
      </div>

      {loading ? (
        <div className={styles.grid} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={112} className={styles.skeleton} />
          ))}
        </div>
      ) : filteredPrinters.length > 0 ? (
        <ul className={styles.grid}>
          {filteredPrinters.map((p) => (
            <li key={p.id}>
              <PrinterCard printer={p} onPress={handleOpenPrinter} />
            </li>
          ))}
        </ul>
      ) : printers.length === 0 ? (
        <EmptyState
          icon={<Printer size={44} strokeWidth={1.5} />}
          title="Sin impresoras"
          description="Agregá tu primera impresora para empezar a gestionar su mantenimiento."
          action={<Button title="Agregar impresora" variant="tinted" onPress={() => navigate('/printers/new')} />}
        />
      ) : (
        <EmptyState title="Sin resultados" description="Ninguna impresora coincide con los filtros." />
      )}

      <Modal
        open={inviteVisible}
        onClose={() => !inviteSending && setInviteVisible(false)}
        title="Invitar técnico"
        size="sm"
        footer={
          <div className={styles.modalActions}>
            <Button
              title="Cancelar"
              variant="ghost"
              fullWidth={false}
              onPress={() => setInviteVisible(false)}
              disabled={inviteSending}
            />
            <Button title="Enviar" fullWidth={false} onPress={() => sendInvite()} loading={inviteSending} />
          </div>
        }
      >
        <form onSubmit={sendInvite}>
          <TextField
            label="Email del técnico"
            type="email"
            placeholder="Email del técnico"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            data-autofocus
            value={inviteEmail}
            onChangeText={setInviteEmail}
          />
        </form>
      </Modal>
    </>
  );
}
