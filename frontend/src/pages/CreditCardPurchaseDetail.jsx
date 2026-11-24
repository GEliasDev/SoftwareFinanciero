import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Swal from '../utils/alerts';
import { CreditCardService } from '../services/creditCardService';
import { ArrowLeft, Pencil, Trash2, Check, RotateCcw, MoreHorizontal } from 'lucide-react';
import { getCardColor } from '../utils/cardColors';
import { MoneyInput } from '../components/ui/MoneyInput';
import { fmt, fmtDateLong } from '../utils/format';
import { getMovimientoVisual } from '../utils/creditCard';

function buildAmortization(montoTotal, numeroCuotas, tasaMensualPct) {
  const n = Number(numeroCuotas);
  const P = parseFloat(montoTotal);
  const i = parseFloat(tasaMensualPct) / 100;
  const C = n === 1 ? P : P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  const rows = [];
  let saldo = P;
  for (let k = 1; k <= n; k++) {
    const interes = saldo * i;
    const capital = C - interes;
    saldo = Math.max(0, saldo - capital);
    rows.push({ periodo: k, cuota: C, interes, capital, saldo });
  }
  return rows;
}

export const CreditCardPurchaseDetail = () => {
  const { id: cardId, purchaseId } = useParams();
  const navigate = useNavigate();

  const [card, setCard]         = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showAmort, setShowAmort] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [abonoMonto, setAbonoMonto]   = useState('');
  const [abonoLoading, setAbonoLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cardData, purchaseData] = await Promise.all([
        CreditCardService.getById(cardId),
        CreditCardService.getPurchaseById(cardId, purchaseId),
      ]);
      setCard(cardData);
      setPurchase(purchaseData);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la compra.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [cardId, purchaseId]);

  const vis           = purchase ? getMovimientoVisual(purchase.tipo, purchase.categoria || 'otros') : null;
  const isPaid        = purchase?.status === 'pagada';
  const cuotasPagadas = purchase ? Number(purchase.cuotasPagadas) : 0;
  const numeroCuotas  = purchase ? Number(purchase.numeroCuotas) : 1;
  const cuotasRestantes = numeroCuotas - cuotasPagadas;
  const progress      = isPaid ? 100 : numeroCuotas > 0 ? (cuotasPagadas / numeroCuotas) * 100 : 0;
  const tasaMensual   = card ? parseFloat(card.tasaInteresMensual) : 0;
  const totalIntereses = purchase ? parseFloat(purchase.totalIntereses ?? 0) : 0;
  const avanceComision = purchase?.commission ? parseFloat(purchase.commission.montoTotal ?? 0) : 0;
  const pendienteTotal = cuotasRestantes * parseFloat(purchase?.valorCuotaMensual ?? 0);

  const amortRows = useMemo(
    () => (showAmort && purchase ? buildAmortization(purchase.montoTotal, numeroCuotas, tasaMensual) : null),
    [showAmort, purchase, numeroCuotas, tasaMensual]
  );

  const handlePay = async () => {
    const result = await Swal.fire({
      title: 'Registrar pago de cuota',
      html: `<b>${purchase.descripcion}</b><br/>Cuota ${cuotasPagadas + 1} de ${numeroCuotas} — <b>${fmt(purchase.valorCuotaMensual)}</b><br/><span style="color:#64748b;font-size:0.85rem">${cuotasRestantes - 1} cuota${cuotasRestantes - 1 !== 1 ? 's' : ''} quedarán pendientes</span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonText: 'Registrar pago', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await CreditCardService.registerPurchasePayment(cardId, purchaseId);
      await load();
      const pagada = cuotasPagadas + 1 >= numeroCuotas;
      Swal.fire({
        icon: 'success',
        title: pagada ? '¡Compra pagada!' : '¡Cuota registrada!',
        text: pagada
          ? `"${purchase.descripcion}" está completamente pagada.`
          : `Cuota ${cuotasPagadas + 1}/${numeroCuotas} registrada.`,
        timer: 2000, showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar el pago.' });
    }
  };

  const handleUndoPay = async () => {
    const result = await Swal.fire({
      title: 'Deshacer último pago',
      html: `Se revertirá la cuota ${cuotasPagadas} de "<b>${purchase.descripcion}</b>".<br/>
             <span style="color:#64748b;font-size:0.85rem">El cupo de la tarjeta se descontará.</span>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626',
      confirmButtonText: 'Deshacer pago', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setUndoLoading(true);
    try {
      await CreditCardService.undoPay(cardId, purchaseId);
      await load();
      Swal.fire({ icon: 'success', title: 'Pago revertido', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo revertir el pago.' });
    } finally {
      setUndoLoading(false);
    }
  };

  const handleApplyAbono = async () => {
    const monto = parseFloat(abonoMonto);
    if (!monto || monto <= 0) return;
    const capitalRestante = cuotasRestantes * (parseFloat(purchase.montoTotal) / numeroCuotas);
    const result = await Swal.fire({
      title: 'Aplicar abono extraordinario',
      html: `Abono de <b>${fmt(monto)}</b> a "<b>${purchase.descripcion}</b>".<br/>
             <span style="color:#64748b;font-size:0.85rem">${monto >= capitalRestante ? 'Este abono liquidará la deuda.' : 'Se reducirán las cuotas restantes.'}</span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonText: 'Aplicar abono', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setAbonoLoading(true);
    try {
      await CreditCardService.registerAbono(cardId, purchaseId, monto);
      setAbonoMonto('');
      await load();
      Swal.fire({ icon: 'success', title: '¡Abono aplicado!', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo aplicar el abono.' });
    } finally {
      setAbonoLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: `¿Eliminar "${purchase.descripcion}"?`,
      text: 'El cupo utilizado será restaurado. Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await CreditCardService.deletePurchase(cardId, purchaseId);
      navigate(`/credit-cards/${cardId}/purchases`);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la compra.' });
    }
  };

  if (loading) return (
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 56, width: 360, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 96, marginBottom: 20, borderRadius: 'var(--radius-lg)' }} />
      <div className="pd-grid">
        <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />
      </div>
    </div>
  );

  if (!purchase) return (
    <div className="card empty-state">
      <p className="empty-state-title">Compra no encontrada</p>
      <p>Puede que se haya eliminado.</p>
      <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate(`/credit-cards/${cardId}/purchases`)}>
        <ArrowLeft size={16} /> Volver a compras
      </button>
    </div>
  );

  const esAvance = purchase.tipo === 'avance';
  const kpis = [
    { label: 'Monto original', value: fmt(purchase.montoTotal) },
    { label: 'Cuota mensual', value: fmt(purchase.valorCuotaMensual) },
    { label: 'Total con intereses', value: fmt(purchase.totalAPagar) },
    { label: esAvance && avanceComision > 0 ? 'Comisión del avance' : 'Intereses', value: fmt(esAvance && avanceComision > 0 ? avanceComision : totalIntereses) },
  ];
  const amortTotals = amortRows ? amortRows.reduce((t, r) => ({ cuota: t.cuota + r.cuota, capital: t.capital + r.capital, interes: t.interes + r.interes }), { cuota: 0, capital: 0, interes: 0 }) : null;
  const abonoNum = parseFloat(abonoMonto) || 0;
  const liquida = abonoNum >= cuotasRestantes * (parseFloat(purchase.montoTotal) / numeroCuotas);

  return (
    <div className="animate-fade-in">
      <nav className="breadcrumb desktop-flex" aria-label="Ruta">
        <Link to="/credit-cards">Tarjetas</Link><span aria-hidden="true">/</span>
        <Link to={`/credit-cards/${cardId}`}>{card?.nombre ?? '—'}</Link><span aria-hidden="true">/</span>
        <span>{purchase.descripcion}</span>
      </nav>

      <div className="detail-head">
        <button className="icon-btn ghost mobile-only" onClick={() => navigate(`/credit-cards/${cardId}/purchases`)} aria-label="Volver a compras"><ArrowLeft size={20} /></button>
        <div className="detail-head-text">
          <div className="row" style={{ gap: 10 }}>
            <h1 className="page-title">{purchase.descripcion}</h1>
            <span className={`badge ${isPaid ? 'badge-success' : 'badge-neutral'}`}>{isPaid ? 'Pagada' : 'Activa'}</span>
          </div>
          {card && (
            <p className="page-subtitle row" style={{ margin: 0, gap: 6 }}>
              {vis?.label} · <span className="card-chip sm" style={{ background: getCardColor(card.color) }} /> {card.nombre} · {card.entidad}{card.ultimos4 ? ` •••• ${card.ultimos4}` : ''}
            </p>
          )}
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary desktop-flex" onClick={() => navigate(`/credit-cards/${cardId}/purchases/${purchaseId}/edit`)}><Pencil size={16} /> Editar</button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="icon-btn" aria-label="Más acciones"><MoreHorizontal size={18} /></button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="menu-content" align="end" sideOffset={6}>
                <DropdownMenu.Item className="menu-item mobile-flex" onSelect={() => navigate(`/credit-cards/${cardId}/purchases/${purchaseId}/edit`)}><Pencil size={16} /> Editar compra</DropdownMenu.Item>
                {cuotasPagadas > 0 && (
                  <DropdownMenu.Item className="menu-item" disabled={undoLoading} onSelect={handleUndoPay}>
                    <RotateCcw size={16} />
                    <span><span style={{ display: 'block' }}>Deshacer último pago</span><span className="text-sm text-muted">Revierte la cuota {cuotasPagadas} · {fmt(purchase.valorCuotaMensual)}</span></span>
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Separator className="menu-sep" />
                <DropdownMenu.Item className="menu-item danger" onSelect={handleDelete}><Trash2 size={16} /> Eliminar compra</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <section className="card pd-kpis" aria-label="Montos">
        {kpis.map(k => (
          <div key={k.label}><p>{k.label}</p><b className="n">{k.value}</b></div>
        ))}
      </section>

      <div className="pd-grid">
        <div className="pd-col">
          <section className="card" aria-labelledby="pd-progress">
            <h2 className="card-title" id="pd-progress" style={{ marginBottom: 16 }}>Progreso de pago</h2>
            <div className="row-between text-sm"><span>{isPaid ? 'Pagada por completo' : `${cuotasPagadas} de ${numeroCuotas} cuotas`}</span><b className="n">{Math.round(progress)} %</b></div>
            <div className="progress-track" style={{ margin: '8px 0 6px' }}><div className="progress-fill" style={{ transform: `scaleX(${progress / 100})` }} /></div>
            <div className="row-between text-sm text-muted n"><span>{cuotasRestantes} cuota{cuotasRestantes !== 1 ? 's' : ''} restante{cuotasRestantes !== 1 ? 's' : ''}</span><span>{fmt(pendienteTotal)} pendiente</span></div>
            <div className="pd-counters">
              <div><b className="n">{cuotasPagadas}</b><span>Pagadas</span></div>
              <div><b className="n">{cuotasRestantes}</b><span>Restantes</span></div>
              <div><b className="n">{numeroCuotas}</b><span>Total</span></div>
            </div>
            {numeroCuotas > 1 && numeroCuotas <= 36 && (
              <div className="pd-timeline">
                <p className="text-sm" style={{ fontWeight: 600, margin: '0 0 10px' }}>Historial de cuotas</p>
                <div className="pd-dots">
                  {Array.from({ length: numeroCuotas }, (_, i) => {
                    const st = i < cuotasPagadas ? 'paid' : i === cuotasPagadas ? 'next' : '';
                    return <span key={i} className={`pd-dot ${st}`} aria-label={`Cuota ${i + 1}${st === 'paid' ? ' pagada' : st === 'next' ? ' próxima' : ''}`}>{st === 'paid' ? <Check size={14} /> : i + 1}</span>;
                  })}
                </div>
                <div className="pd-legend"><span><i className="paid" /> Pagada</span><span><i className="next" /> Próxima</span><span><i /> Pendiente</span></div>
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="pd-info">
            <h2 className="card-title" id="pd-info" style={{ marginBottom: 12 }}>Información de la compra</h2>
            <div className="pd-info">
              <div><span>Fecha de compra</span><b>{fmtDateLong(purchase.fechaCompra)}</b></div>
              <div><span>Categoría</span><b>{vis?.label}</b></div>
              <div><span>Tasa mensual</span><b className="n">{tasaMensual.toLocaleString('es-CO', { maximumFractionDigits: 2 })} % M.V.</b></div>
              <div><span>Tarjeta</span><Link to={`/credit-cards/${cardId}`}>{card?.nombre} · {card?.entidad}</Link></div>
            </div>
          </section>
        </div>

        <div className="pd-col">
          {!isPaid && (
            <section className="card" aria-labelledby="pd-next">
              <div className="row-between">
                <p className="text-secondary" id="pd-next" style={{ margin: 0, fontSize: 14 }}>Próxima cuota</p>
              </div>
              <div className="row-between" style={{ alignItems: 'baseline', margin: '8px 0 16px' }}>
                <span className="amount-lg">{fmt(purchase.valorCuotaMensual)}</span>
                <span className="text-sm text-secondary n">cuota {cuotasPagadas + 1} de {numeroCuotas}</span>
              </div>
              <button className="btn btn-primary btn-lg btn-block" onClick={handlePay}>Registrar cuota</button>
            </section>
          )}

          <section className="card" aria-labelledby="pd-fin">
            <h2 className="card-title" id="pd-fin" style={{ marginBottom: 4 }}>Resumen financiero</h2>
            <div className="row-list">
              <div className="kv"><span>Capital financiado</span><span>{fmt(purchase.montoTotal)}</span></div>
              <div className="kv"><span>Total con intereses</span><span>{fmt(purchase.totalAPagar)}</span></div>
              {esAvance && avanceComision > 0 && <div className="kv"><span>Comisión del avance</span><span>{fmt(avanceComision)}</span></div>}
              <div className="kv"><span>Ya pagado</span><span className={cuotasPagadas > 0 ? 'text-success' : ''}>{cuotasPagadas > 0 ? '−' : ''}{fmt(cuotasPagadas * parseFloat(purchase.valorCuotaMensual ?? 0))}</span></div>
            </div>
            <div className="row-between cc-debt-total">
              <b>Saldo pendiente</b>
              <span className="amount-lg" style={{ fontSize: 22 }}>{fmt(pendienteTotal)}</span>
            </div>
          </section>

          {!isPaid && (
            <section className="card" aria-labelledby="pd-abono">
              <h2 className="card-title" id="pd-abono" style={{ marginBottom: 12 }}>Abono extraordinario</h2>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label" htmlFor="purchase-abono">Monto del abono</label>
                <MoneyInput id="purchase-abono" placeholder="0" value={abonoMonto} onChange={setAbonoMonto} />
              </div>
              {abonoNum > 0 && (
                <p className="text-sm text-success" style={{ margin: '0 0 12px' }}>
                  {liquida ? 'Este abono liquidará la deuda completamente.' : `Reducirá las ${cuotasRestantes} cuotas restantes.`}
                </p>
              )}
              <button className="btn btn-secondary btn-block" onClick={handleApplyAbono} disabled={abonoLoading || abonoNum <= 0}>
                {abonoLoading ? 'Aplicando…' : 'Aplicar abono'}
              </button>
            </section>
          )}
        </div>
      </div>

      <section className="card card-flush" style={{ marginTop: 20 }} aria-labelledby="pd-amort">
        <div className="card-header">
          <div>
            <h2 className="card-title" id="pd-amort">Tabla de amortización</h2>
            <p className="card-subtitle">Sistema francés · {cuotasPagadas} cuota{cuotasPagadas !== 1 ? 's' : ''} pagada{cuotasPagadas !== 1 ? 's' : ''}{amortTotals ? ` · interés total ${fmt(amortTotals.interes)}` : ''}</p>
          </div>
          <button className="btn-text link-sm" style={{ fontFamily: 'inherit', cursor: 'pointer' }} onClick={() => setShowAmort(v => !v)}>
            {showAmort ? 'Ocultar tabla' : 'Ver tabla'}
          </button>
        </div>
        {showAmort && amortRows && (
          <div className="table-container">
            <table className="cc-table pd-amort">
              <thead><tr><th>Cuota</th><th className="r">Valor cuota</th><th className="r">Capital</th><th className="r">Interés</th><th className="r">Saldo</th></tr></thead>
              <tbody>
                {amortRows.map(r => {
                  const st = r.periodo <= cuotasPagadas ? 'paid' : r.periodo === cuotasPagadas + 1 ? 'next' : '';
                  return (
                    <tr key={r.periodo} className={st}>
                      <td>{st === 'paid' ? <span className="text-success row" style={{ gap: 4 }}><Check size={14} /> {r.periodo} · pagada</span> : st === 'next' ? <b>{r.periodo} · próxima</b> : r.periodo}</td>
                      <td className="n r">{fmt(r.cuota)}</td>
                      <td className="n r">{fmt(r.capital)}</td>
                      <td className="n r">{fmt(r.interes)}</td>
                      <td className="n r">{fmt(r.saldo)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td><b>Total</b></td><td className="n r"><b>{fmt(amortTotals.cuota)}</b></td><td className="n r"><b>{fmt(amortTotals.capital)}</b></td><td className="n r"><b>{fmt(amortTotals.interes)}</b></td><td /></tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
