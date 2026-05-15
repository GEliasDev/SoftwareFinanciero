import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { BankCreditService } from '../services/bankCreditService';
import { Plus, Edit, Trash2, CheckCircle } from 'lucide-react';

export const BankCredits = () => {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  
  const [formData, setFormData] = useState({ 
    bankName: '', 
    totalAmount: '', 
    interestRate: '', 
    installments: '', 
    startDate: '',
    paymentDay: ''
  });

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const data = await BankCreditService.getAll();
      setCredits(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleOpenModal = (item = null) => {
    if (item) {
      setSelectedCredit(item);
      setFormData({
        bankName: item.bankName,
        totalAmount: item.totalAmount,
        interestRate: item.interestRate,
        installments: item.installments,
        startDate: item.startDate.split('T')[0],
        paymentDay: item.paymentDay
      });
    } else {
      setSelectedCredit(null);
      setFormData({ bankName: '', totalAmount: '', interestRate: '', installments: '', startDate: '', paymentDay: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedCredit) {
        await BankCreditService.update(selectedCredit._id, formData);
      } else {
        await BankCreditService.create(formData);
      }
      setIsModalOpen(false);
      fetchCredits();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el crédito');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este crédito bancario?')) {
      try {
        await BankCreditService.delete(id);
        fetchCredits();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handlePayInstallment = async () => {
    try {
      await BankCreditService.registerPayment(selectedCredit._id, { amount: selectedCredit.monthlyInstallmentAmount });
      setIsPayModalOpen(false);
      fetchCredits();
    } catch (error) {
      console.error(error);
      alert('Error al registrar pago');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl m-0">Créditos Bancarios</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nuevo Crédito
        </Button>
      </div>

      <div className="grid gap-6">
        {loading ? <p className="text-muted">Cargando...</p> : (
          credits.map(credit => {
            const progress = (credit.paidInstallments / credit.installments) * 100;
            return (
              <Card key={credit._id} className="w-full">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{credit.bankName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted text-xs uppercase">Monto Total</p>
                        <p className="font-semibold">${credit.totalAmount?.toLocaleString('es-CO')}</p>
                      </div>
                      <div>
                        <p className="text-muted text-xs uppercase">Cuota Mensual</p>
                        <p className="font-semibold text-danger">${credit.monthlyInstallmentAmount?.toLocaleString('es-CO')}</p>
                      </div>
                      <div>
                        <p className="text-muted text-xs uppercase">Tasa de Interés</p>
                        <p className="font-semibold">{credit.interestRate}%</p>
                      </div>
                      <div>
                        <p className="text-muted text-xs uppercase">Día de Pago</p>
                        <p className="font-semibold">{credit.paymentDay}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end min-w-[200px]">
                    <div className="w-full mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted">Progreso ({credit.paidInstallments}/{credit.installments})</span>
                        <span className="text-success">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-success h-full transition-all" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <Button variant="success" className="bg-success text-white border-none text-xs px-2 py-1" onClick={() => { setSelectedCredit(credit); setIsPayModalOpen(true); }}>
                        <CheckCircle size={14} className="mr-1" /> Pagar Cuota
                      </Button>
                      <Button variant="secondary" onClick={() => handleOpenModal(credit)} style={{ padding: '0.25rem 0.5rem' }}><Edit size={14}/></Button>
                      <Button variant="danger" onClick={() => handleDelete(credit._id)} style={{ padding: '0.25rem 0.5rem' }}><Trash2 size={14}/></Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedCredit ? 'Editar Crédito' : 'Nuevo Crédito'} footer={
        <>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </>
      }>
        <Input label="Banco / Entidad" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Monto Total" type="number" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})} />
          <Input label="Tasa Interés (%)" type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: Number(e.target.value)})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Plazo (Meses)" type="number" value={formData.installments} onChange={e => setFormData({...formData, installments: Number(e.target.value)})} />
          <Input label="Día de Pago" type="number" min="1" max="31" value={formData.paymentDay} onChange={e => setFormData({...formData, paymentDay: Number(e.target.value)})} />
        </div>
        <Input label="Fecha de Desembolso" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
      </Modal>

      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Registrar Pago de Cuota" footer={
        <>
          <Button variant="secondary" onClick={() => setIsPayModalOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handlePayInstallment}>Confirmar Pago</Button>
        </>
      }>
        <div className="text-center">
          <p className="mb-4">¿Deseas registrar el pago de la cuota actual?</p>
          <h2 className="text-3xl font-bold text-success mb-2">${selectedCredit?.monthlyInstallmentAmount?.toLocaleString('es-CO')}</h2>
          <p className="text-muted text-sm">{selectedCredit?.bankName}</p>
        </div>
      </Modal>
    </div>
  );
};
