import { Link, useOutletContext } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { PendingList, SyncButton } from '../../components/credit-cards/PendingMovements';

// Pestaña "Por aprobar": movimientos de esta tarjeta detectados en Gmail.
export const CardPending = () => {
  const { pending, reload } = useOutletContext();

  return (
    <section className="card card-flush">
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 className="card-title">Movimientos por aprobar</h2>
          <p className="card-subtitle">Alertas de esta tarjeta detectadas en Gmail</p>
        </div>
        <SyncButton onDone={reload} />
      </div>

      {pending.length === 0 ? (
        <div className="empty-state" style={{ borderTop: '1px solid var(--divider)' }}>
          <div className="empty-state-icon"><Inbox size={24} /></div>
          <p className="empty-state-title">No hay movimientos pendientes</p>
          <p>Conecta Gmail en tu <Link to="/profile#gmail">perfil</Link> y las compras de esta tarjeta aparecerán aquí para aprobarlas.</p>
        </div>
      ) : (
        <PendingList items={pending} onDone={reload} />
      )}
    </section>
  );
};
