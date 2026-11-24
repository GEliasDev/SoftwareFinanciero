import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IncomeService } from '../services/incomeService';
import { LoadError } from '../components/ui/LoadError';
import { Plus, Wallet, Pencil, Trash2, Power } from 'lucide-react';
import { RowMenu, RowMenuButton } from '../components/ui/RowMenu';
import { useRowMenuTip } from '../hooks/useRowMenuTip';
import { fmt } from '../utils/format';
import Swal from '../utils/alerts';

const isThisMonth = (createdAt) => {
  const d = new Date(createdAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};
const shortDay = (createdAt) => new Date(createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).replace('.', '');
const mesActual = () => new Date().toLocaleDateString('es-CO', { month: 'long' });

// Menú del ingreso (clic derecho y ⋯).
const accionesIngreso = (inc, { onEdit, onToggle, onDelete }) => [
  { label: 'Editar', icon: Pencil, onSelect: () => onEdit(inc.id) },
  { label: inc.status === 'activo' ? 'Desactivar' : 'Activar', icon: Power, onSelect: () => onToggle(inc) },
  'sep',
  { label: 'Eliminar', icon: Trash2, danger: true, onSelect: () => onDelete(inc.id) },
];

const RowActions = ({ inc, acciones, onEdit, onDelete }) => (
  <>
    <span className="row desktop-flex" style={{ gap: 4, justifyContent: 'flex-end' }}>
      <button className="icon-btn ghost sm" onClick={() => onEdit(inc.id)} aria-label={`Editar ${inc.nombre}`} title="Editar"><Pencil size={16} /></button>
      <button className="icon-btn ghost sm" onClick={() => onDelete(inc.id)} aria-label={`Eliminar ${inc.nombre}`} title="Eliminar" style={{ color: 'var(--neg-600)' }}><Trash2 size={16} /></button>
    </span>
    <span className="mobile-only"><RowMenuButton actions={acciones} label={`Acciones de ${inc.nombre}`} /></span>
  </>
);

export const Income = () => {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    IncomeService.getAll().then(setIncomes).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const activos  = incomes.filter(i => i.status === 'activo');
  const fijos    = incomes.filter(i => i.tipo === 'fijo' || !i.tipo);
  const fijosAct = activos.filter(i => i.tipo === 'fijo' || !i.tipo);
  const extras   = activos.filter(i => i.tipo === 'extra');
  const extrasMes = extras.filter(i => isThisMonth(i.createdAt));
  const totalFijo  = fijosAct.reduce((a, i) => a + parseFloat(i.monto ?? 0), 0);
  const totalExtraMes = extrasMes.reduce((a, i) => a + parseFloat(i.monto ?? 0), 0);

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar este ingreso?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--neg-600)',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
    });
    if (!isConfirmed) return;
    await IncomeService.delete(id);
    load();
  };
  const handleEdit = (id) => navigate(`/income/${id}/edit`);
  const handleToggle = async (inc) => {
    const status = inc.status === 'activo' ? 'inactivo' : 'activo';
    try {
      await IncomeService.update(inc.id, { status });
      Swal.fire({ icon: 'success', title: status === 'activo' ? 'Ingreso activado' : 'Ingreso desactivado' });
      load();
    } catch { Swal.fire({ icon: 'error', title: 'No se pudo cambiar el estado' }); }
  };
  const handlers = { onEdit: handleEdit, onToggle: handleToggle, onDelete: handleDelete };
  useRowMenuTip(incomes.length > 0);

  const header = (
    <div className="page-header">
      <div>
        <h1 className="page-title">Ingresos</h1>
        <p className="page-subtitle">Ingresos mensuales fijos y extras puntuales</p>
      </div>
      <button className="btn btn-primary desktop-flex" onClick={() => navigate('/income/new')}><Plus size={18} /> Agregar ingreso</button>
      <button className="icon-btn mobile-only" onClick={() => navigate('/income/new')} aria-label="Agregar ingreso"><Plus size={20} /></button>
    </div>
  );

  if (loading) return (
    <div aria-busy="true">{header}
      <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)', marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 240, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
  if (error) return <div>{header}<LoadError onRetry={load} title="No se pudieron cargar tus ingresos" /></div>;
  if (incomes.length === 0) return (
    <div className="animate-fade-in">{header}
      <div className="card empty-state">
        <div className="empty-state-icon"><Wallet size={24} /></div>
        <p className="empty-state-title">Registra tus ingresos</p>
        <p>Tu salario y otras entradas fijas. Con esto Debti calcula cuánto te queda libre cada mes.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/income/new')}><Plus size={16} /> Agregar ingreso</button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {header}

      <section className="card stat-strip inc-strip" aria-label="Resumen de ingresos">
        <div><p>Total mensual</p><b className="n">{fmt(totalFijo)}</b><span>{fijosAct.length} fuente{fijosAct.length !== 1 ? 's' : ''} · siempre cuentan en tu dinero libre</span></div>
        <div><p>Extras este mes</p><b className="n">{fmt(totalExtraMes)}</b><span>{extrasMes.length} ingreso{extrasMes.length !== 1 ? 's' : ''} puntual{extrasMes.length !== 1 ? 'es' : ''} · solo cuenta{extrasMes.length !== 1 ? 'n' : ''} en {mesActual()}</span></div>
      </section>

      <section className="card card-flush" aria-labelledby="inc-fijos">
        <div className="card-header">
          <h2 className="card-title" id="inc-fijos">Mensuales</h2>
          <span className="text-sm text-muted n">{fijos.length} fuente{fijos.length !== 1 ? 's' : ''}</span>
        </div>
        {fijos.length === 0 ? <p className="card-empty">Aún no tienes ingresos mensuales.</p> : (
          <>
            <table className="cc-table desktop-table">
              <thead><tr><th>Fuente</th><th>Día en que llega</th><th>Estado</th><th style={{ textAlign: 'right' }}>Monto mensual</th><th style={{ textAlign: 'right', width: 110 }}>Acciones</th></tr></thead>
              <tbody>
                {fijos.map(inc => (
                  <RowMenu key={inc.id} actions={accionesIngreso(inc, handlers)}>
                  <tr className={inc.status === 'activo' ? '' : 'muted-row'}>
                    <td className="cell-title" style={{ display: 'table-cell' }}>{inc.nombre}</td>
                    <td className="text-secondary">Día {inc.diaCobro}</td>
                    <td><span className={`badge badge-${inc.status === 'activo' ? 'success' : 'neutral'}`}>{inc.status === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="n" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(inc.monto)}</td>
                    <td><RowActions inc={inc} acciones={accionesIngreso(inc, handlers)} onEdit={handleEdit} onDelete={handleDelete} /></td>
                  </tr>
                  </RowMenu>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3}><b>Total mensual</b></td><td className="n" style={{ textAlign: 'right' }}><b>{fmt(totalFijo)}</b></td><td /></tr></tfoot>
            </table>
            <div className="mobile-list row-list">
              {fijos.map(inc => (
                <RowMenu key={inc.id} actions={accionesIngreso(inc, handlers)}>
                <div className={`pay-row ${inc.status === 'activo' ? '' : 'muted-row'}`}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="cell-title">{inc.nombre}</span>
                    <span className="cell-sub">Día {inc.diaCobro}{inc.status !== 'activo' ? ' · inactivo' : ''}</span>
                  </span>
                  <b className="n">{fmt(inc.monto)}</b>
                  <RowActions inc={inc} acciones={accionesIngreso(inc, handlers)} onEdit={handleEdit} onDelete={handleDelete} />
                </div>
                </RowMenu>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card card-flush" style={{ marginTop: 20 }} aria-labelledby="inc-extras">
        <div className="card-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 className="card-title" id="inc-extras">Extras</h2>
            <p className="card-subtitle" style={{ fontSize: 14 }}>Cuentan en el dinero libre solo el mes en que los registraste. El mes siguiente salen solos del cálculo.</p>
          </div>
        </div>
        {extras.length === 0 ? <p className="card-empty">No tienes ingresos extra. Agrégalos cuando recibas un bono, una venta o un trabajo puntual.</p> : (
          <>
            <table className="cc-table desktop-table">
              <thead><tr><th>Ingreso</th><th>Recibido</th><th>En dinero libre</th><th style={{ textAlign: 'right' }}>Monto</th><th style={{ textAlign: 'right', width: 110 }}>Acciones</th></tr></thead>
              <tbody>
                {extras.map(inc => {
                  const cuenta = isThisMonth(inc.createdAt);
                  return (
                    <RowMenu key={inc.id} actions={accionesIngreso(inc, handlers)}>
                    <tr className={cuenta ? '' : 'muted-row'}>
                      <td>{inc.nombre}</td>
                      <td className="text-secondary n">{shortDay(inc.createdAt)}</td>
                      <td>{cuenta ? <span className="badge badge-warning">Cuenta este mes</span> : <span className="badge badge-neutral">Ya no cuenta</span>}</td>
                      <td className="n" style={{ textAlign: 'right', fontWeight: cuenta ? 600 : 400 }}>{fmt(inc.monto)}</td>
                      <td><RowActions inc={inc} acciones={accionesIngreso(inc, handlers)} onEdit={handleEdit} onDelete={handleDelete} /></td>
                    </tr>
                    </RowMenu>
                  );
                })}
              </tbody>
            </table>
            <div className="mobile-list row-list">
              {extras.map(inc => {
                const cuenta = isThisMonth(inc.createdAt);
                return (
                  <RowMenu key={inc.id} actions={accionesIngreso(inc, handlers)}>
                  <div className={`pay-row ${cuenta ? '' : 'muted-row'}`}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="cell-title">{inc.nombre}</span>
                      <span className={`cell-sub ${cuenta ? 'tone-warning' : ''}`}>{shortDay(inc.createdAt)} · {cuenta ? 'cuenta este mes' : 'ya no cuenta'}</span>
                    </span>
                    <b className="n">{fmt(inc.monto)}</b>
                    <RowActions inc={inc} acciones={accionesIngreso(inc, handlers)} onEdit={handleEdit} onDelete={handleDelete} />
                  </div>
                  </RowMenu>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
