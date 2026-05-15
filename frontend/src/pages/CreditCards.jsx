import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { CreditCardService } from '../services/creditCardService';
import { Plus, Edit, Trash2, CreditCard as CardIcon } from 'lucide-react';

export const CreditCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', franchise: '', lastFourDigits: '', limit: '', cutOffDay: '', paymentDay: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const data = await CreditCardService.getAll();
      setCards(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item._id);
      setFormData({
        name: item.name,
        franchise: item.franchise,
        lastFourDigits: item.lastFourDigits,
        limit: item.limit,
        cutOffDay: item.cutOffDay,
        paymentDay: item.paymentDay
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', franchise: '', lastFourDigits: '', limit: '', cutOffDay: '', paymentDay: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await CreditCardService.update(editingId, formData);
      } else {
        await CreditCardService.create(formData);
      }
      setIsModalOpen(false);
      fetchCards();
    } catch (error) {
      console.error(error);
      alert('Error al guardar tarjeta');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar tarjeta de crédito?')) {
      try {
        await CreditCardService.delete(id);
        fetchCards();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl m-0">Tarjetas de Crédito</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nueva Tarjeta
        </Button>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {loading ? <p className="text-muted">Cargando...</p> : (
          cards.map(card => (
            <Card key={card._id} style={{ 
              background: 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)',
              border: '1px solid rgba(255,255,255,0.1)' 
            }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold tracking-wider mb-1">{card.name}</h3>
                  <p className="text-muted text-sm">{card.franchise}</p>
                </div>
                <CardIcon size={32} className="text-primary" />
              </div>
              
              <div className="mb-6 font-mono text-xl tracking-widest text-gray-300">
                **** **** **** {card.lastFourDigits}
              </div>

              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-muted text-xs uppercase mb-1">Límite</p>
                  <p className="font-semibold">${card.limit?.toLocaleString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-muted text-xs uppercase mb-1">Corte</p>
                  <p className="font-semibold">{card.cutOffDay}</p>
                </div>
                <div>
                  <p className="text-muted text-xs uppercase mb-1">Pago</p>
                  <p className="font-semibold text-danger">{card.paymentDay}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-700">
                <Button variant="secondary" onClick={() => handleOpenModal(card)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Editar</Button>
                <Button variant="danger" onClick={() => handleDelete(card._id)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Eliminar</Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Tarjeta' : 'Nueva Tarjeta'} footer={
        <>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </>
      }>
        <Input label="Nombre (Alias)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Tarjeta Principal" />
        <Input label="Franquicia" value={formData.franchise} onChange={e => setFormData({...formData, franchise: e.target.value})} placeholder="Visa, Mastercard..." />
        <Input label="Últimos 4 dígitos" type="text" maxLength={4} value={formData.lastFourDigits} onChange={e => setFormData({...formData, lastFourDigits: e.target.value})} />
        <Input label="Cupo (Límite)" type="number" value={formData.limit} onChange={e => setFormData({...formData, limit: Number(e.target.value)})} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Día de Corte" type="number" min="1" max="31" value={formData.cutOffDay} onChange={e => setFormData({...formData, cutOffDay: Number(e.target.value)})} />
          <Input label="Día de Pago" type="number" min="1" max="31" value={formData.paymentDay} onChange={e => setFormData({...formData, paymentDay: Number(e.target.value)})} />
        </div>
      </Modal>
    </div>
  );
};
