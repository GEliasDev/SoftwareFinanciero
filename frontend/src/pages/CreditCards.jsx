import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCardService } from '../services/creditCardService';
import { Plus, CreditCard as CardIcon, AlertTriangle, ShoppingBag, CalendarClock, Wallet } from 'lucide-react';
import { getCardGradient } from '../utils/cardColors';
import { LoadError } from '../components/ui/LoadError';
import { fmt, nextOccurrence, daysUntil, urgencyStyle, fmtShort, buildSchedule, effectiveDayInMonth } from '../utils/creditCard';

const usageColor = (pct) =>
  pct >= 80 ? 'var(--neg-600)' : pct >= 50 ? 'var(--warn-600)' : 'var(--pos-600)';

const STATUS_LABEL = { activa: null, bloqueada: 'Bloqueada', cancelada: 'Cancelada' };

export const CreditCards = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filterDeuda, setFilterDeuda] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    CreditCardService.getAll()
      .then(setCards)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const totalCupo = cards.reduce((s, c) => s + parseFloat(c.cupoTotal ?? 0), 0);
  const totalUsado = cards.reduce((s, c) => s + (parseFloat(c.cupoTotal ?? 0) - parseFloat(c.cupoDisponible ?? c.cupoTotal ?? 0)), 0);
  const totalDisp = totalCupo - totalUsado;
  const usoGlobalPct = totalCupo > 0 ? (totalUsado / totalCupo) * 100 : 0;

  // Pre-cálculo dinámico de estadísticas de pago de cada tarjeta para evitar desfases.
  const cardStats = useMemo(() => {
    return cards.map(c => {
      const schedule = buildSchedule(c.CreditCardPurchases || [], c);
      
      // Encontrar el primer ciclo (pasado, actual o futuro) que tenga cuotas pendientes de pago.
      // Este es el ciclo activo hacia el cual el usuario está aportando o debe pagar.
      const activeSlot = schedule.find(s => s.lines.some(l => !l.wasPaid));
      
      if (!activeSlot) {
        return {
          cardId: c.id,
          cardOblMes: 0,
          nextPago: null,
          dPago: 999,
          activePurchases: [],
          activeSlot: null,
          tieneDeuda: false,
        };
      }

      // Saldo pendiente de este ciclo activo
      const pendingLines = activeSlot.lines.filter(l => !l.wasPaid);
      const cardOblMes = pendingLines.reduce((s, l) => s + l.valorCuota, 0);
      
      const activePurchases = (c.CreditCardPurchases || []).filter(p => p.status === 'activa');
      
      // Calcular la fecha de pago exacta para este ciclo activo
      const payMonthOffset = Number(c.fechaPago) < Number(c.fechaCorte) ? 1 : 0;
      // Día recortado al mes destino: un fechaPago=31 en un mes de 30 desbordaba
      // al mes siguiente y la fecha de pago salía corrida.
      const payYear  = activeSlot.date.getFullYear();
      const payMonth = activeSlot.date.getMonth() + payMonthOffset;
      const date = new Date(payYear, payMonth, effectiveDayInMonth(c.fechaPago, payYear, payMonth));
      const dPago = daysUntil(date);
      
      // Tiene deuda exigible si el ciclo activo ya cerró (isPast)
      const tieneDeuda = activeSlot.isPast && cardOblMes > 0;
      
      return {
        cardId: c.id,
        cardOblMes,
        nextPago: date,
        dPago,
        activePurchases,
        activeSlot,
        tieneDeuda,
      };
    });
  }, [cards]);

  // Tarjetas con algo pendiente de pago en su ciclo activo (ya ignora comisiones
  // de avances pagados, que podrían quedar colgadas como 'activa' por datos viejos).
  const cardsConDeuda = useMemo(() => {
    return cards.filter(c => {
      const s = cardStats.find(cs => cs.cardId === c.id);
      return s && s.cardOblMes > 0;
    });
  }, [cards, cardStats]);

  // Suma lo que realmente vence en el ciclo activo de cada tarjeta
  const totalOblMes = useMemo(() =>
    cardStats.reduce((s, cs) => s + cs.cardOblMes, 0),
  [cardStats]);

  // Próximo vencimiento entre las tarjetas con deuda activa.
  const proximoVenc = useMemo(() => {
    const conPago = cardStats
      .filter(cs => cs.activeSlot !== null)
      .map(cs => {
        const card = cards.find(c => c.id === cs.cardId);
        return { card, date: cs.nextPago, dias: cs.dPago };
      })
      .sort((a, b) => a.dias - b.dias);
    return conPago[0] ?? null;
  }, [cardStats, cards]);

  const mesActual = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const mesBanner = useMemo(() => {
    if (proximoVenc && proximoVenc.date) {
      return proximoVenc.date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    }
    return mesActual;
  }, [proximoVenc, mesActual]);

  // Orden por urgencia: primero las que tienen deuda, luego por días al pago.
  const displayCards = useMemo(() => {
    const base = filterDeuda ? cardsConDeuda : cards;
    return [...base].sort((a, b) => {
      const statsA = cardStats.find(cs => cs.cardId === a.id);
      const statsB = cardStats.find(cs => cs.cardId === b.id);
      const oa = statsA && statsA.tieneDeuda ? 1 : 0;
      const ob = statsB && statsB.tieneDeuda ? 1 : 0;
      if (oa !== ob) return ob - oa;
      if (statsA && statsB) return statsA.dPago - statsB.dPago;
      return 0;
    });
  }, [cards, filterDeuda, cardsConDeuda, cardStats]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tarjetas de Crédito</h1>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            Controla tus cupos, cuotas y fechas de pago en un solo lugar.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/credit-cards/new')}>
          <Plus size={15} /> Nueva Tarjeta
        </button>
      </div>

      {/* ── Banner consolidado: estado de cuenta del mes ──────────────── */}
      {!loading && !error && cardsConDeuda.length > 0 && (
        <div
          className="cc-banner-grid"
          style={{
            background: 'linear-gradient(135deg, var(--brand-800) 0%, var(--brand-600) 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.25rem',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Total del mes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
              <Wallet size={13} /> Estado de cuenta · {mesBanner}
            </div>
            <div style={{ color: 'white', fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              {fmt(totalOblMes)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
              Total a pagar este mes en {cardsConDeuda.length} tarjeta{cardsConDeuda.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Próximo vencimiento */}
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>
              <CalendarClock size={12} /> Próximo pago
            </div>
            {proximoVenc ? (
              <>
                <div style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>
                  {proximoVenc.dias === 0 ? 'Hoy' : proximoVenc.dias === 1 ? 'Mañana' : `En ${proximoVenc.dias} días`}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 }}>
                  {proximoVenc.card.nombre} · {fmtShort(proximoVenc.date)}
                </div>
              </>
            ) : <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>—</div>}
          </div>

          {/* Cupo utilizado */}
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: '1.25rem' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>
              Cupo utilizado
            </div>
            <div style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>{usoGlobalPct.toFixed(0)}%</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 99, marginTop: 6 }}>
              <div style={{ height: 4, width: `${Math.min(usoGlobalPct, 100)}%`, background: usoGlobalPct >= 80 ? '#fca5a5' : '#6EE7B7', borderRadius: 99 }} />
            </div>
          </div>

          {/* Disponible */}
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: '1.25rem' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>
              Cupo disponible
            </div>
            <div style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>{fmt(totalDisp)}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 }}>de {fmt(totalCupo)}</div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      {!loading && !error && cards.length > 0 && (
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
            En deuda ({cardsConDeuda.length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="cc-cards-grid">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <LoadError onRetry={load} title="No se pudieron cargar tus tarjetas" />
      ) : cards.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CardIcon size={24} /></div>
            <p className="empty-state-title">Sin tarjetas</p>
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
            <p className="empty-state-title">Sin tarjetas con deuda activa</p>
            <p>Todas tus tarjetas están al día.</p>
            <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setFilterDeuda(false)}>
              Ver todas
            </button>
          </div>
        </div>
      ) : (
        <div className="cc-cards-grid">
          {displayCards.map(card => {
            const cupoUsado = parseFloat(card.cupoTotal ?? 0) - parseFloat(card.cupoDisponible ?? card.cupoTotal ?? 0);
            const usagePct = card.cupoTotal ? Math.min((cupoUsado / parseFloat(card.cupoTotal)) * 100, 100) : 0;
            const barColor = usageColor(usagePct);
            const statusLabel = STATUS_LABEL[card.status];
            const stats        = cardStats.find(cs => cs.cardId === card.id);
            const cardOblMes   = stats?.cardOblMes ?? 0;
            const dPago        = stats?.dPago ?? 99;
            const activePurchases = stats?.activePurchases ?? [];
            const tieneDeuda   = cardOblMes > 0;
            const u            = urgencyStyle(dPago);

            return (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/credit-cards/${card.id}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/credit-cards/${card.id}`)}
                aria-label={`Ver detalle de ${card.nombre}`}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              >
                {/* ── Franja de color superior ── */}
                <div style={{ background: getCardGradient(card.color), padding: '0.875rem 1.125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 500, marginBottom: 2 }}>{card.entidad}</div>
                      <div style={{ color: 'white', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{card.nombre}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                      {statusLabel && (
                        <span style={{
                          background: card.status === 'bloqueada' ? 'rgba(239,68,68,0.85)' : 'rgba(107,114,128,0.85)',
                          color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 7px',
                          borderRadius: 99, letterSpacing: '0.05em',
                        }}>
                          {statusLabel.toUpperCase()}
                        </span>
                      )}
                      {card.ultimos4 && (
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                          •••• {card.ultimos4}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Cuerpo de datos ── */}
                <div style={{ background: 'var(--surface)', padding: '0.875rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>

                  {/* Números hero */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                        Por pagar este mes
                      </div>
                      {tieneDeuda ? (
                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                          {fmt(cardOblMes)}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-3)', paddingTop: 4 }}>
                          Sin deuda activa
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                        Disponible
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '-0.01em' }}>
                        {fmt(card.cupoDisponible ?? card.cupoTotal)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de uso */}
                  <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: 4, width: '100%', background: barColor, borderRadius: 99, transition: 'transform 0.5s ease', transformOrigin: 'left', transform: `scaleX(${usagePct / 100})` }} />
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShoppingBag size={11} />
                      {activePurchases.length} compra{activePurchases.length !== 1 ? 's' : ''} · {usagePct.toFixed(0)}% usado
                      {usagePct >= 75 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--warn-600)', fontWeight: 700 }}>
                          <AlertTriangle size={10} /> crítico
                        </span>
                      )}
                    </span>
                    {tieneDeuda && card.status === 'activa' ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        display: 'flex', alignItems: 'center', gap: 3,
                        background: dPago <= 7 
                          ? (u.level === 'danger' ? '#fef2f2' : u.level === 'warning' ? '#fffbeb' : 'var(--color-primary-light)')
                          : 'var(--color-success-bg)',
                        color: dPago <= 7
                          ? (u.level === 'danger' ? '#dc2626' : u.level === 'warning' ? '#92400e' : 'var(--color-primary)')
                          : 'var(--color-success)',
                      }}>
                        <CalendarClock size={10} />
                        {dPago === 0 ? 'Paga hoy' : dPago === 1 ? 'Mañana' : `En ${dPago}d`}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Corte {card.fechaCorte}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
