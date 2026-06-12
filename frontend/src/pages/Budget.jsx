import { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, ChevronLeft, ChevronRight, ShoppingCart, X, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import { BudgetService } from '../services/budgetService';
import { PageHeader } from '../components/ui/PageHeader';
import { fmt, fmtDate, monthKey, addMonths, monthLabel, capFirst, localISODate } from '../utils/format';

const CATEGORY_COLORS = ['#5B4DF1','#059669','#DC2626','#D97706','#3B82F6','#7C3AED','#0891B2','#BE185D','#65A30D','#EA580C'];
const PRESET_CATEGORIES = ['Mercado','Transporte','Restaurantes','Entretenimiento','Salud','Educación','Ropa','Servicios del hogar','Viajes','Tecnología'];

// Aritmética de meses en hora LOCAL (toISOString corría el mes/día en UTC-5).
const currentMes = () => monthKey();
const prevMes = (m) => addMonths(m, -1);
const nextMes = (m) => addMonths(m, 1);
const mesLabel = (m) => capFirst(monthLabel(m));

export const Budget = () => {
  const [mes, setMes] = useState(currentMes());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddExp, setShowAddExp] = useState(null); // categoria name
  const [catForm, setCatForm] = useState({ categoria: '', limite: '', color: CATEGORY_COLORS[0] });
  const [expForm, setExpForm] = useState({ monto: '', descripcion: '', fecha: localISODate() });

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await BudgetService.getMonth(mes)); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, [mes]);

  useEffect(() => { load(); }, [load]);

  const totalLimite  = data?.categories.reduce((a, c) => a + c.limite, 0) ?? 0;
  const totalGastado = data?.categories.reduce((a, c) => a + c.gastado, 0) ?? 0;

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await BudgetService.upsertCategory({ mes, categoria: catForm.categoria, limite: Number(catForm.limite), color: catForm.color });
      setCatForm({ categoria: '', limite: '', color: CATEGORY_COLORS[0] });
      setShowAddCat(false);
      load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar la categoría.' });
    }
  };

  const handleDeleteCategory = async (id, nombre) => {
    const result = await Swal.fire({
      title: `¿Eliminar "${nombre}"?`,
      text: 'Se eliminarán también los gastos de esta categoría en este mes.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626', cancelButtonText: 'Cancelar', confirmButtonText: 'Eliminar',
    });
    if (!result.isConfirmed) return;
    await BudgetService.deleteCategory(id);
    load();
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await BudgetService.addExpense({ mes, categoria: showAddExp, monto: Number(expForm.monto), descripcion: expForm.descripcion, fecha: expForm.fecha });
      setExpForm({ monto: '', descripcion: '', fecha: localISODate() });
      setShowAddExp(null);
      load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar el gasto.' });
    }
  };

  const handleDeleteExpense = async (id) => {
    await BudgetService.deleteExpense(id);
    load();
  };

  // Copia las categorías (y sus límites) del mes anterior al mes visible.
  const handleCopyPrevMonth = async () => {
    const prev = prevMes(mes);
    try {
      const prevData = await BudgetService.getMonth(prev);
      if (!prevData?.categories?.length) {
        Swal.fire({ icon: 'info', title: 'Nada que copiar', text: `No hay categorías en ${mesLabel(prev)}.` });
        return;
      }
      for (const c of prevData.categories) {
        await BudgetService.upsertCategory({ mes, categoria: c.categoria, limite: parseFloat(c.limite), color: c.color || undefined });
      }
      load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudieron copiar las categorías.' });
    }
  };

  return (
    <div>
      <PageHeader title="Presupuesto" subtitle="Controla tus gastos por categoría cada mes" />

      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0.625rem 1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setMes(prevMes(mes))} style={{ padding: '6px 10px' }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{mesLabel(mes)}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setMes(nextMes(mes))} style={{ padding: '6px 10px' }} disabled={mes >= currentMes()}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Summary bar */}
      {!loading && data?.categories.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '1rem 1.25rem' }}>
          {[
            { label: 'Presupuestado', value: fmt(totalLimite), color: 'var(--text)' },
            { label: 'Gastado', value: fmt(totalGastado), color: totalGastado > totalLimite ? 'var(--neg-600)' : 'var(--text)' },
            { label: 'Disponible', value: fmt(Math.max(0, totalLimite - totalGastado)), color: 'var(--pos-600)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{label}</p>
              <p className="tabular" style={{ fontSize: 18, fontWeight: 700, color, margin: 0 }}>{value}</p>
            </div>
          ))}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minWidth: 120 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>
              <span>0%</span>
              <span className="tabular">{totalLimite > 0 ? `${Math.round((totalGastado / totalLimite) * 100)}%` : '—'}</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${Math.min(100, totalLimite > 0 ? (totalGastado / totalLimite) * 100 : 0)}%`,
                background: totalGastado > totalLimite ? 'var(--neg-600)' : 'var(--brand-600)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />)}
        </div>
      ) : data?.categories.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><ShoppingCart size={26} /></div>
            <p className="empty-state-title">Sin categorías para {mesLabel(mes)}</p>
            <p>Crea categorías con un límite de gasto y registra tus compras del mes.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => setShowAddCat(true)}>
                <PlusCircle size={14} /> Agregar categoría
              </button>
              <button className="btn btn-secondary" onClick={handleCopyPrevMonth}>
                Copiar categorías de {mesLabel(prevMes(mes))}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {data.categories.map(cat => {
            const pct = cat.limite > 0 ? Math.min(100, (cat.gastado / cat.limite) * 100) : 0;
            const overBudget = cat.gastado > cat.limite;
            const catExpenses = data.expenses.filter(e => e.categoria === cat.categoria);
            return (
              <div key={cat.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', flex: 1 }}>{cat.categoria}</span>
                  {overBudget && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--neg-600)', background: 'var(--neg-50)', border: '1px solid var(--neg-600)', borderRadius: 20, padding: '2px 7px', flexShrink: 0 }}>
                      <AlertTriangle size={10} /> Límite superado
                    </span>
                  )}
                  {!overBudget && pct >= 75 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--warn-600)', background: 'var(--warn-50)', border: '1px solid var(--warn-600)', borderRadius: 20, padding: '2px 7px', flexShrink: 0 }}>
                      <AlertTriangle size={10} /> {pct.toFixed(0)}% usado
                    </span>
                  )}
                  <span className="tabular" style={{ fontSize: 13, color: overBudget ? 'var(--neg-600)' : 'var(--text-2)', fontWeight: 600 }}>
                    {fmt(cat.gastado)} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/ {fmt(cat.limite)}</span>
                  </span>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => setShowAddExp(cat.categoria)} title="Agregar gasto" aria-label={`Agregar gasto en ${cat.categoria}`}>
                    <PlusCircle size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--neg-600)' }} onClick={() => handleDeleteCategory(cat.id, cat.categoria)} title="Eliminar categoría" aria-label={`Eliminar categoría ${cat.categoria}`}>
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: overBudget ? 'var(--neg-600)' : cat.color, transition: 'width 0.4s ease' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
                  <span>{overBudget ? `Excedido ${fmt(cat.gastado - cat.limite)}` : `Disponible ${fmt(cat.limite - cat.gastado)}`}</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>

                {/* Expense list */}
                {catExpenses.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {catExpenses.map(exp => (
                      <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>{exp.descripcion || 'Gasto'}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtDate(exp.fecha)}</span>
                        <span className="tabular" style={{ fontSize: 12, fontWeight: 600, color: 'var(--neg-600)' }}>{fmt(exp.monto)}</span>
                        <button className="btn btn-ghost btn-sm" aria-label="Eliminar gasto" onClick={() => handleDeleteExpense(exp.id)} style={{ padding: '4px 8px', color: 'var(--text-3)' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add category button */}
      {!loading && !showAddCat && (
        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowAddCat(true)}>
          <PlusCircle size={14} /> Agregar categoría
        </button>
      )}

      {/* Add category form */}
      {showAddCat && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 1rem' }}>Nueva categoría</h3>
          <form onSubmit={handleAddCategory}>
            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
                {PRESET_CATEGORIES.map(c => (
                  <button key={c} type="button"
                    onClick={() => setCatForm(p => ({ ...p, categoria: c }))}
                    style={{
                      fontSize: 12, fontWeight: catForm.categoria === c ? 700 : 500,
                      padding: '4px 10px', borderRadius: 20, cursor: 'pointer', border: '1px solid',
                      borderColor: catForm.categoria === c ? 'var(--brand-600)' : 'var(--border)',
                      background: catForm.categoria === c ? 'var(--brand-50)' : 'var(--surface-2)',
                      color: catForm.categoria === c ? 'var(--brand-600)' : 'var(--text-2)',
                      transition: 'all 0.12s ease',
                    }}>
                    {c}
                  </button>
                ))}
              </div>
              <input
                className="form-input" required
                value={catForm.categoria} onChange={e => setCatForm(p => ({ ...p, categoria: e.target.value }))}
                placeholder="O escribe una propia…"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Límite mensual *</label>
              <input
                className="form-input" type="number" min="1" required
                value={catForm.limite} onChange={e => setCatForm(p => ({ ...p, limite: e.target.value }))}
                placeholder="500000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATEGORY_COLORS.map(c => (
                  <button key={c} type="button" className="color-swatch" aria-label={`Color ${c}`}
                    onClick={() => setCatForm(p => ({ ...p, color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: catForm.color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddCat(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Add expense modal */}
      {showAddExp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Gasto en {showAddExp}</h3>
              <button onClick={() => setShowAddExp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label className="form-label">Monto *</label>
                <input className="form-input" type="number" min="1" required
                  value={expForm.monto} onChange={e => setExpForm(p => ({ ...p, monto: e.target.value }))} placeholder="25000" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-input" value={expForm.descripcion} onChange={e => setExpForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="ej. Supermercado Éxito" />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input className="form-input" type="date" required value={expForm.fecha} onChange={e => setExpForm(p => ({ ...p, fecha: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Registrar gasto</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddExp(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
