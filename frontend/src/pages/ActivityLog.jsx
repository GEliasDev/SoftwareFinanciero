import { useState, useEffect } from 'react';
import { ActivityLogService } from '../services/activityLogService';
import { PageHeader } from '../components/ui/PageHeader';
import {
  CreditCard, Landmark, Repeat, Bell, Wallet, Handshake, Target,
  PlusCircle, Edit2, Trash2, DollarSign, Activity,
} from 'lucide-react';
import { fmt } from '../utils/format';

const ACTION_META = {
  created: { label: 'Creado',      color: 'var(--pos-600)',    bg: 'var(--pos-50)',    Icon: PlusCircle  },
  updated: { label: 'Actualizado', color: 'var(--brand-600)',  bg: 'var(--brand-50)',  Icon: Edit2       },
  deleted: { label: 'Eliminado',   color: 'var(--neg-600)',    bg: 'var(--neg-50)',    Icon: Trash2      },
  paid:    { label: 'Pagado',      color: 'var(--pos-600)',    bg: 'var(--pos-50)',    Icon: DollarSign  },
};

const ENTITY_META = {
  credit_card:   { label: 'Tarjeta de crédito', Icon: CreditCard },
  bank_credit:   { label: 'Crédito bancario',   Icon: Landmark   },
  subscription:  { label: 'Suscripción',         Icon: Repeat     },
  reminder:      { label: 'Recordatorio',        Icon: Bell       },
  income:        { label: 'Ingreso',             Icon: Wallet     },
  personal_debt: { label: 'Obligación personal', Icon: Handshake  },
  savings_goal:  { label: 'Meta de ahorro',      Icon: Target     },
};

const groupByDate = (logs) => {
  const groups = {};
  for (const log of logs) {
    const d = new Date(log.createdAt);
    const key = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  return Object.entries(groups);
};

const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

export const ActivityLog = () => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit,   setLimit]   = useState(50);

  useEffect(() => {
    setLoading(true);
    ActivityLogService.getRecent(limit)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [limit]);

  const grouped = groupByDate(logs);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Historial de actividad"
        subtitle="Registro de las acciones realizadas en tu cuenta"
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Activity size={26} /></div>
            <p className="empty-state-title">Sin actividad registrada</p>
            <p>Las acciones que realices en la app aparecerán aquí.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {grouped.map(([date, entries]) => (
            <div key={date}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.625rem', paddingLeft: 4 }}>
                {date.charAt(0).toUpperCase() + date.slice(1)}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {entries.map(log => {
                  const action = ACTION_META[log.action] ?? { label: log.action, color: 'var(--text-2)', bg: 'var(--surface-2)', Icon: Activity };
                  const entity = ENTITY_META[log.entityType] ?? { label: log.entityType, Icon: Activity };
                  const { Icon: ActionIcon } = action;
                  const { Icon: EntityIcon } = entity;
                  const amount = log.meta?.monto ?? log.meta?.amount ?? null;
                  return (
                    <div key={log.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                    }}>
                      {/* Action icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ActionIcon size={14} style={{ color: action.color }} />
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <EntityIcon size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entity.label}</span>
                          <span style={{ fontSize: 10, color: action.color, fontWeight: 700, background: action.bg, borderRadius: 20, padding: '1px 6px' }}>{action.label}</span>
                        </div>
                        <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{log.entityName}</p>
                      </div>
                      {/* Amount + time */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {amount != null && (
                          <p className="tabular" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{fmt(parseFloat(amount))}</p>
                        )}
                        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{timeLabel(log.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {logs.length >= limit && (
            <button className="btn btn-secondary" style={{ alignSelf: 'center' }} onClick={() => setLimit(l => l + 50)}>
              Cargar más
            </button>
          )}
        </div>
      )}
    </div>
  );
};
