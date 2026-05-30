import { useState, useEffect } from 'react';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { User, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

const Alert = ({ type, message, onClose }) => (
  <div className={`info-box ${type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
    <span style={{ flex: 1 }}>{message}</span>
    {onClose && (
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: 0 }}>×</button>
    )}
  </div>
);

export const Profile = () => {
  const currentUser = AuthService.getCurrentUser();
  const userId = currentUser?.id;

  const [profile, setProfile] = useState({
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    email: '',
    telefono: '',
    pais: '',
    ciudad: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileAlert, setProfileAlert] = useState(null);
  const [passwordAlert, setPasswordAlert] = useState(null);

  useEffect(() => {
    if (!userId) return;
    UserService.getById(userId)
      .then(data => {
        setProfile({
          primerNombre: data.primerNombre || '',
          segundoNombre: data.segundoNombre || '',
          primerApellido: data.primerApellido || '',
          segundoApellido: data.segundoApellido || '',
          email: data.email || '',
          telefono: data.telefono || '',
          pais: data.pais || '',
          ciudad: data.ciudad || '',
        });
      })
      .catch(() => setProfileAlert({ type: 'error', message: 'No se pudo cargar tu perfil.' }))
      .finally(() => setLoadingProfile(false));
  }, [userId]);

  const handleProfileChange = e => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async e => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileAlert(null);
    try {
      const updated = await UserService.update(userId, profile);
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updated }));
      setProfileAlert({ type: 'success', message: 'Perfil actualizado correctamente.' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al actualizar el perfil.';
      setProfileAlert({ type: 'error', message: msg });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = e => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async e => {
    e.preventDefault();
    setPasswordAlert(null);
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordAlert({ type: 'error', message: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPasswordAlert({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    setSavingPassword(true);
    try {
      await UserService.changePassword(userId, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswordAlert({ type: 'success', message: 'Contraseña actualizada correctamente.' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al cambiar la contraseña.';
      setPasswordAlert({ type: 'error', message: msg });
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = [profile.primerNombre, profile.primerApellido]
    .filter(Boolean)
    .map(s => s[0].toUpperCase())
    .join('') || '?';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi Perfil</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: 13 }}>
            Administra tu información personal y seguridad de cuenta
          </p>
        </div>
      </div>

      {/* Avatar + resumen */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 700, color: '#fff',
          flexShrink: 0, boxShadow: '0 4px 12px rgba(91,77,241,0.3)',
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {[profile.primerNombre, profile.primerApellido].filter(Boolean).join(' ') || 'Sin nombre'}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>{profile.email}</div>
          {profile.ciudad && profile.pais && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 2 }}>
              {profile.ciudad}, {profile.pais}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {/* Información personal */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <User size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Información personal
            </h2>
          </div>

          {profileAlert && (
            <Alert type={profileAlert.type} message={profileAlert.message} onClose={() => setProfileAlert(null)} />
          )}

          {loadingProfile ? (
            <div>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: 40, marginBottom: '1rem', borderRadius: 8 }} />
              ))}
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Primer nombre *</label>
                  <input
                    className="form-input"
                    name="primerNombre"
                    value={profile.primerNombre}
                    onChange={handleProfileChange}
                    required
                    placeholder="Juan"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Segundo nombre</label>
                  <input
                    className="form-input"
                    name="segundoNombre"
                    value={profile.segundoNombre}
                    onChange={handleProfileChange}
                    placeholder="Carlos"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Primer apellido *</label>
                  <input
                    className="form-input"
                    name="primerApellido"
                    value={profile.primerApellido}
                    onChange={handleProfileChange}
                    required
                    placeholder="Pérez"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Segundo apellido</label>
                  <input
                    className="form-input"
                    name="segundoApellido"
                    value={profile.segundoApellido}
                    onChange={handleProfileChange}
                    placeholder="García"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input
                  className="form-input"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  placeholder="tu@email.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  className="form-input"
                  name="telefono"
                  value={profile.telefono}
                  onChange={handleProfileChange}
                  placeholder="+57 300 000 0000"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">País</label>
                  <input
                    className="form-input"
                    name="pais"
                    value={profile.pais}
                    onChange={handleProfileChange}
                    placeholder="Colombia"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Ciudad</label>
                  <input
                    className="form-input"
                    name="ciudad"
                    value={profile.ciudad}
                    onChange={handleProfileChange}
                    placeholder="Bogotá"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingProfile}>
                <Save size={14} />
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          )}
        </div>

        {/* Cambiar contraseña */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Lock size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Cambiar contraseña
            </h2>
          </div>

          {passwordAlert && (
            <Alert type={passwordAlert.type} message={passwordAlert.message} onClose={() => setPasswordAlert(null)} />
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">Contraseña actual *</label>
              <input
                className="form-input"
                name="currentPassword"
                type="password"
                value={passwords.currentPassword}
                onChange={handlePasswordChange}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nueva contraseña *</label>
              <input
                className="form-input"
                name="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={handlePasswordChange}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar nueva contraseña *</label>
              <input
                className="form-input"
                name="confirmPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={handlePasswordChange}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="info-box primary" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
              La contraseña debe tener al menos 6 caracteres.
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingPassword}>
              <Lock size={14} />
              {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
