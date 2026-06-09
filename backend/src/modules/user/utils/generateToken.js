import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  const payload = { id: user.id, email: user.email, isAdmin: user.isAdmin };
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};
