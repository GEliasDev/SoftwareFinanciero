import { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ShoppingBag, Check, Plus, Search, X, SlidersHorizontal, ChevronDown, ChevronRight, Banknote, Upload,
} from 'lucide-react';
import { fmt, fmtDate, monthLabel, capFirst } from '../../utils/format';
import { rememberCard } from '../../utils/lastCard';
import { getMovimientoVisual, CATEGORIES } from '../../utils/creditCard';

export const CardPurchases = () => {
  const { purchases, activePurchases, id, handlePayAll, payableCount } = useOutletContext();
  const navigate = useNavigate();

  const [searchText, setSearchText]     = useState('');
  const [filterCat, setFilterCat]       = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy]             = useState('fecha');
  // Abiertos por defecto los 2 meses más recientes; el resto cerrado.
  const [expandedMonths, setExpandedMonths] = useState({});

  const filteredPurchases = useMemo(() => purchases.filter(p => {
    const matchSearch = !searchText || p.descripcion.toLowerCase().includes(searchText.toLowerCase());
    const matchCat    = filterCat === 'all' || p.categoria === filterCat;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  }), [purchases, searchText, filterCat, filterStatus]);

  const purchasesByMonth = useMemo(() => {
    const map = {};
    filteredPurchases.forEach(p => { const m = p.fechaCompra.slice(0, 7); (map[m] = map[m] || []).push(p); });
    return map;
  }, [filteredPurchases]);

  const sortedMonths = useMemo(() => Object.keys(purchasesByMonth).sort().reverse(), [purchasesByMonth]);
  const hasFilters = searchText || filterCat !== 'all' || filterStatus !== 'all';
  const isMonthOpen = (m, idx) => expandedMonths[m] ?? idx < 2;
  const toggleMonth = (m, idx) => setExpandedMonths(prev => ({ ...prev, [m]: !(prev[m] ?? idx < 2) }));
  const pagadas = purchases.length - activePurchases.length;
  const sortFn = (a, b) => {
    if (sortBy === 'monto') return parseFloat(b.montoTotal) - parseFloat(a.montoTotal);
    if (sortBy === 'cuotas-restantes') return (Number(b.numeroCuotas) - Number(b.cuotasPagadas)) - (Number(a.numeroCuotas) - Number(a.cuotasPagadas));
    if (sortBy === 'categoria') return (a.categoria || '').localeCompare(b.categoria || '');
    return b.fechaCompra.localeCompare(a.fechaCompra);
  };

  return (
    <section className="card card-flush">
      <div className="card-header pu-header">
        <h2 className="card-title row" style={{ gap: 8, flexWrap: 'wrap' }}>
          Compras
          {activePurchases.length > 0 && <span className="badge badge-neutral n">{activePurchases.length} activa{activePurchases.length !== 1 ? 's' : ''}</span>}
          {pagadas > 0 && <span className="text-sm text-muted" style={{ fontWeight: 400 }}>· {pagadas} pagada{pagadas !== 1 ? 's' : ''}</span>}
        </h2>
        <div className="pu-actions">
          {payableCount > 0 && <button className="btn btn-secondary" onClick={handlePayAll}><Check size={16} /> Pagar corte</button>}
          <button className="btn btn-secondary desktop-flex" onClick={() => navigate(`/credit-cards/${id}/purchases/import`)}><Upload size={16} /> Importar</button>
          <button className="btn btn-secondary desktop-flex" onClick={() => navigate(`/credit-cards/${id}/advances/new`)}><Banknote size={16} /> Avance</button>
          <button className="btn btn-primary" onClick={() => { rememberCard(id); navigate(`/credit-cards/${id}/purchases/new`); }}><Plus size={16} /> Nueva compra</button>
        </div>
      </div>

      {purchases.length > 0 && (
        <div className="pu-filters">
          <label className="pu-search">
            <Search size={16} />
            <input className="form-input" placeholder="Buscar compra…" value={searchText} onChange={e => setSearchText(e.target.value)} aria-label="Buscar compra" />
          </label>
          <select className="form-input" value={filterCat} onChange={e => setFilterCat(e.target.value)} aria-label="Categoría">
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Estado">
            <option value="all">Activas y pagadas</option>
            <option value="activa">Solo activas</option>
            <option value="pagada">Solo pagadas</option>
          </select>
          <select className="form-input" value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Ordenar">
            <option value="fecha">Ordenar: fecha</option>
            <option value="monto">Ordenar: monto</option>
            <option value="cuotas-restantes">Ordenar: cuotas pendientes</option>
            <option value="categoria">Ordenar: categoría</option>
          </select>
          {hasFilters && <button className="btn btn-ghost" onClick={() => { setSearchText(''); setFilterCat('all'); setFilterStatus('all'); }}><X size={16} /> Limpiar</button>}
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="empty-state" style={{ borderTop: '1px solid var(--divider)' }}>
          <div className="empty-state-icon"><ShoppingBag size={22} /></div>
          <p className="empty-state-title">Sin compras registradas</p>
          <p>Registra tu primera compra con "Nueva compra" o importa el extracto del banco.</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="empty-state" style={{ borderTop: '1px solid var(--divider)' }}>
          <div className="empty-state-icon"><SlidersHorizontal size={20} /></div>
          <p>Ninguna compra coincide con el filtro.</p>
        </div>
      ) : (
        <div className="pu-table" role="table" aria-label="Compras por mes">
          <div className="pu-row pu-thead desktop-only" role="row">
            <span role="columnheader">Compra</span><span role="columnheader">Categoría</span><span role="columnheader">Cuotas</span>
            <span role="columnheader" className="r">Cuota</span><span role="columnheader" className="r">Valor</span><span role="columnheader">Estado</span><span />
          </div>
          {sortedMonths.map((month, idx) => {
            const monthPurchases = purchasesByMonth[month];
            // Con búsqueda/filtro activo se muestran todos los resultados.
            const isOpen = hasFilters || isMonthOpen(month, idx);
            const mTotal = monthPurchases.reduce((s, p) => s + parseFloat(p.montoTotal ?? 0), 0);
            const mActive = monthPurchases.filter(p => p.status === 'activa').length;
            return (
              <div key={month} role="rowgroup">
                <button className="pu-month" onClick={() => toggleMonth(month, idx)} aria-expanded={isOpen}>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="pu-month-name">{capFirst(monthLabel(month))}</span>
                  {mActive > 0 && <span className="badge badge-neutral desktop-only">{mActive} activa{mActive !== 1 ? 's' : ''}</span>}
                  <span className="pu-month-sum n">{monthPurchases.length} compra{monthPurchases.length !== 1 ? 's' : ''} · {fmt(mTotal)}</span>
                </button>
                {isOpen && [...monthPurchases].sort(sortFn).map(p => {
                  const vis = getMovimientoVisual(p.tipo, p.categoria || 'otros');
                  const isPaid = p.status === 'pagada';
                  const pag = Number(p.cuotasPagadas), tot = Number(p.numeroCuotas);
                  const progress = isPaid ? 1 : tot > 0 ? pag / tot : 0;
                  const isOther = p.tipo && p.tipo !== 'compra';
                  return (
                    <div key={p.id} role="row" tabIndex={0} className={`pu-row pu-item ${isPaid ? 'paid' : ''}`}
                      onClick={() => navigate(`/credit-cards/${id}/purchases/${p.id}`)}
                      onKeyDown={e => e.key === 'Enter' && navigate(`/credit-cards/${id}/purchases/${p.id}`)}>
                      <span role="cell" className="pu-name">
                        <span className="cell-title">{isOther && <span className="pu-type">{vis.label}</span>}{p.descripcion}</span>
                        <span className="cell-sub">
                          {fmtDate(p.fechaCompra)}
                          {p.commission && <> · comisión del avance <b className="text-warning n">{fmt(p.commission.montoTotal)}</b></>}
                          <span className="m-inline"> · {isPaid ? 'pagada' : `${pag} de ${tot} cuotas`}</span>
                        </span>
                      </span>
                      <span role="cell" className="text-secondary desktop-only">{vis.label}</span>
                      <span role="cell" className="desktop-only">
                        <span className="n text-sm">{isPaid ? 'Completa' : `${pag} de ${tot}`}</span>
                        <span className="progress-track" style={{ display: 'block', height: 4, width: 72, marginTop: 6 }}>
                          <span className="progress-fill" style={{ display: 'block', transform: `scaleX(${progress})` }} />
                        </span>
                      </span>
                      <span role="cell" className="n r desktop-only">{fmt(p.valorCuotaMensual)}</span>
                      <span role="cell" className="n r pu-val">{fmt(p.montoTotal)}</span>
                      <span role="cell" className="desktop-only">{isPaid ? <span className="badge badge-success">Pagada</span> : <span className="badge badge-neutral">Activa</span>}</span>
                      <ChevronRight size={16} className="text-muted desktop-only" />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
