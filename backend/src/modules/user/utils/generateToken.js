import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateToken = (user) => {
  const payload = { id: user.id, email: user.email, isAdmin: user.isAdmin };
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Token opaco de larga duración (30 días) para renovar el access token sin
// pedirle contraseña de nuevo. Se guarda hasheado-por-BD-plano igual que
// resetToken (mismo patrón ya usado en este módulo).
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const generateRefreshToken = () => crypto.randomBytes(48).toString('hex');
