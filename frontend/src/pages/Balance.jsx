import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Drawer } from 'vaul';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Pencil, Trash2, MoreHorizontal, Copy, Wallet, X, Check } from 'lucide-react';
import { BalanceService } from '../services/balanceService';
import { LoadError } from '../components/ui/LoadError';
import { MoneyInput } from '../components/ui/MoneyInput';
import { useIsMobile } from '../hooks/useMediaQuery';
import { fmt } from '../utils/format';
import {
  MESES, CATEGORIAS_INGRESO, CATEGORIAS_GASTO, ESTADOS,
  cardDueForMonth, cardPayMonth, creditDueForMonth, subDueForMonth, incomeDueForMonth,
  montoFila, fuenteDe, resumenBalance,
} from '../utils/balance';
import Swal from '../utils/alerts';

const ESTADO_BADGE = { pendiente: 'neutral', comprometido: 'warning', pagado: 'success', recibido: 'success' };
const ORIGEN_LABEL = { tarjeta: 'Tarjeta', credito: 'Crédito', suscripcion: 'Suscripción', ingreso: 'Ingreso de Debti' };
const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const pct = (n) => `${Math.round(n * 100)} %`;

// ── Piezas ────────────────────────────────────────────────────────────────────

// Diálogo en PC, hoja inferior en teléfono (mismo patrón que Registrar movimiento).
const Sheet = ({ open, onOpenChange, title, children }) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="sheet-overlay" />
          <Drawer.Content className="sheet-content" aria-describedby={undefined}>
            <div className="sheet-handle" />
            <div className="reg-head">
              <Drawer.Title className="sheet-title">{title}</Drawer.Title>
              <Drawer.Close className="icon-btn ghost sm" aria-label="Cerrar"><X size={20} /></Drawer.Close>
            </div>
            <div className="sheet-body">{children}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dlg-overlay" />
        <Dialog.Content className="dlg-content wide" aria-describedby={undefined}>
          <div className="reg-head">
            <Dialog.Title className="dlg-title">{title}</Dialog.Title>
            <Dialog.Close className="icon-btn ghost sm" aria-label="Cerrar"><X size={18} /></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const EstadoMenu = ({ fila, onChange }) => {
  const actual = ESTADOS[fila.tipo].find(e => e.value === fila.estado);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={`badge badge-${ESTADO_BADGE[fila.estado]} bal-estado`} aria-label={`Estado de ${fila.descripcion}: ${actual?.label}. Cambiar`}>
          {actual?.label} <ChevronDown size={12} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu-content" align="start" sideOffset={4}>
          {ESTADOS[fila.tipo].map(e => (
            <DropdownMenu.Item key={e.value} className="menu-item" onSelect={() => e.value !== fila.estado && onChange(fila, e.value)}>
              <span style={{ width: 16, display: 'inline-flex' }}>{e.value === fila.estado && <Check size={16} />}</span> {e.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

const RowActions = ({ fila, onEdit, onDelete }) => (
  <>
    <span className="row desktop-flex" style={{ gap: 4, justifyContent: 'flex-end' }}>
      <button className="icon-btn ghost sm" onClick={() => onEdit(fila)} aria-label={`Editar ${fila.descripcion}`} title="Editar"><Pencil size={16} /></button>
      <button className="icon-btn ghost sm" onClick={() => onDelete(fila)} aria-label={`Quitar ${fila.descripcion}`} title="Quitar del balance" style={{ color: 'var(--neg-600)' }}><Trash2 size={16} /></button>
    </span>
    <span className="mobile-only">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><button className="icon-btn ghost sm" aria-label={`Acciones de ${fila.descripcion}`}><MoreHorizontal size={18} /></button></DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu-content" align="end" sideOffset={4}>
            <DropdownMenu.Item className="menu-item" onSelect={() => onEdit(fila)}><Pencil size={16} /> Editar</DropdownMenu.Item>
            <DropdownMenu.Item className="menu-item danger" onSelect={() => onDelete(fila)}><Trash2 size={16} /> Quitar del balance</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </span>
  </>
);

// Subtítulo de la fila: de dónde viene el monto.
const origenTexto = (f) => {
  if (f.origen === 'manual') return null;
  if (f.huerfana) return `${ORIGEN_LABEL[f.origen]} · ya no existe en Debti`;
  return `${ORIGEN_LABEL[f.origen]} · ${f.monto == null ? 'monto automático' : 'monto ajustado'}`;
};

const Seccion = ({ id, titulo, filas, vacio, onEstado, onEdit, onDelete }) => {
  const total = filas.reduce((s, f) => s + f.valor, 0);
  return (
    <section className="card card-flush" aria-labelledby={id}>
      <div className="card-header">
        <h2 className="card-title" id={id}>{titulo}</h2>
        <span className="text-sm text-muted n">{fmt(total)}</span>
      </div>
      {filas.length === 0 ? <p className="card-empty">{vacio}</p> : (
        <>
          <table className="cc-table desktop-table bal-table">
            <thead><tr><th>Descripción</th><th>Categoría</th><th>Estado</th><th style={{ textAlign: 'right' }}>Monto</th><th style={{ textAlign: 'right', width: 96 }} aria-label="Acciones" /></tr></thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.id}>
                  <td><span className="bal-desc"><span className="cell-title">{f.descripcion}</span>{origenTexto(f) && <span className="cell-sub">{origenTexto(f)}</span>}</span></td>
                  <td className="text-secondary">{f.categoria}</td>
                  <td><EstadoMenu fila={f} onChange={onEstado} /></td>
                  <td className="n" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(f.valor)}</td>
                  <td><RowActions fila={f} onEdit={onEdit} onDelete={onDelete} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={3}><b>Total</b></td><td className="n" style={{ textAlign: 'right' }}><b>{fmt(total)}</b></td><td /></tr></tfoot>
          </table>
          <div className="mobile-list row-list">
            {filas.map(f => (
              <div key={f.id} className="pay-row bal-row">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="cell-title">{f.descripcion}</span>
                  <span className="cell-sub">{f.categoria}{f.origen !== 'manual' && f.monto == null ? ' · automático' : ''}</span>
                </span>
                <span className="bal-row-end">
                  <b className="n">{fmt(f.valor)}</b>
                  <EstadoMenu fila={f} onChange={onEstado} />
                </span>
                <RowActions fila={f} onEdit={onEdit} onDelete={onDelete} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

// En teléfono el detalle se pliega: arriba solo lo que queda, ingresos y gastos.
const Resumen = ({ r, mesNombre }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className={`card bal-resumen ${open ? 'open' : ''}`} aria-labelledby="bal-resumen-t">
      <h2 className="card-title" id="bal-resumen-t">Resumen de {mesNombre}</h2>
      <div className="bal-queda">
        <p>Queda después de pagar todo</p>
        <span className={`amount-xl n ${r.queda < 0 ? 'neg' : ''}`}>{fmt(r.queda)}</span>
      </div>
      <dl className="bal-kv">
        <div><dt>Ingresos</dt><dd className="n">{fmt(r.ingresos)}</dd></div>
        <div className="sub bal-more"><dt>Ya recibido</dt><dd className="n">{fmt(r.recibido)}</dd></div>
        <div><dt>Gastos totales</dt><dd className="n">{fmt(r.gastos)}</dd></div>
        <div className="sub bal-more"><dt>Pagado</dt><dd className="n">{fmt(r.pagado)}</dd></div>
        <div className="sub bal-more"><dt>Comprometido</dt><dd className="n">{fmt(r.comprometido)}</dd></div>
        <div className="sub bal-more"><dt>Pendiente</dt><dd className="n">{fmt(r.pendiente)}</dd></div>
        <div className="strong bal-more"><dt>Disponible hoy <span>recibido menos pagado</span></dt><dd className={`n ${r.disponibleHoy < 0 ? 'text-danger' : ''}`}>{fmt(r.disponibleHoy)}</dd></div>
      </dl>
      <div className="bal-progress bal-more">
        <div className="row-between text-sm"><span className="text-secondary">Gastos ya pagados</span><b className="n">{pct(r.pctPagado)}</b></div>
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.pctPagado * 100)} aria-label="Gastos ya pagados">
          <div className="progress-fill" style={{ width: `${Math.min(100, r.pctPagado * 100)}%` }} />
        </div>
      </div>
      {r.categorias.length > 0 && (
        <div className="bal-more">
          <h3 className="bal-sub-t">Gastos por categoría</h3>
          <ul className="bal-cats">
            {r.categorias.map(c => (
              <li key={c.categoria}>
                <span className="row-between"><span>{c.categoria}</span><b className="n">{fmt(c.valor)}</b></span>
                <span className="bal-bar"><span style={{ width: `${r.gastos ? (c.valor / r.gastos) * 100 : 0}%` }} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="btn-text bal-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {open ? 'Ocultar detalle' : 'Ver detalle'} <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
    </section>
  );
};

// Formulario de una fila: alta manual o edición (manual o enlazada).
const FilaForm = ({ fila, auto, onSubmit, onCancel, saving }) => {
  const editando = !!fila?.id;
  const enlazada = fila && fila.origen && fila.origen !== 'manual';
  const [tipo, setTipo] = useState(fila?.tipo || 'gasto');
  const [descripcion, setDescripcion] = useState(fila?.descripcion || '');
  const [categoria, setCategoria] = useState(fila?.categoria || '');
  const [monto, setMonto] = useState(fila?.monto != null ? String(fila.monto) : '');
  const [estado, setEstado] = useState(fila?.estado || 'pendiente');
  const [usarAuto, setUsarAuto] = useState(enlazada ? fila.monto == null : false);
  const [error, setError] = useState(null);

  const cats = tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;
  const cambiarTipo = (t) => { setTipo(t); if (!ESTADOS[t].some(e => e.value === estado)) setEstado('pendiente'); };

  const submit = (e) => {
    e.preventDefault();
    const n = Number(monto);
    if (!descripcion.trim()) return setError('Escribe una descripción.');
    if (!categoria.trim()) return setError('Elige o escribe una categoría.');
    if (!(enlazada && usarAuto) && !(n > 0)) return setError('Escribe un monto mayor que cero.');
    setError(null);
    onSubmit({
      ...(editando ? {} : { tipo }),
      descripcion: descripcion.trim(),
      categoria: categoria.trim(),
      monto: enlazada && usarAuto ? null : n,
      estado,
    });
  };

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 16 }} noValidate>
      {!editando && (
        <div className="segmented" role="group" aria-label="Tipo de movimiento">
          <button type="button" aria-pressed={tipo === 'gasto'} onClick={() => cambiarTipo('gasto')}>Pago o gasto</button>
          <button type="button" aria-pressed={tipo === 'ingreso'} onClick={() => cambiarTipo('ingreso')}>Ingreso</button>
        </div>
      )}
      <div className="form-group">
        <label className="form-label required" htmlFor="bal-desc">Descripción</label>
        <input id="bal-desc" className="form-input" value={descripcion} maxLength={100} onChange={e => setDescripcion(e.target.value)} placeholder={tipo === 'ingreso' ? 'Ej: Venta de bicicleta' : 'Ej: Aporte casa'} />
      </div>
      <div className="form-group">
        <label className="form-label required" htmlFor="bal-cat">Categoría</label>
        <input id="bal-cat" className="form-input" list="bal-cats" value={categoria} maxLength={40} onChange={e => setCategoria(e.target.value)} placeholder="Elige una o escribe una nueva" />
        <datalist id="bal-cats">{cats.map(c => <option key={c} value={c} />)}</datalist>
      </div>
      <div className="form-group">
        <label className="form-label required" htmlFor="bal-monto">Monto</label>
        {enlazada && (
          <label className="bal-check">
            <input type="checkbox" checked={usarAuto} onChange={e => setUsarAuto(e.target.checked)} />
            <span>Usar el monto que calcula Debti para este mes: <b className="n">{fmt(auto)}</b></span>
          </label>
        )}
        {!(enlazada && usarAuto) && <MoneyInput id="bal-monto" value={monto} onChange={setMonto} />}
      </div>
      <div className="form-group">
        <span className="form-label">Estado</span>
        <div className="segmented" role="group" aria-label="Estado">
          {ESTADOS[tipo].map(e => (
            <button key={e.value} type="button" aria-pressed={estado === e.value} onClick={() => setEstado(e.value)}>{e.label}</button>
          ))}
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dlg-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{editando ? 'Guardar cambios' : 'Agregar al balance'}</button>
      </div>
    </form>
  );
};

// Lista para elegir tarjetas, créditos, suscripciones e ingresos de Debti.
const ElegirDeDebti = ({ grupos, onSubmit, onCancel, saving }) => {
  const [sel, setSel] = useState(() => new Set());
  const toggle = (k) => setSel(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const elegidos = grupos.flatMap(g => g.items).filter(i => sel.has(i.key));
  const vacio = grupos.every(g => g.items.length === 0);

  return (
    <div>
      {vacio && <p className="text-secondary" style={{ fontSize: 14 }}>No tienes tarjetas, créditos, suscripciones ni ingresos registrados en Debti.</p>}
      {grupos.filter(g => g.items.length).map(g => (
        <fieldset key={g.titulo} className="bal-pick">
          <legend className="reg-section">{g.titulo}</legend>
          {g.items.map(i => (
            <label key={i.key} className={`bal-pick-row ${i.ya ? 'disabled' : ''}`}>
              <input type="checkbox" checked={i.ya || sel.has(i.key)} disabled={i.ya} onChange={() => toggle(i.key)} />
              <span className="bal-pick-text"><strong>{i.nombre}</strong><span>{i.ya ? 'Ya está en este balance' : i.sub}</span></span>
              <b className="n">{fmt(i.monto)}</b>
            </label>
          ))}
        </fieldset>
      ))}
      <p className="form-hint" style={{ marginTop: 8 }}>Cada tarjeta trae el total de su extracto de este mes, el mismo de la pestaña Extracto. Si el banco dice otra cosa, edítalo después.</p>
      <div className="dlg-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={!elegidos.length || saving} onClick={() => onSubmit(elegidos)}>
          Agregar{elegidos.length ? ` ${elegidos.length}` : ''} al balance
        </button>
      </div>
    </div>
  );
};

// ── Página ────────────────────────────────────────────────────────────────────

export const Balance = () => {
  const [params, setParams] = useSearchParams();
  const hoy = new Date();
  const anio = Number(params.get('anio')) || hoy.getFullYear();
  const mes = Math.min(12, Math.max(1, Number(params.get('mes')) || hoy.getMonth() + 1));
  const mesNombre = MESES[mes - 1];
  const prev = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  const next = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
  const irA = (p) => setParams({ anio: String(p.anio), mes: String(p.mes) }, { replace: true });

  const [fuentes, setFuentes] = useState({ cards: [], credits: [], subs: [], incomes: [] });
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogo, setDialogo] = useState(null); // { modo: 'debti' | 'manual' | 'editar', fila? }

  useEffect(() => { BalanceService.fuentes().then(setFuentes); }, []);

  // `loaded` guarda qué mes terminó de cargar: al cambiar de mes se ve el
  // esqueleto; al recargar el mismo mes (tras guardar) no parpadea.
  const load = useCallback(() => {
    const key = `${anio}-${mes}`;
    return BalanceService.list(anio, mes)
      .then(d => { setItems(d); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoaded(key));
  }, [anio, mes]);
  useEffect(() => { load(); }, [load]);
  const loading = loaded !== `${anio}-${mes}`;

  const filas = useMemo(() => items.map(it => ({
    ...it,
    valor: montoFila(it, fuentes),
    huerfana: it.origen !== 'manual' && !fuenteDe(it, fuentes),
  })), [items, fuentes]);
  const ingresos = filas.filter(f => f.tipo === 'ingreso');
  const gastos = filas.filter(f => f.tipo === 'gasto');
  const resumen = useMemo(() => resumenBalance(filas), [filas]);

  // Elementos de Debti que se pueden agregar este mes (monto calculado para el mes).
  const grupos = useMemo(() => {
    const ya = new Set(items.filter(i => i.origen !== 'manual').map(i => `${i.origen}:${i.origenId}`));
    const item = (origen, f, nombre, sub, monto, categoria, tipo) => ({ key: `${origen}:${f.id}`, origen, origenId: f.id, nombre, sub, monto, categoria, tipo, ya: ya.has(`${origen}:${f.id}`) });
    return [
      { titulo: 'Ingresos', items: fuentes.incomes.filter(i => i.status === 'activo').map(i => item('ingreso', i, i.nombre, i.tipo === 'extra' ? 'Extra · solo cuenta el mes en que llegó' : `Fijo · llega el día ${i.diaCobro}`, incomeDueForMonth(i, anio, mes), i.tipo === 'extra' ? 'Ingresos extra' : 'Sueldo', 'ingreso')) },
      { titulo: 'Tarjetas', items: fuentes.cards.map(c => {
        const pago = cardPayMonth(c, anio, mes);
        return item('tarjeta', c, c.nombre, `${c.entidad || 'Tarjeta'} · extracto de ${mesNombre.toLowerCase()}, se paga el ${c.fechaPago} de ${MESES[pago.mes - 1].toLowerCase()}`, cardDueForMonth(c, anio, mes), 'Tarjetas', 'gasto');
      }) },
      { titulo: 'Créditos', items: fuentes.credits.filter(c => ['activo', 'en_mora'].includes(c.status)).map(c => item('credito', c, c.nombre, `${c.entidad || 'Crédito'} · cuota del mes`, creditDueForMonth(c, anio, mes), 'Créditos', 'gasto')) },
      // Las que se cobran a una tarjeta ya van dentro del pago de esa tarjeta.
      { titulo: 'Suscripciones', items: fuentes.subs.filter(s => s.status === 'activa' && !s.creditCardId).map(s => item('suscripcion', s, s.nombre, s.frecuencia === 'anual' ? 'Anual · solo el mes del cobro' : 'Mensual', subDueForMonth(s, anio, mes), 'Suscripciones', 'gasto')) },
    ];
  }, [fuentes, items, anio, mes, mesNombre]);

  const guardar = async (fn, okMsg) => {
    setSaving(true);
    try {
      await fn();
      setDialogo(null);
      if (okMsg) Swal.fire({ icon: 'success', title: okMsg });
      load();
    } catch (e) {
      Swal.fire({ icon: 'error', title: errMsg(e, 'No se pudo guardar. Intenta de nuevo.') });
    } finally {
      setSaving(false);
    }
  };

  const agregarDeDebti = (elegidos) => guardar(() => BalanceService.create(anio, mes, elegidos.map(e => ({
    tipo: e.tipo, descripcion: e.nombre, categoria: e.categoria, origen: e.origen, origenId: e.origenId,
  }))), elegidos.length === 1 ? 'Agregado al balance' : `${elegidos.length} agregados al balance`);

  const agregarManual = (data) => guardar(() => BalanceService.create(anio, mes, [data]), 'Agregado al balance');

  const editar = (data) => guardar(() => BalanceService.update(dialogo.fila.id, data), 'Cambios guardados');

  // Al marcar como pagado un monto automático se fija el valor del momento: el
  // cálculo de tarjetas solo mira cuotas pendientes y, una vez pagadas, bajaría.
  const cambiarEstado = async (fila, estado) => {
    const data = { estado };
    if (estado === 'pagado' && fila.monto == null && fila.valor > 0) data.monto = fila.valor;
    setItems(list => list.map(i => i.id === fila.id ? { ...i, ...data } : i));
    try { await BalanceService.update(fila.id, data); }
    catch (e) { Swal.fire({ icon: 'error', title: errMsg(e, 'No se pudo cambiar el estado.') }); load(); }
  };

  const quitar = async (fila) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Quitar "${fila.descripcion}" del balance?`,
      text: fila.origen === 'manual' ? 'Esta fila se borra de este mes.' : 'Solo se quita de este balance; no se borra de Debti.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: 'var(--neg-600)',
      cancelButtonText: 'Cancelar', confirmButtonText: 'Quitar',
    });
    if (!isConfirmed) return;
    try { await BalanceService.delete(fila.id); load(); }
    catch (e) { Swal.fire({ icon: 'error', title: errMsg(e, 'No se pudo quitar.') }); }
  };

  const copiarAnterior = () => guardar(() => BalanceService.copiarAnterior(anio, mes), `Copiado de ${MESES[prev.mes - 1].toLowerCase()}`);

  const empezarConIngresos = () => {
    const ing = grupos[0].items.filter(i => i.monto > 0);
    if (!ing.length) return setDialogo({ modo: 'debti' });
    agregarDeDebti(ing);
  };

  const header = (
    <div className="page-header bal-header">
      <div>
        <h1 className="page-title">Balance</h1>
        <p className="page-subtitle">Tus ingresos y pagos del mes, y cuánto te queda</p>
      </div>
      <div className="bal-month" role="group" aria-label="Mes del balance">
        <button className="icon-btn ghost sm" onClick={() => irA(prev)} aria-label={`Ver ${MESES[prev.mes - 1]} ${prev.anio}`}><ChevronLeft size={18} /></button>
        <span className="bal-month-label" aria-live="polite">{mesNombre} {anio}</span>
        <button className="icon-btn ghost sm" onClick={() => irA(next)} aria-label={`Ver ${MESES[next.mes - 1]} ${next.anio}`}><ChevronRight size={18} /></button>
      </div>
      {items.length > 0 && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="btn btn-primary"><Plus size={18} /> Agregar <ChevronDown size={16} /></button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="menu-content" align="end" sideOffset={4}>
              <DropdownMenu.Item className="menu-item" onSelect={() => setDialogo({ modo: 'debti' })}><Wallet size={16} /> Tarjeta, crédito o ingreso de Debti</DropdownMenu.Item>
              <DropdownMenu.Item className="menu-item" onSelect={() => setDialogo({ modo: 'manual' })}><Pencil size={16} /> Ingreso o pago adicional</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );

  const dialogTitle = dialogo?.modo === 'debti' ? `Agregar de Debti a ${mesNombre.toLowerCase()}`
    : dialogo?.modo === 'manual' ? 'Agregar ingreso o pago adicional' : 'Editar fila';
  const dialogs = (
    <Sheet open={!!dialogo} onOpenChange={(o) => !o && setDialogo(null)} title={dialogTitle}>
      {dialogo?.modo === 'debti' && <ElegirDeDebti grupos={grupos} onSubmit={agregarDeDebti} onCancel={() => setDialogo(null)} saving={saving} />}
      {dialogo?.modo === 'manual' && <FilaForm onSubmit={agregarManual} onCancel={() => setDialogo(null)} saving={saving} />}
      {dialogo?.modo === 'editar' && (
        <FilaForm
          fila={dialogo.fila}
          auto={dialogo.fila.origen !== 'manual' ? montoFila({ ...dialogo.fila, monto: null }, fuentes) : 0}
          onSubmit={editar} onCancel={() => setDialogo(null)} saving={saving}
        />
      )}
    </Sheet>
  );

  if (loading) return (
    <div aria-busy="true">{header}
      <div className="skeleton" style={{ height: 240, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
  if (error) return <div>{header}<LoadError onRetry={load} title="No se pudo cargar el balance" /></div>;

  if (items.length === 0) return (
    <div className="animate-fade-in">{header}
      <div className="card empty-state">
        <div className="empty-state-icon"><Wallet size={24} /></div>
        <p className="empty-state-title">Arma el balance de {mesNombre.toLowerCase()}</p>
        <p>Agrega tus ingresos, elige qué tarjetas y créditos pagas este mes y suma los pagos adicionales. Debti calcula cuánto te queda.</p>
        <div className="bal-empty-actions">
          <button className="btn btn-primary" onClick={empezarConIngresos} disabled={saving}><Plus size={16} /> Empezar con mis ingresos</button>
          <button className="btn btn-secondary" onClick={copiarAnterior} disabled={saving}><Copy size={16} /> Copiar {MESES[prev.mes - 1].toLowerCase()}</button>
          <button className="btn btn-text" onClick={() => setDialogo({ modo: 'manual' })}>Agregar una fila a mano</button>
        </div>
      </div>
      {dialogs}
    </div>
  );

  return (
    <div className="animate-fade-in">
      {header}
      <div className="bal-layout">
        <div className="stack" style={{ gap: 20 }}>
          <Seccion id="bal-ing" titulo="Ingresos" filas={ingresos} vacio="Sin ingresos este mes. Agrégalos con el botón Agregar."
            onEstado={cambiarEstado} onEdit={(f) => setDialogo({ modo: 'editar', fila: f })} onDelete={quitar} />
          <Seccion id="bal-gas" titulo="Pagos y gastos" filas={gastos} vacio="Sin pagos este mes. Agrega tus tarjetas, créditos o pagos adicionales."
            onEstado={cambiarEstado} onEdit={(f) => setDialogo({ modo: 'editar', fila: f })} onDelete={quitar} />
        </div>
        <Resumen r={resumen} mesNombre={mesNombre.toLowerCase()} />
      </div>
      {dialogs}
    </div>
  );
};
