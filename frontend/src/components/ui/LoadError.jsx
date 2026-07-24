import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Estado de "no se pudo cargar" para listas y detalles.
 *
 * Reemplaza al `.catch(console.error)` mudo: antes, si fallaba la petición, la
 * pantalla mostraba el estado VACÍO (como si el usuario no tuviera datos) y el
 * error solo iba a la consola. Aquí distingue "no hay datos" de "no cargó" y
 * ofrece reintentar sin recargar toda la app.
 *
 * Usa las mismas clases `.empty-state*` para no divergir del patrón canónico.
 */
export const LoadError = ({
  onRetry,
  title = 'No se pudo cargar la información',
  message = 'Revisa tu conexión e inténtalo de nuevo.',
}) => (
  <div className="card">
    <div className="empty-state">
      <div className="empty-state-icon" style={{ color: 'var(--neg-600)' }}>
        <AlertTriangle size={24} />
      </div>
      <p className="empty-state-title">{title}</p>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={onRetry}>
          <RotateCcw size={14} /> Reintentar
        </button>
      )}
    </div>
  </div>
);
