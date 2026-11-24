// Nombre e iniciales del usuario para avatar y saludos.
export const userInitials = (user) => {
  const a = user?.primerNombre || user?.name || 'U';
  const b = user?.primerApellido || '';
  return (a.charAt(0) + b.charAt(0)).toUpperCase();
};

export const userShortName = (user) => {
  if (!user?.primerNombre) return user?.name || 'Usuario';
  return user.primerApellido ? `${user.primerNombre} ${user.primerApellido.charAt(0)}.` : user.primerNombre;
};

export const userFirstName = (user) => user?.primerNombre || user?.name?.split(' ')[0] || '';
