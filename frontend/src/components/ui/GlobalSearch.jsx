import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CreditCard, Landmark, Repeat, Wallet, Handshake, Target } from 'lucide-react';
import api from '../../services/api';

const TYPE_META = {
  subscription:  { label: 'Suscripción',        Icon: Repeat,     color: '#D97706' },
  bank_credit:   { label: 'Crédito bancario',    Icon: Landmark,   color: '#DC2626' },
  credit_card:   { label: 'Tarjeta de crédito',  Icon: CreditCard, color: '#3B82F6' },
  income:        { label: 'Ingreso',             Icon: Wallet,     color: '#059669' },
  personal_debt: { label: 'Gasto',               Icon: Handshake,  color: '#7C3AED' },
  savings_goal:  { label: 'Meta de ahorro',      Icon: Target,     color: '#0EA5E9' },
};

export const GlobalSearch = ({ onClose }) => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive]   = useState(0);
  const [failed, setFailed]   = useState(false);
  const inputRef  = useRef(null);
  const timerRef  = useRef(null);
  const reqIdRef  = useRef(0);
  const navigate  = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2) { setResults([]); setFailed(false); return; }
    setLoading(true);
    setFailed(false);
    timerRef.current = setTimeout(async () => {
      // Secuencia por petición: con red lenta, la respuesta de una consulta
      // vieja podía llegar DESPUÉS de una nueva y pisar los resultados con
      // los del texto anterior. Solo se aplica la respuesta más reciente.
      const reqId = ++reqIdRef.current;
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        if (reqId !== reqIdRef.current) return;
        setResults(res.data);
        setActive(0);
      } catch {
        if (reqId !== reqIdRef.current) return;
        setResults([]);
        setFailed(true);
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const go = useCallback((route) => {
    onClose();
    navigate(route);
  }, [navigate, onClose]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && results[active]) go(results[active].route);
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '80px 16px 16px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 560, padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar tarjetas, créditos, suscripciones…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--text)', fontFamily: 'inherit',
            }}
          />
          {loading && <div className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0 }} />}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}
            aria-label="Cerrar búsqueda"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {results.map((r, i) => {
              const meta = TYPE_META[r.type] ?? { label: r.type, Icon: Search, color: 'var(--text-3)' };
              const { Icon } = meta;
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => go(r.route)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '10px 16px', border: 'none',
                    background: i === active ? 'var(--surface-2)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: `${meta.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} style={{ color: meta.color }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }} className="truncate">{r.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{meta.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Error de búsqueda — distinto de "no hay resultados" */}
        {query.length >= 2 && !loading && failed && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--neg-600)' }}>No se pudo buscar. Revisa tu conexión.</p>
          </div>
        )}

        {/* Empty */}
        {query.length >= 2 && !loading && !failed && results.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Sin resultados para "{query}"</p>
          </div>
        )}

        {/* Hint */}
        {query.length < 2 && (
          <div style={{ padding: '14px 16px', display: 'flex', gap: 16 }}>
            {['↑↓ navegar', '↵ abrir', 'Esc cerrar'].map(h => (
              <span key={h} style={{ fontSize: 11, color: 'var(--text-3)' }}>{h}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
