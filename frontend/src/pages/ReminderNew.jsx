import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReminderService } from '../services/reminderService';
import { SubscriptionService } from '../services/subscriptionService';
import { CreditCardService } from '../services/creditCardService';
import { BankCreditService } from '../services/bankCreditService';
import { ArrowLeft, Bell, Info, Repeat, CreditCard, Landmark } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';

const DEBT_META = {
  subscription: { label: 'Suscripción', Icon: Repeat },
  credit_card:  { label: 'Tarjeta de Crédito', Icon: CreditCard },
  bank_credit:  { label: 'Crédito Bancario', Icon: Landmark },
};

export const ReminderNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingDebts, setLoadingDebts] = useState(true);
  const [error, setError] = useState('');
  const [debts, setDebts] = useState({ subscriptions: [], creditCards: [], bankCredits: [] });
  const [formData, setFormData] = useState({ debtType: 'subscription', debtId: '', nombre: '', diasAnticipacion: '3' });

  useEffect(() => {
    Promise.all([SubscriptionService.getAll(), CreditCardService.getAll(), BankCreditService.getAll()])
      .then(([subs, cards, credits]) => setDebts({ subscriptions: subs, creditCards: cards, bankCredits: credits }))
      .catch(() => setError('No se pudieron cargar las deudas disponibles.'))
      .finally(() => setLoadingDebts(false));
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
    if (name === 'debtType') setFormData(prev => ({ ...prev, debtType: value, debtId: '' }));
    else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.debtId) { setError('Debes seleccionar una deuda.'); return; }
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

  const meta = DEBT_META[formData.debtType];
  const selectedDebt = getDebtList().find(d => String(d.id) === String(formData.debtId));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nuevo Recordatorio"
        subtitle="Configura una alerta para no olvidar un pago"
        back={<button onClick={() => navigate('/reminders')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>}
      />

      {error && <div className="info-box danger" style={{ marginBottom: '1rem' }}><Info size={14} />{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Preview */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <div style={{ borderRadius: 16, background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 100%)', padding: '1.5rem', color: 'white', boxShadow: '0 16px 40px rgba(91,77,241,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <Bell size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formData.nombre || 'Tu recordatorio'}</div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
              Te avisaremos <strong>{formData.diasAnticipacion || '—'} día{Number(formData.diasAnticipacion) !== 1 ? 's' : ''}</strong> antes del pago
              {selectedDebt ? <> de <strong>{selectedDebt.nombre}</strong></> : <> de la {meta?.label.toLowerCase()} seleccionada</>}.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: '1rem', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
              {meta && <meta.Icon size={13} />} {meta?.label}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: '1.75rem' }}>
          {loadingDebts ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>Cargando deudas...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre del recordatorio *</label>
                <input className="form-input" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej: Pago Netflix, Cuota crédito..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Tipo de deuda *</label>
                  <select className="form-input" name="debtType" value={formData.debtType} onChange={handleChange}>
                    {debtTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deuda *</label>
                  <select className="form-input" name="debtId" value={formData.debtId} onChange={handleChange} required>
                    <option value="">-- Seleccionar --</option>
                    {getDebtList().map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </div>
              </div>

              {getDebtList().length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--color-warning)', marginBottom: '0.75rem' }}>
                  No hay {debtTypeOptions.find(o => o.value === formData.debtType)?.label.toLowerCase()}s registradas.
                </p>
              )}

              <div className="form-group" style={{ maxWidth: 280 }}>
                <label className="form-label">Días de anticipación * (1–30)</label>
                <input className="form-input" type="number" name="diasAnticipacion" value={formData.diasAnticipacion} onChange={handleChange} required min="1" max="30" placeholder="3" />
                <p className="form-hint">Cuántos días antes del pago quieres el aviso.</p>
              </div>

              <div className="flex justify-end gap-2" style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/reminders')}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Crear recordatorio'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
