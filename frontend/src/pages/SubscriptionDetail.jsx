import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Swal from '../utils/alerts';
import { SubscriptionService } from '../services/subscriptionService';
import { ArrowLeft, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { fmt, fmtDateLong, fmtShort, nextOccurrence, daysUntil } from '../utils/format';
import { getCardColor } from '../utils/cardColors';

const FRECUENCIA_LABEL = { mensual: 'Mensual', anual: 'Anual' };
const MONEDA_LABEL = { COP: 'COP · Peso colombiano', USD: 'USD · Dólar', EUR: 'EUR · Euro' };
const STATUS = { activa: ['success', 'Activa'], pausada: ['neutral', 'Pausada'], cancelada: ['neutral', 'Cancelada'] };

const Info = ({ label, value, muted }) => (
  <div className="bc-info-item"><span>{label}</span><b className={muted ? 'text-muted' : ''} style={muted ? { fontWeight: 500 } : undefined}>{value}</b></div>
);

export const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setSub(await SubscriptionService.getById(id));
    } catch {
      setError('No se pudo cargar la suscripción.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Eliminar esta suscripción?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await SubscriptionService.delete(id);
      navigate('/subscriptions');
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la suscripción.' });
    }
  };

  if (loading) return (
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 56, width: 320, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 120, marginBottom: 20, borderRadius: 'var(--radius-lg)' }} />
      <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );

  const anual = sub ? (sub.frecuencia === 'anual' ? sub.monto : sub.monto * 12) : 0;
  const dias = sub ? daysUntil(nextOccurrence(sub.diaCobro)) : null;

  const nextDate = sub ? nextOccurrence(sub.diaCobro) : null;
  const [stTone, stLabel] = STATUS[sub?.status] ?? STATUS.activa;

  return (
    <div className="animate-fade-in">
      <nav className="breadcrumb desktop-flex" aria-label="Ruta">
        <Link to="/subscriptions">Suscripciones</Link><span aria-hidden="true">/</span><span>{sub?.nombre}</span>
      </nav>
      <div className="detail-head">
        <button className="icon-btn ghost mobile-only" onClick={() => navigate('/subscriptions')} aria-label="Volver a suscripciones"><ArrowLeft size={20} /></button>
        <span className="list-icon lg letter desktop-only" style={{ fontSize: 16 }}>{sub?.nombre?.charAt(0).toUpperCase()}</span>
        <div className="detail-head-text">
          <div className="row" style={{ gap: 10 }}>
            <h1 className="page-title">{sub?.nombre}</h1>
            <span className={`badge badge-${stTone} desktop-only`}>{stLabel}</span>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>{[sub?.descripcion, FRECUENCIA_LABEL[sub?.frecuencia]?.toLowerCase()].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary desktop-flex" onClick={() => navigate(`/subscriptions/${id}/edit`)}><Pencil size={16} /> Editar</button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild><button className="icon-btn" aria-label="Más acciones"><MoreHorizontal size={18} /></button></DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="menu-content" align="end" sideOffset={6}>
                <DropdownMenu.Item className="menu-item mobile-flex" onSelect={() => navigate(`/subscriptions/${id}/edit`)}><Pencil size={16} /> Editar suscripción</DropdownMenu.Item>
                <DropdownMenu.Item className="menu-item danger" onSelect={handleDelete}><Trash2 size={16} /> Eliminar suscripción</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {error && <div className="notice warn" role="alert">{error}</div>}

      <section className="card stat-strip" aria-label="Resumen">
        <div><p>Monto por cobro</p><b className="n">{fmt(sub?.monto, sub?.moneda)}</b><span>{FRECUENCIA_LABEL[sub?.frecuencia]}</span></div>
        <div><p>Costo anual</p><b className="n">{fmt(anual, sub?.moneda)}</b><span>Equivalente al año</span></div>
        <div className="desktop-only">
          <p>Próximo cobro</p>
          <b className="row" style={{ gap: 10 }}>{dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`} {nextDate && <span className={`badge badge-${dias <= 1 ? 'danger' : dias <= 3 ? 'warning' : 'neutral'}`}>{fmtShort(nextDate)}</span>}</b>
          <span>Día {sub?.diaCobro} de cada mes</span>
        </div>
      </section>

      <div className="sd-grid">
        <section className="card" aria-labelledby="sd-details">
          <h2 className="card-title" id="sd-details" style={{ marginBottom: 8 }}>Detalles de la suscripción</h2>
          <div className="bc-info" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Info label="Nombre" value={sub?.nombre} />
            <Info label="Descripción" value={sub?.descripcion || 'Sin descripción'} muted={!sub?.descripcion} />
            <Info label="Monto" value={fmt(sub?.monto, sub?.moneda)} />
            <Info label="Moneda" value={MONEDA_LABEL[sub?.moneda] ?? sub?.moneda} />
            <Info label="Frecuencia" value={FRECUENCIA_LABEL[sub?.frecuencia]} />
            <Info label="Día de cobro" value={`Día ${sub?.diaCobro}`} />
            <Info label="Fecha de inicio" value={fmtDateLong(sub?.fechaInicio)} />
            <Info label="Fecha de fin" value={sub?.fechaFin ? fmtDateLong(sub.fechaFin) : 'Sin fecha de fin'} muted={!sub?.fechaFin} />
          </div>
        </section>

        <section className="card" aria-labelledby="sd-charge">
          <h2 className="card-title" id="sd-charge" style={{ marginBottom: 16 }}>Cobro</h2>
          {sub?.CreditCard ? (
            <>
              <div className="row" style={{ gap: 12 }}>
                <span className="cc-brand lg" style={{ background: getCardColor(sub.CreditCard.color) }} aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="cell-title" style={{ fontWeight: 600 }}>Automático</span>
                  <span className="cell-sub">{sub.CreditCard.nombre}{sub.CreditCard.entidad ? ` · ${sub.CreditCard.entidad}` : ''}</span>
                </span>
                <span className="badge badge-success">Activo</span>
              </div>
              <p className="text-sm text-secondary" style={{ margin: '14px 0 12px' }}>Cada ciclo se genera el cargo en esta tarjeta el día {sub.diaCobro}. No tienes que registrar el pago aparte.</p>
              <Link to={`/credit-cards/${sub.CreditCard.id ?? sub.creditCardId}`} className="link-sm">Ver tarjeta</Link>
            </>
          ) : (
            <>
              <div className="row" style={{ gap: 12 }}>
                <span className="cell-title" style={{ fontWeight: 600, flex: 1 }}>Manual</span>
                <span className="badge badge-neutral">Sin tarjeta</span>
              </div>
              <p className="text-sm text-secondary" style={{ margin: '14px 0 12px' }}>Debti te recuerda el cobro, pero no lo registra en ninguna tarjeta. Si la pagas con tarjeta, vincúlala al editar.</p>
              <Link to={`/subscriptions/${id}/edit`} className="link-sm">Vincular una tarjeta</Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
