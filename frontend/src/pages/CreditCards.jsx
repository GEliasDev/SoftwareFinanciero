import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCardService } from '../services/creditCardService';
import { Plus, CreditCard as CardIcon, AlertTriangle, ShoppingBag } from 'lucide-react';
import { getCardGradient } from '../utils/cardColors';

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

const usageColor = (pct) =>
  pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e';

const STATUS_LABEL = { activa: null, bloqueada: 'Bloqueada', cancelada: 'Cancelada' };

export const CreditCards = () => {
  const navigate = useNavigate();
  const [cards, setCards]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterDeuda, setFilterDeuda] = useState(false);

  useEffect(() => {
    CreditCardService.getAll()
      .then(setCards)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalCupo    = cards.reduce((s, c) => s + parseFloat(c.cupoTotal ?? 0), 0);
  const totalUsado   = cards.reduce((s, c) => s + (parseFloat(c.cupoTotal ?? 0) - parseFloat(c.cupoDisponible ?? c.cupoTotal ?? 0)), 0);
  const totalDisp    = totalCupo - totalUsado;
  const totalOblMes  = cards.reduce((s, c) =>
    s + (c.CreditCardPurchases || []).reduce((a, p) => a + parseFloat(p.valorCuotaMensual ?? 0), 0), 0);

  const displayCards = filterDeuda
    ? cards.filter(c => (c.CreditCardPurchases || []).length > 0)
    : cards;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Tarjetas de Crédito</h1>
        <button className="btn btn-primary" onClick={() => navigate('/credit-cards/new')}>
          <Plus size={15} /> Nueva Tarjeta
        </button>
      </div>

      {/* Filter chips */}
      {!loading && cards.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterDeuda(false)}
            style={{
              padding: '0.3rem 0.875rem', borderRadius: 99, fontSize: 12, fontWeight: 600,
              border: '1.5px solid', cursor: 'pointer', transition: 'var(--transition)',
              borderColor: !filterDeuda ? 'var(--color-primary)' : 'var(--color-border)',
              background: !filterDeuda ? 'var(--color-primary-light)' : 'transparent',
              color: !filterDeuda ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >
            Todas ({cards.length})
          </button>
          <button
            onClick={() => setFilterDeuda(true)}
            style={{
              padding: '0.3rem 0.875rem', borderRadius: 99, fontSize: 12, fontWeight: 600,
              border: '1.5px solid', cursor: 'pointer', transition: 'var(--transition)',
              borderColor: filterDeuda ? '#dc2626' : 'var(--color-border)',
              background: filterDeuda ? '#fef2f2' : 'transparent',
              color: filterDeuda ? '#dc2626' : 'var(--color-text-muted)',
            }}
          >
            En deuda ({cards.filter(c => (c.CreditCardPurchases || []).length > 0).length})
          </button>
        </div>
      )}

      {/* Mini stats */}
      {!loading && cards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Cupo total', value: fmt(totalCupo), color: 'var(--color-primary)' },
            { label: 'Disponible', value: fmt(totalDisp), color: '#16a34a' },
            { label: 'Utilizado', value: fmt(totalUsado), color: totalUsado / totalCupo > 0.7 ? '#dc2626' : '#d97706' },
            { label: 'Oblig. mensual', value: fmt(totalOblMes), color: 'var(--color-text-secondary)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 210, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CardIcon size={24} /></div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin tarjetas</p>
            <p>Registra tus tarjetas de crédito para monitorear el cupo y las compras.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/credit-cards/new')}>
              <Plus size={14} /> Agregar tarjeta
            </button>
          </div>
        </div>
      ) : displayCards.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CardIcon size={24} /></div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin tarjetas con deuda activa</p>
            <p>Todas tus tarjetas están al día.</p>
            <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setFilterDeuda(false)}>
              Ver todas
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {displayCards.map(card => {
            const cupoUsado  = parseFloat(card.cupoTotal ?? 0) - parseFloat(card.cupoDisponible ?? card.cupoTotal ?? 0);
            const usagePct   = card.cupoTotal ? Math.min((cupoUsado / parseFloat(card.cupoTotal)) * 100, 100) : 0;
            const barColor   = usageColor(usagePct);
            const activePurchases = (card.CreditCardPurchases || []).filter(p => p.status === 'activa');
            const statusLabel = STATUS_LABEL[card.status];
            const cardOblMes = activePurchases.reduce((s, p) => s + parseFloat(p.valorCuotaMensual ?? 0), 0);

            return (
              <div
                key={card.id}
                className="credit-card-visual"
                style={{ cursor: 'pointer', minHeight: 210, background: getCardGradient(card.color) }}
                onClick={() => navigate(`/credit-cards/${card.id}`)}
              >
                {/* Status badge */}
                {statusLabel && (
                  <div style={{
                    position: 'absolute', top: '0.75rem', right: '0.75rem',
                    background: card.status === 'bloqueada' ? 'rgba(239,68,68,0.85)' : 'rgba(107,114,128,0.85)',
                    color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px',
                    borderRadius: 99, letterSpacing: '0.05em', zIndex: 2,
                  }}>
                    {statusLabel.toUpperCase()}
                  </div>
                )}

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 0.15rem', fontWeight: 500 }}>{card.entidad}</p>
                    <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1rem', margin: 0, letterSpacing: '-0.01em' }}>{card.nombre}</h3>
                  </div>
                  <CardIcon size={20} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                </div>

                {/* Cupo disponible */}
                <div style={{ position: 'relative', zIndex: 1, marginBottom: '0.875rem' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: '0 0 0.2rem', fontWeight: 600, letterSpacing: '0.08em' }}>CUPO DISPONIBLE</p>
                  <p style={{ color: 'white', fontSize: '1.55rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                    {fmt(card.cupoDisponible ?? card.cupoTotal)}
                  </p>
                </div>

                {/* Usage bar with semaphore color */}
                <div style={{ position: 'relative', zIndex: 1, marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }}>
                    <span>Usado {usagePct.toFixed(0)}%</span>
                    <span>Total {fmt(card.cupoTotal)}</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 99 }}>
                    <div style={{
                      height: 5, width: `${usagePct}%`,
                      background: barColor,
                      borderRadius: 99, transition: 'width 0.5s ease',
                      boxShadow: `0 0 6px ${barColor}99`,
                    }} />
                  </div>
                  {usagePct >= 75 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#fbbf24', fontSize: 10, fontWeight: 600 }}>
                      <AlertTriangle size={10} /> Cupo crítico
                    </div>
                  )}
                </div>

                {/* Last 4 digits */}
                {card.ultimos4 && (
                  <div style={{ position: 'relative', zIndex: 1, marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.15em' }}>
                      •••• •••• •••• {card.ultimos4}
                    </span>
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.65)', position: 'relative', zIndex: 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShoppingBag size={11} />
                    {activePurchases.length > 0
                      ? <><strong style={{ color: 'rgba(255,255,255,0.9)' }}>{fmt(cardOblMes)}</strong>/mes</>
                      : 'Sin compras activas'
                    }
                  </span>
                  <span>{activePurchases.length} activa{activePurchases.length !== 1 ? 's' : ''} · Corte {card.fechaCorte}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
