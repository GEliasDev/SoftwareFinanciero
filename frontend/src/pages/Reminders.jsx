import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ReminderService } from '../services/reminderService';
import { Plus, Bell, Trash2, Calendar, Clock, BellRing, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { LoadError } from '../components/ui/LoadError';
import { fmtDateLong, daysUntil, urgencyStyle, parseLocalDate } from '../utils/format';

const DEBT_TYPE = {
  subscription: { label: 'Suscripción',        cls: 'badge badge-primary' },
  credit_card:  { label: 'Tarjeta de Crédito', cls: 'badge badge-warning' },
  bank_credit:  { label: 'Crédito Bancario',   cls: 'badge badge-danger'  },
};

const STATUS = {
  activo:    { label: 'Activo',    cls: 'badge badge-success' },
  pausado:   { label: 'Pausado',   cls: 'badge badge-neutral' },
  cancelado: { label: 'Cancelado', cls: 'badge badge-danger'  },
};

// parseLocalDate y no `new Date(str)`: el DATEONLY se parsea en UTC y en UTC-5
// retrocede un día, corriendo el conteo y el grupo (Hoy / 7 días / Más adelante).
const reminderDays = (r) => (r.fechaRecordatorio ? daysUntil(parseLocalDate(r.fechaRecordatorio)) : null);

const BUCKETS = [
  { key: 'hoy',      title: 'Hoy y vencidos', test: (d) => d !== null && d <= 0 },
  { key: 'semana',   title: 'Próximos 7 días', test: (d) => d !== null && d >= 1 && d <= 7 },
  { key: 'adelante', title: 'Más adelante',    test: (d) => d !== null && d > 7 },
  { key: 'sinfecha', title: 'Sin fecha',       test: (d) => d === null },
];

export const Reminders = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    ReminderService.getAll()
      .then(setReminders)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: '¿Eliminar este recordatorio?',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626', cancelButtonColor: '#64748B',
      confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try { await ReminderService.delete(id); load(); } catch { /* noop */ }
  };

  const activos   = reminders.filter(r => r.status === 'activo').length;
  const proximos7 = reminders.filter(r => { const d = reminderDays(r); return d !== null && d >= 0 && d <= 7; }).length;

  const buckets = useMemo(() => {
    const sorted = [...reminders].sort((a, b) => {
      const da = reminderDays(a), db = reminderDays(b);
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    return BUCKETS.map(b => ({ ...b, items: sorted.filter(r => b.test(reminderDays(r))) })).filter(b => b.items.length > 0);
  }, [reminders]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Recordatorios"
        subtitle="Tu agenda de alertas de pago, ordenada por urgencia"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/reminders/new')}>
            <Plus size={15} /> Nuevo Recordatorio
          </button>
        }
      />

      {!loading && !error && reminders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
          <StatCard label="Activos" value={`${activos}`} delta="en seguimiento" icon={CheckCircle2} tone="pos" />
          <StatCard label="Próximos 7 días" value={`${proximos7}`} delta="por vencer" icon={BellRing} tone={proximos7 > 0 ? 'warn' : 'neutral'} />
          <StatCard label="Total" value={`${reminders.length}`} delta="recordatorios" icon={Bell} tone="neutral" />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : error ? (
        <LoadError onRetry={load} title="No se pudieron cargar tus recordatorios" />
      ) : reminders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={24} /></div>
            <p className="empty-state-title">Sin recordatorios</p>
            <p>Configura alertas para no olvidar ningún pago importante.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/reminders/new')}>
              <Plus size={14} /> Crear recordatorio
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {buckets.map(bucket => (
            <div key={bucket.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 0.625rem 2px' }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{bucket.title}</h3>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{bucket.items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {bucket.items.map(reminder => {
                  const days = reminderDays(reminder);
                  const u = days !== null ? urgencyStyle(days) : null;
                  const debtInfo = DEBT_TYPE[reminder.debtType] || { label: reminder.debtType, cls: 'badge badge-neutral' };
                  const statusInfo = STATUS[reminder.status] || STATUS.activo;
                  return (
                    <div key={reminder.id} className="card" style={{ padding: '0.875rem 1.125rem', borderLeft: u ? `3px solid ${u.badge}` : '3px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', flexShrink: 0, background: u ? u.bg : 'var(--surface-2)', color: u ? u.color : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bell size={16} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reminder.nombre}</span>
                            <span className={debtInfo.cls}>{debtInfo.label}</span>
                            <span className={statusInfo.cls}>{statusInfo.label}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}>
                              <Clock size={10} /> {reminder.diasAnticipacion} días de anticipación
                            </span>
                            {reminder.proximaFechaPago && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}>
                                <Calendar size={10} /> Pago: {fmtDateLong(reminder.proximaFechaPago)}
                              </span>
                            )}
                          </div>
                        </div>

                        {days !== null && (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: u.color }}>
                              {days < 0 ? `Hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days}d`}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtDateLong(reminder.fechaRecordatorio)}</div>
                          </div>
                        )}

                        <button className="btn btn-ghost" style={{ flexShrink: 0, color: 'var(--text-3)' }} onClick={(e) => handleDelete(e, reminder.id)} title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
