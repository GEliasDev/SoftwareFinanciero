import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { AnalyticsService } from '../services/analyticsService';
import { SubscriptionService } from '../services/subscriptionService';
import { CreditCardService } from '../services/creditCardService';
import { BankCreditService } from '../services/bankCreditService';
import { BarChart2, Download, FileText, TrendingUp, Calendar, Shield } from 'lucide-react';
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
  subscription: '#1565C0',
  bank_credit:  '#DC2626',
  credit_card:  '#D97706',
};

const TYPE_LABEL = {
  subscription: 'Suscripción',
  bank_credit:  'Crédito Bancario',
  credit_card:  'Tarjeta de Crédito',
};

const PIE_COLORS = ['#1565C0', '#DC2626', '#D97706', '#059669'];

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

// ── Componente principal ───────────────────
export const Reports = () => {
  const [summary, setSummary]       = useState(null);
  const [trend, setTrend]           = useState([]);
  const [distribution, setDist]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [exporting, setExporting]   = useState(false);

  useEffect(() => {
    Promise.allSettled([
      AnalyticsService.getSummary(),
      AnalyticsService.getMonthlyTrend(6),
      AnalyticsService.getDistribution(),
    ]).then(([s, t, d]) => {
      if (s.status === 'fulfilled') setSummary(s.value);
      if (t.status === 'fulfilled') setTrend(t.value);
      if (d.status === 'fulfilled') setDist(d.value);
    }).finally(() => setLoading(false));
  }, []);

  const health = summary?.health;
  const hc = health ? HEALTH_COLOR(health.score) : null;

  // ── Exportar Excel ─────────────────────
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const [subs, cards, credits] = await Promise.all([
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
        ...subs.map(s => [s.nombre, s.monto, s.moneda, s.frecuencia, s.diaCobro, s.fechaInicio, s.status]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(subsSheet), 'Suscripciones');

      // Hoja 3: Créditos bancarios
      const creditsSheet = [
        ['Nombre', 'Entidad', 'Monto Total', 'Saldo Pendiente', 'Cuota', 'Cuotas Pagadas', 'Total Cuotas', 'Estado'],
        ...credits.map(c => [c.nombre, c.entidad, c.montoTotal, c.saldoPendiente, c.valorCuota, c.cuotasPagadas, c.numeroCuotas, c.status]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(creditsSheet), 'Créditos');

      // Hoja 4: Tarjetas
      const cardsSheet = [
        ['Nombre', 'Entidad', 'Cupo Total', 'Cupo Disponible', 'Cupo Usado', 'Tasa', 'Estado'],
        ...cards.map(c => [c.nombre, c.entidad, c.cupoTotal, c.cupoDisponible, c.cupoTotal - c.cupoDisponible, `${c.tasaInteresMensual}%`, c.status]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cardsSheet), 'Tarjetas');

      // Hoja 5: Tendencia mensual
      if (trend.length > 0) {
        const trendSheet = [
          ['Mes', 'Suscripciones', 'Créditos', 'Total'],
          ...trend.map(t => [t.month, t.subscriptions, t.bankCredits, t.total]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendSheet), 'Tendencia');
      }

      XLSX.writeFile(wb, `Solventa_Reporte_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
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
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Reportes y Analítica</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handlePrint}>
            <FileText size={14} /> PDF / Imprimir
          </button>
          <button className="btn btn-primary" onClick={handleExportExcel} disabled={exporting}>
            <Download size={14} /> {exporting ? 'Exportando...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* ── Salud financiera ── */}
      {health && (
        <div className="card" style={{
          marginBottom: '1rem',
          background: `linear-gradient(135deg, var(--color-surface) 60%, ${hc.bg} 100%)`,
          borderLeft: `4px solid ${hc.color}`,
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
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: 18 }}>Salud Financiera</h3>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', minWidth: 260 }}>
              {[
                { label: 'Obligación mensual', value: fmt(summary.obligations.total), color: 'var(--color-text-primary)' },
                { label: 'Deuda total',          value: fmt(summary.debt.total),        color: 'var(--color-danger)' },
                { label: 'Suscripciones activas', value: summary.counts.activeSubscriptions, color: 'var(--color-primary)' },
                { label: 'Pagos próximos 30d',   value: summary.upcoming.length,        color: 'var(--color-warning)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.625rem' }}>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 0.15rem', fontWeight: 600 }}>{label}</p>
                  <p style={{ fontWeight: 800, color, margin: 0, fontSize: '0.95rem' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tendencia mensual ── */}
      {trend.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Obligaciones Mensuales</h3>
              <p className="card-subtitle">Últimos 6 meses — suscripciones + créditos</p>
            </div>
            <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1565C0" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="subscriptions" name="Suscripciones" stroke="#1565C0" fill="url(#gSub)" strokeWidth={2} />
              <Area type="monotone" dataKey="bankCredits"   name="Créditos"      stroke="#DC2626" fill="url(#gCred)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* ── Distribución ── */}
        {distribution.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Distribución Mensual</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {distribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmt(value)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
              {distribution.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
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

        {/* ── Próximos pagos ── */}
        {summary?.upcoming?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Próximos Pagos</h3>
                <p className="card-subtitle">Siguientes 30 días</p>
              </div>
              <Calendar size={16} style={{ color: 'var(--color-warning)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 250, overflowY: 'auto' }}>
              {summary.upcoming.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.625rem', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg)', borderLeft: `3px solid ${TYPE_COLORS[p.type] || 'var(--color-border)'}`,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                      {new Date(p.date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · {TYPE_LABEL[p.type]}
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, color: TYPE_COLORS[p.type], whiteSpace: 'nowrap', marginLeft: '0.5rem', fontSize: 13 }}>
                    {fmt(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Comparativo de obligaciones (bar chart) ── */}
      {trend.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Comparativo Mensual</h3>
              <p className="card-subtitle">Total de obligaciones por mes</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="subscriptions" name="Suscripciones" stackId="a" fill="#1565C0" radius={[0,0,0,0]} />
              <Bar dataKey="bankCredits"   name="Créditos"      stackId="a" fill="#DC2626" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
