import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { AnalyticsService } from '../services/analyticsService';
import { SubscriptionService } from '../services/subscriptionService';
import { CreditCardService } from '../services/creditCardService';
import { BankCreditService } from '../services/bankCreditService';
import { BalanceService } from '../services/balanceService';
import { IncomeService } from '../services/incomeService';
import { StatCard } from '../components/ui/StatCard';
import { buildSchedule } from '../utils/creditCard';
import { localISODate, fmt as fmtCOP } from '../utils/format';
import { subMonthlyCOP } from '../utils/currency';
import {
  Download, FileText, TrendingUp, Calendar,
  CreditCard, Wallet, Zap, TrendingDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// ── Helpers ───────────────────────────────
const fmt = (n) => fmtCOP(n);

const fmtShort = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

const HEALTH_COLOR = (score) => {
  if (score >= 90) return { color: 'var(--color-success)',  bg: 'var(--color-success-bg)',   label: 'Excelente' };
  if (score >= 70) return { color: 'var(--color-primary)',  bg: 'var(--color-primary-light)', label: 'Bueno' };
  if (score >= 50) return { color: 'var(--color-warning)',  bg: 'var(--color-warning-bg)',    label: 'Regular' };
  return               { color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)',    label: 'Crítico' };
};

// Categorías de gasto en grises (el verde queda para lo que sobra).
const C_CARDS = '#1D2939', C_CREDITS = '#667085', C_SUBS = '#98A2B3';
const TYPE_COLORS = { subscription: C_SUBS, bank_credit: C_CREDITS, credit_card: C_CARDS };
const TYPE_LABEL  = { subscription: 'Suscripción', bank_credit: 'Crédito bancario', credit_card: 'Tarjeta' };
const DIST_COLORS = [C_SUBS, C_CREDITS, C_CARDS];

// Nota: se usa el helper compartido `subMonthlyCOP` (utils/currency.js), que
// parte de `montoMensual` y contempla EUR. El helper local anterior usaba el
// `monto` por cobro sin dividir las anuales entre 12 (las contaba 12× de más)
// y solo convertía USD.

// ── Sub-componentes ───────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem',
      boxShadow: 'var(--shadow-md)', fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, marginBottom: '0.3rem', color: 'var(--color-text-primary)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', margin: '0 0 10px' }}>
    {children}
  </p>
);

// ── Componente principal ──────────────────
export const Reports = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [summary, setSummary]     = useState(null);
  const [trend, setTrend]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(false);

  const [subs, setSubs]       = useState([]);
  const [cards, setCards]     = useState([]);
  const [credits, setCredits] = useState([]);
  const [bal, setBal]         = useState(null); // Balance del mes actual (si existe)

  useEffect(() => {
    Promise.allSettled([
      AnalyticsService.getSummary(),
      AnalyticsService.getMonthlyTrend(6),
      SubscriptionService.getAll(),
      CreditCardService.getAll(),
      BankCreditService.getAll(),
      BalanceService.mesActual(),
    ]).then(([s, t, subRes, cardRes, credRes, balRes]) => {
      if (s.status       === 'fulfilled') setSummary(s.value);
      if (t.status       === 'fulfilled') setTrend(t.value);
      if (subRes.status  === 'fulfilled') setSubs(subRes.value);
      if (cardRes.status === 'fulfilled') setCards(cardRes.value);
      if (credRes.status === 'fulfilled') setCredits(credRes.value);
      if (balRes.status  === 'fulfilled') setBal(balRes.value);
    }).finally(() => setLoading(false));
  }, []);

  const health = summary?.health;
  const hc     = health ? HEALTH_COLOR(health.score) : null;

  // Compromisos del mes: del Balance si el mes lo tiene; si no, de summary.obligations.
  const mesNombre = new Date().toLocaleDateString('es-CO', { month: 'long' });
  const distribution = bal ? [
    { name: 'Suscripciones',       value: bal.g.suscripcion, color: DIST_COLORS[0] },
    { name: 'Créditos bancarios',  value: bal.g.credito,     color: DIST_COLORS[1] },
    { name: 'Tarjetas de crédito', value: bal.g.tarjeta,     color: DIST_COLORS[2] },
    { name: 'Otros pagos',         value: bal.g.manual,      color: 'var(--cat-4)' },
  ].filter(d => d.value > 0) : summary ? [
    { name: 'Suscripciones',       value: summary.obligations.subscriptions, color: DIST_COLORS[0] },
    { name: 'Créditos bancarios',  value: summary.obligations.bankCredits,   color: DIST_COLORS[1] },
    { name: 'Tarjetas de crédito', value: summary.obligations.creditCards,   color: DIST_COLORS[2] },
  ].filter(d => d.value > 0) : [];


  // ── Proyección dinámica ──────────────────
  const getProjectionData = () => {
    const today = new Date();

    // Constantes (no varían mes a mes)
    // OJO: el enum de Subscription es 'activa' (femenino), no 'activo' — con
    // 'activo' el filtro no casaba nunca y la columna Suscripciones salía en 0.
    // Las que tienen creditCardId se excluyen: su cargo ya viene por la columna
    // Tarjetas (subscriptionChargeJob crea un CreditCardPurchase real).
    const totalSubs = subs
      .filter(s => s.status === 'activa' && !s.creditCardId)
      .reduce((acc, s) => acc + subMonthlyCOP(s), 0);

    return Array.from({ length: 12 }, (_, i) => {
      const d     = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });

      // Variables (decrecen con el tiempo)
      const totalCredits = credits
        .filter(c => c.status === 'activo' || c.status === 'en_mora')
        .reduce((acc, c) => {
          const restantes = parseInt(c.numeroCuotas ?? 0) - parseInt(c.cuotasPagadas ?? 0);
          return i < restantes ? acc + parseFloat(c.valorCuota ?? 0) : acc;
        }, 0);

      const totalCards = cards.reduce((acc, card) => {
        const schedule = buildSchedule(card.CreditCardPurchases || [], card, 18, 0);
        const slot = schedule.find(s => s.key === key);
        return acc + (slot ? slot.total : 0);
      }, 0);

      const totalObligations = totalSubs + totalCredits + totalCards;

      return {
        month: label.charAt(0).toUpperCase() + label.slice(1),
        key,
        Suscripciones: totalSubs,
        Créditos: totalCredits,
        Tarjetas: totalCards,
        Obligaciones: totalObligations,
      };
    });
  };

  // ── Exportar Excel ───────────────────────
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const [subsData, cardsData, creditsData, incomesData] = await Promise.all([
        SubscriptionService.getAll(),
        CreditCardService.getAll(),
        BankCreditService.getAll(),
        IncomeService.getAll(),
      ]);

      const wb = XLSX.utils.book_new();

      // Resumen
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Resumen Financiero', '', ''],
        ['', '', ''],
        ['INGRESOS', '', ''],
        ['Ingresos fijos mensuales',      summary?.income?.total  ?? 0, ''],
        ...(summary?.income?.extra > 0 ? [['Ingresos extra (esporádicos)', summary.income.extra, '']] : []),
        ['', '', ''],
        ['COMPROMISOS MENSUALES', '', ''],
        ['Suscripciones',       summary?.obligations?.subscriptions ?? 0, ''],
        ['Créditos bancarios',  summary?.obligations?.bankCredits   ?? 0, ''],
        ['Tarjetas de crédito', summary?.obligations?.creditCards   ?? 0, ''],
        ['Total compromisos',   summary?.obligations?.total         ?? 0, ''],
        ['', '', ''],
        ['Dinero libre mensual',  summary?.dineroLibre ?? 0, ''],
        ['Deuda total',           summary?.debt?.total ?? 0, ''],
        ['Score salud financiera', health?.score ?? 0, health?.label ?? ''],
      ]), 'Resumen');

      // Suscripciones
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Nombre', 'Monto', 'Moneda', 'Frecuencia', 'Día Cobro', 'Fecha Inicio', 'Estado'],
        ...subsData.map(s => [s.nombre, s.monto, s.moneda, s.frecuencia, s.diaCobro, s.fechaInicio, s.status]),
      ]), 'Suscripciones');

      // Créditos bancarios
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Nombre', 'Entidad', 'Monto Total', 'Saldo Pendiente', 'Cuota', 'Total Cuotas', 'Estado'],
        ...creditsData.map(c => [c.nombre, c.entidad, c.montoTotal, c.saldoPendiente, c.valorCuota, c.numeroCuotas, c.status]),
      ]), 'Créditos');

      // Tarjetas
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Nombre', 'Entidad', 'Cupo Total', 'Cupo Disponible', 'Cupo Usado', 'Tasa', 'Estado'],
        ...cardsData.map(c => [c.nombre, c.entidad, c.cupoTotal, c.cupoDisponible, c.cupoTotal - c.cupoDisponible, `${c.tasaInteresMensual}%`, c.status]),
      ]), 'Tarjetas');

      // Ingresos
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Nombre', 'Tipo', 'Monto', 'Frecuencia', 'Fuente', 'Fecha', 'Estado'],
        ...incomesData.map(i => [i.nombre, i.tipo ?? 'fijo', i.monto, i.frecuencia ?? 'mensual', i.fuente ?? '—', i.fecha ?? '—', i.status]),
      ]), 'Ingresos');


      // Tendencia
      if (trend.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
          ['Mes', 'Suscripciones', 'Créditos Bancarios', 'Tarjetas de Crédito', 'Total'],
          ...trend.map(t => [t.month, t.subscriptions, t.bankCredits, t.creditCards ?? 0, t.total]),
        ]), 'Tendencia');
      }

      XLSX.writeFile(wb, `Debti_Reporte_${localISODate()}.xlsx`);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      toast.error('Error al exportar', { description: 'No se pudo generar el archivo Excel.' });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header"><h1 className="page-title">Reportes y analítica</h1></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      </div>
    );
  }

  const projectionData        = getProjectionData();
  const avgMonthlyObligations = projectionData.reduce((acc, m) => acc + m.Obligaciones, 0) / 12;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0, flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 className="page-title">Reportes y analítica</h1>
          <p className="page-subtitle">Histórico de tus compromisos, proyección y salud financiera</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary desktop-flex" onClick={handlePrint}>
            <FileText size={16} /> PDF / Imprimir
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={exporting}>
            <Download size={16} /> {exporting ? 'Exportando…' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="segmented" role="tablist" aria-label="Vista" style={{ alignSelf: 'flex-start' }}>
        <button role="tab" aria-selected={activeTab === 'analytics'} aria-pressed={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
          Analítica<span className="desktop-only" style={{ display: 'inline' }}> · últimos 6 meses</span>
        </button>
        <button role="tab" aria-selected={activeTab === 'projection'} aria-pressed={activeTab === 'projection'} onClick={() => setActiveTab('projection')}>
          Proyección<span className="desktop-only" style={{ display: 'inline' }}> · próximos 12 meses</span>
        </button>
      </div>

      {/* ══ TAB 1: ANALÍTICA ══ */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Salud financiera */}
          {health && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div className="score-ring" style={{ '--p': health.score, '--c': hc.color }} role="img" aria-label={`Puntaje ${health.score} de 100`}>
                    <span><b className="n">{health.score}</b><small>de 100</small></span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 180 }}>
                  <h2 className="card-title row" style={{ gap: 8, marginBottom: 8 }}>Salud financiera <span className="badge" style={{ background: hc.bg, color: hc.color }}>{hc.label}</span></h2>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                    Utilización de cupo: <strong style={{ color: health.utilization > 70 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{health.utilization}%</strong>
                  </p>
                  {health.details?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {health.details.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 12 }}>
                          <span className="n" style={{ color: d.impact < 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600, minWidth: 28 }}>
                            {d.impact < 0 ? `−${Math.abs(d.impact)}` : '✓'}
                          </span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{d.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="health-kpis">
                  {[
                    bal ? { label: `Pagos de ${mesNombre}`, value: fmt(bal.r.gastos) } : { label: 'Obligación mensual', value: fmt(summary.obligations.total) },
                    { label: 'Deuda total',           value: fmt(summary.debt.total) },
                    { label: 'Suscripciones activas', value: summary.counts.activeSubscriptions },
                    { label: 'Pagos próximos 30 días', value: summary.upcoming.length },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p>{label}</p>
                      <b className="n">{value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ingresos y dinero libre del mes según el Balance */}
          {bal && (
            <div>
              <SectionLabel>{`Tu Balance de ${mesNombre}`}</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <StatCard label="Ingresos del mes" value={fmt(bal.r.ingresos)} delta={`${fmt(bal.r.recibido)} ya recibido`} icon={Wallet} tone="pos" />
                <StatCard label="Pagos del mes" value={fmt(bal.r.gastos)} delta={`${fmt(bal.r.pagado)} pagado · ${fmt(bal.r.pendiente + bal.r.comprometido)} por pagar`} icon={Calendar} tone="warn" />
                <StatCard label="Dinero libre" value={fmt(bal.r.queda)} delta="Ingresos − pagos del Balance" icon={TrendingDown} tone={bal.r.queda >= 0 ? 'pos' : 'neg'} />
              </div>
            </div>
          )}

          {/* Ingresos: fijo vs extra (sin Balance del mes) */}
          {!bal && summary && (summary.income.total > 0 || (summary.income.extra ?? 0) > 0) && (
            <div>
              <SectionLabel>Ingresos mensuales</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <StatCard
                  label="Ingresos fijos"
                  value={fmt(summary.income.total)}
                  delta="Fuentes recurrentes mensuales"
                  icon={Wallet}
                  tone="pos"
                />
                {(summary.income.extra ?? 0) > 0 && (
                  <StatCard
                    label="Ingresos extra"
                    value={fmt(summary.income.extra)}
                    delta="Esporádicos — no cuentan en Dinero Libre"
                    icon={Zap}
                    tone="warn"
                  />
                )}
                <StatCard
                  label="Dinero libre mensual"
                  value={fmt(summary.dineroLibre)}
                  delta="Ingresos fijos − compromisos"
                  icon={TrendingDown}
                  tone={summary.dineroLibre >= 0 ? 'pos' : 'neg'}
                />
              </div>
            </div>
          )}

          {/* Tendencia mensual */}
          {trend.length > 0 && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <div>
                  <h3 className="card-title">Histórico de obligaciones</h3>
                  <p className="card-subtitle">Suscripciones + créditos + tarjetas en los últimos 6 meses</p>
                </div>
                <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div
                role="img"
                aria-label={`Histórico de obligaciones de los últimos ${trend.length} meses. Último mes: total ${fmt(trend[trend.length - 1]?.total ?? 0)}`}
              >
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="subscriptions" name="Suscripciones" stroke={C_SUBS} fill="none"  strokeWidth={2} />
                  <Area type="monotone" dataKey="bankCredits"   name="Créditos"      stroke={C_CREDITS} fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="creditCards"   name="Tarjetas"       stroke={C_CARDS} fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Distribución + Próximos pagos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {distribution.length > 0 && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                  <h3 className="card-title">Distribución de compromisos</h3>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={distribution} cx="50%" cy="50%"
                      innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}
                    >
                      {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => fmt(value)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {distribution.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary?.upcoming?.length > 0 && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                  <div>
                    <h3 className="card-title">Próximos vencimientos</h3>
                    <p className="card-subtitle">Siguientes 30 días calendario</p>
                  </div>
                  <Calendar size={16} style={{ color: 'var(--color-warning)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 280, overflowY: 'auto' }}>
                  {summary.upcoming.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0',
                      borderBottom: i < summary.upcoming.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[p.type] || 'var(--color-border)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', margin: 0 }}>
                          {new Date(p.date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · {TYPE_LABEL[p.type]}
                        </p>
                      </div>
                      <span className="tabular" style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', fontSize: 14 }}>
                        {fmt(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comportamiento mensual (bar chart) */}
          {trend.length > 0 && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <div>
                  <h3 className="card-title">Comportamiento mensual</h3>
                  <p className="card-subtitle">Monto agregado de obligaciones por categoría y mes</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="subscriptions" name="Suscripciones" stackId="a" fill={C_SUBS} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="bankCredits"   name="Créditos"      stackId="a" fill={C_CREDITS} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="creditCards"   name="Tarjetas"       stackId="a" fill={C_CARDS} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 2: PROYECCIÓN ══ */}
      {activeTab === 'projection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <StatCard label="Obligaciones promedio"   value={fmt(avgMonthlyObligations)}         delta="Suscr. + tarjetas + créditos" icon={CreditCard} tone="neg"  />
          </div>

          {/* Gráfico */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
            <div className="card" style={{ padding: 20 }}>
              <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <div>
                  <h3 className="card-title">Proyección de flujo de caja a 12 meses</h3>
                  <p className="card-subtitle">Evolución estimada de tus pasivos y flujo disponible</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={projectionData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Suscripciones"                      stackId="a" stroke={C_SUBS} fill={C_SUBS} fillOpacity={0.35}  strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Tarjetas"                           stackId="a" stroke={C_CARDS} fill={C_CARDS} fillOpacity={0.35} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Créditos"                           stackId="a" stroke={C_CREDITS} fill={C_CREDITS} fillOpacity={0.35} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla cronograma */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Cronograma mensual proyectado</h3>
            <div className="responsive-table table-container">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th style={{ textAlign: 'right' }}>Suscripciones</th>
                    <th style={{ textAlign: 'right' }}>Tarjetas</th>
                    <th style={{ textAlign: 'right' }}>Créditos</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionData.map((m, idx) => (
                    <tr key={idx}>
                      <td data-label="Mes"          style={{ fontWeight: 600 }}>{m.month}</td>
                      <td className="tabular" data-label="Suscripciones" style={{ textAlign: 'right' }}>{fmt(m.Suscripciones)}</td>
                      <td className="tabular" data-label="Tarjetas"      style={{ textAlign: 'right' }}>{fmt(m.Tarjetas)}</td>
                      <td className="tabular" data-label="Créditos"      style={{ textAlign: 'right' }}>{fmt(m.Créditos)}</td>
                      <td className="tabular" data-label="Total"         style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(m.Obligaciones)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
