import { useRouteError } from 'react-router-dom';
import ErrorState from '../ui/ErrorState';

// errorElement global: error de carga de un chunk o excepción de render.
export default function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  return <ErrorState error={message} onRetry={() => window.location.reload()} />;
}
