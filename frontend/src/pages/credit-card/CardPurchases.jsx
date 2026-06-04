import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ShoppingBag, CheckSquare, Plus, Search, X, SlidersHorizontal, ChevronUp, ChevronDown, ChevronRight, Banknote,
} from 'lucide-react';
import { fmt, fmtDate, monthLabel } from '../../utils/format';
import { getMovimientoVisual, CATEGORIES } from '../../utils/creditCard';

export const CardPurchases = () => {
  const { purchases, activePurchases, id, handlePayAll, payableCount } = useOutletContext();
  const navigate = useNavigate();

  const [searchText, setSearchText]     = useState('');
  const [filterCat, setFilterCat]       = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy]             = useState('fecha');
  const [expandedMonths, setExpandedMonths] = useState({});

  useEffect(() => {
    if (purchases.length > 0) {
      const latest = purchases.map(p => p.fechaCompra.slice(0, 7)).sort().reverse()[0];
      setExpandedMonths(prev => ({ ...prev, [latest]: true }));
    }
  }, [purchases]);

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
  const toggleMonth = (m) => setExpandedMonths(prev => ({ ...prev, [m]: !prev[m] }));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShoppingBag size={16} style={{ color: 'var(--brand-600)' }} />
          Compras
          {activePurchases.length > 0 && <span style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 99 }}>{activePurchases.length} activa{activePurchases.length !== 1 ? 's' : ''}</span>}
          {purchases.length > activePurchases.length && <span style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 99 }}>{purchases.length - activePurchases.length} pagada{purchases.length - activePurchases.length !== 1 ? 's' : ''}</span>}
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {payableCount > 0 && <button className="btn btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: 12 }} onClick={handlePayAll}><CheckSquare size={13} /> Pagar corte</button>}
          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: 12 }} onClick={() => navigate(`/credit-cards/${id}/advances/new`)}><Banknote size={13} /> Avance</button>
          <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: 12 }} onClick={() => navigate(`/credit-cards/${id}/purchases/new`)}><Plus size={13} /> Nueva compra</button>
        </div>
      </div>

      {purchases.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 160px' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input className="form-input" style={{ paddingLeft: 28, fontSize: 12, height: 34 }} placeholder="Buscar compra…" value={searchText} onChange={e => setSearchText(e.target.value)} />
          </div>
          <select className="form-input" style={{ fontSize: 12, height: 34, flex: '0 0 auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className="form-input" style={{ fontSize: 12, height: 34, flex: '0 0 auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Activas + pagadas</option>
            <option value="activa">Solo activas</option>
            <option value="pagada">Solo pagadas</option>
          </select>
          <select className="form-input" style={{ fontSize: 12, height: 34, flex: '0 0 auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="fecha">Ordenar: fecha</option>
            <option value="monto">Ordenar: monto ↓</option>
            <option value="cuotas-restantes">Ordenar: cuotas restantes ↓</option>
            <option value="categoria">Ordenar: categoría</option>
          </select>
          {hasFilters && <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: 11, height: 34 }} onClick={() => { setSearchText(''); setFilterCat('all'); setFilterStatus('all'); }}><X size={11} /> Limpiar</button>}
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="empty-state" style={{ padding: '2.5rem 0' }}>
          <div className="empty-state-icon"><ShoppingBag size={22} /></div>
          <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sin compras registradas</p>
          <p>Registra tu primera compra con el botón "Nueva compra".</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
          <SlidersHorizontal size={20} style={{ marginBottom: '0.5rem', opacity: 0.4, display: 'block', margin: '0 auto 0.5rem' }} />
          <p style={{ fontSize: 13 }}>Ninguna compra coincide con el filtro.</p>
        </div>
      ) : (
        <div>
          {sortedMonths.map(month => {
            const monthPurchases = purchasesByMonth[month];
            const isOpen = expandedMonths[month] !== false;
            const mTotal = monthPurchases.reduce((s, p) => s + parseFloat(p.montoTotal ?? 0), 0);
            const mActive = monthPurchases.filter(p => p.status === 'activa').length;
            return (
              <div key={month} style={{ marginBottom: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <button onClick={() => toggleMonth(month)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 1rem', background: 'var(--color-bg)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{monthLabel(month)}</span>
                    {mActive > 0 && <span style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>{mActive} activa{mActive !== 1 ? 's' : ''}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <span className="tabular" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{monthPurchases.length} compra{monthPurchases.length !== 1 ? 's' : ''} · {fmt(mTotal)}</span>
                    {isOpen ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
                  </div>
                </button>
                {isOpen && (
                  <div style={{ padding: '0.625rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[...monthPurchases].sort((a, b) => {
                      if (sortBy === 'monto') return parseFloat(b.montoTotal) - parseFloat(a.montoTotal);
                      if (sortBy === 'cuotas-restantes') return (Number(b.numeroCuotas) - Number(b.cuotasPagadas)) - (Number(a.numeroCuotas) - Number(a.cuotasPagadas));
                      if (sortBy === 'categoria') return (a.categoria || '').localeCompare(b.categoria || '');
                      return 0;
                    }).map(p => {
                      const cat = getMovimientoVisual(p.tipo, p.categoria || 'otros');
                      const isPaid = p.status === 'pagada';
                      const cuotasPagadas = Number(p.cuotasPagadas);
                      const numeroCuotas = Number(p.numeroCuotas);
                      const progress = isPaid ? 100 : numeroCuotas > 0 ? (cuotasPagadas / numeroCuotas) * 100 : 0;
                      const pgColor = isPaid ? 'var(--pos-600)' : cuotasPagadas > 0 ? 'var(--brand-600)' : 'var(--text-3)';
                      return (
                        <div key={p.id} onClick={() => navigate(`/credit-cards/${id}/purchases/${p.id}`)}
                          style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: isPaid ? 'var(--color-bg)' : 'var(--color-surface)', opacity: isPaid ? 0.82 : 1, transition: 'background 0.12s ease' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-50)'}
                          onMouseLeave={e => e.currentTarget.style.background = isPaid ? 'var(--color-bg)' : 'var(--color-surface)'}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <cat.Icon size={16} style={{ color: cat.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {p.tipo && p.tipo !== 'compra' && (
                                  <span style={{ background: `${cat.color}1a`, color: cat.color, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>{cat.label}</span>
                                )}
                                {p.descripcion}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                <span className="tabular" style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>{fmt(p.montoTotal)}</span>
                                {isPaid ? <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>PAGADA</span> : <span style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>ACTIVA</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                              <span>{fmtDate(p.fechaCompra)}</span>
                              <span className="tabular">{fmt(p.valorCuotaMensual)}/cuota</span>
                              <span>{isPaid ? 'Completada' : `${cuotasPagadas}/${numeroCuotas} cuotas`}</span>
                            </div>
                            <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: 4, width: '100%', background: pgColor, borderRadius: 99, transition: 'transform 0.4s ease', transformOrigin: 'left', transform: `scaleX(${progress / 100})` }} />
                            </div>
                          </div>
                          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
