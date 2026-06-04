import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { TrendingDown, Percent, Receipt, BarChart2 } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { SectionCard } from '../../components/ui/SectionCard';
import { buildLoanSchedule } from '../../utils/bankCredit';
import { fmt } from '../../utils/format';

// Hex fijos para recharts (no soporta CSS vars en SVG fill)
const C_CAPITAL  = '#059669'; // --pos-600
const C_INTERES  = '#DC2626'; // --neg-600
const C_SALDO    = '#047857'; // --brand-600
const C_PAGADA   = '#CBD5E1'; // --border-strong — cuotas ya pagadas (atenuado)

const fmtK = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
      padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(15,23,42,0.10)',
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: '#0F172A' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <span style={{ fontWeight: 600 }}>{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

export const BankCreditAnalysis = () => {
  const { credit } = useOutletContext();
  const { rows } = useMemo(() => buildLoanSchedule(credit), [credit]);

  const pagadas = Number(credit?.cuotasPagadas) || 0;

  const chartData = useMemo(() => rows.map(r => ({
    cuota: `C${r.k}`,
    k: r.k,
    capital:  Math.round(r.capital),
    interes:  Math.round(r.interes),
    saldo:    Math.round(r.saldo),
    pagada:   r.k <= pagadas,
  })), [rows, pagadas]);

  // KPIs
  const paid = rows.slice(0, pagadas);
  const capitalPagado  = paid.reduce((s, r) => s + r.capital, 0);
  const interesPagado  = paid.reduce((s, r) => s + r.interes, 0);
  const totalIntereses = parseFloat(credit?.totalIntereses ?? 0);
  const totalAPagar    = parseFloat(credit?.totalAPagar ?? 0);
  const cargaInteres   = totalAPagar > 0 ? (totalIntereses / totalAPagar * 100) : 0;
  const saldoCapital   = parseFloat(credit?.saldoPendiente ?? 0);

  // Para el AreaChart de saldo: incluye cuota 0 (inicio) como punto de partida
  const saldoData = useMemo(() => [
    { cuota: 'Inicio', saldo: Math.round(parseFloat(credit?.montoTotal ?? 0)), pagada: true },
    ...chartData.map(r => ({ cuota: r.cuota, saldo: r.saldo, pagada: r.pagada })),
  ], [chartData, credit]);

  // Intervalo de ticks: si hay muchas cuotas, saltar etiquetas
  const tickInterval = rows.length > 24 ? Math.ceil(rows.length / 12) - 1 : 0;

  if (!credit || rows.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard
          label="Capital pagado" value={fmt(capitalPagado)}
          delta={`Interés pagado: ${fmt(interesPagado)}`}
          icon={TrendingDown} tone="pos"
        />
        <StatCard
          label="Saldo capital pendiente" value={fmt(saldoCapital)}
          delta={`${credit.numeroCuotas - pagadas} cuotas restantes`}
          icon={TrendingDown} tone="neg"
        />
        <StatCard
          label="Carga de intereses" value={`${cargaInteres.toFixed(1)}%`}
          delta={`${fmt(totalIntereses)} del total pagado`}
          icon={Percent} tone="warn"
        />
        <StatCard
          label="Total intereses" value={fmt(totalIntereses)}
          delta={`sobre ${fmt(parseFloat(credit?.montoTotal ?? 0))} de capital`}
          icon={Receipt} tone="neutral"
        />
      </div>

      {/* Composición capital vs interés por cuota */}
      <SectionCard title="Composición de cada cuota" icon={BarChart2}>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
          Las primeras cuotas van mayoritariamente a interés; conforme avanza el crédito, más va a capital.
          Las cuotas atenuadas ya fueron pagadas.
        </p>
        <div style={{ overflowX: rows.length > 36 ? 'auto' : 'visible', paddingBottom: 4 }}>
          <div style={{ minWidth: rows.length > 36 ? rows.length * 24 : '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={rows.length > 24 ? 8 : 14} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="cuota"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  interval={tickInterval}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtK}
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 12, color: '#475569' }}>{v}</span>}
                />
                <Bar dataKey="capital" name="Capital" stackId="a" fill={C_CAPITAL}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.pagada ? C_PAGADA : C_CAPITAL} />
                  ))}
                </Bar>
                <Bar dataKey="interes" name="Interés" stackId="a" fill={C_INTERES} radius={[3, 3, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.pagada ? '#FCA5A5' : C_INTERES} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      {/* Curva de saldo pendiente */}
      <SectionCard title="Curva de amortización — saldo capital" icon={TrendingDown}>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
          Cómo disminuye el saldo de capital con cada cuota pagada.
        </p>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={saldoData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C_SALDO} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={C_SALDO} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="cuota"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                interval={tickInterval}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtK}
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="saldo"
                name="Saldo capital"
                stroke={C_SALDO}
                strokeWidth={2}
                fill="url(#gradSaldo)"
                dot={false}
                activeDot={{ r: 4, fill: C_SALDO }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

    </div>
  );
};
