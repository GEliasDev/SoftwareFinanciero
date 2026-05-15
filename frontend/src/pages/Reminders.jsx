import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ReminderService } from '../services/reminderService';
import { Plus, Edit, Trash2 } from 'lucide-react';

export const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', date: '', type: 'other', isCompleted: false });
  const [editingId, setEditingId] = useState(null);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const data = await ReminderService.getAll();
      setReminders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item._id);
      setFormData({
        title: item.title,
        description: item.description || '',
        date: item.date.split('T')[0],
        type: item.type,
        isCompleted: item.isCompleted
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', description: '', date: '', type: 'other', isCompleted: false });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await ReminderService.update(editingId, formData);
      } else {
        await ReminderService.create(formData);
      }
      setIsModalOpen(false);
      fetchReminders();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el recordatorio');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar recordatorio?')) {
      try {
        await ReminderService.delete(id);
        fetchReminders();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const toggleComplete = async (reminder) => {
    try {
      await ReminderService.update(reminder._id, { isCompleted: !reminder.isCompleted });
      fetchReminders();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl m-0">Recordatorios</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nuevo
        </Button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {loading ? <p className="text-muted">Cargando...</p> : (
          reminders.map(reminder => (
            <Card key={reminder._id} className={reminder.isCompleted ? 'opacity-50' : ''} headerActions={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleOpenModal(reminder)} style={{ padding: '0.25rem' }}><Edit size={14}/></Button>
                <Button variant="danger" onClick={() => handleDelete(reminder._id)} style={{ padding: '0.25rem' }}><Trash2 size={14}/></Button>
              </div>
            }>
              <div className="flex justify-between mb-2 border-b border-gray-700 pb-2">
                <h3 className={`font-bold ${reminder.isCompleted ? 'line-through text-muted' : ''}`}>{reminder.title}</h3>
                <span className="text-xs px-2 py-1 bg-blue-900 rounded-full text-blue-200">{reminder.type}</span>
              </div>
              <p className="text-sm text-muted mb-4">{reminder.description}</p>
              <div className="flex justify-between items-center mt-auto">
                <span className={`text-sm ${new Date(reminder.date) < new Date() && !reminder.isCompleted ? 'text-danger font-bold' : 'text-muted'}`}>
                  {new Date(reminder.date).toLocaleDateString()}
                </span>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={reminder.isCompleted} onChange={() => toggleComplete(reminder)} />
                  Completado
                </label>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Recordatorio' : 'Nuevo Recordatorio'} footer={
        <>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </>
      }>
        <Input label="Título" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
        <Input label="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        <Input label="Fecha" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
            <option value="payment">Pago</option>
            <option value="renewal">Renovación</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </Modal>
    </div>
  );
};
