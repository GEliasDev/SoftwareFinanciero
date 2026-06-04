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
  Repeat, CreditCard, Landmark, Sliders, Zap, CheckCircle, Info, Percent,
  ChevronUp, ChevronDown
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
  const [activeTab, setActiveTab]   = useState('analytics'); // 'analytics' | 'projection' | 'payoff'
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
    const saved = localStorage.getItem('solventa_ingreso_neto');
    return saved !== null ? saved : "4000000";
  });
  const [gastosFijos, setGastosFijos] = useState(() => {
    const saved = localStorage.getItem('solventa_gastos_fijos');
    return saved !== null ? saved : "1000000";
  });
  const [abonoExtra, setAbonoExtra] = useState(() => {
    const saved = localStorage.getItem('solventa_abono_extra');
    return saved !== null ? saved : "500000";
  });
  const [desmonteMetodo, setDesmonteMetodo] = useState('avalancha'); // 'avalancha' | 'bolanieve'
  const [expandedMonthIndex, setExpandedMonthIndex] = useState(null);

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
    localStorage.setItem('solventa_ingreso_neto', val);
  };
  const handleGastosChange = (e) => {
    const val = e.target.value;
    setGastosFijos(val);
    localStorage.setItem('solventa_gastos_fijos', val);
  };
  const handleAbonoExtraChange = (e) => {
    const val = e.target.value;
    setAbonoExtra(val);
    localStorage.setItem('solventa_abono_extra', val);
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

  // ── Algoritmo de Desmonte de Deudas ──
  const getActiveDebts = () => {
    const debts = [];

    // Créditos (activos y en mora)
    credits.forEach(c => {
      if ((c.status === 'activo' || c.status === 'en_mora') && parseFloat(c.saldoPendiente) > 0) {
        const rate = parseFloat(c.tasaMensual || (c.tasaInteres / (c.tipoTasa === 'anual' ? 12 : 1)) || 0);
        // Ajustar si la tasa está en formato porcentaje o fracción
        const rateFraction = rate > 0.5 ? rate / 100 : rate;
        debts.push({
          id: `credit-${c.id}`,
          name: c.nombre,
          entity: c.entidad,
          type: 'Crédito',
          balance: parseFloat(c.saldoPendiente),
          monthlyPayment: parseFloat(c.valorCuota),
          rate: rateFraction,
        });
      }
    });

    // Tarjetas (compras individuales con saldo amortizable)
    cards.forEach(card => {
      const cardRate = parseFloat(card.tasaInteresMensual || 0) / 100;
      (card.CreditCardPurchases || []).forEach(p => {
        if (p.status === 'activa' && p.tipo !== 'cuota_manejo') {
          const totalCuotas = parseInt(p.numeroCuotas);
          const pagadas = parseInt(p.cuotasPagadas);
          const restantes = totalCuotas - pagadas;
          if (restantes > 0) {
            const capitalPorCuota = parseFloat(p.montoTotal) / totalCuotas;
            const balance = restantes * capitalPorCuota;
            debts.push({
              id: `card-p-${p.id}`,
              name: `${p.descripcion} (${card.nombre})`,
              entity: card.entidad,
              type: 'Tarjeta',
              balance: balance,
              monthlyPayment: parseFloat(p.valorCuotaMensual),
              rate: cardRate,
            });
          }
        }
      });
    });

    return debts;
  };

  const runPayoffSimulation = (activeDebts, extraMonthly, method) => {
    let debts = activeDebts.map(d => ({ ...d }));
    let month = 0;
    const history = [];
    const maxMonths = 120; // Límite de 10 años
    let totalInterestPaid = 0;
    const timeline = [];



    while (debts.some(d => d.balance > 0.01) && month < maxMonths) {
      month++;

      let active = debts.filter(d => d.balance > 0.01);
      if (method === 'avalancha') {
        // Mayor tasa primero
        active.sort((a, b) => b.rate - a.rate || b.balance - a.balance);
      } else {
        // Menor saldo primero
        active.sort((a, b) => a.balance - b.balance || b.rate - a.rate);
      }

      // Step 1: Calcular interés acumulado del mes y pagar mínimos
      const paymentsThisMonth = {};

      active.forEach(d => {
        const interest = d.balance * d.rate;
        totalInterestPaid += interest;
        d.balance += interest; // acumular interés

        const minPay = Math.min(d.monthlyPayment, d.balance);
        paymentsThisMonth[d.id] = minPay;
        d.balance -= minPay;

        if (d.balance <= 0.01) {
          d.balance = 0;
          timeline.push({ month, name: d.name, type: d.type, monthlyPayment: d.monthlyPayment });
        }
      });

      // Step 2: Sumar cuotas de deudas liquidadas al flujo extra (Efecto Rollover)
      let freedMin = 0;
      debts.forEach(d => {
        if (d.balance <= 0.01) {
          freedMin += d.monthlyPayment;
        }
      });

      let totalExtraAvailable = extraMonthly + freedMin;

      // Inyectar el extra en la deuda prioritaria
      for (let i = 0; i < active.length; i++) {
        const d = active[i];
        if (d.balance <= 0.01) continue;

        const extraToApply = Math.min(totalExtraAvailable, d.balance);
        paymentsThisMonth[d.id] = (paymentsThisMonth[d.id] || 0) + extraToApply;
        d.balance -= extraToApply;
        totalExtraAvailable -= extraToApply;

        if (d.balance <= 0.01) {
          d.balance = 0;
          // Si se liquida aquí, agregar al timeline
          if (!timeline.some(t => t.name === d.name && t.month === month)) {
            timeline.push({ month, name: d.name, type: d.type, monthlyPayment: d.monthlyPayment });
          }
        }

        if (totalExtraAvailable <= 0) break;
      }

      history.push({
        monthIndex: month,
        balances: debts.map(d => ({ id: d.id, name: d.name, balance: d.balance })),
        payments: paymentsThisMonth,
      });
    }

    return {
      months: month,
      totalInterest: totalInterestPaid,
      timeline,
      history,
    };
  };

  // Ejecución de simulaciones
  const activeDebts = getActiveDebts();
  const hasDebts = activeDebts.length > 0;
  
  const baseline = runPayoffSimulation(activeDebts, 0, 'avalancha');
  const simulation = runPayoffSimulation(activeDebts, parseFloat(abonoExtra) || 0, desmonteMetodo);

  const mesesAhorrados = Math.max(0, baseline.months - simulation.months);
  const interesesAhorrados = Math.max(0, baseline.totalInterest - simulation.totalInterest);

  const getPayoffDate = (monthsCount) => {
    if (monthsCount === 0) return 'Inmediato';
    const d = new Date();
    d.setMonth(d.getMonth() + monthsCount);
    return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
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
          ['Mes', 'Suscripciones', 'Créditos', 'Total'],
          ...trend.map(t => [t.month, t.subscriptions, t.bankCredits, t.total]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendSheet), 'Tendencia');
      }

      XLSX.writeFile(wb, `Solventa_Reporte_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        <button
          className={`tab-nav-item ${activeTab === 'payoff' ? 'active' : ''}`}
          onClick={() => setActiveTab('payoff')}
        >
          <Zap size={14} /> Plan de Desmonte
        </button>
      </div>

      {/* ── TAB 1: ANALÍTICA HISTÓRICA ── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Salud financiera */}
          {health && (
            <div className="card" style={{
              background: `linear-gradient(135deg, var(--color-surface) 60%, ${hc.bg} 100%)`,
              borderLeft: `4px solid ${hc.color}`,
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', minWidth: 260 }}>
                  {[
                    { label: 'Obligación mensual', value: fmt(summary.obligations.total), color: 'var(--color-text-primary)' },
                    { label: 'Deuda total',          value: fmt(summary.debt.total),        color: 'var(--color-danger)' },
                    { label: 'Suscripciones activas', value: summary.counts.activeSubscriptions, color: 'var(--color-primary)' },
                    { label: 'Pagos próximos 30d',   value: summary.upcoming.length,        color: 'var(--color-warning)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.625rem' }}>
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
                  <p className="card-subtitle">Suscripciones + cuotas de créditos en los últimos 6 meses</p>
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
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="subscriptions" name="Suscripciones" stroke="#047857" fill="url(#gSub)" strokeWidth={2} />
                  <Area type="monotone" dataKey="bankCredits"   name="Créditos"      stroke="#DC2626" fill="url(#gCred)" strokeWidth={2} />
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
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.5rem 0.625rem', borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg)', borderLeft: `3px solid ${TYPE_COLORS[p.type] || 'var(--color-border)'}`,
                    }}>
                      <div style={{ minWidth: 0 }}>
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
                  <Bar dataKey="bankCredits"   name="Créditos"      stackId="a" fill="#DC2626" radius={[4,4,0,0]} />
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

      {/* ── TAB 3: PLAN DE DESMONTE (SIMULADOR DE ACELERACIÓN) ── */}
      {activeTab === 'payoff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!hasDebts ? (
            <div className="card empty-state" style={{ padding: 48 }}>
              <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>¡Sin deudas activas!</h3>
              <p>No se encontraron créditos bancarios ni compras a cuotas de tarjeta de crédito pendientes. Estás en una posición excelente.</p>
            </div>
          ) : (
            <>
              {/* KPIs de Comparación */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <StatCard
                  label="Tiempo total de desmonte"
                  value={`${simulation.months} meses`}
                  delta={`Liquidación total en: ${getPayoffDate(simulation.months)}`}
                  icon={Calendar}
                  tone="brand"
                />
                <StatCard
                  label="Tiempo ahorrado"
                  value={`${mesesAhorrados} meses`}
                  delta={mesesAhorrados > 0 ? `Antes duraba: ${baseline.months} meses` : 'Añade abonos para acelerar'}
                  icon={Zap}
                  tone={mesesAhorrados > 0 ? 'pos' : 'neutral'}
                />
                <StatCard
                  label="Intereses totales proyectados"
                  value={fmt(simulation.totalInterest)}
                  delta={`En base a amortización francesa`}
                  icon={TrendingUp}
                  tone="neutral"
                />
                <StatCard
                  label="Plata ahorrada en intereses"
                  value={fmt(interesesAhorrados)}
                  delta={interesesAhorrados > 0 ? `Reducción en sobrecostos bancarios` : 'Sin abonos extraordinarios'}
                  icon={Percent}
                  tone={interesesAhorrados > 0 ? 'pos' : 'neutral'}
                />
              </div>

              {/* Layout del Simulador */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'start' }}>
                
                {/* Panel de Configuración de Acelerador */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                      <Zap size={16} style={{ color: 'var(--color-primary)' }} />
                      <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Parámetros de Aceleración</h4>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Abono Extraordinario Mensual</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={abonoExtra}
                          onChange={handleAbonoExtraChange}
                          style={{ paddingLeft: 24 }}
                        />
                        <span style={{ position: 'absolute', left: 10, top: 8, color: 'var(--text-3)', fontWeight: 600 }}>$</span>
                      </div>
                      <span className="form-hint">Dinero mensual inyectado para matar deuda</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ marginBottom: 8 }}>Estrategia Matemática</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="payoffMethod"
                            checked={desmonteMetodo === 'avalancha'}
                            onChange={() => setDesmonteMetodo('avalancha')}
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          <div>
                            <span style={{ fontWeight: 600 }}>Método Avalancha</span>
                            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-3)' }}>Prioriza deudas de mayor interés (ahorra más plata)</p>
                          </div>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="payoffMethod"
                            checked={desmonteMetodo === 'bolanieve'}
                            onChange={() => setDesmonteMetodo('bolanieve')}
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          <div>
                            <span style={{ fontWeight: 600 }}>Método Bola de Nieve</span>
                            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-3)' }}>Prioriza deudas de menor saldo (psicológico, reduce cuentas)</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Listado de Pasivos Actuales */}
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Info size={15} style={{ color: 'var(--text-3)' }} />
                      <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--color-text-secondary)' }}>Tus Pasivos Activos ({activeDebts.length})</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                      {activeDebts.map((d, idx) => (
                        <div key={idx} style={{
                          padding: '8px 10px', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)', fontSize: 12
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span className="truncate" style={{ maxWidth: 140 }}>{d.name}</span>
                            <span className="tabular">{fmt(d.balance)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)', marginTop: 4 }}>
                            <span>Cuota: {fmt(d.monthlyPayment)}</span>
                            <span>Tasa: {(d.rate * 100).toFixed(2)}% MV</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline de Hitos y Plan de Pagos */}
                <div className="card" style={{ padding: 20 }}>
                  <div className="card-header" style={{ marginBottom: 16, paddingBottom: 10 }}>
                    <div>
                      <h3 className="card-title">Calendario de Liquidación Proyectado</h3>
                      <p className="card-subtitle">Pasos cronológicos recomendados bajo la estrategia {desmonteMetodo === 'avalancha' ? 'Avalancha' : 'Bola de Nieve'}</p>
                    </div>
                  </div>

                  {simulation.timeline.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>
                      <p>Modifica los parámetros para visualizar el plan de desmonte.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 12, borderLeft: '2px solid var(--color-border)', margin: '10px 0 10px 10px' }}>
                      {simulation.timeline.map((item, idx) => {
                        // El presupuesto acumulado liberado es el abonoExtra más la suma de las cuotas de las deudas pagadas hasta este mes
                        const deudasPagadasHastaEsteMes = simulation.timeline.filter(t => t.month <= item.month);
                        const totalBudget = (parseFloat(abonoExtra) || 0) + deudasPagadasHastaEsteMes.reduce((sum, d) => sum + d.monthlyPayment, 0);
                        return (
                          <div key={idx} style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            {/* Punto indicador */}
                            <span style={{
                              position: 'absolute', left: -19, top: 4, width: 12, height: 12, borderRadius: '50%',
                              backgroundColor: 'var(--color-success)', border: '2.5px solid var(--color-surface)',
                              boxShadow: '0 0 0 2px var(--color-success-bg)'
                            }} />

                            <div style={{ flex: 1, background: 'var(--color-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span className="badge badge-success" style={{ fontSize: 10, fontWeight: 700 }}>
                                  Mes {item.month} ({getPayoffDate(item.month)})
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 700 }}>LIQUIDADA ✓</span>
                              </div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>{item.name}</p>
                              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                                Tipo: {item.type} · Cuota liberada: <strong style={{ color: 'var(--color-text-primary)' }}>{fmt(item.monthlyPayment)}</strong>. 
                                La cuota se suma al presupuesto de desmonte. Nuevo presupuesto acumulado de abono extra: <strong>{fmt(totalBudget)}</strong>.
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="divider" style={{ margin: '20px 0' }} />

                  {/* Detalle de Pagos por Mes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, margin: '8px 0 4px', color: 'var(--color-text-secondary)' }}>Detalle de Pagos por Mes</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 350, overflowY: 'auto', paddingRight: 4 }}>
                      {simulation.history.map((h) => {
                        const isExpanded = expandedMonthIndex === h.monthIndex;
                        const totalPaid = Object.values(h.payments).reduce((sum, v) => sum + v, 0);
                        return (
                          <div key={h.monthIndex} style={{
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-surface)', overflow: 'hidden'
                          }}>
                            {/* Header del mes */}
                            <button
                              onClick={() => setExpandedMonthIndex(isExpanded ? null : h.monthIndex)}
                              style={{
                                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 12px', background: 'var(--color-bg)', border: 'none',
                                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left'
                              }}
                            >
                              <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--color-text-primary)' }}>
                                Mes {h.monthIndex} · {getPayoffDate(h.monthIndex)}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="tabular" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>
                                  {fmt(totalPaid)}
                                </span>
                                {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />}
                              </div>
                            </button>

                            {/* Desglose de pagos del mes */}
                            {isExpanded && (
                              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', paddingBottom: 4, borderBottom: '1px dashed var(--color-border)' }}>
                                  <span>Obligación</span>
                                  <span style={{ textAlign: 'right' }}>Pago este Mes</span>
                                  <span style={{ textAlign: 'right' }}>Saldo Restante</span>
                                </div>
                                {Object.entries(h.payments).map(([debtId, paymentAmt]) => {
                                  const debtObj = activeDebts.find(d => d.id === debtId);
                                  const balanceObj = h.balances.find(b => b.id === debtId);
                                  if (!debtObj || paymentAmt <= 0) return null;
                                  return (
                                    <div key={debtId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: 12 }}>
                                      <span className="truncate" style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{debtObj.name}</span>
                                      <span className="tabular" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-text-primary)' }}>{fmt(paymentAmt)}</span>
                                      <span className="tabular" style={{ textAlign: 'right', color: 'var(--text-3)' }}>{fmt(balanceObj ? balanceObj.balance : 0)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
