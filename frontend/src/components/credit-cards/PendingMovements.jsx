import { useState } from 'react';
import { RefreshCw, Check, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { CardInboxService } from '../../services/cardInboxService';
import { fmt, parseLocalDate } from '../../utils/format';
import { CATEGORIES } from '../../utils/creditCard';

const TIPO_LABEL = { compra: 'Compra', avance: 'Avance', pago: 'Pago de tarjeta' };

const fechaCorta = (iso) => parseLocalDate(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Valores editables de un movimiento: lo que el usuario cambió o, si no, lo que trajo el correo.
const valoresDe = (item, edit = {}) => ({
    cardId: edit.cardId ?? item.creditCardId ?? '',
    cuotas: edit.cuotas ?? item.numeroCuotas ?? 1,
    categoria: edit.categoria ?? 'otros',
});

// Cuerpo que se envía al aprobar (los pagos no se aprueban; el avance toma sus cuotas del correo).
const ajustesDe = (item, v) => ({
    ...(v.cardId ? { creditCardId: Number(v.cardId) } : {}),
    ...(item.tipo === 'compra' ? { numeroCuotas: Number(v.cuotas), categoria: v.categoria } : {}),
});

// Un movimiento detectado en Gmail. Con `cards` muestra el selector de tarjeta (movimientos sin tarjeta
// asignada); sin `cards` el movimiento se aprueba contra la tarjeta que ya tiene.
const PendingRow = ({ item, cards, valores, onChange, selected, onToggle, busy, onApprove, onDiscard }) => {
  const esCompra = item.tipo === 'compra';
  const esPago = item.tipo === 'pago';

  return (
    <div className="card" style={{ padding: '14px 20px', outline: selected ? '2px solid var(--brand-600)' : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={selected} onChange={onToggle} disabled={busy}
            aria-label={`Seleccionar ${item.comercio || TIPO_LABEL[item.tipo]}`} style={{ marginTop: 4 }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: 0 }}>
              {item.comercio || TIPO_LABEL[item.tipo]}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              {TIPO_LABEL[item.tipo]} · {fechaCorta(item.fechaMovimiento)}
              {item.tipo === 'avance' && item.numeroCuotas ? ` · ${item.numeroCuotas} cuotas` : ''}
            </p>
          </div>
        </div>
        <span className="tabular" style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{fmt(item.monto)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        {!esPago && cards && (
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor={`card-${item.id}`}>Tarjeta</label>
            <select id={`card-${item.id}`} className="form-input" value={valores.cardId} onChange={e => onChange({ cardId: e.target.value })}>
              <option value="">Elegir tarjeta…</option>
              {cards.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.ultimos4 ? ` ····${c.ultimos4}` : ''}</option>)}
            </select>
          </div>
        )}
        {esCompra && (
          <>
            <div className="form-group" style={{ margin: 0, width: 110 }}>
              <label className="form-label" htmlFor={`cuotas-${item.id}`}>Cuotas{item.numeroCuotas ? ' (del correo)' : ''}</label>
              <input id={`cuotas-${item.id}`} className="form-input" type="number" min={1} max={36} value={valores.cuotas}
                onChange={e => onChange({ cuotas: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor={`cat-${item.id}`}>Categoría</label>
              <select id={`cat-${item.id}`} className="form-input" value={valores.categoria} onChange={e => onChange({ categoria: e.target.value })}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {esPago ? (
            <button className="btn btn-secondary" disabled={busy} onClick={onDiscard}>
              <Check size={14} /> Marcar como visto
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" disabled={busy} onClick={onDiscard}>
                <X size={14} /> Descartar
              </button>
              <button className="btn btn-primary" disabled={busy || !valores.cardId} onClick={onApprove}>
                <Check size={14} /> Aprobar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Lista de movimientos con selección y acciones masivas. Es dueña de lo que el usuario edita en cada fila
// (tarjeta, cuotas, categoría) para que "Aprobar seleccionados" use esos mismos valores.
export const PendingList = ({ items, cards, onDone }) => {
  const [edits, setEdits] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);

  const valores = (item) => valoresDe(item, edits[item.id]);
  const cambiar = (id, patch) => setEdits(e => ({ ...e, [id]: { ...e[id], ...patch } }));
  const alternar = (id) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const elegidos = items.filter(i => selected.has(i.id));
  const todos = items.length > 0 && elegidos.length === items.length;

  const errorDe = (err) => err.response?.data?.message || 'Intenta de nuevo';

  const individual = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) Swal.fire({ icon: 'success', title: okMsg, timer: 1200, showConfirmButton: false });
      onDone();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo completar', text: errorDe(err), confirmButtonColor: 'var(--brand-600)' });
    } finally {
      setBusy(false);
    }
  };

  // Uno por uno (no en paralelo): cada aprobación mueve el cupo de la tarjeta.
  const masivo = async (lista, accion) => {
    let ok = 0;
    let fallaron = 0;
    for (const item of lista) {
      try { await accion(item); ok += 1; } catch { fallaron += 1; }
    }
    return { ok, fallaron };
  };

  const aprobarSeleccionados = async () => {
    const aprobables = elegidos.filter(i => i.tipo !== 'pago');
    const conTarjeta = aprobables.filter(i => valores(i).cardId);
    const omitidos = elegidos.length - conTarjeta.length;
    if (conTarjeta.length === 0) {
      Swal.fire({ icon: 'info', title: 'Nada que aprobar', text: 'Los pagos solo se descartan, y cada compra necesita una tarjeta.', confirmButtonColor: 'var(--brand-600)' });
      return;
    }
    const total = conTarjeta.reduce((s, i) => s + Number(i.monto), 0);
    const { isConfirmed } = await Swal.fire({
      icon: 'question', title: `Aprobar ${plural(conTarjeta.length, 'movimiento', 'movimientos')}`,
      html: `Se registrarán por <b>${fmt(total)}</b> con las cuotas y categorías que ves en cada fila.${omitidos ? `<br/><span style="color:#64748b;font-size:0.85rem">${plural(omitidos, 'seleccionado se omite', 'seleccionados se omiten')} (pagos o sin tarjeta).</span>` : ''}`,
      showCancelButton: true, confirmButtonText: 'Aprobar', cancelButtonText: 'Cancelar', confirmButtonColor: 'var(--brand-600)',
    });
    if (!isConfirmed) return;

    setBusy(true);
    const { ok, fallaron } = await masivo(conTarjeta, (i) => CardInboxService.approve(i.id, ajustesDe(i, valores(i))));
    setBusy(false);
    setSelected(new Set());
    await Swal.fire({
      icon: fallaron ? 'warning' : 'success',
      title: fallaron ? 'Aprobación parcial' : 'Movimientos registrados',
      text: `${plural(ok, 'aprobado', 'aprobados')}${fallaron ? `, ${plural(fallaron, 'falló', 'fallaron')}` : ''}${omitidos ? `, ${plural(omitidos, 'omitido', 'omitidos')}` : ''}.`,
      confirmButtonColor: 'var(--brand-600)',
    });
    onDone();
  };

  const descartarSeleccionados = async () => {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning', title: `Descartar ${plural(elegidos.length, 'movimiento', 'movimientos')}`,
      text: 'No se registrarán en tu tarjeta. Esta acción no se puede deshacer.',
      showCancelButton: true, confirmButtonText: 'Descartar', cancelButtonText: 'Cancelar', confirmButtonColor: '#DC2626',
    });
    if (!isConfirmed) return;

    setBusy(true);
    const { ok, fallaron } = await masivo(elegidos, (i) => CardInboxService.discard(i.id));
    setBusy(false);
    setSelected(new Set());
    await Swal.fire({
      icon: fallaron ? 'warning' : 'success',
      title: fallaron ? 'Descarte parcial' : 'Movimientos descartados',
      text: `${plural(ok, 'descartado', 'descartados')}${fallaron ? `, ${plural(fallaron, 'falló', 'fallaron')}` : ''}.`,
      confirmButtonColor: 'var(--brand-600)',
    });
    onDone();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={todos} disabled={busy}
            onChange={() => setSelected(todos ? new Set() : new Set(items.map(i => i.id)))} />
          Seleccionar todos ({items.length})
        </label>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button className="btn btn-secondary" disabled={busy || elegidos.length === 0} onClick={descartarSeleccionados}>
            <X size={14} /> Descartar seleccionados ({elegidos.length})
          </button>
          <button className="btn btn-primary" disabled={busy || elegidos.length === 0} onClick={aprobarSeleccionados}>
            <Check size={14} /> Aprobar seleccionados ({elegidos.length})
          </button>
        </div>
      </div>

      {items.map(item => (
        <PendingRow
          key={item.id} item={item} cards={cards} valores={valores(item)} busy={busy}
          selected={selected.has(item.id)} onToggle={() => alternar(item.id)}
          onChange={(patch) => cambiar(item.id, patch)}
          onApprove={() => individual(() => CardInboxService.approve(item.id, ajustesDe(item, valores(item))), 'Movimiento registrado')}
          onDiscard={() => individual(() => CardInboxService.discard(item.id))}
        />
      ))}
    </div>
  );
};

// Lee ahora los correos nuevos de todas las tarjetas (el job también lo hace solo cada 15 min).
export const SyncButton = ({ onDone }) => {
  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    setSyncing(true);
    try {
      const { nuevos } = await CardInboxService.sync();
      await Swal.fire({ icon: 'success', title: nuevos ? `${nuevos} movimiento${nuevos !== 1 ? 's' : ''} nuevo${nuevos !== 1 ? 's' : ''}` : 'No hay movimientos nuevos', timer: 1500, showConfirmButton: false });
      onDone();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo sincronizar', text: err.response?.data?.message || 'Revisa la conexión con Gmail en tu perfil.', confirmButtonColor: 'var(--brand-600)' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button className="btn btn-secondary" onClick={sync} disabled={syncing}>
      <RefreshCw size={14} /> {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
    </button>
  );
};
