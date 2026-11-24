import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { CreditCardService } from '../services/creditCardService';
import { CardInboxService } from '../services/cardInboxService';
import { PendingList } from '../components/credit-cards/PendingMovements';
import { accionesTarjeta } from '../components/credit-cards/cardMenu';
import { RowMenu, RowMenuButton } from '../components/ui/RowMenu';
import { useRowMenuTip } from '../hooks/useRowMenuTip';
import Swal from '../utils/alerts';
import { Plus, CreditCard as CardIcon, Inbox, ChevronRight, X } from 'lucide-react';
import { getCardColor } from '../utils/cardColors';
import { LoadError } from '../components/ui/LoadError';
import { fmt, fmtShort, buildCardStats } from '../utils/creditCard';

const STATUS_LABEL = { activa: null, bloqueada: 'Bloqueada', cancelada: 'Cancelada' };

const dueBadge = (d) => d < 0 ? ['danger', 'Vencido'] : d === 0 ? ['danger', 'Hoy'] : d === 1 ? ['danger', 'Mañana'] : d <= 3 ? ['warning', `En ${d} días`] : [null, `En ${d} días`];

// Marca chica con el color de la tarjeta (logo genérico de franquicia).
const CardBrand = ({ card, size = 'md' }) => (
  <span className={`cc-brand ${size}`} style={{ background: getCardColor(card.color) }} aria-hidden="true" />
);

export const CreditCards = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filterDeuda, setFilterDeuda] = useState(false);
  const [pending, setPending] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    // Sin Gmail conectado (o si falla) simplemente no hay pendientes que mostrar.
    CardInboxService.list().then(setPending).catch(() => setPending([]));
    CreditCardService.getAll()
      .then(setCards)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useRowMenuTip(cards.length > 0);

  const eliminarTarjeta = async (card) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar "${card.nombre}"?`,
      text: 'Se eliminarán también todas las compras registradas. Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;
    try { await CreditCardService.delete(card.id); Swal.fire({ icon: 'success', title: 'Tarjeta eliminada' }); load(); }
    catch { Swal.fire({ icon: 'error', title: 'No se pudo eliminar la tarjeta' }); }
  };
  const acciones = (card, { obl, nPend }) => accionesTarjeta(card, { navigate, porPagar: obl, pendientes: nPend, onDelete: eliminarTarjeta });

  const sinTarjeta = pending.filter(p => !p.creditCardId);
  const cardsActivas = cards.filter(c => c.status === 'activa');

  // Llegada desde los avisos (?tab=por-aprobar): abrir lo que haya por revisar.
  useEffect(() => {
    if (params.get('tab') !== 'por-aprobar' || loading) return;
    const conTarjeta = pending.find(p => p.creditCardId);
    if (sinTarjeta.length > 0) setAssignOpen(true); // eslint-disable-line react-hooks/set-state-in-effect
    else if (conTarjeta) { navigate(`/credit-cards/${conTarjeta.creditCardId}/pending`, { replace: true }); return; }
    setParams({}, { replace: true });
  }, [params, loading, pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalCupo = cards.reduce((s, c) => s + parseFloat(c.cupoTotal ?? 0), 0);
  const totalUsado = cards.reduce((s, c) => s + (parseFloat(c.cupoTotal ?? 0) - parseFloat(c.cupoDisponible ?? c.cupoTotal ?? 0)), 0);
  const totalDisp = totalCupo - totalUsado;
  const usoGlobalPct = totalCupo > 0 ? (totalUsado / totalCupo) * 100 : 0;

  // Estadísticas de pago por tarjeta. Fuente ÚNICA `buildCardStats` (en
  // utils/creditCard), la MISMA que usa el Dashboard, para que Inicio y
  // Tarjetas nunca se desfasen.
  const cardStats = useMemo(() => buildCardStats(cards), [cards]);
  const statsOf = (id) => cardStats.find(cs => cs.cardId === id);

  // Tarjetas con algo pendiente de pago en su ciclo activo.
  const cardsConDeuda = useMemo(() => cards.filter(c => (statsOf(c.id)?.cardOblMes ?? 0) > 0), [cards, cardStats]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalOblMes = useMemo(() => cardStats.reduce((s, cs) => s + cs.cardOblMes, 0), [cardStats]);

  // Próximo vencimiento entre las tarjetas con deuda activa.
  const proximoVenc = useMemo(() => {
    const conPago = cardStats
      .filter(cs => cs.activeSlot !== null)
      .map(cs => ({ card: cards.find(c => c.id === cs.cardId), date: cs.nextPago, dias: cs.dPago }))
      .sort((a, b) => a.dias - b.dias);
    return conPago[0] ?? null;
  }, [cardStats, cards]);

  const mesBanner = (proximoVenc?.date ?? new Date()).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  // Orden por urgencia: primero las que tienen deuda, luego por días al pago.
  const displayCards = useMemo(() => {
    const base = filterDeuda ? cardsConDeuda : cards;
    return [...base].sort((a, b) => {
      const sa = statsOf(a.id), sb = statsOf(b.id);
      const oa = sa?.cardOblMes > 0 ? 1 : 0, ob = sb?.cardOblMes > 0 ? 1 : 0;
      if (oa !== ob) return ob - oa;
      if (sa && sb) return sa.dPago - sb.dPago;
      return 0;
    });
  }, [cards, filterDeuda, cardsConDeuda, cardStats]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingOf = (id) => pending.filter(p => p.creditCardId === id).length;

  const rowData = (card) => {
    const total = parseFloat(card.cupoTotal ?? 0);
    const usado = total - parseFloat(card.cupoDisponible ?? total);
    const usagePct = total ? Math.min((usado / total) * 100, 100) : 0;
    const st = statsOf(card.id);
    const obl = st?.cardOblMes ?? 0;
    return { usagePct, st, obl, nPend: pendingOf(card.id), nCompras: st?.activePurchases?.length ?? 0 };
  };

  const header = (
    <div className="page-header">
      <div>
        <h1 className="page-title">Tarjetas<span className="desktop-only" style={{ display: 'inline' }}> de crédito</span></h1>
        <p className="page-subtitle"><span className="desktop-only">Controla tus cupos, cuotas y fechas de pago en un solo lugar.</span><span className="mobile-only">Cupos, cuotas y fechas de pago</span></p>
      </div>
      <button className="btn btn-primary desktop-flex" onClick={() => navigate('/credit-cards/new')}>
        <Plus size={18} /> Nueva tarjeta
      </button>
      <button className="icon-btn mobile-only" onClick={() => navigate('/credit-cards/new')} aria-label="Nueva tarjeta">
        <Plus size={20} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div aria-busy="true">
        {header}
        <div className="skeleton" style={{ height: 130, borderRadius: 'var(--radius-lg)', marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }
  if (error) return <div>{header}<LoadError onRetry={load} title="No se pudieron cargar tus tarjetas" /></div>;

  if (cards.length === 0) {
    return (
      <div className="animate-fade-in">
        {header}
        <div className="card empty-hero">
          <div className="empty-state">
            <div className="empty-state-icon"><CardIcon size={24} /></div>
            <p className="empty-state-title">Agrega tu primera tarjeta</p>
            <p>Con el cupo, el día de corte y el día de pago, Debti calcula cuánto pagas en cada extracto y te avisa antes de que venza.</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/credit-cards/new')}>
              <Plus size={16} /> Agregar tarjeta
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [pvTone, pvLabel] = proximoVenc ? dueBadge(proximoVenc.dias) : [null, ''];

  return (
    <div className="animate-fade-in">
      {header}

      {/* ── Resumen del mes ── */}
      <section className="card cc-summary" aria-label="Resumen de tarjetas">
        <div className="cc-sum-main">
          <p className="cc-sum-label">
            <span className="desktop-only">Estado de cuenta · {mesBanner}</span>
            <span className="mobile-only">Por pagar en {mesBanner.split(' ')[0]} · {cardsConDeuda.length} tarjeta{cardsConDeuda.length !== 1 ? 's' : ''}</span>
          </p>
          <p className="amount-lg cc-sum-amount">{fmt(totalOblMes)}</p>
          <p className="cc-sum-sub desktop-only">Total a pagar este mes en {cardsConDeuda.length} tarjeta{cardsConDeuda.length !== 1 ? 's' : ''}</p>
          {proximoVenc && totalOblMes > 0 && (
            <p className="cc-sum-sub mobile-only" style={{ marginTop: 8 }}>
              <span className={`badge badge-${pvTone ?? 'neutral'}`}>{pvLabel}</span> {proximoVenc.card.nombre} · {fmtShort(proximoVenc.date)}
            </p>
          )}
        </div>
        <div className="cc-sum-cell desktop-only">
          <p className="cc-sum-label">Próximo pago</p>
          {proximoVenc && totalOblMes > 0 ? (
            <>
              <span className={`badge badge-${pvTone ?? 'neutral'}`}>{pvLabel}</span>
              <p className="cc-sum-sub" style={{ marginTop: 6 }}>{proximoVenc.card.nombre} · {fmtShort(proximoVenc.date)}</p>
            </>
          ) : <p className="cc-sum-sub">Sin pagos pendientes</p>}
        </div>
        <div className="cc-sum-cell">
          <p className="cc-sum-label">Cupo utilizado</p>
          <p className="cc-sum-value n">{Math.round(usoGlobalPct)} %</p>
          <div className="progress-track" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ transform: `scaleX(${usoGlobalPct / 100})`, background: 'var(--cat-1)' }} />
          </div>
        </div>
        <div className="cc-sum-cell">
          <p className="cc-sum-label">Cupo disponible</p>
          <p className="cc-sum-value n">{fmt(totalDisp)}</p>
          <p className="cc-sum-sub n">de {fmt(totalCupo)}</p>
        </div>
      </section>

      {/* ── Movimientos de Gmail sin tarjeta ── */}
      {sinTarjeta.length > 0 && (
        <div className="notice warn">
          <Inbox size={18} />
          <span style={{ flex: 1 }}>{sinTarjeta.length} movimiento{sinTarjeta.length !== 1 ? 's' : ''} de Gmail sin tarjeta asignada</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setAssignOpen(true)}>Asignar <ChevronRight size={16} /></button>
        </div>
      )}

      {/* ── Mis tarjetas ── */}
      <section className="card card-flush" aria-labelledby="mis-tarjetas">
        <div className="card-header">
          <h2 className="card-title" id="mis-tarjetas">Mis tarjetas</h2>
          <div className="segmented" role="group" aria-label="Filtrar tarjetas">
            <button aria-pressed={!filterDeuda} onClick={() => setFilterDeuda(false)}>Todas <span className="n text-muted">{cards.length}</span></button>
            <button aria-pressed={filterDeuda} onClick={() => setFilterDeuda(true)}>En deuda <span className="n text-muted">{cardsConDeuda.length}</span></button>
          </div>
        </div>

        {displayCards.length === 0 ? (
          <p className="card-empty">Todas tus tarjetas están al día.</p>
        ) : (
          <>
            <table className="cc-table desktop-table">
              <thead>
                <tr><th>Tarjeta</th><th>Próximo pago</th><th>Cupo usado</th><th style={{ textAlign: 'right' }}>Disponible</th><th style={{ textAlign: 'right' }}>Por pagar este mes</th><th aria-label="Abrir" /></tr>
              </thead>
              <tbody>
                {displayCards.map(card => {
                  const { usagePct, st, obl, nPend, nCompras } = rowData(card);
                  const [tone, label] = dueBadge(st?.dPago ?? 99);
                  const statusLabel = STATUS_LABEL[card.status];
                  return (
                    <RowMenu key={card.id} actions={acciones(card, { obl, nPend })}>
                    <tr className="clickable" onClick={() => navigate(`/credit-cards/${card.id}`)}>
                      <td>
                        <div className="row" style={{ gap: 12 }}>
                          <CardBrand card={card} />
                          <div style={{ minWidth: 0 }}>
                            <span className="cell-title">{card.nombre}</span>
                            <span className="cell-sub">{card.entidad}{card.ultimos4 ? ` · •••• ${card.ultimos4}` : ''} · {nCompras} compra{nCompras !== 1 ? 's' : ''}</span>
                          </div>
                          {nPend > 0 && (
                            <button className="badge badge-primary" style={{ border: 'none', cursor: 'pointer' }}
                              onClick={e => { e.stopPropagation(); navigate(`/credit-cards/${card.id}/pending`); }}>
                              {nPend} por aprobar
                            </button>
                          )}
                          {statusLabel && <span className="badge badge-neutral">{statusLabel}</span>}
                        </div>
                      </td>
                      <td>
                        {obl > 0 && st?.nextPago ? (
                          <>
                            {tone ? <span className={`badge badge-${tone}`}>{label}</span> : <span className="text-sm">{label}</span>}
                            <span className="cell-sub">{fmtShort(st.nextPago)}</span>
                          </>
                        ) : (
                          <>
                            <span className="badge badge-success">Al día</span>
                            <span className="cell-sub">Corte día {card.fechaCorte}</span>
                          </>
                        )}
                      </td>
                      <td style={{ width: 140 }}>
                        <span className="n text-sm">{Math.round(usagePct)} %</span>
                        <div className="progress-track" style={{ height: 4, marginTop: 6 }}>
                          <div className="progress-fill" style={{ transform: `scaleX(${usagePct / 100})`, background: 'var(--cat-1)' }} />
                        </div>
                      </td>
                      <td className="n" style={{ textAlign: 'right' }}>
                        {fmt(card.cupoDisponible ?? card.cupoTotal)}
                        <span className="cell-sub">de {fmt(card.cupoTotal)}</span>
                      </td>
                      <td className="n" style={{ textAlign: 'right' }}>
                        {obl > 0 ? <b style={{ fontSize: 16 }}>{fmt(obl)}</b> : <span className="text-muted">Sin deuda activa</span>}
                      </td>
                      <td style={{ width: 48 }}><RowMenuButton actions={acciones(card, { obl, nPend })} label={`Acciones de ${card.nombre}`} /></td>
                    </tr>
                    </RowMenu>
                  );
                })}
              </tbody>
            </table>

            <div className="mobile-list row-list">
              {displayCards.map(card => {
                const { usagePct, st, obl, nPend } = rowData(card);
                const [tone, label] = dueBadge(st?.dPago ?? 99);
                return (
                  <RowMenu key={card.id} actions={acciones(card, { obl, nPend })}>
                  <button className="cc-mrow" onClick={() => navigate(`/credit-cards/${card.id}`)}>
                    <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                      <CardBrand card={card} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="cell-title">{card.nombre}</span>
                        <span className="cell-sub">{card.entidad}{card.ultimos4 ? ` · ••${card.ultimos4}` : ''}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {obl > 0 ? (
                          <>
                            <b className="n" style={{ fontSize: 15 }}>{fmt(obl)}</b>
                            <span className={`cell-sub ${tone ? `tone-${tone}` : ''}`}>{label}</span>
                          </>
                        ) : <span className="badge badge-success">Al día</span>}
                      </div>
                    </div>
                    <div className="progress-track" style={{ height: 4, margin: '10px 0 8px' }}>
                      <div className="progress-fill" style={{ transform: `scaleX(${usagePct / 100})`, background: 'var(--cat-1)' }} />
                    </div>
                    <div className="row-between">
                      <span className="text-sm text-secondary n">{Math.round(usagePct)} % usado · disp. {fmt(card.cupoDisponible)}</span>
                      {nPend > 0 ? <span className="badge badge-primary">{nPend} por aprobar</span> : obl === 0 ? <span className="text-sm text-secondary">Corte día {card.fechaCorte}</span> : null}
                    </div>
                  </button>
                  </RowMenu>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ── Diálogo: asignar movimientos sin tarjeta ── */}
      <Dialog.Root open={assignOpen} onOpenChange={setAssignOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dlg-overlay" />
          <Dialog.Content className="dlg-content wide" style={{ padding: 0 }}>
            <div className="row-between" style={{ padding: '20px 24px 12px', alignItems: 'flex-start' }}>
              <div>
                <Dialog.Title className="dlg-title">Asignar movimientos</Dialog.Title>
                <Dialog.Description className="text-secondary" style={{ fontSize: 14, margin: '4px 0 0' }}>
                  Detectados en Gmail sin tarjeta. Elige la tarjeta de cada uno para poder aprobarlo.
                </Dialog.Description>
              </div>
              <Dialog.Close className="icon-btn ghost sm" aria-label="Cerrar"><X size={18} /></Dialog.Close>
            </div>
            {sinTarjeta.length === 0
              ? <p className="card-empty" style={{ padding: '8px 24px 24px' }}>Ya no quedan movimientos sin tarjeta.</p>
              : <PendingList items={sinTarjeta} cards={cardsActivas} onDone={load} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
