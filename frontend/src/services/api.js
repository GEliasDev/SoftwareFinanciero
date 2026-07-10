import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// El access token dura 1h; sin esto, un formulario largo (ej. cargar un
// extracto de 12 compras a mano) expiraba a medio llenar y redirigía a
// login SIN AVISO, perdiendo todo lo no guardado. Ahora un 401 intenta
// renovar en silencio con el refresh token (30 días) antes de cerrar sesión.
let refreshPromise = null;

const doRefresh = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('Sin refresh token');
  // axios "pelado" (no la instancia `api`) para no reentrar en este mismo interceptor.
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_URL || '/api'}/users/refresh-token`,
    { refreshToken }
  );
  localStorage.setItem('token', data.token);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data.token;
};

const forceLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  // Login.jsx muestra un aviso de "sesión expirada" en vez de un redirect mudo.
  window.location.href = '/login?expired=1';
};

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    // Un 401 en /login es credenciales inválidas — el propio formulario de
    // login lo maneja, no hay sesión que renovar ni de la que cerrar sesión.
    const isLoginAttempt = config?.url?.includes('/users/login');
    // Un 401 renovando el refresh token es terminal: no hay nada más que
    // intentar, hay que mandar a login (sin esto, reintentaría en bucle).
    const isRefreshAttempt = config?.url?.includes('/users/refresh-token');

    if (isLoginAttempt) return Promise.reject(error);

    if (response?.status === 401 && isRefreshAttempt) {
      forceLogout();
      return Promise.reject(error);
    }

    if (response?.status === 401 && !config._retried) {
      config._retried = true;
      try {
        // Varias requests pueden fallar con 401 a la vez (ej. carga inicial de
        // la página): solo la primera dispara el refresh, las demás esperan.
        refreshPromise ??= doRefresh().finally(() => { refreshPromise = null; });
        const newToken = await refreshPromise;
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch {
        forceLogout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
