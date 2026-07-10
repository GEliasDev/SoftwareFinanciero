import api from './api';

export const ActivityLogService = {
  // `before`: ISO de createdAt del último registro cargado (paginación por
  // cursor). Antes se pedía un `limit` cada vez mayor, pero el backend lo
  // topaba en 50 y "Cargar más" repetía siempre la misma página.
  getRecent: async (limit = 50, before) => {
    const params = new URLSearchParams({ limit });
    if (before) params.set('before', before);
    const res = await api.get(`/activity-log?${params}`);
    return res.data;
  },
};
