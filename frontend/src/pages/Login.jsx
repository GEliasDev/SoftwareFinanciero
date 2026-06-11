import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, CreditCard, Bell, Landmark, AlertCircle, ArrowRight } from 'lucide-react';
import { AuthService } from '../services/authService';
import logo from '../assets/logo.png';
import icono from '../assets/icono.png';

const FEATURES = [
  { icon: TrendingUp, text: 'Seguimiento de deudas y saldos en tiempo real' },
  { icon: CreditCard, text: 'Gestión completa de tarjetas y compras a cuotas' },
  { icon: Landmark,   text: 'Créditos con tabla de amortización automática' },
  { icon: Bell,       text: 'Recordatorios de vencimientos configurables' },
];

export const Login = () => {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [touched, setTouched]     = useState({});
  const navigate = useNavigate();

  const emailError    = touched.email    && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) ? 'Ingresa un correo válido' : '';
  const passwordError = touched.password && password.length < 6 ? 'Mínimo 6 caracteres' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError || passwordError) return;
    setLoading(true);
    setError('');
    try {
      await AuthService.login(email, password);
      const needsOnboarding = localStorage.getItem('debti-onboarding') === '1';
      navigate(needsOnboarding ? '/onboarding' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">

        {/* Panel izquierdo */}
        <div className="auth-panel-brand">
          <div className="auth-panel-brand-inner">
            <div className="auth-brand-logo">
              <img src={logo} alt="Debti" style={{ height: 68, width: 'auto' }} />
            </div>
            <div>
              <h2 className="auth-panel-headline">Tus finanzas, bajo control total</h2>
              <p className="auth-panel-sub">Un panel unificado para gestionar deudas, tarjetas y créditos con claridad.</p>
            </div>
            <ul className="auth-feature-list">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="auth-feature-item">
                  <span className="auth-feature-dot"><Icon size={13} /></span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="auth-panel-stat-row">
              <div className="auth-panel-stat"><span>COP</span><strong>Moneda nativa</strong></div>
              <div className="auth-panel-stat-sep" />
              <div className="auth-panel-stat"><span>100%</span><strong>Privado</strong></div>
              <div className="auth-panel-stat-sep" />
              <div className="auth-panel-stat"><span>6</span><strong>Módulos</strong></div>
            </div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className="auth-form-section">
          <div className="auth-form-container">

            <div className="auth-form-header">
              <div className="auth-logo">
                <img src={logo} alt="Debti" style={{ height: 52, width: 'auto' }} />
              </div>
              <h2>Iniciar sesión</h2>
              <p>Bienvenido de vuelta a tu panel financiero</p>
            </div>

            <div className="auth-form-card">
              {error && (
                <div className="auth-alert-error">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Correo electrónico</label>
                  <input
                    id="login-email"
                    className={`form-input auth-input ${touched.email && emailError ? 'error' : ''}`}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, email: true }))}
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                    aria-describedby={emailError ? 'login-email-err' : undefined}
                    aria-invalid={!!emailError}
                  />
                  {touched.email && emailError && (
                    <p className="form-error" id="login-email-err"><AlertCircle size={11} /> {emailError}</p>
                  )}
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>Contraseña</label>
                    <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--brand-600)', fontWeight: 500, textDecoration: 'none' }}
                      onMouseOver={e => e.target.style.textDecoration = 'underline'}
                      onMouseOut={e => e.target.style.textDecoration = 'none'}>
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="auth-pwd-wrap">
                    <input
                      id="login-password"
                      className={`form-input auth-input ${touched.password && passwordError ? 'error' : ''}`}
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, password: true }))}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-describedby={passwordError ? 'login-pwd-err' : undefined}
                      aria-invalid={!!passwordError}
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {touched.password && passwordError && (
                    <p className="form-error" id="login-pwd-err"><AlertCircle size={11} /> {passwordError}</p>
                  )}
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? 'Ingresando…' : <><span>Ingresar a mi cuenta</span><ArrowRight size={16} /></>}
                </button>
              </form>
            </div>

            <div className="auth-footer-link">
              ¿No tienes cuenta? <Link to="/register">Regístrate gratis</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
