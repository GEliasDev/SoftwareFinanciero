import { Link, useOutletContext } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { PendingRow, SyncButton } from '../../components/credit-cards/PendingMovements';

// Pestaña "Por aprobar": movimientos de esta tarjeta detectados en Gmail.
export const CardPending = () => {
  const { pending, reload } = useOutletContext();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>Alertas de esta tarjeta detectadas en Gmail</p>
        <SyncButton onDone={reload} />
      </div>

      {pending.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Inbox size={24} /></div>
            <p className="empty-state-title">No hay movimientos pendientes</p>
            <p>Conecta Gmail en tu <Link to="/profile">perfil</Link> y las compras de esta tarjeta aparecerán aquí para aprobarlas.</p>
          </div>
        </div>
      ) : (
        pending.map(item => <PendingRow key={item.id} item={item} onDone={reload} />)
      )}
    </div>
  );
};
