import { useOutletContext } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { CardStatement } from '../../components/credit-cards/CardStatement';

export const CardStatementPage = () => {
  const { card, purchases, activePurchases, handlePayAll } = useOutletContext();

  if (purchases.length === 0) return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon"><FileText size={22} /></div>
        <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sin extracto</p>
        <p>Esta tarjeta no tiene compras registradas.</p>
      </div>
    </div>
  );

  return (
    <CardStatement
      card={card}
      purchases={purchases}
      onPayMonth={activePurchases.length > 0 ? handlePayAll : null}
    />
  );
};
