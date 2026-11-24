import api from './api';

export const BalanceService = {
  list:           async (anio, mes)        => (await api.get('/balance', { params: { anio, mes } })).data,
  create:         async (anio, mes, items) => (await api.post('/balance', { anio, mes, items })).data,
  update:         async (id, data)         => (await api.patch(`/balance/${id}`, data)).data,
  delete:         async (id)               => (await api.delete(`/balance/${id}`)).data,
  copiarAnterior: async (anio, mes)        => (await api.post('/balance/copiar-anterior', { anio, mes })).data,
};
