export const generateToken = (user) => {
  const payload = { id: user.id, email: user.email, isAdmin: user.isAdmin };
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h'; // fallback to 1 hour
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};
