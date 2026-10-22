// src/screens/PrivacyPolicyScreen.tsx
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import LegalDocument from '../components/legal/LegalDocument';
import type { LegalSection } from '../components/legal/LegalDocument';
import { useAuth } from '../hooks/useAuth';

const SECTIONS: LegalSection[] = [
  {
    title: 'Información que Recopilamos',
    paragraphs: [
      'En PrintOps nos tomamos muy en serio la privacidad de los datos de su taller. Recopilamos y almacenamos la siguiente información estrictamente para el funcionamiento de la aplicación:',
    ],
    bullets: [
      { label: 'Datos Operativos', text: 'Modelos de impresoras, estados de mantenimiento, inventario y registros de errores.' },
      { label: 'Datos Comerciales', text: 'Información de presupuestos, órdenes de trabajo e historial de impresiones.' },
      { label: 'Archivos Multimedia', text: 'Fotografías de comprobantes, piezas impresas o estados de las máquinas, subidas por los usuarios.' },
    ],
  },
  {
    title: 'Permisos del Dispositivo Requeridos',
    paragraphs: [
      'Para ofrecer una experiencia completa, PrintOps solicitará acceso a las siguientes funciones de su dispositivo, las cuales solo se usan con su consentimiento explícito:',
    ],
    bullets: [
      { label: 'Cámara', text: 'Utilizada exclusivamente para escanear los códigos QR de las impresoras y agilizar la identificación del equipo en el taller.' },
      { label: 'Galería de Fotos', text: 'Requerida para que el usuario pueda seleccionar y adjuntar comprobantes de pago o imágenes de referencia en los presupuestos y mantenimientos.' },
    ],
  },
  {
    title: 'Uso de la Información',
    paragraphs: [
      'Toda la información ingresada en la aplicación se sincroniza con nuestros servidores seguros y se utiliza única y exclusivamente para:',
    ],
    bullets: [
      'Sincronizar el estado del taller en tiempo real entre todo el equipo.',
      'Generar históricos de mantenimiento y presupuestos.',
      'Mejorar la funcionalidad del sistema.',
    ],
    closing: [
      'No vendemos, alquilamos ni compartimos la información de su taller o sus clientes con terceros bajo ninguna circunstancia.',
    ],
  },
  {
    title: 'Seguridad de los Datos',
    paragraphs: [
      'Implementamos medidas de seguridad de nivel estándar en la industria para proteger su información contra acceso no autorizado, alteración o destrucción.',
    ],
  },
  {
    title: 'Sus Derechos',
    paragraphs: [
      'Usted o el administrador de su taller pueden solicitar en cualquier momento la eliminación total o parcial de los registros, presupuestos o archivos multimedia almacenados en el sistema contactando al administrador general de la plataforma.',
    ],
  },
  {
    title: 'Contacto',
    paragraphs: [
      'Si tiene dudas sobre el manejo de su información o necesita revocar accesos, puede comunicarse con el administrador de su espacio de trabajo en PrintOps.',
    ],
  },
];

// Se renderiza dentro de StandaloneLayout (también sin sesión): volver a /settings si hay sesión, si no a /login.
export default function PrivacyPolicyScreen() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  return (
    <LegalDocument
      icon={ShieldCheck}
      title="Política de Privacidad"
      lastUpdated="10 de octubre de 2026"
      sections={SECTIONS}
      actionLabel="Volver"
      onAction={() => navigate(isAuthenticated ? '/settings' : '/login')}
    />
  );
}
