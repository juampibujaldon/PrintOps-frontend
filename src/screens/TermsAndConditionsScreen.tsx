import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FileText } from 'lucide-react-native';
import { SettingsStackParamList } from '../navigation/SettingsStack';
import LegalDocument, { LegalSection } from '../components/legal/LegalDocument';

type Props = NativeStackScreenProps<SettingsStackParamList, 'TermsAndConditions'>;

const SECTIONS: LegalSection[] = [
  {
    title: 'Introducción',
    paragraphs: [
      'Bienvenido a PrintOps. Al descargar, instalar y acceder a esta aplicación, usted (en adelante, "el Usuario" o "el Técnico") acepta estar sujeto a los siguientes Términos y Condiciones. PrintOps es una plataforma diseñada para la gestión integral de granjas de impresión 3D, control de mantenimiento de maquinaria y generación de presupuestos.',
    ],
  },
  {
    title: 'Cuentas y Seguridad',
    paragraphs: [
      'Para utilizar PrintOps, se requiere una cuenta autorizada por la administración del taller. El Usuario es responsable de mantener la confidencialidad de sus credenciales. La aplicación permite el uso de autenticación biométrica (como Face ID o Touch ID) para facilitar un acceso rápido y seguro, pero es responsabilidad del usuario asegurar su dispositivo.',
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

export default function TermsAndConditionsScreen({ navigation }: Props) {
  return (
    <LegalDocument
      icon={FileText}
      title="Términos y Condiciones de Uso"
      lastUpdated="10 de octubre de 2026"
      sections={SECTIONS}
      actionLabel="Aceptar y volver"
      onAction={() => navigation.goBack()}
    />
  );
}
