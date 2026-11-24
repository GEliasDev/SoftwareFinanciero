import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine, ReferenceDot,
} from 'recharts';
import { buildLoanSchedule } from '../../utils/bankCredit';
import { fmt } from '../../utils/format';

// Hex fijos para recharts (no soporta CSS vars en SVG fill)
const C_CAPITAL   = '#12B76A'; // --pos-500
const C_CAPITAL_P = '#A6F4C5'; // capital de cuotas ya pagadas (atenuado)
const C_INTERES   = '#667085'; // --cat-2
const C_INTERES_P = '#D0D5DD'; // interés de cuotas ya pagadas
const C_SALDO     = '#047857'; // --brand-600
const C_GRID      = '#EAECF0';
const C_TICK      = '#98A2B3';

const fmtK = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

const pctFmt = (n) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
const LegendItem = ({ color, label, dashed }) => (
  <span className="chart-legend-item"><i style={{ background: dashed ? 'none' : color, borderTop: dashed ? `2px dashed ${color}` : 'none', height: dashed ? 0 : 8, width: dashed ? 14 : 8 }} />{label}</span>
);


const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow-lg)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{label}</p>
      {payload.filter(p => p.value != null).map(p => (
        <p key={p.dataKey} style={{ color: 'var(--text-2)', margin: '2px 0' }}>
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
  // Dos series: lo ya pagado (línea sólida con relleno) y lo que falta (punteada).
  const saldoData = useMemo(() => [
    { cuota: 'Inicio', k: 0, saldo: Math.round(parseFloat(credit?.montoTotal ?? 0)) },
    ...chartData.map(r => ({ cuota: r.cuota, k: r.k, saldo: r.saldo })),
  ].map(d => ({ ...d, pagado: d.k <= pagadas ? d.saldo : null, pendiente: d.k >= pagadas ? d.saldo : null })), [chartData, credit, pagadas]);
  const hoy = saldoData[pagadas];

  // Intervalo de ticks: si hay muchas cuotas, saltar etiquetas
  const tickInterval = rows.length > 24 ? Math.ceil(rows.length / 12) - 1 : 0;

  if (!credit || rows.length === 0) return null;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="card stat-strip" aria-label="Resumen del análisis">
        <div><p>Capital pagado</p><b className="n">{fmt(capitalPagado)}</b><span>Interés pagado: {fmt(interesPagado)}</span></div>
        <div><p>Saldo capital pendiente</p><b className="n">{fmt(saldoCapital)}</b><span>{credit.numeroCuotas - pagadas} cuotas restantes</span></div>
        <div><p>Carga de intereses</p><b className="n">{pctFmt(cargaInteres)}</b><span>{fmt(totalIntereses)} del total a pagar</span></div>
        <div><p>Total intereses</p><b className="n">{fmt(totalIntereses)}</b><span>sobre {fmt(parseFloat(credit?.montoTotal ?? 0))} de capital</span></div>
      </section>

      <section className="card" aria-labelledby="an-comp">
        <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title" id="an-comp">Composición de cada cuota</h2>
            <p className="card-subtitle" style={{ fontSize: 14 }}>Las primeras cuotas van sobre todo a interés; con el tiempo, más va a capital. Las cuotas claras ya están pagadas.</p>
          </div>
          <div className="chart-legend">
            <LegendItem color={C_CAPITAL} label="Capital" />
            <LegendItem color={C_INTERES} label="Interés" />
            <LegendItem color={C_INTERES_P} label="Pagadas" />
          </div>
        </div>
        <div style={{ overflowX: rows.length > 36 ? 'auto' : 'visible', paddingBottom: 4, marginTop: 16 }}>
          <div style={{ minWidth: rows.length > 36 ? rows.length * 18 : '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%" margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={C_GRID} vertical={false} />
                <XAxis dataKey="cuota" tick={{ fontSize: 11, fill: C_TICK }} interval={tickInterval} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: C_TICK }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
                {pagadas > 0 && pagadas < rows.length && (
                  <ReferenceLine x={`C${pagadas + 1}`} stroke="#101828" strokeDasharray="3 3" label={{ value: 'Hoy', position: 'top', fontSize: 11, fill: '#475467' }} />
                )}
                <Bar dataKey="capital" name="Capital" stackId="a" fill={C_CAPITAL}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.pagada ? C_CAPITAL_P : C_CAPITAL} />)}
                </Bar>
                <Bar dataKey="interes" name="Interés" stackId="a" fill={C_INTERES}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.pagada ? C_INTERES_P : C_INTERES} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="an-curve">
        <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title" id="an-curve">Curva de amortización · saldo de capital</h2>
            <p className="card-subtitle" style={{ fontSize: 14 }}>Cómo baja el saldo de capital con cada cuota pagada.</p>
          </div>
          <div className="chart-legend">
            <LegendItem color={C_SALDO} label="Pagado" />
            <LegendItem color={C_INTERES} label="Por pagar" dashed />
          </div>
        </div>
        <div style={{ height: 240, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={saldoData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C_GRID} vertical={false} />
              <XAxis dataKey="cuota" tick={{ fontSize: 11, fill: C_TICK }} interval={tickInterval} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: C_TICK }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="linear" dataKey="pagado" name="Saldo" stroke={C_SALDO} strokeWidth={2} fill="#ECFDF3" fillOpacity={1} dot={false} connectNulls={false} />
              <Area type="linear" dataKey="pendiente" name="Saldo proyectado" stroke={C_INTERES} strokeWidth={2} strokeDasharray="5 5" fill="none" dot={false} connectNulls={false} />
              {hoy && pagadas > 0 && (
                <ReferenceDot x={hoy.cuota} y={hoy.saldo} r={4} fill={C_SALDO} stroke="#fff"
                  label={{ value: `Hoy · ${fmtK(hoy.saldo)}`, position: 'top', fontSize: 11, fill: '#101828' }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
