import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { AnalyticsService } from '../services/analyticsService';
import { SubscriptionService } from '../services/subscriptionService';
import { CreditCardService } from '../services/creditCardService';
import { BankCreditService } from '../services/bankCreditService';
import { PersonalDebtService } from '../services/personalDebtService';
import { IncomeService } from '../services/incomeService';
import { SavingsGoalService } from '../services/savingsGoalService';
import { StatCard } from '../components/ui/StatCard';
import { buildSchedule } from '../utils/creditCard';
import {
  Download, FileText, TrendingUp, Calendar, Shield,
  Repeat, CreditCard, Landmark, Sliders, Wallet, Zap, Handshake, TrendingDown,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Helpers ───────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

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

const TYPE_COLORS = { subscription: '#047857', bank_credit: '#DC2626', credit_card: '#D97706' };
const TYPE_LABEL  = { subscription: 'Suscripción', bank_credit: 'Crédito bancario', credit_card: 'Tarjeta' };
const DIST_COLORS = ['#1565C0', '#DC2626', '#D97706', '#7C3AED', '#059669'];

const conversionRate = 4000;
const getMonthlyCostInCOP = (s) => {
  const amount = parseFloat(s.monto ?? s.cost ?? 0);
  return (s.moneda ?? s.currency ?? 'COP') === 'USD' ? amount * conversionRate : amount;
};

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
  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
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
  const [debts, setDebts]     = useState([]);

  const [ingresoNeto, setIngresoNeto] = useState(() => localStorage.getItem('debti_ingreso_neto') ?? '4000000');
  const [gastosFijos, setGastosFijos] = useState(() => localStorage.getItem('debti_gastos_fijos') ?? '1000000');

  useEffect(() => {
    Promise.allSettled([
      AnalyticsService.getSummary(),
      AnalyticsService.getMonthlyTrend(6),
      SubscriptionService.getAll(),
      CreditCardService.getAll(),
      BankCreditService.getAll(),
      PersonalDebtService.getAll(),
    ]).then(([s, t, subRes, cardRes, credRes, debtRes]) => {
      if (s.status       === 'fulfilled') setSummary(s.value);
      if (t.status       === 'fulfilled') setTrend(t.value);
      if (subRes.status  === 'fulfilled') setSubs(subRes.value);
      if (cardRes.status === 'fulfilled') setCards(cardRes.value);
      if (credRes.status === 'fulfilled') setCredits(credRes.value);
      if (debtRes.status === 'fulfilled') setDebts(debtRes.value);
    }).finally(() => setLoading(false));
  }, []);

  const health = summary?.health;
  const hc     = health ? HEALTH_COLOR(health.score) : null;

  // 5 categorías de compromisos desde summary.obligations
  const distribution = summary ? [
    { name: 'Suscripciones',       value: summary.obligations.subscriptions, color: DIST_COLORS[0] },
    { name: 'Créditos bancarios',  value: summary.obligations.bankCredits,   color: DIST_COLORS[1] },
    { name: 'Tarjetas de crédito', value: summary.obligations.creditCards,   color: DIST_COLORS[2] },
    { name: 'Obligaciones pers.',  value: summary.obligations.personalDebts, color: DIST_COLORS[3] },
    { name: 'Metas de ahorro',     value: summary.obligations.savings,       color: DIST_COLORS[4] },
  ].filter(d => d.value > 0) : [];

  const handleIngresoChange = (e) => { setIngresoNeto(e.target.value); localStorage.setItem('debti_ingreso_neto', e.target.value); };
  const handleGastosChange  = (e) => { setGastosFijos(e.target.value); localStorage.setItem('debti_gastos_fijos', e.target.value); };

  // ── Proyección dinámica ──────────────────
  const getProjectionData = () => {
    const today = new Date();

    // Constantes (no varían mes a mes)
    const totalSubs = subs
      .filter(s => s.status === 'activo')
      .reduce((acc, s) => acc + getMonthlyCostInCOP(s), 0);

    const totalPersonalDebts = debts
      .filter(d => d.status === 'activo')
      .reduce((acc, d) => acc + parseFloat(d.montoCuota ?? 0), 0);

    const totalSavingsGoals = summary?.obligations?.savings ?? 0;

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

      const totalObligations = totalSubs + totalCredits + totalCards + totalPersonalDebts + totalSavingsGoals;
      const libre = (parseFloat(ingresoNeto) || 0) - (parseFloat(gastosFijos) || 0) - totalObligations;

      return {
        month: label.charAt(0).toUpperCase() + label.slice(1),
        key,
        Suscripciones: totalSubs,
        Créditos: totalCredits,
        Tarjetas: totalCards,
        ObligacionesPers: totalPersonalDebts,
        Metas: totalSavingsGoals,
        Obligaciones: totalObligations,
        FlujoLibre: libre,
      };
    });
  };

  // ── Exportar Excel ───────────────────────
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const [subsData, cardsData, creditsData, debtsData, incomesData, savingsData] = await Promise.all([
        SubscriptionService.getAll(),
        CreditCardService.getAll(),
        BankCreditService.getAll(),
        PersonalDebtService.getAll(),
        IncomeService.getAll(),
        SavingsGoalService.getAll(),
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
        ['Obligaciones pers.',  summary?.obligations?.personalDebts ?? 0, ''],
        ['Metas de ahorro',     summary?.obligations?.savings       ?? 0, ''],
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

      // Obligaciones personales (con % pagado)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Nombre', 'Tipo', 'Acreedor', 'Monto Total', 'Saldo Pendiente', '% Pagado', 'Cuota Mensual', 'Día Pago', 'Estado'],
        ...debtsData.map(d => {
          const montoTotal = parseFloat(d.montoTotal ?? 0);
          const saldo      = parseFloat(d.saldoPendiente ?? 0);
          const pct        = montoTotal > 0 ? `${Math.round(((montoTotal - saldo) / montoTotal) * 100)}%` : '—';
          return [d.nombre, d.tipo, d.prestamista ?? '—', montoTotal, saldo, pct, d.montoCuota, d.diaPago, d.status];
        }),
      ]), 'Obligaciones Pers.');

      // Ingresos
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Nombre', 'Tipo', 'Monto', 'Frecuencia', 'Fuente', 'Fecha', 'Estado'],
        ...incomesData.map(i => [i.nombre, i.tipo ?? 'fijo', i.monto, i.frecuencia ?? 'mensual', i.fuente ?? '—', i.fecha ?? '—', i.status]),
      ]), 'Ingresos');

      // Metas de ahorro
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Nombre', 'Meta', 'Ahorrado', '% Completado', 'Aporte Mensual', 'Fecha Límite', 'Estado'],
        ...savingsData.map(g => {
          const meta    = parseFloat(g.montoMeta ?? 0);
          const ahorrado = parseFloat(g.montoAhorrado ?? 0);
          const pct = meta > 0 ? `${Math.round((ahorrado / meta) * 100)}%` : '—';
          return [g.nombre, meta, ahorrado, pct, g.aporteMensual, g.fechaLimite ?? '—', g.status];
        }),
      ]), 'Metas de Ahorro');

      // Tendencia
      if (trend.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
          ['Mes', 'Suscripciones', 'Créditos Bancarios', 'Tarjetas de Crédito', 'Total'],
          ...trend.map(t => [t.month, t.subscriptions, t.bankCredits, t.creditCards ?? 0, t.total]),
        ]), 'Tendencia');
      }

      XLSX.writeFile(wb, `Debti_Reporte_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire({ icon: 'error', title: 'Error al exportar', text: 'No se pudo generar el archivo Excel.', confirmButtonColor: 'var(--brand-600)' });
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header"><h1 className="page-title">Reportes y Analítica</h1></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      </div>
    );
  }

  const projectionData        = getProjectionData();
  const avgMonthlyObligations = projectionData.reduce((acc, m) => acc + m.Obligaciones, 0) / 12;
  const avgFreeCashflow       = Math.max(0, (parseFloat(ingresoNeto) || 0) - (parseFloat(gastosFijos) || 0) - avgMonthlyObligations);

  const activeDebts  = debts.filter(d => d.tipo === 'deuda' && d.status === 'activo');
  const activeGastos = debts.filter(d => d.tipo === 'gasto' && d.status === 'activo');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0, flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 className="page-title">Reportes y Analítica</h1>
          <p className="page-subtitle">Monitoreo histórico, proyecciones futuras y optimización de pasivos</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <FileText size={12} /> PDF / Imprimir
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportExcel} disabled={exporting}>
            <Download size={12} /> {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav" style={{ overflowX: 'auto', flexShrink: 0 }}>
        <button className={`tab-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <Shield size={14} /> Analítica
        </button>
        <button className={`tab-nav-item ${activeTab === 'projection' ? 'active' : ''}`} onClick={() => setActiveTab('projection')}>
          <Sliders size={14} /> Proyección de Flujo
        </button>
        <button className={`tab-nav-item ${activeTab === 'mom' ? 'active' : ''}`} onClick={() => setActiveTab('mom')}>
          <TrendingUp size={14} /> Comparación MoM
        </button>
      </div>

      {/* ══ TAB 1: ANALÍTICA ══ */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Salud financiera */}
          {health && (
            <div className="card" style={{
              background: `linear-gradient(135deg, var(--color-surface) 60%, ${hc.bg} 100%)`,
              border: `1px solid ${hc.color}40`, padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 96, height: 96, borderRadius: '50%',
                    background: hc.bg, border: `4px solid ${hc.color}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 14px ${hc.color}30`,
                  }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: hc.color, lineHeight: 1 }}>{health.score}</span>
                    <span style={{ fontSize: '0.6rem', color: hc.color, fontWeight: 600, letterSpacing: '0.05em' }}>/100</span>
                  </div>
                  <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                    <Shield size={12} style={{ color: hc.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: hc.color }}>{hc.label}</span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 180 }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: 16 }}>Salud Financiera</h3>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                    Utilización de cupo: <strong style={{ color: health.utilization > 70 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{health.utilization}%</strong>
                  </p>
                  {health.details?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {health.details.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 12 }}>
                          <span style={{ color: d.impact < 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700, minWidth: 28 }}>
                            {d.impact < 0 ? d.impact : '✓'}
                          </span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{d.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.25rem', minWidth: 220 }}>
                  {[
                    { label: 'Obligación mensual',   value: fmt(summary.obligations.total),        color: 'var(--color-text-primary)' },
                    { label: 'Deuda total',           value: fmt(summary.debt.total),               color: 'var(--color-danger)' },
                    { label: 'Suscripciones activas', value: summary.counts.activeSubscriptions,    color: 'var(--color-primary)' },
                    { label: 'Pagos próximos 30d',    value: summary.upcoming.length,               color: 'var(--color-warning)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '0.25rem 0' }}>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 0.15rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                      <p style={{ fontWeight: 800, color, margin: 0, fontSize: '0.95rem' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ingresos: fijo vs extra */}
          {summary && (summary.income.total > 0 || (summary.income.extra ?? 0) > 0) && (
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
                  delta="Ingresos fijos − compromisos − metas"
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
                  <h3 className="card-title">Histórico de Obligaciones</h3>
                  <p className="card-subtitle">Suscripciones + créditos + tarjetas en los últimos 6 meses</p>
                </div>
                <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSub"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#047857" stopOpacity={0.2} /><stop offset="95%" stopColor="#047857" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gCred" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#DC2626" stopOpacity={0.2} /><stop offset="95%" stopColor="#DC2626" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gCard" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#D97706" stopOpacity={0.2} /><stop offset="95%" stopColor="#D97706" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="subscriptions" name="Suscripciones" stroke="#047857" fill="url(#gSub)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="bankCredits"   name="Créditos"      stroke="#DC2626" fill="url(#gCred)" strokeWidth={2} />
                  <Area type="monotone" dataKey="creditCards"   name="Tarjetas"       stroke="#D97706" fill="url(#gCard)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribución + Próximos pagos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {distribution.length > 0 && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                  <h3 className="card-title">Distribución de Compromisos</h3>
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
                    <h3 className="card-title">Próximos Vencimientos</h3>
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
                      <span className="tabular" style={{ fontWeight: 700, color: TYPE_COLORS[p.type], whiteSpace: 'nowrap', fontSize: 13 }}>
                        {fmt(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Obligaciones personales */}
          {(activeDebts.length > 0 || activeGastos.length > 0) && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="card-header" style={{ marginBottom: 16, paddingBottom: 10 }}>
                <div>
                  <h3 className="card-title">Obligaciones Personales</h3>
                  <p className="card-subtitle">Avance de deudas y compromisos mensuales</p>
                </div>
                <Handshake size={16} style={{ color: 'var(--color-primary)' }} />
              </div>

              {activeDebts.length > 0 && (
                <div style={{ marginBottom: activeGastos.length > 0 ? 16 : 0 }}>
                  {activeGastos.length > 0 && <SectionLabel>Deudas en cuotas</SectionLabel>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                    {activeDebts.map(debt => {
                      const montoTotal = parseFloat(debt.montoTotal ?? 0);
                      const saldo      = parseFloat(debt.saldoPendiente ?? 0);
                      const pct        = montoTotal > 0 ? Math.min(100, ((montoTotal - saldo) / montoTotal) * 100) : 0;
                      return (
                        <div key={debt.id} style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{debt.nombre}</p>
                            <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: 'var(--neg-600)', flexShrink: 0 }}>{fmt(saldo)}</span>
                          </div>
                          <div className="progress-track" style={{ marginBottom: 4 }}>
                            <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
                            <span>{fmt(debt.montoCuota)}/mes · Día {debt.diaPago}</span>
                            <span className="tabular" style={{ color: 'var(--pos-600)', fontWeight: 600 }}>{pct.toFixed(0)}% pagado</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeGastos.length > 0 && (
                <div>
                  {activeDebts.length > 0 && <SectionLabel>Gastos mensuales</SectionLabel>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                    {activeGastos.map(gasto => (
                      <div key={gasto.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Repeat size={13} style={{ color: 'var(--brand-600)', flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{gasto.nombre}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Día {gasto.diaPago}</p>
                          </div>
                        </div>
                        <span className="tabular" style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{fmt(gasto.montoCuota)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comportamiento mensual (bar chart) */}
          {trend.length > 0 && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <div>
                  <h3 className="card-title">Comportamiento Mensual</h3>
                  <p className="card-subtitle">Monto agregado de obligaciones por categoría y mes</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="subscriptions" name="Suscripciones" stackId="a" fill="#047857" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="bankCredits"   name="Créditos"      stackId="a" fill="#DC2626" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="creditCards"   name="Tarjetas"       stackId="a" fill="#D97706" radius={[4, 4, 0, 0]} />
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
            <StatCard label="Ingreso neto mensual"    value={fmt(parseFloat(ingresoNeto) || 0)} delta="Disponible para fijos + deudas"    icon={Repeat}    tone="brand"   />
            <StatCard label="Gastos fijos declarados" value={fmt(parseFloat(gastosFijos) || 0)} delta="Arriendo, servicios, etc."          icon={Landmark}  tone="neutral" />
            <StatCard label="Obligaciones promedio"   value={fmt(avgMonthlyObligations)}         delta="Suscr. + tarjetas + créditos + deudas + metas" icon={CreditCard} tone="neg"  />
            <StatCard label="Flujo libre estimado"    value={fmt(avgFreeCashflow)}               delta="Promedio mensual neto restante"     icon={Shield}    tone="pos"    />
          </div>

          {/* Simulador + Gráfico (responsivo) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Sliders size={16} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Simulador de Presupuesto</h4>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Ingreso Neto Mensual</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" className="form-input" value={ingresoNeto} onChange={handleIngresoChange} style={{ paddingLeft: 24 }} />
                  <span style={{ position: 'absolute', left: 10, top: 8, color: 'var(--text-3)', fontWeight: 600 }}>$</span>
                </div>
                <span className="form-hint">Tu salario neto o ingresos fijos en COP</span>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Gastos Fijos No Opcionales</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" className="form-input" value={gastosFijos} onChange={handleGastosChange} style={{ paddingLeft: 24 }} />
                  <span style={{ position: 'absolute', left: 10, top: 8, color: 'var(--text-3)', fontWeight: 600 }}>$</span>
                </div>
                <span className="form-hint">Arriendo, alimentación base, servicios en COP</span>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <div>
                  <h3 className="card-title">Proyección de Flujo de Caja a 12 Meses</h3>
                  <p className="card-subtitle">Evolución estimada de tus pasivos y flujo disponible</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={projectionData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gProjSub"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#047857" stopOpacity={0.15} /><stop offset="95%" stopColor="#047857" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gProjCard" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#D97706" stopOpacity={0.15} /><stop offset="95%" stopColor="#D97706" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gProjCred" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#DC2626" stopOpacity={0.15} /><stop offset="95%" stopColor="#DC2626" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gProjDebt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.15} /><stop offset="95%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gProjMeta" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#059669" stopOpacity={0.15} /><stop offset="95%" stopColor="#059669" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine
                    y={(parseFloat(ingresoNeto) || 0) - (parseFloat(gastosFijos) || 0)}
                    stroke="var(--color-text-primary)" strokeWidth={1.5} strokeDasharray="4 4"
                    label={{ value: 'Presupuesto Neto', position: 'top', fill: 'var(--color-text-secondary)', fontSize: 10, fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="Suscripciones"                      stackId="a" stroke="#047857" fill="url(#gProjSub)"  strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Tarjetas"                           stackId="a" stroke="#D97706" fill="url(#gProjCard)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Créditos"                           stackId="a" stroke="#DC2626" fill="url(#gProjCred)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="ObligacionesPers" name="Obs. Pers." stackId="a" stroke="#7C3AED" fill="url(#gProjDebt)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Metas"            name="Metas"      stackId="a" stroke="#059669" fill="url(#gProjMeta)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla cronograma */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Cronograma Mensual Proyectado</h3>
            <div className="responsive-table table-container">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th style={{ textAlign: 'right' }}>Suscripciones</th>
                    <th style={{ textAlign: 'right' }}>Tarjetas</th>
                    <th style={{ textAlign: 'right' }}>Créditos</th>
                    <th style={{ textAlign: 'right' }}>Obs. Pers.</th>
                    <th style={{ textAlign: 'right' }}>Metas</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Flujo Libre</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionData.map((m, idx) => (
                    <tr key={idx}>
                      <td data-label="Mes"          style={{ fontWeight: 600 }}>{m.month}</td>
                      <td className="tabular" data-label="Suscripciones" style={{ textAlign: 'right' }}>{fmt(m.Suscripciones)}</td>
                      <td className="tabular" data-label="Tarjetas"      style={{ textAlign: 'right' }}>{fmt(m.Tarjetas)}</td>
                      <td className="tabular" data-label="Créditos"      style={{ textAlign: 'right' }}>{fmt(m.Créditos)}</td>
                      <td className="tabular" data-label="Obs. Pers."    style={{ textAlign: 'right' }}>{fmt(m.ObligacionesPers)}</td>
                      <td className="tabular" data-label="Metas"         style={{ textAlign: 'right' }}>{fmt(m.Metas)}</td>
                      <td className="tabular" data-label="Total"         style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(m.Obligaciones)}</td>
                      <td className="tabular" data-label="Flujo Libre"   style={{ textAlign: 'right', fontWeight: 700, color: m.FlujoLibre >= 0 ? 'var(--color-success)' : 'var(--neg-600)' }}>
                        {fmt(m.FlujoLibre)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB 3: MoM ══ */}
      {activeTab === 'mom' && (() => {
        if (trend.length < 2) return (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><TrendingUp size={26} /></div>
              <p className="empty-state-title">No hay datos suficientes</p>
              <p>Se necesitan al menos 2 meses registrados para la comparación.</p>
            </div>
          </div>
        );

        const cur  = trend[trend.length - 1];
        const prev = trend[trend.length - 2];

        const cats = [
          { key: 'subscriptions', label: 'Suscripciones', color: '#047857' },
          { key: 'bankCredits',   label: 'Créditos',       color: '#DC2626' },
          { key: 'creditCards',   label: 'Tarjetas',        color: '#D97706' },
          { key: 'total',         label: 'Total',           color: 'var(--brand-600)', bold: true },
        ];

        const delta = (c, p) => {
          if (!p || p === 0) return null;
          return ((c - p) / p) * 100;
        };

        const barData = [
          { name: 'Suscripciones', prev: prev.subscriptions, cur: cur.subscriptions },
          { name: 'Créditos',       prev: prev.bankCredits,   cur: cur.bankCredits   },
          { name: 'Tarjetas',        prev: prev.creditCards,   cur: cur.creditCards   },
          { name: 'Total',           prev: prev.total,         cur: cur.total         },
        ];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {cats.map(({ key, label, color, bold }) => {
                const c = parseFloat(cur[key] ?? 0);
                const p = parseFloat(prev[key] ?? 0);
                const d = delta(c, p);
                const up   = d !== null && d > 0;
                const down = d !== null && d < 0;
                return (
                  <div key={key} className="card" style={{ padding: '1rem', borderTop: `3px solid ${color}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>{label}</p>
                    <p className="tabular" style={{ fontSize: bold ? '1.15rem' : '1rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.25rem' }}>{fmt(c)}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {d === null ? <Minus size={11} style={{ color: 'var(--text-3)' }} />
                        : up ? <ArrowUpRight size={11} style={{ color: 'var(--neg-600)' }} />
                        : down ? <ArrowDownRight size={11} style={{ color: 'var(--pos-600)' }} />
                        : <Minus size={11} style={{ color: 'var(--text-3)' }} />}
                      <span style={{ fontSize: 11, fontWeight: 600, color: d === null ? 'var(--text-3)' : up ? 'var(--neg-600)' : down ? 'var(--pos-600)' : 'var(--text-3)' }}>
                        {d === null ? 'Sin datos' : `${d > 0 ? '+' : ''}${d.toFixed(1)}% vs ${prev.month}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <div>
                  <h3 className="card-title">Comparación {prev.month} vs {cur.month}</h3>
                  <p className="card-subtitle">Obligaciones por categoría — mes anterior vs actual</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="prev" name={prev.month} fill="var(--surface-2)" stroke="var(--border)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cur"  name={cur.month}  fill="var(--brand-600)"  radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Detalle de cambios</h3>
              <div className="responsive-table table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th style={{ textAlign: 'right' }}>{prev.month}</th>
                      <th style={{ textAlign: 'right' }}>{cur.month}</th>
                      <th style={{ textAlign: 'right' }}>Δ Absoluto</th>
                      <th style={{ textAlign: 'right' }}>Δ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map(({ key, label, bold }) => {
                      const c = parseFloat(cur[key] ?? 0);
                      const p = parseFloat(prev[key] ?? 0);
                      const abs = c - p;
                      const d = delta(c, p);
                      return (
                        <tr key={key}>
                          <td style={{ fontWeight: bold ? 700 : 400 }}>{label}</td>
                          <td className="tabular" style={{ textAlign: 'right' }}>{fmt(p)}</td>
                          <td className="tabular" style={{ textAlign: 'right', fontWeight: bold ? 700 : 400 }}>{fmt(c)}</td>
                          <td className="tabular" style={{ textAlign: 'right', color: abs > 0 ? 'var(--neg-600)' : abs < 0 ? 'var(--pos-600)' : 'var(--text-3)', fontWeight: 600 }}>
                            {abs > 0 ? '+' : ''}{fmt(abs)}
                          </td>
                          <td className="tabular" style={{ textAlign: 'right', color: d === null ? 'var(--text-3)' : d > 0 ? 'var(--neg-600)' : d < 0 ? 'var(--pos-600)' : 'var(--text-3)', fontWeight: 600 }}>
                            {d === null ? '—' : `${d > 0 ? '+' : ''}${d.toFixed(1)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
