import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Inbox, ChevronRight, ChevronDown, BarChart3, Wallet, CreditCard, Mail, Eye, Check, X } from 'lucide-react';
import { RowMenu } from '../components/ui/RowMenu';
import { useRowMenuTip } from '../hooks/useRowMenuTip';
import { accionesTarjeta } from '../components/credit-cards/cardMenu';
import Swal from '../utils/alerts';
import { BankCreditService } from '../services/bankCreditService';
import { CreditCardService } from '../services/creditCardService';
import { CardInboxService } from '../services/cardInboxService';
import { GmailService } from '../services/gmailService';
import { AuthService } from '../services/authService';
import { AnalyticsService } from '../services/analyticsService';
import { BalanceService } from '../services/balanceService';
import { AlertsBell } from '../components/layout/AlertsBell';
import { useShell } from '../components/layout/ShellContext';
import { userInitials, userFirstName } from '../components/layout/userDisplay';
import { fmt, localISODate, parseLocalDate, capFirst } from '../utils/format';
import { buildCardStats } from '../utils/creditCard';
import { getCardColor } from '../utils/cardColors';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABEL = { subscription: 'Suscripción', bank_credit: 'Crédito', credit_card: 'Tarjeta' };

const daysUntil = (dateStr) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((parseLocalDate(dateStr) - today) / 86_400_000);
};

const dueLabel = (d) => d < 0 ? 'Vencido' : d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`;
const dueTone  = (d) => d <= 1 ? 'danger' : d <= 3 ? 'warning' : null;

const monthName = (date = new Date()) => date.toLocaleDateString('es-CO', { month: 'long' });
const dayMonth  = (dateStr) => {
  const d = parseLocalDate(dateStr);
  return { day: String(d.getDate()).padStart(2, '0'), mon: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '') };
};
const pct = (n) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;

const HEALTH_TONE = { 'Excelente': 'success', 'Bueno': 'success', 'Regular': 'warning', 'Crítico': 'danger' };

// Línea de tendencia mínima (sin ejes): últimos meses de dinero libre.
const Sparkline = ({ values }) => {
  if (values.length < 2) return null;
  const w = 120, h = 28, min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)]);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ overflow: 'visible' }}>
      <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill="var(--brand-600)" />
    </svg>
  );
};

// Barra apilada de compromisos + libre.
const SplitBar = ({ parts }) => {
  const total = parts.reduce((a, p) => a + Math.max(p.value, 0), 0) || 1;
  return (
    <div className="split-bar" role="img" aria-label={parts.map(p => `${p.name} ${fmt(p.value)}`).join(', ')}>
      {parts.filter(p => p.value > 0).map(p => (
        <span key={p.key} style={{ flexGrow: p.value / total, background: p.color }} />
      ))}
    </div>
  );
};

// ── Estado vacío (cuenta nueva) ────────────────────────────────────────────────

const Onboard = ({ hasIncome, hasDebt, gmailConnected, navigate }) => {
  const steps = [
    { done: hasIncome, title: 'Registra tus ingresos', sub: 'Tu salario y otras entradas fijas. Con esto calculamos cuánto te queda libre.', icon: Wallet, label: 'Registrar ingresos', to: '/income/new' },
    { done: hasDebt, title: 'Agrega tu primera tarjeta o crédito', sub: 'Cupo, fecha de corte y cuotas, para avisarte antes de cada pago.', icon: CreditCard, label: 'Agregar tarjeta o crédito', to: '/credit-cards/new' },
    { done: gmailConnected, title: 'Conecta Gmail para detectar compras', sub: 'Leemos solo las notificaciones de tu banco y dejamos cada compra por aprobar.', icon: Mail, label: 'Conectar Gmail', to: '/profile#gmail' },
  ];
  const doneN = steps.filter(s => s.done).length;
  const firstPending = steps.findIndex(s => !s.done);
  return (
    <div className="card card-flush">
      <div style={{ padding: '20px 24px' }}>
        <div className="row-between">
          <h2 className="card-title">Empieza en 3 pasos</h2>
          <span className="text-sm text-secondary n">{doneN} de 3 listos</span>
        </div>
        <p className="text-secondary" style={{ margin: '8px 0 12px', fontSize: 14 }}>Con esto Debti puede mostrarte tu dinero libre y avisarte antes de cada pago.</p>
        <div className="progress-track"><div className="progress-fill" style={{ transform: `scaleX(${doneN / 3})` }} /></div>
      </div>
      <div className="row-list" style={{ borderTop: '1px solid var(--divider)' }}>
        {steps.map((s, i) => (
          <div key={s.title} className="onb-step">
            <span className={`onb-num ${s.done ? 'done' : ''}`}>{s.done ? '✓' : i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="onb-title">{s.title}</p>
              <p className="onb-sub">{s.sub}</p>
            </div>
            {!s.done && (
              <button className={`btn ${i === firstPending ? 'btn-primary' : 'btn-secondary'}`} onClick={() => navigate(s.to)}>
                <s.icon size={16} /> {s.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Componente ────────────────────────────────────────────────────────────────

export const Dashboard = () => {
  const navigate  = useNavigate();
  const { openSearch } = useShell();
  const user      = AuthService.getCurrentUser();
  const firstName = userFirstName(user) || 'Usuario';

  const [summary, setSummary] = useState(null);
  const [credits, setCredits] = useState([]);
  const [cards,   setCards]   = useState([]);
  const [trend,   setTrend]   = useState([]);
  const [inbox,   setInbox]   = useState([]);
  const [gmail,   setGmail]   = useState(null);
  const [bal,     setBal]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      AnalyticsService.getSummary(),
      BankCreditService.getAll(),
      CreditCardService.getAll(),
      AnalyticsService.getMonthlyTrend(6),
      CardInboxService.list('pendiente'),
      GmailService.getStatus(),
      BalanceService.mesActual(),
    ]).then(([sRes, cRes, kRes, tRes, iRes, gRes, bRes]) => {
      if (sRes.status === 'fulfilled') setSummary(sRes.value);
      if (cRes.status === 'fulfilled') setCredits(cRes.value);
      if (kRes.status === 'fulfilled') setCards(kRes.value);
      if (tRes.status === 'fulfilled') setTrend(tRes.value);
      if (iRes.status === 'fulfilled') setInbox(iRes.value);
      if (gRes.status === 'fulfilled') setGmail(gRes.value);
      if (bRes.status === 'fulfilled') setBal(bRes.value);
    }).finally(() => setLoading(false));
  }, []);

  // ── Valores derivados ──────────────────────────────────────────────────────
  const obl         = summary?.obligations ?? {};
  const totalIncome = summary?.income?.total ?? 0;

  // Tarjetas: fuente ÚNICA de verdad. `buildCardStats` (la MISMA que usa la
  // página de Tarjetas) calcula la obligación por ciclo activo, así que un
  // cambio en la lógica de tarjetas se refleja aquí sin tocar nada más.
  const cardStats = useMemo(() => buildCardStats(cards), [cards]);
  const cardsObl  = cardStats.reduce((s, cs) => s + cs.cardOblMes, 0);

  // El total del backend trae su propio cálculo de tarjetas; lo sustituimos por
  // el de buildCardStats y recalculamos dinero libre en consecuencia.
  const oblGeneral  = (obl.total ?? 0) - (obl.creditCards ?? 0) + cardsObl;
  const health      = summary?.health;

  // Si el mes tiene Balance, el hero y el resumen usan SUS cifras (lo que el
  // usuario eligió pagar y sus ingresos reales); si no, el cálculo general.
  const ingresosMes = bal ? bal.r.ingresos : totalIncome;
  const totalObl    = bal ? bal.r.gastos : oblGeneral;
  const dineroLibre = bal ? bal.r.queda : (summary ? totalIncome - oblGeneral : null);

  const parts = bal ? [
    { key: 'cards', name: 'Tarjetas',      value: bal.g.tarjeta,     color: 'var(--cat-1)' },
    { key: 'banks', name: 'Créditos',      value: bal.g.credito,     color: 'var(--cat-2)' },
    { key: 'subs',  name: 'Suscripciones', value: bal.g.suscripcion, color: 'var(--cat-3)' },
    { key: 'other', name: 'Otros pagos',   value: bal.g.manual,      color: 'var(--cat-4)' },
    { key: 'free',  name: 'Libre',         value: Math.max(dineroLibre ?? 0, 0), color: 'var(--pos-500)' },
  ].filter(p => p.key === 'free' || p.value > 0) : [
    { key: 'cards', name: 'Tarjetas',      value: cardsObl,                 color: 'var(--cat-1)' },
    { key: 'banks', name: 'Créditos',      value: obl.bankCredits ?? 0,     color: 'var(--cat-2)' },
    { key: 'subs',  name: 'Suscripciones', value: obl.subscriptions ?? 0,   color: 'var(--cat-3)' },
    { key: 'free',  name: 'Libre',         value: Math.max(dineroLibre ?? 0, 0), color: 'var(--pos-500)' },
  ];

  // Comparación con el mes anterior. Con Balance: contra el Balance del mes
  // anterior (si existe); sin Balance: ingresos actuales menos compromisos de cada mes.
  const freeSeries = bal ? [] : trend.map(t => totalIncome - t.total);
  const prevFree   = bal ? (bal.prev?.queda ?? null) : (freeSeries.length >= 2 ? freeSeries[freeSeries.length - 2] : null);
  const deltaFree  = prevFree !== null && dineroLibre !== null ? dineroLibre - prevFree : null;
  const prevMonth  = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

  // Próximos pagos: los de tarjeta se derivan de `buildCardStats` (la misma
  // fuente que la página de Tarjetas) en vez del cálculo del backend, para que
  // fecha y monto coincidan exactamente con la lista de tarjetas.
  const cardUpcoming = cardStats
    .filter(cs => cs.cardOblMes > 0 && cs.nextPago && cs.dPago >= 0 && cs.dPago <= 30)
    .map(cs => ({ date: localISODate(cs.nextPago), name: cs.nombre, sub: cs.entidad, type: 'credit_card', amount: cs.cardOblMes, moneda: 'COP', to: `/credit-cards/${cs.cardId}` }));
  const creditById = Object.fromEntries(credits.map(c => [c.nombre, c]));
  const upcoming = [
    ...(summary?.upcoming ?? []).filter(u => u.type !== 'credit_card').map(u => {
      const c = u.type === 'bank_credit' ? creditById[u.name] : null;
      return {
        ...u,
        sub: c ? `${c.entidad} · cuota ${c.cuotasPagadas + 1} de ${c.numeroCuotas}` : null,
        to: u.type === 'bank_credit' ? (c ? `/bank-credits/${c.id}` : '/bank-credits') : '/subscriptions',
      };
    }),
    ...cardUpcoming,
  ].sort((a, b) => a.date.localeCompare(b.date));

  const activeCredits = credits.filter(c => c.status === 'activo');
  const totalDebt     = summary?.debt?.total ?? 0;
  const cardById      = Object.fromEntries(cards.map(c => [c.id, c]));

  // ── Acciones rápidas (clic derecho / mantener presionado) ──
  useRowMenuTip(cards.length > 0 || upcoming.length > 0);
  const pendientesDe = (cardId) => inbox.filter(i => i.creditCardId === cardId).length;
  // Próximo pago: ir al detalle y pagar con la confirmación de cada vista (?accion=pagar).
  const accionesPago = (u) => [
    { label: u.type === 'subscription' ? 'Ver suscripciones' : 'Ver detalle', icon: Eye, onSelect: () => navigate(u.to) },
    u.type === 'credit_card' && { label: 'Pagar corte', icon: Check, onSelect: () => navigate(`${u.to}?accion=pagar`) },
    u.type === 'bank_credit' && u.to !== '/bank-credits' && { label: 'Pagar cuota', icon: Check, onSelect: () => navigate(`${u.to}?accion=pagar`) },
  ];
  // Por aprobar: aprobar tal cual llegó del correo o descartar, sin salir de Inicio.
  const resolverInbox = async (it, fn, okMsg) => {
    try { await fn(); setInbox(list => list.filter(x => x.id !== it.id)); Swal.fire({ icon: 'success', title: okMsg }); }
    catch (err) { Swal.fire({ icon: 'error', title: err.response?.data?.message || 'No se pudo completar' }); }
  };
  const accionesInbox = (it) => [
    it.tipo !== 'pago' && it.creditCardId && { label: 'Aprobar tal cual', icon: Check, onSelect: () => resolverInbox(it, () => CardInboxService.approve(it.id, {}), 'Movimiento registrado') },
    { label: 'Revisar y ajustar', icon: Eye, onSelect: () => navigate(it.creditCardId ? `/credit-cards/${it.creditCardId}/pending` : '/credit-cards?tab=por-aprobar') },
    'sep',
    { label: it.tipo === 'pago' ? 'Marcar como visto' : 'Descartar', icon: X, danger: it.tipo !== 'pago', onSelect: () => resolverInbox(it, () => CardInboxService.discard(it.id), it.tipo === 'pago' ? 'Marcado como visto' : 'Movimiento descartado') },
  ];

  const hasIncome = totalIncome > 0;
  const hasDebt   = cards.length > 0 || credits.length > 0;
  const isEmpty   = !loading && !hasIncome && !hasDebt;

  const hoy = capFirst(new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }));
  const mes = monthName();

  // ── Render ─────────────────────────────────────────────────────────────────

  const header = (
    <>
      {/* Teléfono: saludo con avatar + búsqueda y avisos */}
      <div className="m-header">
        <Link to="/more" className="avatar" aria-label="Perfil y ajustes">{userInitials(user)}</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="m-title">Hola, {firstName}</h1>
          <p className="m-sub">{hoy}</p>
        </div>
        <button className="icon-btn" onClick={openSearch} aria-label="Buscar"><Search size={18} /></button>
        <AlertsBell />
      </div>
      {/* PC */}
      <div className="page-header desktop-only">
        <div>
          <h1 className="page-title">Hola, {firstName}</h1>
          <p className="page-subtitle">{hoy} · {isEmpty ? 'Organicemos tu mes' : 'Así va tu mes'}</p>
        </div>
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="dash" aria-busy="true">
        {header}
        <div className="dash-top">
          <div className="skeleton" style={{ height: 272, borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton desktop-only" style={{ height: 272, borderRadius: 'var(--radius-lg)' }} />
        </div>
        <div className="dash-mid">
          <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton desktop-only" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="dash animate-fade-in">
        {header}
        <div className="dash-top">
          <Onboard hasIncome={hasIncome} hasDebt={hasDebt} gmailConnected={!!gmail?.connected} navigate={navigate} />
          <div className="card">
            <p className="text-secondary" style={{ fontSize: 14, margin: '0 0 16px' }}>Dinero libre en {mes}</p>
            <span className="empty-state-icon" style={{ width: 56, height: 56 }}><BarChart3 size={22} /></span>
            <h2 className="card-title" style={{ margin: '16px 0 6px' }}>Aquí verás cuánto te queda libre</h2>
            <p className="text-secondary" style={{ fontSize: 14, margin: 0 }}>Restamos tus cuotas de tarjetas, créditos y suscripciones a tus ingresos del mes, y te mostramos en qué se va cada peso.</p>
            <div className="split-bar empty" style={{ margin: '20px 0 12px' }} />
            <p className="text-muted text-sm" style={{ margin: 0 }}>Se activa cuando registres tus ingresos (paso 1).</p>
          </div>
        </div>
        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="card-title">Próximos pagos</h2>
          <p className="text-secondary" style={{ fontSize: 14, margin: '6px 0 0' }}>Aún no hay pagos programados. Aparecerán aquí con su fecha cuando agregues una tarjeta o un crédito.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash animate-fade-in">
      {header}

      {/* ═══ Fila 1: dinero libre + resumen ═══ */}
      <div className="dash-top">
        {dineroLibre !== null && (
          <section className="card dash-hero" aria-label="Dinero libre">
            <div className="row-between">
              <p className="dash-hero-label">Dinero libre en {mes}{bal && <> · <Link to="/balance" className="link-sm">según tu Balance</Link></>}</p>
              {health && (
                <span className={`badge badge-${HEALTH_TONE[health.label] ?? 'warning'}`}>
                  <span className="desktop-only">{`Salud financiera: ${health.label} · ${health.score}/100`}</span>
                  <span className="mobile-only">{`${health.label} · ${health.score}`}</span>
                </span>
              )}
            </div>
            <div className="dash-hero-amount">
              <span className={`amount-xl ${dineroLibre < 0 ? 'neg' : ''}`}>{fmt(dineroLibre)}</span>
              {ingresosMes > 0 && (
                <span className="dash-hero-note desktop-only">
                  {dineroLibre >= 0
                    ? `el ${pct((dineroLibre / ingresosMes) * 100)} de tus ingresos queda libre`
                    : 'tus compromisos superan tus ingresos'}
                </span>
              )}
            </div>
            <SplitBar parts={parts} />
            <button className="legend desktop-flex" onClick={() => setShowBreakdown(o => !o)} aria-expanded={showBreakdown}>
              {parts.map(p => (
                <span key={p.key} className="legend-item">
                  <i style={{ background: p.color }} />{p.name} <b className="n">{fmt(p.value)}</b>
                </span>
              ))}
              <ChevronDown size={16} className={`legend-caret ${showBreakdown ? 'open' : ''}`} />
            </button>
            {showBreakdown && (
              <div className="dash-breakdown desktop-only">
                {(bal ? bal.filas.filter(f => f.tipo === 'gasto' && f.valor > 0).map(f => ({ k: `f${f.id}`, name: f.descripcion, sub: f.categoria, v: f.valor })) : [
                  ...cardStats.filter(cs => cs.cardOblMes > 0).map(cs => ({ k: `c${cs.cardId}`, name: cs.nombre, sub: 'Tarjeta', v: cs.cardOblMes })),
                  ...(summary?.breakdown?.bankCredits ?? []).map((b, i) => ({ k: `b${i}`, name: b.nombre ?? b.name, sub: 'Crédito', v: b.monto ?? b.amount })),
                  ...(summary?.breakdown?.subscriptions ?? []).map((b, i) => ({ k: `s${i}`, name: b.nombre ?? b.name, sub: 'Suscripción', v: b.monto ?? b.amount })),
                ]).map(r => (
                  <div key={r.k} className="kv"><span>{r.name} <span className="text-muted">· {r.sub}</span></span><span>{fmt(r.v)}</span></div>
                ))}
              </div>
            )}

            {/* Teléfono: ingresos y compromisos bajo la barra */}
            <div className="dash-hero-mini mobile-only">
              <div><span>Ingresos</span><b className="n">{fmt(ingresosMes)}</b></div>
              <div><span>{bal ? 'Pagos' : 'Compromisos'}</span><b className="n">{fmt(totalObl)}</b></div>
            </div>

            {/* Con Balance y sin mes anterior para comparar: avance de pagos del mes */}
            {bal && deltaFree === null && (
              <div className="dash-hero-foot desktop-flex">
                <div className="row" style={{ gap: 32 }}>
                  <div><p className="text-secondary" style={{ margin: 0, fontSize: 13 }}>Ya pagado</p><p className="n dash-delta">{fmt(bal.r.pagado)}</p></div>
                  <div><p className="text-secondary" style={{ margin: 0, fontSize: 13 }}>Por pagar</p><p className="n dash-delta">{fmt(bal.r.pendiente + bal.r.comprometido)}</p></div>
                </div>
                <Link to="/balance" className="link-sm">Ver Balance</Link>
              </div>
            )}

            {deltaFree !== null && (
              <div className="dash-hero-foot desktop-flex">
                <div>
                  <p className="text-secondary" style={{ margin: 0, fontSize: 13 }}>vs. {monthName(prevMonth)}</p>
                  <p className={`n dash-delta ${deltaFree >= 0 ? 'up' : 'down'}`}>
                    {deltaFree >= 0 ? '+' : '−'}{fmt(Math.abs(deltaFree))}
                    {prevFree > 0 && ` (${deltaFree >= 0 ? '+' : '−'}${Math.round(Math.abs(deltaFree / prevFree) * 100)} %)`}
                  </p>
                </div>
                {freeSeries.length >= 2 && (
                  <div className="row" style={{ gap: 12 }}>
                    <span className="text-muted text-sm">Últimos {freeSeries.length} meses</span>
                    <Sparkline values={freeSeries} />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="card card-flush dash-side desktop-only row-list" aria-label="Resumen del mes">
          <Link to={bal ? '/balance' : '/income'} className="dash-side-row">
            <div><p>Ingresos del mes</p><b className="n">{fmt(ingresosMes)}</b></div>
            {bal ? <span className="n">{fmt(bal.r.recibido)} recibido</span>
              : summary?.income?.extra > 0 && <span className="n">incluye {fmt(summary.income.extra)} extra</span>}
          </Link>
          <Link to={bal ? '/balance' : '/reports'} className="dash-side-row">
            <div><p>{bal ? 'Pagos del mes' : 'Compromisos del mes'}</p><b className="n">{fmt(totalObl)}</b></div>
            {bal ? <span className="n">{fmt(bal.r.pagado)} pagado</span>
              : totalIncome > 0 && <span className="n">{pct((totalObl / totalIncome) * 100)} del ingreso</span>}
          </Link>
          <Link to="/bank-credits" className="dash-side-row">
            <div><p>Deuda total</p><b className="n">{fmt(totalDebt)}</b></div>
            <span>{activeCredits.length} crédito{activeCredits.length !== 1 ? 's' : ''} · {cards.length} tarjeta{cards.length !== 1 ? 's' : ''}</span>
          </Link>
        </section>
      </div>

      {/* Teléfono: aviso de movimientos por aprobar */}
      {inbox.length > 0 && (
        <Link to="/credit-cards?tab=por-aprobar" className="card dash-inbox-banner mobile-only">
          <span className="dash-inbox-icon"><Inbox size={18} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>{inbox.length} movimiento{inbox.length !== 1 ? 's' : ''} por aprobar</b>
            <span>Detectados en Gmail</span>
          </span>
          <ChevronRight size={18} className="text-muted" />
        </Link>
      )}

      {/* ═══ PC: dos columnas independientes (sin huecos entre tarjetas de distinta altura) ═══ */}
      <div className="dash-cols">
        <div className="dash-col">
        <section className="card card-flush dash-o1" aria-labelledby="dash-upcoming">
          <div className="card-header">
            <h2 className="card-title" id="dash-upcoming">Próximos pagos</h2>
            <Link to="/reports" className="link-sm">Ver todo</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="card-empty">No tienes pagos en los próximos 30 días.</p>
          ) : (
            <>
              <table className="dash-table desktop-table">
                <thead><tr><th>Fecha</th><th>Concepto</th><th>Vence</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
                <tbody>
                  {upcoming.slice(0, 6).map((u, i) => {
                    const d = daysUntil(u.date); const tone = dueTone(d); const dm = dayMonth(u.date);
                    return (
                      <RowMenu key={i} actions={accionesPago(u)}>
                      <tr className="clickable" onClick={() => navigate(u.to)}>
                        <td className="text-secondary n" style={{ whiteSpace: 'nowrap' }}>{dm.day} {dm.mon}</td>
                        <td>
                          <span className="cell-title">{u.name}</span>
                          <span className="cell-sub">{TYPE_LABEL[u.type]}{u.sub ? ` · ${u.sub}` : ''}</span>
                        </td>
                        <td>{tone ? <span className={`badge badge-${tone}`}>{dueLabel(d)}</span> : <span className="text-secondary text-sm">{dueLabel(d)}</span>}</td>
                        <td className="n" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(u.amount)}</td>
                      </tr>
                      </RowMenu>
                    );
                  })}
                </tbody>
              </table>
              <div className="mobile-list row-list">
                {upcoming.slice(0, 4).map((u, i) => {
                  const d = daysUntil(u.date); const tone = dueTone(d); const dm = dayMonth(u.date);
                  return (
                    <RowMenu key={i} actions={accionesPago(u)}>
                    <Link to={u.to} className="pay-row">
                      <span className="pay-date"><b className="n">{dm.day}</b><span>{dm.mon}</span></span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="cell-title">{u.name}</span>
                        <span className={`cell-sub ${tone ? `tone-${tone}` : ''}`}>{dueLabel(d)}{u.type !== 'subscription' ? ` · ${TYPE_LABEL[u.type].toLowerCase()}` : ''}</span>
                      </span>
                      <b className="n">{fmt(u.amount)}</b>
                    </Link>
                    </RowMenu>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="card dash-o3" aria-labelledby="dash-credits">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <h2 className="card-title" id="dash-credits">Créditos</h2>
            <Link to="/bank-credits" className="link-sm">Ver todos</Link>
          </div>
          {activeCredits.length === 0 ? (
            <p className="text-secondary" style={{ fontSize: 14 }}>No tienes créditos activos. <Link to="/bank-credits/new">Agregar crédito</Link></p>
          ) : (
            <>
              <div className="dash-credit-list">
                {activeCredits.slice(0, 3).map(c => {
                  const progress = c.numeroCuotas ? (c.cuotasPagadas / c.numeroCuotas) : 0;
                  return (
                    <Link key={c.id} to={`/bank-credits/${c.id}`} className="dash-credit">
                      <div className="row-between">
                        <span><b>{c.nombre}</b> <span className="text-secondary">· {c.entidad}</span></span>
                        <span className="text-secondary n">{c.cuotasPagadas} de {c.numeroCuotas} cuotas</span>
                      </div>
                      <div className="progress-track" style={{ margin: '10px 0 8px' }}>
                        <div className="progress-fill" style={{ transform: `scaleX(${progress})` }} />
                      </div>
                      <div className="row-between text-sm text-secondary n">
                        <span>{fmt(parseFloat(c.valorCuota) + parseFloat(c.cuotaAdministracion || 0))} al mes</span>
                        <span>Saldo {fmt(c.saldoPendiente)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="dash-credit-foot">
                <div><p>Cuotas este mes</p><b className="n">{fmt(obl.bankCredits ?? 0)}</b></div>
                <div><p>Saldo total</p><b className="n">{fmt(activeCredits.reduce((a, c) => a + parseFloat(c.saldoPendiente || 0), 0))}</b></div>
              </div>
            </>
          )}
        </section>
        </div>

        <div className="dash-col">
        <section className="card dash-cards" aria-labelledby="dash-cards">
          <div className="card-header" style={{ marginBottom: 8 }}>
            <h2 className="card-title" id="dash-cards">Tarjetas</h2>
            <Link to="/credit-cards" className="link-sm">Ver todas</Link>
          </div>
          {cards.length === 0 ? (
            <p className="text-secondary" style={{ fontSize: 14 }}>Aún no tienes tarjetas. <Link to="/credit-cards/new">Agregar tarjeta</Link></p>
          ) : (
            <div className="row-list">
              {cardStats.slice(0, 4).map(cs => {
                const c = cardById[cs.cardId];
                const total = parseFloat(c.cupoTotal) || 0;
                const used = total ? Math.min(100, Math.max(0, ((total - parseFloat(c.cupoDisponible)) / total) * 100)) : 0;
                return (
                  <RowMenu key={cs.cardId} actions={accionesTarjeta(c, { navigate, porPagar: cs.cardOblMes, pendientes: pendientesDe(cs.cardId) })}>
                  <Link to={`/credit-cards/${cs.cardId}`} className="dash-card-row">
                    <div className="row-between">
                      <span className="row" style={{ gap: 10, minWidth: 0 }}>
                        <span className="card-chip" style={{ background: getCardColor(c.color) }} />
                        <span className="truncate"><b>{c.nombre}</b> <span className="text-secondary">· {c.entidad}</span></span>
                      </span>
                      {cs.cardOblMes > 0 ? <b className="n">{fmt(cs.cardOblMes)}</b> : <span className="text-success text-sm" style={{ fontWeight: 600 }}>Al día</span>}
                    </div>
                    <div className="progress-track" style={{ margin: '10px 0 8px' }}>
                      <div className="progress-fill" style={{ transform: `scaleX(${used / 100})`, background: 'var(--cat-1)' }} />
                    </div>
                    <div className="row-between text-sm text-secondary">
                      <span className="n">Cupo usado {Math.round(used)} % · disponible {fmt(c.cupoDisponible)}</span>
                      {cs.cardOblMes > 0 && <span>pago del corte</span>}
                    </div>
                  </Link>
                  </RowMenu>
                );
              })}
            </div>
          )}
        </section>

        <section className="card dash-o4" aria-labelledby="dash-inbox">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <h2 className="card-title row" id="dash-inbox" style={{ gap: 8 }}>
              Por aprobar {inbox.length > 0 && <span className="badge badge-primary n">{inbox.length}</span>}
            </h2>
            {gmail?.connected && gmail.lastSyncAt && <span className="text-muted text-sm">Detectados en Gmail</span>}
          </div>
          {!gmail?.connected ? (
            <div>
              <p className="text-secondary" style={{ fontSize: 14, margin: '0 0 12px' }}>Conecta Gmail y Debti detectará las compras de tus notificaciones bancarias para que solo tengas que aprobarlas.</p>
              <Link to="/profile#gmail" className="btn btn-secondary"><Mail size={16} /> Conectar Gmail</Link>
            </div>
          ) : inbox.length === 0 ? (
            <p className="text-secondary" style={{ fontSize: 14 }}>No hay movimientos nuevos por revisar.</p>
          ) : (
            <>
              <div className="row-list">
                {inbox.slice(0, 3).map(it => (
                  <RowMenu key={it.id} actions={accionesInbox(it)}>
                  <div className="row-between" style={{ padding: '10px 0' }}>
                    <span style={{ minWidth: 0 }}>
                      <span className="cell-title">{it.comercio || (it.tipo === 'avance' ? 'Avance' : 'Movimiento')}{it.numeroCuotas > 1 ? ` · ${it.numeroCuotas} cuotas` : ''}</span>
                      <span className="cell-sub">{cardById[it.creditCardId]?.nombre ?? 'Sin tarjeta'} · {dayMonth(it.fechaMovimiento).day} {dayMonth(it.fechaMovimiento).mon}</span>
                    </span>
                    <b className="n">{fmt(it.monto)}</b>
                  </div>
                  </RowMenu>
                ))}
              </div>
              <div className="row-between" style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, marginTop: 8 }}>
                <span className="text-secondary text-sm">{inbox.length > 3 ? `y ${inbox.length - 3} más` : ''}</span>
                <Link to="/credit-cards?tab=por-aprobar" className="link-sm">Revisar y aprobar{inbox.length > 1 ? ` los ${inbox.length}` : ''}</Link>
              </div>
            </>
          )}
        </section>
        </div>
      </div>

      {/* Teléfono: carrusel de tarjetas */}
      {cards.length > 0 && (
        <section className="mobile-only dash-o2" aria-labelledby="dash-cards-m">
          <div className="row-between" style={{ margin: '24px 0 12px' }}>
            <h2 className="card-title" id="dash-cards-m">Tus tarjetas</h2>
            <Link to="/credit-cards" className="link-sm">Ver todas</Link>
          </div>
          <div className="card-carousel">
            {cardStats.map(cs => {
              const c = cardById[cs.cardId];
              return (
                <Link key={cs.cardId} to={`/credit-cards/${cs.cardId}`} className="mini-cc" style={{ background: getCardColor(c.color) }}>
                  <div className="row-between"><b>{c.nombre}</b><span>{c.entidad}</span></div>
                  <div className="mini-cc-foot">
                    <div><span>Disponible</span><b className="n">{fmt(c.cupoDisponible)}</b></div>
                    {cs.cardOblMes > 0 && <div><span>Pago del corte</span><b className="n">{fmt(cs.cardOblMes)}</b></div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};
