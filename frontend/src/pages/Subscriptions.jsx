import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { Plus, Repeat, CreditCard, Eye, Pencil, Pause, Play, Ban, Trash2 } from 'lucide-react';
import { RowMenu, RowMenuButton } from '../components/ui/RowMenu';
import { useRowMenuTip } from '../hooks/useRowMenuTip';
import Swal from '../utils/alerts';
import { LoadError } from '../components/ui/LoadError';
import { fmt, fmtShort, nextOccurrence, daysUntil, parseLocalDate, effectiveDayInMonth } from '../utils/format';
import { subMonthlyCOP, subAnnualCOP } from '../utils/currency';

const STATUS = {
  activa:    { label: 'Activa',    tone: 'success' },
  pausada:   { label: 'Pausada',   tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
};
const FREQ = { mensual: 'Mensual', anual: 'Anual' };
const whenText = (d) => d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`;
const weekday = (d) => d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');

// Próxima fecha de cobro: mensual el día de cobro; anual el mismo día y mes de inicio.
const nextCharge = (s) => {
  if (s.frecuencia !== 'anual') return nextOccurrence(s.diaCobro);
  const ini = parseLocalDate(s.fechaInicio);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let y = today.getFullYear();
  let d = new Date(y, ini.getMonth(), effectiveDayInMonth(s.diaCobro, y, ini.getMonth()));
  if (d < today) { y += 1; d = new Date(y, ini.getMonth(), effectiveDayInMonth(s.diaCobro, y, ini.getMonth())); }
  return d;
};

export const Subscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    SubscriptionService.getAll()
      .then(setSubscriptions)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useRowMenuTip(subscriptions.length > 0);

  // ── Acciones rápidas (clic derecho / ⋯) ──
  const cambiarEstado = async (sub, status, okMsg) => {
    try { await SubscriptionService.update(sub.id, { status }); Swal.fire({ icon: 'success', title: okMsg }); load(); }
    catch { Swal.fire({ icon: 'error', title: 'No se pudo cambiar el estado' }); }
  };
  const cancelar = async (sub) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Cancelar "${sub.nombre}"?`, text: 'Deja de contar en tus gastos y de cobrarse. Puedes reactivarla después.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626', confirmButtonText: 'Cancelar suscripción', cancelButtonText: 'Volver',
    });
    if (isConfirmed) cambiarEstado(sub, 'cancelada', 'Suscripción cancelada');
  };
  const eliminar = async (sub) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar "${sub.nombre}"?`, text: 'Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;
    try { await SubscriptionService.delete(sub.id); Swal.fire({ icon: 'success', title: 'Suscripción eliminada' }); load(); }
    catch { Swal.fire({ icon: 'error', title: 'No se pudo eliminar la suscripción' }); }
  };
  const acciones = (sub) => [
    { label: 'Ver detalle', icon: Eye, onSelect: () => navigate(`/subscriptions/${sub.id}`) },
    { label: 'Editar', icon: Pencil, onSelect: () => navigate(`/subscriptions/${sub.id}/edit`) },
    sub.status === 'activa'
      ? { label: 'Pausar', icon: Pause, onSelect: () => cambiarEstado(sub, 'pausada', 'Suscripción pausada') }
      : { label: 'Reactivar', icon: Play, onSelect: () => cambiarEstado(sub, 'activa', 'Suscripción reactivada') },
    sub.status !== 'cancelada' && { label: 'Cancelar suscripción', icon: Ban, onSelect: () => cancelar(sub) },
    'sep',
    { label: 'Eliminar', icon: Trash2, danger: true, onSelect: () => eliminar(sub) },
  ];

  // Los totales cuentan SOLO las activas: una suscripción cancelada o pausada
  // ya no se cobra, incluirla inflaba el costo mensual del usuario.
  const activas = subscriptions.filter(s => s.status === 'activa');
  const totalMensual = activas.reduce((acc, s) => acc + subMonthlyCOP(s), 0);
  const totalAnual = totalMensual * 12;

  // Cobros de los próximos 30 días, agrupados por semana.
  const upcoming = useMemo(() => activas
    .map(s => { const date = nextCharge(s); return { sub: s, date, dias: daysUntil(date) }; })
    .filter(u => u.dias >= 0 && u.dias < 30)
    .sort((a, b) => a.dias - b.dias), [subscriptions]); // eslint-disable-line react-hooks/exhaustive-deps
  const proximo = upcoming[0] ?? null;
  const weeks = [0, 1, 2, 3].map(w => {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() + w * 7);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const items = upcoming.filter(u => Math.floor(u.dias / 7) === w);
    return { w, start, end, items, total: items.reduce((a, u) => a + subMonthlyCOP(u.sub) * (u.sub.frecuencia === 'anual' ? 12 : 1), 0) };
  });
  const WEEK_LABEL = ['Esta semana', 'Próxima semana', 'En 2 semanas', 'En 3 semanas'];
  const pausadas = subscriptions.filter(s => s.status === 'pausada');

  const header = (
    <div className="page-header">
      <div>
        <h1 className="page-title">Suscripciones</h1>
        <p className="page-subtitle">Servicios recurrentes, próximos cobros y costo anualizado</p>
      </div>
      <button className="btn btn-primary desktop-flex" onClick={() => navigate('/subscriptions/new')}><Plus size={18} /> Nueva suscripción</button>
      <button className="icon-btn mobile-only" onClick={() => navigate('/subscriptions/new')} aria-label="Nueva suscripción"><Plus size={20} /></button>
    </div>
  );

  if (loading) return (
    <div aria-busy="true">{header}
      <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)', marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 360, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
  if (error) return <div>{header}<LoadError onRetry={load} title="No se pudieron cargar tus suscripciones" /></div>;
  if (subscriptions.length === 0) return (
    <div className="animate-fade-in">{header}
      <div className="card empty-state">
        <div className="empty-state-icon"><Repeat size={24} /></div>
        <p className="empty-state-title">Agrega tu primera suscripción</p>
        <p>Netflix, Spotify, el gimnasio… Debti suma lo que pagas al mes y al año y te avisa antes de cada cobro.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/subscriptions/new')}><Plus size={16} /> Agregar suscripción</button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {header}

      <section className="card stat-strip" aria-label="Resumen de suscripciones">
        <div><p>Costo mensual</p><b className="n">{fmt(totalMensual)}</b><span>Solo suscripciones activas</span></div>
        <div><p>Costo anual</p><b className="n">{fmt(totalAnual)}</b><span>Lo que gastas al año</span></div>
        <div className="desktop-only"><p>Suscripciones</p><b className="n">{activas.length}</b><span>activas de {subscriptions.length} en total</span></div>
        <div className="desktop-only">
          <p>Próximo cobro</p>
          {proximo ? (
            <>
              <b className="row" style={{ gap: 10 }}>{whenText(proximo.dias)} <span className={`badge badge-${proximo.dias <= 1 ? 'danger' : proximo.dias <= 3 ? 'warning' : 'neutral'}`} style={{ marginTop: 0, fontSize: 12 }}>{fmtShort(proximo.date)}</span></b>
              <span>{proximo.sub.nombre} · {fmt(proximo.sub.monto, proximo.sub.moneda)}</span>
            </>
          ) : <b>—</b>}
        </div>
      </section>

      <section className="card card-flush" aria-labelledby="subs-all">
        <div className="card-header">
          <h2 className="card-title" id="subs-all">Todas las suscripciones</h2>
          <span className="text-sm text-muted n">{subscriptions.length} servicio{subscriptions.length !== 1 ? 's' : ''}</span>
        </div>

        <table className="cc-table desktop-table">
          <thead>
            <tr><th>Nombre</th><th>Estado</th><th style={{ textAlign: 'right' }}>Monto</th><th>Frecuencia</th><th style={{ textAlign: 'right' }}>Costo anual</th><th>Día de cobro</th><th>Cobro</th><th aria-label="Abrir" /></tr>
          </thead>
          <tbody>
            {subscriptions.map(sub => {
              const st = STATUS[sub.status] || STATUS.activa;
              const active = sub.status === 'activa';
              const dias = daysUntil(nextCharge(sub));
              const foreign = sub.moneda && sub.moneda !== 'COP';
              return (
                <RowMenu key={sub.id} actions={acciones(sub)}>
                <tr className={`clickable ${active ? '' : 'muted-row'}`} onClick={() => navigate(`/subscriptions/${sub.id}`)}>
                  <td>
                    <div className="row" style={{ gap: 12 }}>
                      <span className="list-icon letter">{sub.nombre.charAt(0).toUpperCase()}</span>
                      <div style={{ minWidth: 0 }}>
                        <span className="cell-title">{sub.nombre}</span>
                        {(!active || sub.descripcion) && <span className="cell-sub">{active ? sub.descripcion : 'No cuenta en el costo mensual'}</span>}
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge badge-${st.tone}`}>{st.label}</span></td>
                  <td className="n" style={{ textAlign: 'right' }}>
                    <b>{fmt(sub.monto, sub.moneda)}</b> <span className="text-muted text-sm">{sub.moneda}</span>
                    {foreign && <span className="cell-sub">≈ {fmt(subMonthlyCOP(sub))}</span>}
                  </td>
                  <td className="text-secondary">{FREQ[sub.frecuencia] || sub.frecuencia}</td>
                  <td className="n text-secondary" style={{ textAlign: 'right' }}>{foreign ? '≈ ' : ''}{fmt(subAnnualCOP(sub))}</td>
                  <td>
                    <span className="row" style={{ gap: 8 }}>
                      <span className="text-secondary">Día {sub.diaCobro}</span>
                      {active && dias <= 3 && <span className={`badge badge-${dias <= 1 ? 'danger' : 'warning'}`}>{whenText(dias)}</span>}
                    </span>
                  </td>
                  <td>
                    {sub.CreditCard
                      ? <span className="row text-secondary" style={{ gap: 6 }} title={`Se cobra automáticamente en ${sub.CreditCard.nombre}`}><CreditCard size={16} /> {sub.CreditCard.nombre}</span>
                      : <span className="badge badge-neutral">Manual</span>}
                  </td>
                  <td style={{ width: 48 }}><RowMenuButton actions={acciones(sub)} label={`Acciones de ${sub.nombre}`} /></td>
                </tr>
                </RowMenu>
              );
            })}
          </tbody>
        </table>

        <div className="mobile-list row-list">
          {subscriptions.map(sub => {
            const st = STATUS[sub.status] || STATUS.activa;
            const active = sub.status === 'activa';
            const dias = daysUntil(nextCharge(sub));
            return (
              <RowMenu key={sub.id} actions={acciones(sub)}>
              <button className={`cc-mrow row ${active ? '' : 'muted-row'}`} style={{ gap: 12 }} onClick={() => navigate(`/subscriptions/${sub.id}`)}>
                <span className="list-icon letter">{sub.nombre.charAt(0).toUpperCase()}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="cell-title">{sub.nombre}</span>
                  <span className={`cell-sub ${active && dias <= 1 ? 'tone-danger' : ''}`}>{active ? `${whenText(dias)} · ${sub.CreditCard ? sub.CreditCard.nombre : 'manual'}` : st.label}</span>
                </span>
                <b className="n">{fmt(sub.monto, sub.moneda)}</b>
              </button>
              </RowMenu>
            );
          })}
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }} aria-labelledby="subs-next">
        <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title" id="subs-next">Próximos cobros · 30 días</h2>
            <p className="card-subtitle n" style={{ fontSize: 14 }}>
              {fmtShort(weeks[0].start)} – {fmtShort(weeks[3].end)} · {upcoming.length} cobro{upcoming.length !== 1 ? 's' : ''}
            </p>
          </div>
          {pausadas.length > 0 && <span className="text-sm text-muted"><span className="badge badge-neutral">Pausada</span> {pausadas.map(p => p.nombre).join(', ')} no aparece{pausadas.length > 1 ? 'n' : ''}</span>}
        </div>
        <div className="weeks">
          {weeks.map(wk => (
            <div key={wk.w} className="week">
              <div className="week-head">
                <span><b>{WEEK_LABEL[wk.w]}</b> <span className="text-muted n">{wk.start.getDate()}–{wk.end.getDate()} {wk.end.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</span></span>
                {wk.total > 0 && <b className="n">{fmt(wk.total)}</b>}
              </div>
              {wk.items.length === 0 && <p className="text-sm text-muted" style={{ margin: '10px 0 0' }}>Sin cobros</p>}
              {wk.items.map(u => (
                <button key={u.sub.id} className={`week-item ${u.dias <= 1 ? 'soon' : ''}`} onClick={() => navigate(`/subscriptions/${u.sub.id}`)}>
                  <span className="pay-date"><b className="n">{u.date.getDate()}</b><span>{weekday(u.date)}</span></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="cell-title">{u.sub.nombre}</span>
                    <span className={`cell-sub ${u.dias <= 1 ? 'tone-danger' : ''}`}>{u.dias <= 1 ? `${whenText(u.dias)} · ` : ''}{u.sub.CreditCard ? u.sub.CreditCard.nombre : 'Manual'}</span>
                  </span>
                  <b className="n">{fmt(u.sub.monto, u.sub.moneda)}</b>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
