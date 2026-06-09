import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { UserService } from '../services/userService';
import { BrandMark } from '../components/ui/BrandMark';

const StrengthBar = ({ password }) => {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length;
  const colors = ['', '#DC2626', '#D97706', '#059669', '#047857'];
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= score ? colors[score] : 'var(--border)', transition: 'background 0.2s' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score], fontWeight: 600 }}>{labels[score]}</span>
    </div>
  );
};

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [form, setForm]           = useState({ token: '', password: '', confirm: '' });
  const [showPwd, setShowPwd]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [touched, setTouched]     = useState({});
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const errs = {};
  if (!form.token.trim())            errs.token    = 'Ingresa el token de recuperación';
  if (form.password.length < 8)      errs.password = 'Mínimo 8 caracteres';
  if (form.confirm !== form.password) errs.confirm  = 'Las contraseñas no coinciden';

  const show = f => touched[f] && errs[f];
  const blur = f => setTouched(t => ({ ...t, [f]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ token: true, password: true, confirm: true });
    if (Object.keys(errs).length) return;
    setLoading(true);
    setError('');
    try {
      await UserService.resetPassword(form.token, form.password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Token inválido o expirado. Solicita uno nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div style={{
        margin: 'auto', width: '100%', maxWidth: 440,
        padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={32} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Debti</span>
        </div>

        {!done ? (
          <div className="auth-form-card">
            <div style={{ marginBottom: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--brand-50)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <ShieldCheck size={20} color="var(--brand-600)" />
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Nueva contraseña
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.55 }}>
                Pega el token que recibiste y elige una nueva contraseña.
              </p>
            </div>

            {error && (
              <div className="auth-alert-error">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Token */}
              <div className="form-group">
                <label className="form-label" htmlFor="rp-token">Token de recuperación</label>
                <input
                  id="rp-token"
                  className={`form-input auth-input ${show('token') ? 'error' : ''}`}
                  value={form.token}
                  onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
                  onBlur={() => blur('token')}
                  placeholder="Pega el token aquí"
                  autoFocus
                  aria-invalid={!!show('token')}
                />
                {show('token') && <p className="form-error"><AlertCircle size={11} /> {errs.token}</p>}
              </div>

              {/* Nueva contraseña */}
              <div className="form-group">
                <label className="form-label" htmlFor="rp-password">Nueva contraseña</label>
                <div className="auth-pwd-wrap">
                  <input
                    id="rp-password"
                    className={`form-input auth-input ${show('password') ? 'error' : ''}`}
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onBlur={() => blur('password')}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    aria-invalid={!!show('password')}
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Ocultar' : 'Mostrar'}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {show('password') && <p className="form-error"><AlertCircle size={11} /> {errs.password}</p>}
                <StrengthBar password={form.password} />
              </div>

              {/* Confirmar */}
              <div className="form-group">
                <label className="form-label" htmlFor="rp-confirm">Confirmar contraseña</label>
                <div className="auth-pwd-wrap">
                  <input
                    id="rp-confirm"
                    className={`form-input auth-input ${show('confirm') ? 'error' : ''}`}
                    type={showConf ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    onBlur={() => blur('confirm')}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    aria-invalid={!!show('confirm')}
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowConf(v => !v)} aria-label={showConf ? 'Ocultar' : 'Mostrar'}>
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {show('confirm') && <p className="form-error"><AlertCircle size={11} /> {errs.confirm}</p>}
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Guardando…' : 'Restablecer contraseña'}
              </button>
            </form>

            <div className="auth-footer-link" style={{ marginTop: 16 }}>
              <Link to="/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <ArrowLeft size={13} /> Solicitar nuevo token
              </Link>
            </div>
          </div>

        ) : (
          <div className="auth-form-card" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--pos-50)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <CheckCircle2 size={24} color="var(--pos-600)" />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              ¡Contraseña restablecida!
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: '0 0 24px', lineHeight: 1.6 }}>
              Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.
            </p>
            <button className="auth-submit-btn" onClick={() => navigate('/login')}>
              Ir al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
