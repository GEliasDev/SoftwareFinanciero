import * as Popover from '@radix-ui/react-popover';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarClock, Inbox, ChevronRight } from 'lucide-react';
import { useShell } from './ShellContext';
import { fmtShort } from '../../utils/format';

const whenLabel = (dias) => dias < 0 ? `vencido hace ${-dias} día${dias === -1 ? '' : 's'}`
  : dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;

// Campana de avisos: pago de tarjeta próximo (≤ 7 días) y movimientos de Gmail por aprobar.
export const AlertsBell = ({ className = 'icon-btn' }) => {
  const navigate = useNavigate();
  const { payAlert, pendingCount } = useShell();
  const showPay = payAlert && payAlert.dias <= 7;
  const count = (showPay ? 1 : 0) + (pendingCount > 0 ? 1 : 0);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className={className} aria-label={count ? `Avisos (${count})` : 'Avisos'}>
          <Bell size={18} />
          {count > 0 && <span className="dot" aria-hidden="true" />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="menu-content alerts-pop" align="end" sideOffset={8} collisionPadding={12}>
          <p className="alerts-title">Avisos</p>
          {count === 0 && <p className="alerts-empty">Todo al día. No tienes pagos cercanos ni movimientos por revisar.</p>}
          {showPay && (
            <Popover.Close asChild>
              <button className="alerts-item" onClick={() => navigate(`/credit-cards/${payAlert.card.id}`)}>
                <span className={`alerts-icon ${payAlert.dias <= 3 ? 'warn' : ''}`}><CalendarClock size={16} /></span>
                <span className="alerts-text">
                  <strong>Pago de {payAlert.card.nombre} {whenLabel(payAlert.dias)}</strong>
                  <span>Vence el {fmtShort(payAlert.date)}</span>
                </span>
                <ChevronRight size={16} />
              </button>
            </Popover.Close>
          )}
          {pendingCount > 0 && (
            <Popover.Close asChild>
              <button className="alerts-item" onClick={() => navigate('/credit-cards?tab=por-aprobar')}>
                <span className="alerts-icon"><Inbox size={16} /></span>
                <span className="alerts-text">
                  <strong>{pendingCount} movimiento{pendingCount !== 1 ? 's' : ''} por aprobar</strong>
                  <span>Detectados en Gmail</span>
                </span>
                <ChevronRight size={16} />
              </button>
            </Popover.Close>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
