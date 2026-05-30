import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReminderService } from '../services/reminderService';
import { SubscriptionService } from '../services/subscriptionService';
import { CreditCardService } from '../services/creditCardService';
import { BankCreditService } from '../services/bankCreditService';
import { ArrowLeft, Bell } from 'lucide-react';

export const ReminderNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingDebts, setLoadingDebts] = useState(true);
  const [error, setError] = useState('');
  const [debts, setDebts] = useState({ subscriptions: [], creditCards: [], bankCredits: [] });
  const [formData, setFormData] = useState({
    debtType: 'subscription',
    debtId: '',
    nombre: '',
    diasAnticipacion: '3',
  });

  useEffect(() => {
    const loadDebts = async () => {
      try {
        const [subs, cards, credits] = await Promise.all([
          SubscriptionService.getAll(),
          CreditCardService.getAll(),
          BankCreditService.getAll(),
        ]);
        setDebts({ subscriptions: subs, creditCards: cards, bankCredits: credits });
      } catch {
        setError('No se pudieron cargar las deudas disponibles.');
      } finally {
        setLoadingDebts(false);
      }
    };
    loadDebts();
  }, []);

  const debtTypeOptions = [
    { value: 'subscription', label: 'Suscripción' },
    { value: 'credit_card', label: 'Tarjeta de Crédito' },
    { value: 'bank_credit', label: 'Crédito Bancario' },
  ];

  const getDebtList = () => {
    if (formData.debtType === 'subscription') return debts.subscriptions;
    if (formData.debtType === 'credit_card') return debts.creditCards;
    return debts.bankCredits;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'debtType') {
      setFormData(prev => ({ ...prev, debtType: value, debtId: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.debtId) {
      setError('Debes seleccionar una deuda.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ReminderService.create({
        debtType: formData.debtType,
        debtId: Number(formData.debtId),
        nombre: formData.nombre,
        diasAnticipacion: Number(formData.diasAnticipacion),
      });
      navigate('/reminders');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear el recordatorio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/reminders')} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Bell size={20} style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-2xl m-0">Nuevo Recordatorio</h1>
        </div>
      </div>

      <div className="card">
        {error && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {loadingDebts ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Cargando deudas...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre del Recordatorio *</label>
              <input className="form-input" name="nombre" value={formData.nombre}
                onChange={handleChange} required placeholder="Ej: Pago Netflix, Cuota crédito..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Deuda *</label>
                <select className="form-input" name="debtType" value={formData.debtType} onChange={handleChange}>
                  {debtTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Deuda *</label>
                <select className="form-input" name="debtId" value={formData.debtId} onChange={handleChange} required>
                  <option value="">-- Seleccionar --</option>
                  {getDebtList().map(item => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {getDebtList().length === 0 && !loadingDebts && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginBottom: '0.75rem' }}>
                No hay {debtTypeOptions.find(o => o.value === formData.debtType)?.label.toLowerCase()}s registradas.
              </p>
            )}

            <div className="form-group">
              <label className="form-label">Días de Anticipación * (1-30)</label>
              <input className="form-input" type="number" name="diasAnticipacion" value={formData.diasAnticipacion}
                onChange={handleChange} required min="1" max="30" placeholder="3" />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Recibirás el recordatorio este número de días antes de la fecha de pago.
              </p>
            </div>

            <div className="flex justify-end gap-2" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/reminders')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : 'Crear Recordatorio'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
