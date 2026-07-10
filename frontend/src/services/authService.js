import api from './api';

const storeSession = (data) => {
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('refreshToken', data.refreshToken);
};

export const AuthService = {
  // Si la cuenta tiene 2FA, no llega `token` — llega `requiresTwoFactor` +
  // `tempToken` para completar con verifyTwoFactor().
  login: async (email, password) => {
    const response = await api.post('/users/login', { email, password });
    if (response.data.token) storeSession(response.data);
    return response.data;
  },
  verifyTwoFactor: async (tempToken, code) => {
    const response = await api.post('/users/2fa/login-verify', { tempToken, code });
    if (response.data.token) storeSession(response.data);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
  }
};
