import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeState } from '../components/layout/ShellContext';
import Swal from '../utils/alerts';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { TwoFactorService } from '../services/twoFactorService';
import { GmailService } from '../services/gmailService';
import { User, Lock, Save, AlertCircle, CheckCircle, Eye, EyeOff, Trash2, Mail, MailX, ShieldCheck, Shield, Download, Inbox, LogOut } from 'lucide-react';

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
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [theme, setTheme] = useThemeState();
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

  const [emailDigest, setEmailDigest] = useState(false);
  const [emailDigestLoading, setEmailDigestLoading] = useState(false);
  const [emailDigestAlert, setEmailDigestAlert] = useState(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState(null); // { qrDataUrl, secret } mientras se activa
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorAlert, setTwoFactorAlert] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileAlert, setProfileAlert] = useState(null);
  const [passwordAlert, setPasswordAlert] = useState(null);
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [gmail, setGmail] = useState(null); // { configured, connected, googleEmail, lastSyncAt }
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailAlert, setGmailAlert] = useState(null);

  // Estado de la conexión con Gmail + resultado del regreso desde Google
  // (/profile?gmail=ok|error&reason=…, que deja el callback del backend).
  useEffect(() => {
    GmailService.getStatus().then(setGmail).catch(() => setGmail(null));
    const params = new URLSearchParams(window.location.search);
    const result = params.get('gmail');
    if (result) {
      setGmailAlert(result === 'ok'
        ? { type: 'success', message: 'Gmail conectado. Debti leerá solo las alertas de tus tarjetas.' }
        : { type: 'error', message: `No se pudo conectar Gmail${params.get('reason') ? `: ${params.get('reason')}` : ''}.` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnectGmail = async () => {
    setGmailLoading(true);
    setGmailAlert(null);
    try {
      window.location.href = await GmailService.getAuthUrl();
    } catch (err) {
      setGmailAlert({ type: 'error', message: err.response?.data?.message || 'No se pudo iniciar la conexión con Gmail.' });
      setGmailLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Desconectar Gmail?',
      text: 'Debti dejará de leer tus alertas y se borrará el acceso guardado. Los movimientos ya aprobados se conservan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desconectar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;
    setGmailLoading(true);
    try {
      await GmailService.disconnect();
      setGmail(g => ({ ...g, connected: false, googleEmail: null, lastSyncAt: null }));
      setGmailAlert({ type: 'success', message: 'Gmail desconectado.' });
    } catch {
      setGmailAlert({ type: 'error', message: 'No se pudo desconectar. Intenta de nuevo.' });
    } finally {
      setGmailLoading(false);
    }
  };

  const handleStartTwoFactorSetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorAlert(null);
    try {
      const result = await TwoFactorService.setup();
      setTwoFactorSetup(result);
    } catch {
      setTwoFactorAlert({ type: 'error', message: 'No se pudo generar el código QR. Intenta de nuevo.' });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleConfirmTwoFactor = async (e) => {
    e.preventDefault();
    setTwoFactorLoading(true);
    setTwoFactorAlert(null);
    try {
      await TwoFactorService.confirm(twoFactorCode);
      setTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      setTwoFactorAlert({ type: 'success', message: 'Verificación en dos pasos activada.' });
    } catch (err) {
      setTwoFactorAlert({ type: 'error', message: err.response?.data?.message || 'Código incorrecto.' });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    const result = await Swal.fire({
      title: 'Desactivar verificación en dos pasos',
      text: 'Confirma tu contraseña para desactivarla.',
      icon: 'warning',
      input: 'password',
      inputPlaceholder: 'Tu contraseña',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed || !result.value) return;
    try {
      await TwoFactorService.disable(result.value);
      setTwoFactorEnabled(false);
      setTwoFactorAlert({ type: 'success', message: 'Verificación en dos pasos desactivada.' });
    } catch (err) {
      setTwoFactorAlert({ type: 'error', message: err.response?.data?.message || 'No se pudo desactivar.' });
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      await UserService.exportData();
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar la exportación. Intenta de nuevo.' });
    } finally {
      setExportLoading(false);
    }
  };

  const toggleEmailDigest = async () => {
    setEmailDigestLoading(true);
    setEmailDigestAlert(null);
    try {
      const next = !emailDigest;
      await UserService.update(userId, { emailDigest: next });
      setEmailDigest(next);
      setEmailDigestAlert({
        type: 'success',
        message: next
          ? 'Resumen semanal activado. Te llegará cada lunes a las 8 a.m.'
          : 'Resumen semanal desactivado.',
      });
    } catch {
      setEmailDigestAlert({ type: 'error', message: 'No se pudo actualizar la preferencia.' });
    } finally {
      setEmailDigestLoading(false);
    }
  };

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
        setEmailDigest(!!data.emailDigest);
        setTwoFactorEnabled(!!data.twoFactorEnabled);
      })
      .catch(() => setProfileAlert({ type: 'error', message: 'No se pudo cargar tu perfil.' }))
      .finally(() => setLoadingProfile(false));
  }, [userId]);

  // Enlaces a una sección (/profile#gmail): llevarla a la vista cuando ya cargó.
  useEffect(() => {
    if (loadingProfile || !hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 50);
    return () => clearTimeout(t);
  }, [loadingProfile, hash]);

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

  const SECTIONS = [
    ['personal', 'Datos personales'], ['seguridad', 'Seguridad'], ['gmail', 'Movimientos desde Gmail'],
    ['resumen', 'Resumen semanal'], ['apariencia', 'Apariencia'], ['exportar', 'Exporta tus datos'],
    ['sesion', 'Sesión'], ['peligro', 'Zona de peligro'],
  ];
  const goSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="pf">
      <div className="page-header">
        <div>
          <h1 className="page-title">Perfil y ajustes</h1>
          <p className="page-subtitle">Tu información personal, la seguridad de tu cuenta y tus preferencias</p>
        </div>
      </div>

      <div className="pf-layout">
      <nav className="pf-nav desktop-only" aria-label="Secciones del perfil">
        {SECTIONS.map(([id, label]) => (
          <button key={id} className={id === 'peligro' ? 'danger' : ''} onClick={() => goSection(id)}>{label}</button>
        ))}
      </nav>
      <div className="pf-main">

      {/* Avatar + resumen */}
      <div className="card row" style={{ gap: 16 }}>
        <span className="avatar lg" style={{ width: 56, height: 56, fontSize: 18 }}>{initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            {[profile.primerNombre, profile.primerApellido].filter(Boolean).join(' ') || 'Sin nombre'}
          </div>
          <div className="text-sm text-secondary truncate">
            {profile.email}{profile.ciudad && profile.pais ? ` · ${profile.ciudad}, ${profile.pais}` : ''}
          </div>
        </div>
      </div>

      <div className="pf-grid">
        {/* Información personal */}
        <div className="card" id="personal">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <User size={18} style={{ color: 'var(--text-3)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
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
              <div className="form-row-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
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

              <div className="form-row-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
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
        <div className="card" id="seguridad">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Lock size={18} style={{ color: 'var(--text-3)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Cambiar contraseña
            </h2>
          </div>

          {passwordAlert && (
            <Alert type={passwordAlert.type} message={passwordAlert.message} onClose={() => setPasswordAlert(null)} />
          )}

          <form onSubmit={handlePasswordSubmit}>
            {[
              { name: 'currentPassword', label: 'Contraseña actual *',          show: showCurrent, setShow: setShowCurrent, auto: 'current-password' },
              { name: 'newPassword',     label: 'Nueva contraseña *',            show: showNew,     setShow: setShowNew,     auto: 'new-password'     },
              { name: 'confirmPassword', label: 'Confirmar nueva contraseña *',  show: showConfirm, setShow: setShowConfirm, auto: 'new-password'     },
            ].map(({ name, label, show, setShow, auto }) => (
              <div className="form-group" key={name}>
                <label className="form-label">{label}</label>
                <div className="auth-pwd-wrap">
                  <input
                    className="form-input"
                    name={name}
                    type={show ? 'text' : 'password'}
                    value={passwords[name]}
                    onChange={handlePasswordChange}
                    required
                    placeholder="••••••••"
                    autoComplete={auto}
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar' : 'Mostrar'}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}

            <div className="info-box primary" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
              La contraseña debe tener al menos 6 caracteres.
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingPassword}>
              <Lock size={14} />
              {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>

        {/* Verificación en dos pasos (2FA) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--text-3)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Verificación en dos pasos
            </h2>
          </div>

          {twoFactorAlert && (
            <Alert type={twoFactorAlert.type} message={twoFactorAlert.message} onClose={() => setTwoFactorAlert(null)} />
          )}

          {twoFactorSetup ? (
            <form onSubmit={handleConfirmTwoFactor}>
              <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: '0.875rem' }}>
                Escanea el código con Google Authenticator, Authy u otra app similar, y confirma con el código de 6 dígitos que genere.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.875rem' }}>
                <img src={twoFactorSetup.qrDataUrl} alt="Código QR para 2FA" style={{ width: 180, height: 180, borderRadius: 8, border: '1px solid var(--color-border)' }} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '1rem', wordBreak: 'break-all' }}>
                ¿No puedes escanear? Ingresa manualmente: <code className="tabular">{twoFactorSetup.secret}</code>
              </p>
              <div className="form-group">
                <label className="form-label">Código de 6 dígitos</label>
                <input
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: 18, letterSpacing: '0.25em', fontVariantNumeric: 'tabular-nums' }}
                  type="text" inputMode="numeric" maxLength={6} autoFocus
                  value={twoFactorCode}
                  onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setTwoFactorSetup(null); setTwoFactorCode(''); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={twoFactorLoading || twoFactorCode.length !== 6}>
                  {twoFactorLoading ? 'Verificando…' : 'Confirmar'}
                </button>
              </div>
            </form>
          ) : twoFactorEnabled ? (
            <div>
              <div className="info-box success" style={{ marginBottom: '1.25rem' }}>
                <ShieldCheck size={16} />
                <span>Tu cuenta está protegida con verificación en dos pasos.</span>
              </div>
              <button type="button" className="btn btn-danger" style={{ width: '100%' }} onClick={handleDisableTwoFactor}>
                Desactivar
              </button>
            </div>
          ) : (
            <div>
              <div className="info-box primary" style={{ marginBottom: '1.25rem', fontSize: 12, display: 'flex', gap: 10 }}>
                <Shield size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Añade una capa extra de seguridad: además de tu contraseña, pedirá un código de tu teléfono al iniciar sesión.</span>
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleStartTwoFactorSetup} disabled={twoFactorLoading}>
                <ShieldCheck size={14} />
                {twoFactorLoading ? 'Generando…' : 'Activar verificación en dos pasos'}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Resumen semanal por email */}
      <div className="card" id="resumen">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Mail size={18} style={{ color: 'var(--text-3)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Resumen semanal por email</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Recibe cada lunes un correo con tu dinero libre, obligaciones del mes y próximos pagos.
        </p>
        {emailDigestAlert && (
          <Alert type={emailDigestAlert.type} message={emailDigestAlert.message} onClose={() => setEmailDigestAlert(null)} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {emailDigest
              ? <Mail size={20} style={{ color: 'var(--pos-600)' }} />
              : <MailX size={20} style={{ color: 'var(--text-3)' }} />}
            <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
              {emailDigest ? 'Resumen activado' : 'Resumen desactivado'}
            </span>
          </div>
          <button
            className={`btn ${emailDigest ? 'btn-secondary' : 'btn-primary'}`}
            onClick={toggleEmailDigest}
            disabled={emailDigestLoading}
            style={{ minWidth: 140 }}
          >
            {emailDigestLoading ? 'Guardando...' : emailDigest ? 'Desactivar' : 'Activar resumen'}
          </button>
        </div>
      </div>

      {/* Conexión con Gmail (movimientos de tarjetas por correo) */}
      {gmail && (
        <div className="card" id="gmail">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Inbox size={16} style={{ color: 'var(--text-3)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Movimientos desde Gmail</h2>
          </div>
          {gmailAlert && <Alert type={gmailAlert.type} message={gmailAlert.message} onClose={() => setGmailAlert(null)} />}
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Conecta tu Gmail (solo lectura) para que Debti detecte las alertas de tus tarjetas y te proponga los movimientos. Solo se leen los correos del banco; no se envía, modifica ni borra nada. Puedes desconectarlo cuando quieras.
          </p>
          {!gmail.configured ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>La conexión con Gmail aún no está configurada en el servidor.</p>
          ) : gmail.connected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>
                Conectado como <strong>{gmail.googleEmail}</strong>
              </span>
              <button className="btn btn-secondary" onClick={handleDisconnectGmail} disabled={gmailLoading}>
                {gmailLoading ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleConnectGmail} disabled={gmailLoading}>
              <Mail size={14} /> {gmailLoading ? 'Redirigiendo...' : 'Conectar Gmail'}
            </button>
          )}
        </div>
      )}

      {/* Apariencia */}
      <div className="card" id="apariencia">
        <h2 className="card-title" style={{ marginBottom: 12 }}>Apariencia</h2>
        <div className="theme-choices" role="radiogroup" aria-label="Tema">
          {[['light', 'Claro'], ['dark', 'Oscuro']].map(([v, label]) => (
            <label key={v} className={`theme-choice ${theme === v ? 'selected' : ''}`}>
              <span className={`theme-preview ${v}`} aria-hidden="true"><i /><i /></span>
              <span className="row" style={{ gap: 8 }}>
                <input type="radio" name="theme" value={v} checked={theme === v} onChange={() => setTheme(v)} />
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="pf-two">
      {/* Exportar datos */}
      <div className="card" id="exportar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Download size={16} style={{ color: 'var(--text-3)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Exporta tus datos</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Descarga toda tu información (tarjetas, créditos, suscripciones, ingresos e historial) en un solo archivo .json.
        </p>
        <button className="btn btn-secondary" onClick={handleExportData} disabled={exportLoading}>
          <Download size={14} /> {exportLoading ? 'Generando...' : 'Descargar mis datos'}
        </button>
      </div>

      {/* Sesión */}
      <div className="card" id="sesion">
        <h2 className="card-title" style={{ marginBottom: 8 }}>Sesión</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Sesión iniciada como {profile.email} en este dispositivo.
        </p>
        <button className="btn btn-secondary" onClick={() => AuthService.logout()}><LogOut size={16} /> Cerrar sesión</button>
      </div>
      </div>

      {/* Zona de peligro */}
      <div className="card" id="peligro" style={{ border: '1px solid var(--neg-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Trash2 size={16} style={{ color: 'var(--neg-600)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neg-600)', margin: 0 }}>Zona de peligro</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Una vez que elimines tu cuenta, todos tus datos serán borrados permanentemente. Esta acción no se puede deshacer.
        </p>
        <button
          className="btn btn-danger"
          onClick={async () => {
            const result = await Swal.fire({
              title: '¿Eliminar tu cuenta?',
              html: 'Se borrarán <b>todos tus datos</b>: tarjetas, créditos, suscripciones y más.<br/><br/>Esta acción <b>no se puede deshacer</b>.',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#DC2626',
                            confirmButtonText: 'Sí, eliminar mi cuenta',
              cancelButtonText: 'Cancelar',
              reverseButtons: true,
            });
            if (!result.isConfirmed) return;
            try {
              await UserService.delete(userId);
              AuthService.logout();
              navigate('/login');
            } catch {
              Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la cuenta. Intenta de nuevo.' });
            }
          }}
        >
          <Trash2 size={14} /> Eliminar mi cuenta
        </button>
      </div>

      </div>
      </div>
    </div>
  );
};
