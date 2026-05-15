import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SubscriptionService } from '../services/subscriptionService';
import { Plus, Edit, Trash2 } from 'lucide-react';

export const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', cost: '', billingCycle: 'monthly', nextRenewalDate: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await SubscriptionService.getAll();
      setSubscriptions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenModal = (sub = null) => {
    if (sub) {
      setEditingId(sub._id);
      setFormData({
        name: sub.name,
        cost: sub.cost,
        billingCycle: sub.billingCycle,
        nextRenewalDate: sub.nextRenewalDate.split('T')[0]
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', cost: '', billingCycle: 'monthly', nextRenewalDate: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await SubscriptionService.update(editingId, formData);
      } else {
        await SubscriptionService.create(formData);
      }
      setIsModalOpen(false);
      fetchSubscriptions();
    } catch (error) {
      console.error(error);
      alert('Error al guardar suscripción');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta suscripción?')) {
      try {
        await SubscriptionService.delete(id);
        fetchSubscriptions();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl m-0">Suscripciones</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nueva Suscripción
        </Button>
      </div>

      <Card>
        {loading ? (
          <p className="text-center text-muted">Cargando...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="p-4 text-muted font-semibold">Nombre</th>
                  <th className="p-4 text-muted font-semibold">Costo</th>
                  <th className="p-4 text-muted font-semibold">Ciclo</th>
                  <th className="p-4 text-muted font-semibold">Próxima Renovación</th>
                  <th className="p-4 text-muted font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr><td colSpan="5" className="p-4 text-center text-muted">No hay suscripciones registradas.</td></tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="p-4 font-semibold">{sub.name}</td>
                      <td className="p-4">${sub.cost.toLocaleString('es-CO')}</td>
                      <td className="p-4" style={{ textTransform: 'capitalize' }}>{sub.billingCycle}</td>
                      <td className="p-4">{new Date(sub.nextRenewalDate).toLocaleDateString()}</td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => handleOpenModal(sub)} style={{ padding: '0.5rem' }}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="danger" onClick={() => handleDelete(sub._id)} style={{ padding: '0.5rem' }}>
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Suscripción' : 'Nueva Suscripción'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </>
        }
      >
        <Input 
          label="Nombre" 
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})} 
        />
        <Input 
          label="Costo" 
          type="number" 
          value={formData.cost} 
          onChange={e => setFormData({...formData, cost: Number(e.target.value)})} 
        />
        <div className="form-group">
          <label className="form-label">Ciclo de Facturación</label>
          <select 
            className="form-input" 
            value={formData.billingCycle} 
            onChange={e => setFormData({...formData, billingCycle: e.target.value})}
          >
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </select>
        </div>
        <Input 
          label="Fecha de Próxima Renovación" 
          type="date" 
          value={formData.nextRenewalDate} 
          onChange={e => setFormData({...formData, nextRenewalDate: e.target.value})} 
        />
      </Modal>
    </div>
  );
};
