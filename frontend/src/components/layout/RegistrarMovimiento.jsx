import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Drawer } from 'vaul';
import {
  ShoppingBag, Banknote, CreditCard, Landmark, Wallet, Repeat, FileUp,
  ChevronRight, ChevronLeft, X,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { CreditCardService } from '../../services/creditCardService';
import { BankCreditService } from '../../services/bankCreditService';
import { getCardColor } from '../../utils/cardColors';
import { fmt } from '../../utils/format';
import { rememberCard, lastCardId } from '../../utils/lastCard';


// Cada acción: a dónde lleva y si primero hay que elegir tarjeta o crédito.
const ACTIONS = {
  compra:   { pick: 'card',   title: 'Compra con tarjeta', to: (id) => `/credit-cards/${id}/purchases/new` },
  avance:   { pick: 'card',   title: 'Avance en efectivo', to: (id) => `/credit-cards/${id}/advances/new` },
  pagoTc:   { pick: 'card',   title: 'Pago de tarjeta',    to: (id) => `/credit-cards/${id}?accion=pagar` },
  pagoCred: { pick: 'credit', title: 'Pago de cuota de crédito', to: (id) => `/bank-credits/${id}?accion=pagar` },
  importar: { pick: 'card',   title: 'Importar extracto',  to: (id) => `/credit-cards/${id}/purchases/import` },
  ingreso:  { to: () => '/income/new' },
  suscripcion: { to: () => '/subscriptions/new' },
};

const OTHER = [
  { key: 'pagoTc',      icon: CreditCard, title: 'Pago de tarjeta',          sub: 'Registra el pago del corte' },
  { key: 'pagoCred',    icon: Landmark,   title: 'Pago de cuota de crédito', sub: 'Abona la cuota del mes a un crédito' },
  { key: 'ingreso',     icon: Wallet,     title: 'Ingreso',                  sub: 'Salario, honorarios u otra entrada' },
  { key: 'suscripcion', icon: Repeat,     title: 'Suscripción',              sub: 'Un cobro que se repite cada mes o año' },
  { key: 'importar',    icon: FileUp,     title: 'Importar extracto',        sub: 'Sube el CSV o Excel que te da el banco' },
];

const Body = ({ step, setStep, cards, credits, go, isMobile }) => {
  if (step) {
    const action = ACTIONS[step];
    const list = action.pick === 'card' ? cards : credits;
    return (
      <div>
        <button className="reg-back" onClick={() => setStep(null)}><ChevronLeft size={16} /> Volver</button>
        <p className="reg-section">{action.pick === 'card' ? 'Elige la tarjeta' : 'Elige el crédito'}</p>
        {list === null && <div className="skeleton" style={{ height: 120 }} />}
        {list?.length === 0 && (
          <div className="reg-empty">
            <p>{action.pick === 'card' ? 'Aún no tienes tarjetas registradas.' : 'Aún no tienes créditos registrados.'}</p>
            <button className="btn btn-secondary btn-sm" onClick={() => go(action.pick === 'card' ? '/credit-cards/new' : '/bank-credits/new')}>
              {action.pick === 'card' ? 'Agregar tarjeta' : 'Agregar crédito'}
            </button>
          </div>
        )}
        <div className="reg-list">
          {list?.map(item => (
            <button key={item.id} className="reg-row" onClick={() => { if (action.pick === 'card') rememberCard(item.id); go(action.to(item.id)); }}>
              {action.pick === 'card'
                ? <span className="card-chip" style={{ background: getCardColor(item.color) }} />
                : <span className="reg-icon"><Landmark size={16} /></span>}
              <span className="reg-text">
                <strong>{item.nombre}</strong>
                <span>
                  {action.pick === 'card'
                    ? `${item.entidad || 'Tarjeta'} · disponible ${fmt(item.cupoDisponible)}`
                    : `${item.entidad || 'Crédito'} · cuota ${fmt(item.valorCuota)}`}
                </span>
              </span>
              <ChevronRight size={16} className="reg-chev" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const last = cards?.find(c => String(c.id) === lastCardId()) || (cards?.length === 1 ? cards[0] : null);
  const pick = (key) => {
    const a = ACTIONS[key];
    if (!a.pick) return go(a.to());
    setStep(key);
  };

  return (
    <div>
      {!isMobile && <p className="reg-section">Más usados</p>}
      <div className="reg-featured">
        <button className="reg-feat primary" onClick={() => last ? (rememberCard(last.id), go(ACTIONS.compra.to(last.id))) : pick('compra')}>
          <span className="reg-feat-icon"><ShoppingBag size={18} /></span>
          <strong>Compra con tarjeta</strong>
          <span>De contado o a cuotas</span>
          {last && (
            <span className="reg-feat-card">
              <span className="card-chip sm" style={{ background: getCardColor(last.color) }} />
              <span><b>{last.nombre}</b> · última usada</span>
            </span>
          )}
        </button>
        <button className="reg-feat" onClick={() => pick('avance')}>
          <span className="reg-feat-icon"><Banknote size={18} /></span>
          <strong>Avance en efectivo</strong>
          <span>Retiro con la tarjeta y su comisión</span>
        </button>
      </div>
      {last && cards?.length > 1 && (
        <button className="btn-text reg-other-card" onClick={() => setStep('compra')}>Compra con otra tarjeta</button>
      )}
      {!isMobile && <p className="reg-section" style={{ marginTop: 16 }}>Otros movimientos</p>}
      <div className="reg-list">
        {OTHER.map(o => (
          <button key={o.key} className="reg-row" onClick={() => pick(o.key)}>
            <span className="reg-icon"><o.icon size={18} /></span>
            <span className="reg-text"><strong>{o.title}</strong><span>{o.sub}</span></span>
            <ChevronRight size={16} className="reg-chev" />
          </button>
        ))}
      </div>
    </div>
  );
};

export const RegistrarMovimiento = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [step, setStep] = useState(null);
  const [cards, setCards] = useState(null);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    if (!open) return;
    CreditCardService.getAll().then(setCards).catch(() => setCards([]));
    BankCreditService.getAll().then(list => setCredits(list.filter(c => c.status === 'activo' || !c.status))).catch(() => setCredits([]));
  }, [open]);

  const setOpen = (o) => { if (!o) setStep(null); onOpenChange(o); };
  const go = (to) => { setOpen(false); navigate(to); };
  const title = step ? ACTIONS[step].title : (isMobile ? 'Registrar movimiento' : '¿Qué quieres registrar?');
  const body = <Body step={step} setStep={setStep} cards={cards} credits={credits} go={go} isMobile={isMobile} />;

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="sheet-overlay" />
          <Drawer.Content className="sheet-content" aria-describedby={undefined}>
            <div className="sheet-handle" />
            <div className="reg-head">
              <Drawer.Title className="sheet-title">{title}</Drawer.Title>
              <Drawer.Close className="icon-btn ghost sm" aria-label="Cerrar"><X size={20} /></Drawer.Close>
            </div>
            <div className="sheet-body">{body}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="dlg-overlay" />
        <Dialog.Content className="reg-panel" aria-describedby={undefined}>
          <div className="reg-head">
            <Dialog.Title className="dlg-title">{title}</Dialog.Title>
            <Dialog.Close className="icon-btn ghost sm" aria-label="Cerrar"><X size={18} /></Dialog.Close>
          </div>
          {body}
          <p className="reg-foot"><kbd className="kbd">Esc</kbd> para cerrar</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
