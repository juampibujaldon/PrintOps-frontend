// src/screens/TermsAndConditionsScreen.tsx
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import LegalDocument from '../components/legal/LegalDocument';
import type { LegalSection } from '../components/legal/LegalDocument';
import { useAuth } from '../hooks/useAuth';

const SECTIONS: LegalSection[] = [
  {
    title: 'Introducción',
    paragraphs: [
      'Bienvenido a PrintOps. Al acceder y utilizar esta aplicación, usted (en adelante, "el Usuario" o "el Técnico") acepta estar sujeto a los siguientes Términos y Condiciones. PrintOps es una plataforma diseñada para la gestión integral de granjas de impresión 3D, control de mantenimiento de maquinaria y generación de presupuestos.',
    ],
  },
  {
    title: 'Cuentas y Seguridad',
    paragraphs: [
      'Para utilizar PrintOps, se requiere una cuenta autorizada por la administración del taller. El Usuario es responsable de mantener la confidencialidad de sus credenciales. Es responsabilidad del usuario asegurar su dispositivo y cerrar la sesión al usar equipos compartidos.',
    ],
  },
  {
    title: 'Uso Aceptable de la Aplicación',
    paragraphs: [
      'El Usuario se compromete a utilizar la aplicación exclusivamente para fines laborales y de gestión interna del taller de impresión 3D. Esto incluye:',
    ],
    bullets: [
      'Escanear códigos QR de las impresoras para su identificación.',
      'Actualizar el estado del equipo (operativa, en mantenimiento, fuera de servicio).',
      'Generar y gestionar presupuestos para clientes.',
      'Subir comprobantes o imágenes relacionadas con las órdenes de impresión o mantenimientos.',
    ],
  },
  {
    title: 'Limitación de Responsabilidad',
    paragraphs: [
      'PrintOps provee herramientas para calcular presupuestos y llevar registros, pero no se hace responsable por errores humanos en la carga de datos, cálculos incorrectos de precios de impresión o fallas mecánicas en las impresoras. Toda la información registrada es responsabilidad del equipo de gestión del taller.',
    ],
  },
  {
    title: 'Modificaciones',
    paragraphs: [
      'Nos reservamos el derecho de modificar o actualizar estos Términos y Condiciones en cualquier momento. Los cambios significativos serán notificados a través de la aplicación. El uso continuo de PrintOps tras dichas modificaciones constituirá la aceptación de los nuevos términos.',
    ],
  },
];

// Se renderiza dentro de StandaloneLayout (también sin sesión): volver a /settings si hay sesión, si no a /login.
export default function TermsAndConditionsScreen() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  return (
    <LegalDocument
      icon={FileText}
      title="Términos y Condiciones de Uso"
      lastUpdated="10 de octubre de 2026"
      sections={SECTIONS}
      actionLabel="Aceptar y volver"
      onAction={() => navigate(isAuthenticated ? '/settings' : '/login')}
    />
  );
}
