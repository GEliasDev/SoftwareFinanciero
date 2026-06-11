import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BankCreditService } from '../services/bankCreditService';
import { AuthService } from '../services/authService';
import { AnalyticsService } from '../services/analyticsService';
import { ReminderService } from '../services/reminderService';
import {
  Repeat, CreditCard, Landmark, ArrowRight, Wallet, Bell, Plus,
  PieChart as PieIcon, TrendingUp, TrendingDown, Target, Handshake,
  Lightbulb, AlertTriangle, CheckCircle, Info, XCircle, Flag,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { fmt } from '../utils/format';

// ── Constantes de estilo ──────────────────────────────────────────────────────

const DIST_COLORS = {
  creditCards:   '#3B82F6',
  bankCredits:   '#DC2626',
  subscriptions: '#D97706',
  personalDebts: '#7C3AED',
  savings:       '#059669',
};

const UPCOMING_TYPE = {
  subscription: { Icon: Repeat,    label: 'Suscripción', accent: '#D97706' },
  bank_credit:  { Icon: Landmark,  label: 'Crédito',     accent: '#DC2626' },
  credit_card:  { Icon: CreditCard,label: 'Tarjeta',     accent: '#3B82F6' },
};

const HEALTH_TONE = {
  'Excelente': { bg: 'var(--pos-50)',  fg: 'var(--pos-600)'  },
  'Bueno':     { bg: 'var(--pos-50)',  fg: 'var(--pos-700)'  },
  'Regular':   { bg: 'var(--warn-50)', fg: 'var(--warn-600)' },
  'Crítico':   { bg: 'var(--neg-50)',  fg: 'var(--neg-600)'  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const daysUntil = (dateStr) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - today) / 86_400_000);
};

const dayLabel = (d) =>
  d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`;

const urgencyColor = (d) =>
  d === 0 ? 'var(--neg-600)' : d <= 3 ? 'var(--warn-600)' : 'var(--text-3)';

// ── Componente ────────────────────────────────────────────────────────────────

export const Dashboard = () => {
  const navigate   = useNavigate();
  const user       = AuthService.getCurrentUser();
  const firstName  = user?.primerNombre || user?.name?.split(' ')[0] || 'Usuario';

  const [summary,   setSummary]   = useState(null);
  const [credits,   setCredits]   = useState([]);
  const [recs,      setRecs]      = useState([]);
  const [freedom,   setFreedom]   = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.allSettled([
      AnalyticsService.getSummary(),
      BankCreditService.getAll(),
      AnalyticsService.getRecommendations(),
      AnalyticsService.getDebtFreedom(),
      ReminderService.getAll(),
    ]).then(([sRes, cRes, rRes, fRes, remRes]) => {
      if (sRes.status === 'fulfilled') setSummary(sRes.value);
      if (cRes.status === 'fulfilled') setCredits(cRes.value);
      if (rRes.status === 'fulfilled') setRecs(rRes.value);
      if (fRes.status === 'fulfilled') setFreedom(fRes.value);
      if (remRes.status === 'fulfilled') {
        const active = (remRes.value ?? [])
          .filter(r => r.status === 'activo')
          .sort((a, b) => new Date(a.proximaFechaPago) - new Date(b.proximaFechaPago))
          .slice(0, 5);
        setReminders(active);
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── Valores derivados ──────────────────────────────────────────────────────
  const obl          = summary?.obligations ?? {};
  const dineroLibre  = summary?.dineroLibre ?? null;
  const totalIncome  = summary?.income?.total ?? 0;
  const totalObl     = obl.total ?? 0;
  const savings      = obl.savings ?? 0;
  const health       = summary?.health;
  const healthTone   = health ? (HEALTH_TONE[health.label] ?? HEALTH_TONE['Regular']) : null;

  const dist = [
    { name: 'Tarjetas de crédito', value: obl.creditCards   ?? 0, color: DIST_COLORS.creditCards   },
    { name: 'Créditos bancarios',  value: obl.bankCredits   ?? 0, color: DIST_COLORS.bankCredits   },
    { name: 'Suscripciones',       value: obl.subscriptions ?? 0, color: DIST_COLORS.subscriptions },
    { name: 'Obligaciones',        value: obl.personalDebts ?? 0, color: DIST_COLORS.personalDebts },
    { name: 'Metas de ahorro',     value: obl.savings       ?? 0, color: DIST_COLORS.savings       },
  ].filter(d => d.value > 0);

  const totalDist    = dist.reduce((a, d) => a + d.value, 0);
  const upcoming     = (summary?.upcoming ?? []).slice(0, 8);
  const activeCredits = credits.filter(c => c.status === 'activo');
  const totalDebt    = summary?.debt?.total ?? 0;

  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Hola, ${firstName}`}
        subtitle={`${hoy.charAt(0).toUpperCase()}${hoy.slice(1)} · Resumen financiero`}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="skeleton" style={{ height: 152, borderRadius: 'var(--radius-xl)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
          <div className="split-grid">
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        </div>
      ) : (
        <>

          {/* ═══════════════════════════════════════════════════════════════
              HERO — Dinero Libre
          ═══════════════════════════════════════════════════════════════ */}
          {dineroLibre !== null && (
            <div
              className="card"
              role="button"
              tabIndex={0}
              onClick={() => navigate('/income')}
              onKeyDown={e => e.key === 'Enter' && navigate('/income')}
              style={{
                padding: '1.5rem 1.75rem',
                marginBottom: 16,
                cursor: 'pointer',
                borderLeft: `4px solid ${dineroLibre >= 0 ? 'var(--pos-600)' : 'var(--neg-600)'}`,
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
            >
              {/* Fila superior: label + badge salud financiera */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  Dinero libre este mes
                </p>
                {health && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px',
                    borderRadius: 20, letterSpacing: '0.02em',
                    background: healthTone.bg, color: healthTone.fg,
                  }}>
                    Salud {health.label} · {health.score}/100
                  </span>
                )}
              </div>

              {/* Número principal */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1.25rem' }}>
                <span
                  className="tabular dashboard-hero-amount"
                  style={{
                    fontWeight: 800, lineHeight: 1,
                    letterSpacing: '-0.025em',
                    color: dineroLibre >= 0 ? 'var(--pos-600)' : 'var(--neg-600)',
                  }}
                >
                  {fmt(Math.abs(dineroLibre))}
                </span>
                {dineroLibre < 0 && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neg-600)' }}>déficit</span>
                )}
              </div>

              {/* Fórmula desglosada */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.875rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem 1.75rem' }}>
                  {[
                    { label: 'Ingresos',       value: totalIncome, Icon: TrendingUp,   color: 'var(--pos-600)',  sign: null },
                    { label: 'Compromisos',    value: totalObl,    Icon: TrendingDown,  color: 'var(--warn-600)', sign: '−' },
                    { label: 'Metas ahorro',   value: savings,     Icon: Target,        color: 'var(--brand-600)',sign: '−' },
                  ].map(({ label, value, Icon, color, sign }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {sign && (
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-3)', marginRight: 2 }}>{sign}</span>
                      )}
                      <Icon size={12} style={{ color }} />
                      <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
                      <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {fmt(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              KPI ROW — Ingresos / Compromisos / Metas / Deuda
          ═══════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
            <StatCard
              label="Ingresos mensuales"
              value={fmt(totalIncome)}
              delta="Fuentes activas de ingreso"
              icon={Wallet}
              tone="pos"
              onClick={() => navigate('/income')}
            />
            <StatCard
              label="Compromisos mensuales"
              value={fmt(totalObl)}
              delta="Tarjetas + créditos + suscripciones + deudas"
              icon={TrendingDown}
              tone="warn"
              onClick={() => navigate('/personal-debts')}
            />
            <StatCard
              label="Ahorro mensual"
              value={fmt(savings)}
              delta="Aporte a metas activas"
              icon={Target}
              tone="brand"
              onClick={() => navigate('/savings')}
            />
            {totalDebt > 0 && (
              <StatCard
                label="Deuda total"
                value={fmt(totalDebt)}
                delta="Créditos + tarjetas"
                icon={Landmark}
                tone="neg"
                onClick={() => navigate('/bank-credits')}
              />
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              DISTRIBUCIÓN + PRÓXIMOS PAGOS
          ═══════════════════════════════════════════════════════════════ */}
          <div className="split-grid" style={{ marginBottom: 16 }}>

            {/* Distribución — 5 categorías */}
            <SectionCard
              title="¿A dónde va tu dinero?"
              subtitle="Compromisos + metas este mes"
              icon={PieIcon}
            >
              {dist.length > 0 ? (
                <div className="dist-layout">
                  {/* Donut */}
                  <div className="dist-donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dist} cx="50%" cy="50%"
                          innerRadius={50} outerRadius={72}
                          paddingAngle={2} dataKey="value" stroke="none"
                        >
                          {dist.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</span>
                      <span className="tabular" style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{fmt(totalDist)}</span>
                    </div>
                  </div>
                  {/* Leyenda */}
                  <div className="dist-legend">
                    {dist.map(d => {
                      const pct = totalDist > 0 ? (d.value / totalDist) * 100 : 0;
                      return (
                        <div key={d.name} className="dist-legend-row">
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                          <span className="dist-legend-name">{d.name}</span>
                          <span className="dist-legend-pct">{pct.toFixed(0)}%</span>
                          <span className="tabular dist-legend-amount">{fmt(d.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <p>Sin compromisos registrados aún.</p>
                </div>
              )}
            </SectionCard>

            {/* Próximos pagos — todos los tipos, 30 días */}
            <SectionCard
              title="Próximos pagos"
              subtitle="Vencimientos en los próximos 30 días"
              icon={Bell}
            >
              {upcoming.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {upcoming.map((item, i) => {
                    const d    = daysUntil(item.date);
                    const type = UPCOMING_TYPE[item.type] ?? UPCOMING_TYPE.subscription;
                    const { Icon, accent } = type;
                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: i < upcoming.length - 1 ? '1px solid var(--color-border)' : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: 'var(--surface-2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon size={13} style={{ color: accent }} />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <p className="truncate" style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: 0 }}>{item.name}</p>
                            <p style={{ fontSize: 11, margin: 0, fontWeight: d <= 3 ? 600 : 400, color: urgencyColor(d) }}>
                              {dayLabel(d)}
                            </p>
                          </div>
                        </div>
                        <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: item.amount > 0 ? 'var(--text)' : 'var(--text-3)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                          {item.amount > 0 ? fmt(item.amount) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <p>Sin pagos en los próximos 30 días</p>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              RECOMENDACIONES FINANCIERAS
          ═══════════════════════════════════════════════════════════════ */}
          {recs.length > 0 && (
            <SectionCard
              title="Recomendaciones"
              subtitle="Basadas en tu situación actual"
              icon={Lightbulb}
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recs.map((rec, i) => {
                  const styles = {
                    danger:  { bg: 'var(--neg-50)',  border: 'var(--neg-600)',  icon: XCircle,       color: 'var(--neg-600)'  },
                    warning: { bg: 'var(--warn-50)', border: 'var(--warn-600)', icon: AlertTriangle,  color: 'var(--warn-600)' },
                    info:    { bg: 'var(--brand-50)',border: 'var(--brand-600)',icon: Info,           color: 'var(--brand-600)'},
                    success: { bg: 'var(--pos-50)',  border: 'var(--pos-600)',  icon: CheckCircle,    color: 'var(--pos-600)'  },
                  }[rec.type] ?? {};
                  const RecIcon = styles.icon;
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '10px 12px', borderRadius: 'var(--radius-md)',
                      background: styles.bg, borderLeft: `3px solid ${styles.border}`,
                    }}>
                      <RecIcon size={16} style={{ color: styles.color, flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', margin: '0 0 2px' }}>{rec.title}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{rec.description}</p>
                      </div>
                      {rec.action && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ flexShrink: 0, fontSize: 11 }}
                          onClick={() => navigate(rec.action)}
                        >
                          Ver <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              PRÓXIMOS RECORDATORIOS
          ═══════════════════════════════════════════════════════════════ */}
          {reminders.length > 0 && (
            <SectionCard
              title="Recordatorios activos"
              subtitle="Tus próximas fechas de pago programadas"
              icon={Bell}
              action={
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reminders')}>
                  Ver todos <ArrowRight size={12} />
                </button>
              }
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem' }}>
                {reminders.map(r => {
                  const d = daysUntil(r.proximaFechaPago);
                  const color = d <= 0 ? 'var(--neg-600)' : d <= 3 ? 'var(--warn-600)' : d <= 7 ? 'var(--brand-600)' : 'var(--pos-600)';
                  const bg    = d <= 0 ? 'var(--neg-50)'  : d <= 3 ? 'var(--warn-50)'  : d <= 7 ? 'var(--brand-50)'  : 'var(--surface-2)';
                  const border = d <= 0 ? 'var(--neg-600)' : d <= 3 ? 'var(--warn-600)' : d <= 7 ? 'var(--brand-600)' : 'var(--border)';
                  return (
                    <div key={r.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                      <p className="truncate" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', margin: '0 0 0.2rem' }}>{r.nombre}</p>
                      {r.debtType && <p style={{ fontSize: 10, color: 'var(--text-3)', margin: '0 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.debtType.replace('_', ' ')}</p>}
                      <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>{dayLabel(d)}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '2px 0 0' }}>
                        {new Date(r.proximaFechaPago + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              LIBERTAD DE DEUDAS
          ═══════════════════════════════════════════════════════════════ */}
          {freedom?.hasDebts && (
            <SectionCard title="¿Cuándo te liberas de deudas?" subtitle="Basado en tus cuotas restantes actuales" icon={Flag} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Deuda total', value: fmt(freedom.totalDebt), color: 'var(--neg-600)' },
                    { label: 'Cuota este mes', value: fmt(freedom.monthlyPayments), color: 'var(--text)' },
                    { label: 'Meses restantes', value: `${freedom.estimatedMonths}`, color: 'var(--brand-600)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{label}</p>
                      <p className="tabular" style={{ fontSize: 16, fontWeight: 700, color, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Estimated date */}
                {freedom.estimatedDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--pos-50, rgba(5,150,105,0.06))', border: '1px solid var(--pos-600)' }}>
                    <CheckCircle size={16} style={{ color: 'var(--pos-600)', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 1px' }}>
                        Libre de deudas en{' '}
                        <span style={{ color: 'var(--pos-600)' }}>
                          {new Date(freedom.estimatedDate + '-01').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                        </span>
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Si mantienes el ritmo actual de pagos sin nuevas deudas</p>
                    </div>
                  </div>
                )}

                {/* Breakdown */}
                {freedom.breakdown.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {freedom.breakdown.map((item, i) => {
                      const pct = freedom.estimatedMonths > 0 ? Math.min(100, (item.monthsLeft / freedom.estimatedMonths) * 100) : 0;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {item.type === 'bank_credit' ? <Landmark size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} /> : <CreditCard size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                          <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{item.nombre}</span>
                          <div style={{ width: 80, height: 6, borderRadius: 99, background: 'var(--surface-2)', flexShrink: 0, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand-600)', borderRadius: 99 }} />
                          </div>
                          <span className="tabular" style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 55, textAlign: 'right', flexShrink: 0 }}>{item.monthsLeft} meses</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              CRÉDITOS ACTIVOS + ACCESOS RÁPIDOS
          ═══════════════════════════════════════════════════════════════ */}
          <div className="split-grid">

            {/* Créditos — barras de progreso */}
            <SectionCard
              title="Créditos bancarios"
              subtitle="Progreso de pago"
              icon={Landmark}
              action={
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/bank-credits')}>
                  Ver todo <ArrowRight size={12} />
                </button>
              }
            >
              {activeCredits.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {activeCredits.slice(0, 4).map(c => {
                    const pct = c.numeroCuotas ? (c.cuotasPagadas / c.numeroCuotas) * 100 : 0;
                    return (
                      <div
                        key={c.id} role="button" tabIndex={0}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/bank-credits/${c.id}`)}
                        onKeyDown={e => e.key === 'Enter' && navigate(`/bank-credits/${c.id}`)}
                        aria-label={`Ver detalle de ${c.nombre}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span className="truncate" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{c.nombre}</span>
                          <span className="tabular" style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                            {c.cuotasPagadas}/{c.numeroCuotas}
                          </span>
                        </div>
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-valuenow={Math.round(pct)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${c.cuotasPagadas} de ${c.numeroCuotas} cuotas pagadas`}
                        >
                          <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span className="tabular" style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmt(c.valorCuota)}/mes</span>
                          <span style={{ fontSize: 11, color: 'var(--pos-600)', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/bank-credits/new')}>
                    <Plus size={13} /> Registrar crédito
                  </button>
                </div>
              )}
            </SectionCard>

            {/* Accesos rápidos — 6 acciones en grilla 3×2 */}
            <SectionCard title="Registrar rápido" subtitle="Nuevo movimiento en un clic" icon={Plus}>
              <div className="quick-actions-grid">
                {[
                  { Icon: Wallet,     label: 'Ingreso',     path: '/income/new' },
                  { Icon: Handshake,  label: 'Obligación',  path: '/personal-debts/new' },
                  { Icon: Target,     label: 'Meta',        path: '/savings/new' },
                  { Icon: Repeat,     label: 'Suscripción', path: '/subscriptions/new' },
                  { Icon: CreditCard, label: 'Tarjeta',     path: '/credit-cards/new' },
                  { Icon: Landmark,   label: 'Crédito',     path: '/bank-credits/new' },
                ].map(({ Icon, label, path }) => (
                  <button key={path} className="quick-action-btn" onClick={() => navigate(path)}>
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </SectionCard>

          </div>
        </>
      )}
    </div>
  );
};
