import { useOutletContext } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { AmortizationSchedule } from '../../components/bank-credits/AmortizationSchedule';
import { buildLoanSchedule } from '../../utils/bankCredit';

export const BankCreditSchedule = () => {
  const { credit, handlePay, paying } = useOutletContext();
  const { remaining } = buildLoanSchedule(credit);

  if (remaining.length === 0) return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon"><CheckCircle2 size={22} /></div>
        <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Crédito saldado</p>
        <p>No quedan cuotas pendientes en este crédito.</p>
      </div>
    </div>
  );

  return <AmortizationSchedule credit={credit} onPay={handlePay} paying={paying} />;
};
