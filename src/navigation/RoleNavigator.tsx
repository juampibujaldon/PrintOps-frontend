// src/navigation/RoleNavigator.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminStack from './AdminStack';
import TecnicoStack from './TecnicoStack';

// Redirige al stack correspondiente según el role del usuario autenticado
export default function RoleNavigator() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'ADMIN':
      return <AdminStack />;
    case 'TECNICO':
      return <TecnicoStack />;
    default:
      return <TecnicoStack />;
  }
}
