import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardInboxService } from '../services/cardInboxService';
import { CreditCardService } from '../services/creditCardService';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadError } from '../components/ui/LoadError';
import { Inbox, RefreshCw, Check, X } from 'lucide-react';
import { fmt, parseLocalDate } from '../utils/format';
import { CATEGORIES } from '../utils/creditCard';
import Swal from 'sweetalert2';

const TIPO_LABEL = { compra: 'Compra', avance: 'Avance', pago: 'Pago de tarjeta' };

const fechaCorta = (iso) => parseLocalDate(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

const Row = ({ item, cards, onDone }) => {
  const [cardId, setCardId] = useState(item.creditCardId ?? '');
  const [cuotas, setCuotas] = useState(item.numeroCuotas ?? 1);
  const [categoria, setCategoria] = useState('otros');
  const [busy, setBusy] = useState(false);

  const esCompra = item.tipo === 'compra';
  const esPago = item.tipo === 'pago';

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) Swal.fire({ icon: 'success', title: okMsg, timer: 1200, showConfirmButton: false });
      onDone();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo completar', text: err.response?.data?.message || 'Intenta de nuevo', confirmButtonColor: 'var(--brand-600)' });
      setBusy(false);
    }
  };

  const approve = () => run(() => CardInboxService.approve(item.id, {
    ...(cardId ? { creditCardId: Number(cardId) } : {}),
    ...(esCompra ? { numeroCuotas: Number(cuotas), categoria } : {}),
  }), 'Movimiento registrado');

  return (
    <div className="card" style={{ padding: '14px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: 0 }}>
            {item.comercio || TIPO_LABEL[item.tipo]}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
            {TIPO_LABEL[item.tipo]} · {fechaCorta(item.fechaMovimiento)}
            {item.tipo === 'avance' && item.numeroCuotas ? ` · ${item.numeroCuotas} cuotas` : ''}
          </p>
        </div>
        <span className="tabular" style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{fmt(item.monto)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        {!esPago && (
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor={`card-${item.id}`}>Tarjeta</label>
            <select id={`card-${item.id}`} className="form-input" value={cardId} onChange={e => setCardId(e.target.value)}>
              <option value="">Elegir tarjeta…</option>
              {cards.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.ultimos4 ? ` ····${c.ultimos4}` : ''}</option>)}
            </select>
          </div>
        )}
        {esCompra && (
          <>
            <div className="form-group" style={{ margin: 0, width: 90 }}>
              <label className="form-label" htmlFor={`cuotas-${item.id}`}>Cuotas</label>
              <input id={`cuotas-${item.id}`} className="form-input" type="number" min={1} max={36} value={cuotas}
                onChange={e => setCuotas(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor={`cat-${item.id}`}>Categoría</label>
              <select id={`cat-${item.id}`} className="form-input" value={categoria} onChange={e => setCategoria(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {esPago ? (
            <button className="btn btn-secondary" disabled={busy} onClick={() => run(() => CardInboxService.discard(item.id))}>
              <Check size={14} /> Marcar como visto
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" disabled={busy} onClick={() => run(() => CardInboxService.discard(item.id))}>
                <X size={14} /> Descartar
              </button>
              <button className="btn btn-primary" disabled={busy || !cardId} onClick={approve}>
                <Check size={14} /> Aprobar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const CardInbox = () => {
  const [items, setItems] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([CardInboxService.list(), CreditCardService.getAll()])
      .then(([pend, tarjetas]) => { setItems(pend); setCards(tarjetas.filter(c => c.status === 'activa')); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      const { nuevos } = await CardInboxService.sync();
      await Swal.fire({ icon: 'success', title: nuevos ? `${nuevos} movimiento${nuevos !== 1 ? 's' : ''} nuevo${nuevos !== 1 ? 's' : ''}` : 'No hay movimientos nuevos', timer: 1500, showConfirmButton: false });
      load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo sincronizar', text: err.response?.data?.message || 'Revisa la conexión con Gmail en tu perfil.', confirmButtonColor: 'var(--brand-600)' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Movimientos por aprobar"
        subtitle="Alertas de tus tarjetas detectadas en Gmail"
        actions={
          <button className="btn btn-secondary" onClick={sync} disabled={syncing}>
            <RefreshCw size={14} /> {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : error ? (
        <LoadError onRetry={load} title="No se pudieron cargar los movimientos" />
      ) : items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Inbox size={24} /></div>
            <p className="empty-state-title">No hay movimientos pendientes</p>
            <p>Conecta Gmail en tu <Link to="/profile">perfil</Link> y las compras de tus tarjetas aparecerán aquí para aprobarlas.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => <Row key={item.id} item={item} cards={cards} onDone={load} />)}
        </div>
      )}
    </div>
  );
};
