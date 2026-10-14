import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ShoppingBag, DollarSign, Zap, PieChart as PieIcon } from 'lucide-react';
import { CreditCardService } from '../../services/creditCardService';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { fmt } from '../../utils/format';

function calcAbonoImpact(activePurchases, abonoAmount, tasaMensual) {
  const extra = parseFloat(abonoAmount) || 0;
  if (extra <= 0 || activePurchases.length === 0) return null;
  const target = [...activePurchases].sort((a, b) =>
    (Number(b.numeroCuotas) - Number(b.cuotasPagadas)) - (Number(a.numeroCuotas) - Number(a.cuotasPagadas))
  )[0];
  const restantes = Number(target.numeroCuotas) - Number(target.cuotasPagadas);
  const capitalPorCuota = parseFloat(target.montoTotal) / Number(target.numeroCuotas);
  const capitalRestante = capitalPorCuota * restantes;
  const nuevoCapital = Math.max(0, capitalRestante - extra);
  let nuevasCuotas;
  if (nuevoCapital <= 0) {
    nuevasCuotas = 0;
  } else {
    const i = tasaMensual / 100;
    const C = parseFloat(target.valorCuotaMensual);
    if (i === 0 || C <= 0) nuevasCuotas = Math.ceil(nuevoCapital / capitalPorCuota);
    else { const ratio = 1 - (nuevoCapital * i) / C; nuevasCuotas = ratio <= 0 ? 1 : Math.ceil(-Math.log(ratio) / Math.log(1 + i)); }
  }
  const mesesAhorrados = Math.max(0, restantes - nuevasCuotas);
  const interesAhorrado = Math.max(0, mesesAhorrados * (parseFloat(target.valorCuotaMensual) - capitalPorCuota));
  return { targetName: target.descripcion, mesesAhorrados, interesAhorrado };
}

export const CardAnalysis = () => {
  const {
    activePurchases, categoryData, monthlyObligation,
    totalConIntereses, totalCapital, maxMesesRestantes, tasaMensual, id, reload,
  } = useOutletContext();

  const [simBudget, setSimBudget]   = useState('');
  const [abonoExtra, setAbonoExtra] = useState('');
  const [abonoLoading, setAbonoLoading] = useState(false);

  const simAmount     = parseFloat(simBudget) || 0;
  const simDiff       = simAmount - monthlyObligation;
  const simSuficiente = simAmount > 0 && simAmount >= monthlyObligation;
  const abonoImpact   = useMemo(() => calcAbonoImpact(activePurchases, abonoExtra, tasaMensual), [abonoExtra, activePurchases, tasaMensual]);

  const handleApplyAbono = async () => {
    const monto = parseFloat(abonoExtra);
    if (!monto || monto <= 0 || activePurchases.length === 0) return;
    const target = [...activePurchases].sort((a, b) => (Number(b.numeroCuotas) - Number(b.cuotasPagadas)) - (Number(a.numeroCuotas) - Number(a.cuotasPagadas)))[0];
    const capitalPorCuota = parseFloat(target.montoTotal) / Number(target.numeroCuotas);
    const capitalRestante = capitalPorCuota * (Number(target.numeroCuotas) - Number(target.cuotasPagadas));
    const result = await Swal.fire({
      title: 'Aplicar abono extraordinario',
      html: `Abono de <b>${fmt(monto)}</b> a "<b>${target.descripcion}</b>".<br/><span style="color:#64748b;font-size:0.85rem">${monto >= capitalRestante ? 'Este abono liquidará la deuda.' : 'Se reducirán las cuotas restantes.'}</span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#5B4DF1', cancelButtonColor: '#64748B',
      confirmButtonText: 'Aplicar abono', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setAbonoLoading(true);
    try {
      await CreditCardService.registerAbono(id, target.id, monto);
      setAbonoExtra('');
      await reload();
      Swal.fire({ icon: 'success', title: '¡Abono aplicado!', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo aplicar el abono.' });
    } finally {
      setAbonoLoading(false);
    }
  };

  if (activePurchases.length === 0) return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon"><PieIcon size={22} /></div>
        <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sin datos para analizar</p>
        <p>Cuando tengas compras activas verás aquí la distribución por categoría y el simulador de pago.</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {categoryData.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <ShoppingBag size={15} style={{ color: 'var(--brand-600)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: 0 }}>Compras por categoría</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={88} paddingAngle={2} dataKey="value">
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.125rem' }}>
          <DollarSign size={15} style={{ color: 'var(--brand-600)' }} />
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: 0 }}>Simulador de pago</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.125rem' }}>
          <div>
            <label className="form-label">¿Cuánto puedes pagar por mes?</label>
            <MoneyInput placeholder="Ej: 300000" value={simBudget} onChange={setSimBudget} />
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Obligación actual: <strong className="tabular" style={{ color: 'var(--color-text-secondary)' }}>{fmt(monthlyObligation)}</strong></p>
          </div>
          <div>
            {simAmount > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div className={`info-box ${simSuficiente ? 'success' : 'danger'}`} style={{ fontSize: 12 }}>
                  {simSuficiente ? <span><strong>Suficiente.</strong> Cubres la obligación con {fmt(simDiff)} de margen.</span> : <span><strong>Insuficiente.</strong> Faltan {fmt(Math.abs(simDiff))} para cubrir todas las cuotas.</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Meses hasta saldar todo</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-600)' }}>{maxMesesRestantes} {maxMesesRestantes === 1 ? 'mes' : 'meses'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Intereses totales generados</span>
                  <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{fmt(totalConIntereses - totalCapital)}</span>
                </div>
              </div>
            ) : <p style={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 8 }}>Ingresa un monto para ver el análisis.</p>}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.875rem' }}>
            <Zap size={14} style={{ color: '#d97706' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Abono extraordinario</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>— pago único de capital extra</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Monto del abono</label>
              <MoneyInput placeholder="Ej: 500000" value={abonoExtra} onChange={setAbonoExtra} />
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Se aplica a la compra con más cuotas restantes.</p>
            </div>
            <div>
              {abonoImpact ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className="info-box success" style={{ fontSize: 12 }}>
                    <Zap size={12} />
                    {abonoImpact.mesesAhorrados > 0 ? <span>Ahorras <strong>{abonoImpact.mesesAhorrados} {abonoImpact.mesesAhorrados === 1 ? 'mes' : 'meses'}</strong> en <em>{abonoImpact.targetName}</em>.</span> : <span>El abono liquida completamente <em>{abonoImpact.targetName}</em>.</span>}
                  </div>
                  {abonoImpact.interesAhorrado > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Intereses que te ahorras</span>
                      <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>{fmt(abonoImpact.interesAhorrado)}</span>
                    </div>
                  )}
                  <button className="btn btn-success" style={{ fontSize: 12, padding: '0.4rem 0.875rem', marginTop: '0.25rem' }} onClick={handleApplyAbono} disabled={abonoLoading}>
                    <Zap size={12} /> {abonoLoading ? 'Aplicando…' : 'Aplicar abono real'}
                  </button>
                </div>
              ) : <p style={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 8 }}>Ingresa un monto para ver el impacto del abono.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
