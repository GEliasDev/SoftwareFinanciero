import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { AnalyticsService } from '../services/analyticsService';
import { SubscriptionService } from '../services/subscriptionService';
import { CreditCardService } from '../services/creditCardService';
import { BankCreditService } from '../services/bankCreditService';
import { StatCard } from '../components/ui/StatCard';
import { buildSchedule } from '../utils/creditCard';
import {
  Download, FileText, TrendingUp, Calendar, Shield,
  Repeat, CreditCard, Landmark, Sliders,
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
  if (score >= 90) return { color: 'var(--color-success)',  bg: 'var(--color-success-bg)',  label: 'Excelente' };
  if (score >= 70) return { color: 'var(--color-primary)',  bg: 'var(--color-primary-light)',  label: 'Bueno' };
  if (score >= 50) return { color: 'var(--color-warning)',  bg: 'var(--color-warning-bg)',  label: 'Regular' };
  return               { color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)',   label: 'Crítico' };
};

const TYPE_COLORS = {
  subscription: '#047857',
  bank_credit:  '#DC2626',
  credit_card:  '#D97706',
};

const TYPE_LABEL = {
  subscription: 'Suscripción',
  bank_credit:  'Crédito Bancario',
  credit_card:  'Tarjeta de Crédito',
};

const PIE_COLORS = ['#047857', '#DC2626', '#D97706', '#059669'];

// ── Tooltip personalizado ──────────────────
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

// Conversión estática para suscripciones en USD
const conversionRate = 4000;
const getMonthlyCostInCOP = (s) => {
  const amount = parseFloat(s.monto ?? s.cost ?? 0);
  const currency = s.moneda ?? s.currency ?? 'COP';
  if (currency === 'USD') {
    return amount * conversionRate;
  }
  return amount;
};

// ── Componente principal ───────────────────
export const Reports = () => {
  const [activeTab, setActiveTab]   = useState('analytics'); // 'analytics' | 'projection'
  const [summary, setSummary]       = useState(null);
  const [trend, setTrend]           = useState([]);
  const [distribution, setDist]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [exporting, setExporting]   = useState(false);

  // Datos crudos cargados para simulación del lado del cliente
  const [subs, setSubs]             = useState([]);
  const [cards, setCards]           = useState([]);
  const [credits, setCredits]       = useState([]);

  // Variables de configuración de simulación en LocalStorage para persistencia
  const [ingresoNeto, setIngresoNeto] = useState(() => {
    const saved = localStorage.getItem('debti_ingreso_neto');
    return saved !== null ? saved : "4000000";
  });
  const [gastosFijos, setGastosFijos] = useState(() => {
    const saved = localStorage.getItem('debti_gastos_fijos');
    return saved !== null ? saved : "1000000";
  });
  useEffect(() => {
    Promise.allSettled([
      AnalyticsService.getSummary(),
      AnalyticsService.getMonthlyTrend(6),
      AnalyticsService.getDistribution(),
      SubscriptionService.getAll(),
      CreditCardService.getAll(),
      BankCreditService.getAll(),
    ]).then(([s, t, d, subRes, cardRes, credRes]) => {
      if (s.status === 'fulfilled') setSummary(s.value);
      if (t.status === 'fulfilled') setTrend(t.value);
      if (d.status === 'fulfilled') setDist(d.value);
      if (subRes.status === 'fulfilled') setSubs(subRes.value);
      if (cardRes.status === 'fulfilled') setCards(cardRes.value);
      if (credRes.status === 'fulfilled') setCredits(credRes.value);
    }).finally(() => setLoading(false));
  }, []);

  const health = summary?.health;
  const hc = health ? HEALTH_COLOR(health.score) : null;

  // Manejadores de cambios de inputs
  const handleIngresoChange = (e) => {
    const val = e.target.value;
    setIngresoNeto(val);
    localStorage.setItem('debti_ingreso_neto', val);
  };
  const handleGastosChange = (e) => {
    const val = e.target.value;
    setGastosFijos(val);
    localStorage.setItem('debti_gastos_fijos', val);
  };
  // ── Algoritmo de Proyección Dinámica ──
  const getProjectionData = () => {
    const today = new Date();
    const data = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });

      // 1. Suscripciones activas
      const totalSubs = subs
        .filter(s => s.status === 'activo')
        .reduce((acc, s) => acc + getMonthlyCostInCOP(s), 0);

      // 2. Créditos Bancarios (activos y en mora)
      const totalCredits = credits
        .filter(c => c.status === 'activo' || c.status === 'en_mora')
        .reduce((acc, c) => {
          const pagadas = parseInt(c.cuotasPagadas ?? 0);
          const totalCuotas = parseInt(c.numeroCuotas ?? 0);
          const restantes = totalCuotas - pagadas;
          if (i < restantes) {
            return acc + parseFloat(c.valorCuota ?? 0);
          }
          return acc;
        }, 0);

      // 3. Tarjetas de Crédito (amortizaciones vigentes por mes)
      const totalCards = cards.reduce((acc, card) => {
        const schedule = buildSchedule(card.CreditCardPurchases || [], card, 18, 0);
        const slot = schedule.find(s => s.key === key);
        return acc + (slot ? slot.total : 0);
      }, 0);

      const totalObligations = totalSubs + totalCredits + totalCards;
      const incomeVal = parseFloat(ingresoNeto) || 0;
      const expensesVal = parseFloat(gastosFijos) || 0;
      const libre = incomeVal - expensesVal - totalObligations;

      data.push({
        month: label.charAt(0).toUpperCase() + label.slice(1),
        key,
        Suscripciones: totalSubs,
        Créditos: totalCredits,
        Tarjetas: totalCards,
        Obligaciones: totalObligations,
        FlujoLibre: Math.max(0, libre),
      });
    }
    return data;
  };

  // ── Exportar Excel ─────────────────────
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const [subsData, cardsData, creditsData] = await Promise.all([
        SubscriptionService.getAll(),
        CreditCardService.getAll(),
        BankCreditService.getAll(),
      ]);

      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen
      const resumenData = [
        ['Resumen Financiero', '', ''],
        ['Categoría', 'Monto mensual', ''],
        ['Suscripciones', summary?.obligations?.subscriptions ?? 0, ''],
        ['Créditos bancarios', summary?.obligations?.bankCredits ?? 0, ''],
        ['Tarjetas de crédito', summary?.obligations?.creditCards ?? 0, ''],
        ['Total obligaciones', summary?.obligations?.total ?? 0, ''],
        ['', '', ''],
        ['Deuda total créditos', summary?.debt?.bankCredits ?? 0, ''],
        ['Deuda total tarjetas', summary?.debt?.creditCards ?? 0, ''],
        ['Deuda total', summary?.debt?.total ?? 0, ''],
        ['', '', ''],
        ['Score de salud financiera', health?.score ?? 0, health?.label ?? ''],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen');

      // Hoja 2: Suscripciones
      const subsSheet = [
        ['Nombre', 'Monto', 'Moneda', 'Frecuencia', 'Día Cobro', 'Fecha Inicio', 'Estado'],
        ...subsData.map(s => [s.nombre, s.monto, s.moneda, s.frecuencia, s.diaCobro, s.fechaInicio, s.status]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(subsSheet), 'Suscripciones');

      // Hoja 3: Créditos bancarios
      const creditsSheet = [
        ['Nombre', 'Entidad', 'Monto Total', 'Saldo Pendiente', 'Cuota', 'Cuotas Pagadas', 'Total Cuotas', 'Estado'],
        ...creditsData.map(c => [c.nombre, c.entidad, c.montoTotal, c.saldoPendiente, c.valorCuota, c.cuotasPagadas, c.numeroCuotas, c.status]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(creditsSheet), 'Créditos');

      // Hoja 4: Tarjetas
      const cardsSheet = [
        ['Nombre', 'Entidad', 'Cupo Total', 'Cupo Disponible', 'Cupo Usado', 'Tasa', 'Estado'],
        ...cardsData.map(c => [c.nombre, c.entidad, c.cupoTotal, c.cupoDisponible, c.cupoTotal - c.cupoDisponible, `${c.tasaInteresMensual}%`, c.status]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cardsSheet), 'Tarjetas');

      // Hoja 5: Tendencia mensual
      if (trend.length > 0) {
        const trendSheet = [
          ['Mes', 'Suscripciones', 'Créditos Bancarios', 'Tarjetas de Crédito', 'Total'],
          ...trend.map(t => [t.month, t.subscriptions, t.bankCredits, t.creditCards ?? 0, t.total]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendSheet), 'Tendencia');
      }

      XLSX.writeFile(wb, `Debti_Reporte_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire({ icon: 'error', title: 'Error al exportar', text: 'No se pudo generar el archivo Excel. Intenta de nuevo.', confirmButtonColor: 'var(--brand-600)' });
      });
    } finally {
      setExporting(false);
    }
  };

  // ── Imprimir como PDF ──────────────────
  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Reportes y Analítica</h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      </div>
    );
  }

  // Datos procesados para el gráfico de proyección
  const projectionData = getProjectionData();
  const avgMonthlyObligations = projectionData.reduce((acc, m) => acc + m.Obligaciones, 0) / 12;
  const incomeVal = parseFloat(ingresoNeto) || 0;
  const expensesVal = parseFloat(gastosFijos) || 0;
  const avgFreeCashflow = Math.max(0, incomeVal - expensesVal - avgMonthlyObligations);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Reportes y Analítica</h1>
          <p className="page-subtitle">Monitoreo histórico, proyecciones futuras y optimización de pasivos</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <FileText size={12} /> PDF / Imprimir
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportExcel} disabled={exporting}>
            <Download size={12} /> {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <Shield size={14} /> Analítica
        </button>
        <button
          className={`tab-nav-item ${activeTab === 'projection' ? 'active' : ''}`}
          onClick={() => setActiveTab('projection')}
        >
          <Sliders size={14} /> Proyección de Flujo
        </button>
      </div>

      {/* ── TAB 1: ANALÍTICA HISTÓRICA ── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Salud financiera */}
          {health && (
            <div className="card" style={{
              background: `linear-gradient(135deg, var(--color-surface) 60%, ${hc.bg} 100%)`,
              border: `1px solid ${hc.color}40`,
              padding: '20px 24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Score circular */}
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

                {/* Detalles */}
                <div style={{ flex: 1, minWidth: 200 }}>
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

                {/* KPIs rápidos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.25rem', minWidth: 240 }}>
                  {[
                    { label: 'Obligación mensual', value: fmt(summary.obligations.total), color: 'var(--color-text-primary)' },
                    { label: 'Deuda total',          value: fmt(summary.debt.total),        color: 'var(--color-danger)' },
                    { label: 'Suscripciones activas', value: summary.counts.activeSubscriptions, color: 'var(--color-primary)' },
                    { label: 'Pagos próximos 30d',   value: summary.upcoming.length,        color: 'var(--color-warning)' },
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
                    <linearGradient id="gSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#047857" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#D97706" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="subscriptions" name="Suscripciones" stroke="#047857" fill="url(#gSub)" strokeWidth={2} />
                  <Area type="monotone" dataKey="bankCredits"   name="Créditos"      stroke="#DC2626" fill="url(#gCred)" strokeWidth={2} />
                  <Area type="monotone" dataKey="creditCards"   name="Tarjetas"       stroke="#D97706" fill="url(#gCard)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Distribución */}
            {distribution.length > 0 && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                  <h3 className="card-title">Distribución del Gasto</h3>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={distribution}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {distribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => fmt(value)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {distribution.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color || PIE_COLORS[i] }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Próximos pagos */}
            {summary?.upcoming?.length > 0 && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                  <div>
                    <h3 className="card-title">Próximos Vencimientos</h3>
                    <p className="card-subtitle">Siguientes 30 días calendario</p>
                  </div>
                  <Calendar size={16} style={{ color: 'var(--color-warning)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 220, overflowY: 'auto' }}>
                  {summary.upcoming.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 0',
                      borderBottom: i < summary.upcoming.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[p.type] || 'var(--color-border)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', margin: 0 }}>
                          {new Date(p.date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · {TYPE_LABEL[p.type]}
                        </p>
                      </div>
                      <span className="tabular" style={{ fontWeight: 700, color: TYPE_COLORS[p.type], whiteSpace: 'nowrap', marginLeft: '0.5rem', fontSize: 13 }}>
                        {fmt(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comparativo de obligaciones (bar chart) */}
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
                  <Bar dataKey="subscriptions" name="Suscripciones" stackId="a" fill="#047857" radius={[0,0,0,0]} />
                  <Bar dataKey="bankCredits"   name="Créditos"      stackId="a" fill="#DC2626" radius={[0,0,0,0]} />
                  <Bar dataKey="creditCards"   name="Tarjetas"       stackId="a" fill="#D97706" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PROYECCIÓN DE FLUJO DE CAJA FUTURO ── */}
      {activeTab === 'projection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <StatCard
              label="Ingreso neto mensual"
              value={fmt(parseFloat(ingresoNeto) || 0)}
              delta="Disponible para fijos + deudas"
              icon={Repeat}
              tone="brand"
            />
            <StatCard
              label="Gastos fijos declarados"
              value={fmt(parseFloat(gastosFijos) || 0)}
              delta="Arriendo, servicios, etc."
              icon={Landmark}
              tone="neutral"
            />
            <StatCard
              label="Obligaciones promedio"
              value={fmt(avgMonthlyObligations)}
              delta="Suscripciones + créditos + tarjetas"
              icon={CreditCard}
              tone="neg"
            />
            <StatCard
              label="Flujo libre estimado"
              value={fmt(avgFreeCashflow)}
              delta="Promedio mensual neto restante"
              icon={Shield}
              tone="pos"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 16, alignItems: 'start' }}>
            {/* Parámetros */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Sliders size={16} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Simulador de Presupuesto</h4>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Ingreso Neto Mensual</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={ingresoNeto}
                    onChange={handleIngresoChange}
                    style={{ paddingLeft: 24 }}
                  />
                  <span style={{ position: 'absolute', left: 10, top: 8, color: 'var(--text-3)', fontWeight: 600 }}>$</span>
                </div>
                <span className="form-hint">Tu salario neto o ingresos fijos en COP</span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Gastos Fijos No Opcionales</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={gastosFijos}
                    onChange={handleGastosChange}
                    style={{ paddingLeft: 24 }}
                  />
                  <span style={{ position: 'absolute', left: 10, top: 8, color: 'var(--text-3)', fontWeight: 600 }}>$</span>
                </div>
                <span className="form-hint">Arriendo, alimentación base, servicios en COP</span>
              </div>
            </div>

            {/* Gráfico de flujo de caja */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <div>
                  <h3 className="card-title">Proyección de Flujo de Caja a 12 Meses</h3>
                  <p className="card-subtitle">Evolución estimada de tus pasivos y flujo de efectivo disponible</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={projectionData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gProjSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#047857" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gProjCard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#D97706" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gProjCred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  
                  {/* Línea de presupuesto disponible (Ingresos - Gastos Fijos) */}
                  <ReferenceLine
                    y={(parseFloat(ingresoNeto) || 0) - (parseFloat(gastosFijos) || 0)}
                    stroke="var(--color-text-primary)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: 'Presupuesto Neto',
                      position: 'top',
                      fill: 'var(--color-text-secondary)',
                      fontSize: 10,
                      fontWeight: 600
                    }}
                  />

                  <Area type="monotone" dataKey="Suscripciones" stackId="a" stroke="#047857" fill="url(#gProjSub)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Tarjetas"       stackId="a" stroke="#D97706" fill="url(#gProjCard)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Créditos"      stackId="a" stroke="#DC2626" fill="url(#gProjCred)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla densa de proyecciones */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Cronograma Mensual Proyectado</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th style={{ textAlign: 'right' }}>Suscripciones</th>
                    <th style={{ textAlign: 'right' }}>Tarjetas (Cuotas)</th>
                    <th style={{ textAlign: 'right' }}>Créditos Bancarios</th>
                    <th style={{ textAlign: 'right', color: 'var(--color-text-primary)' }}>Total Obligado</th>
                    <th style={{ textAlign: 'right', color: 'var(--color-success)' }}>Flujo Libre Proyectado</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionData.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{m.month}</td>
                      <td className="tabular" style={{ textAlign: 'right' }}>{fmt(m.Suscripciones)}</td>
                      <td className="tabular" style={{ textAlign: 'right' }}>{fmt(m.Tarjetas)}</td>
                      <td className="tabular" style={{ textAlign: 'right' }}>{fmt(m.Créditos)}</td>
                      <td className="tabular" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmt(m.Obligaciones)}</td>
                      <td className="tabular" style={{ textAlign: 'right', fontWeight: 700, color: m.FlujoLibre > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
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

    </div>
  );
};
