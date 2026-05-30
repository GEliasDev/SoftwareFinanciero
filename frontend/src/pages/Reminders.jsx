import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReminderService } from '../services/reminderService';
import { Plus, Bell, Trash2, Calendar, Clock } from 'lucide-react';

const DEBT_TYPE = {
  subscription: { label: 'Suscripción',       cls: 'badge badge-primary' },
  credit_card:  { label: 'Tarjeta de Crédito', cls: 'badge badge-warning' },
  bank_credit:  { label: 'Crédito Bancario',   cls: 'badge badge-danger'  },
};

const STATUS = {
  activo:    { label: 'Activo',    cls: 'badge badge-success' },
  pausado:   { label: 'Pausado',   cls: 'badge badge-neutral' },
  cancelado: { label: 'Cancelado', cls: 'badge badge-danger'  },
};

const fmtDate = (str) => {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isNearDate = (str) => {
  if (!str) return false;
  const diff = new Date(str) - Date.now();
  return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
};

export const Reminders = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    ReminderService.getAll()
      .then(setReminders)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este recordatorio?')) return;
    try { await ReminderService.delete(id); load(); } catch {}
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Recordatorios</h1>
        <button className="btn btn-primary" onClick={() => navigate('/reminders/new')}>
          <Plus size={15} /> Nuevo Recordatorio
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : reminders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={24} /></div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin recordatorios</p>
            <p>Configura alertas para no olvidar ningún pago importante.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/reminders/new')}>
              <Plus size={14} /> Crear recordatorio
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {reminders.map(reminder => {
            const near = isNearDate(reminder.fechaRecordatorio);
            const debtInfo   = DEBT_TYPE[reminder.debtType]  || { label: reminder.debtType, cls: 'badge badge-neutral' };
            const statusInfo = STATUS[reminder.status]        || STATUS.activo;
            return (
              <div
                key={reminder.id}
                className="card"
                style={{
                  padding: '1rem 1.25rem',
                  borderLeft: near ? '3px solid var(--color-warning)' : '3px solid transparent',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  {/* Icono */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    background: near ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                    color: near ? 'var(--color-warning)' : 'var(--color-success)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bell size={16} />
                  </div>

                  {/* Contenido */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {reminder.nombre}
                      </span>
                      <span className={debtInfo.cls}>{debtInfo.label}</span>
                      <span className={statusInfo.cls}>{statusInfo.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 12, color: 'var(--color-text-muted)' }}>
                        <Clock size={10} />
                        <span>{reminder.diasAnticipacion} días de anticipación</span>
                      </div>
                      {reminder.proximaFechaPago && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 12, color: 'var(--color-text-muted)' }}>
                          <Calendar size={10} />
                          <span>Próximo pago: {fmtDate(reminder.proximaFechaPago)}</span>
                        </div>
                      )}
                      {reminder.fechaRecordatorio && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 12, color: near ? 'var(--color-warning)' : 'var(--color-text-muted)', fontWeight: near ? 600 : 400 }}>
                          <Bell size={10} />
                          <span>{near ? '⚠ ' : ''}Recordatorio: {fmtDate(reminder.fechaRecordatorio)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acción */}
                  <button
                    className="btn btn-ghost"
                    style={{ flexShrink: 0, color: 'var(--color-text-muted)' }}
                    onClick={(e) => handleDelete(e, reminder.id)}
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
