import api from './api';

export const PersonalDebtService = {
  getAll:        async ()          => (await api.get('/personal-debts')).data,
  getById:       async (id)        => (await api.get(`/personal-debts/${id}`)).data,
  create:        async (data)      => (await api.post('/personal-debts', data)).data,
  update:        async (id, data)  => (await api.patch(`/personal-debts/${id}`, data)).data,
  delete:        async (id)        => (await api.delete(`/personal-debts/${id}`)).data,
  registerAbono: async (id, monto) => {
    const d = new Date();
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return (await api.post(`/personal-debts/${id}/abono`, { monto, fecha })).data;
  },
  getAbonos:     async (id)        => (await api.get(`/personal-debts/${id}/abonos`)).data,
};
