import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, LineChart, Bell, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { UserService } from '../services/userService';
import { BrandMark } from '../components/ui/BrandMark';

const FEATURES = [
  { icon: ShieldCheck, text: 'Datos seguros — solo tú los ves' },
  { icon: LineChart,   text: 'Análisis de gastos y tendencias' },
  { icon: Bell,        text: 'Alertas automáticas de vencimientos' },
];

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

export const Register = () => {
  const [form, setForm] = useState({
    primerNombre: '', segundoNombre: '',
    primerApellido: '', segundoApellido: '',
    email: '', telefono: '',
    pais: 'Colombia', ciudad: '',
    password: '', confirmPassword: '',
  });
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [touched, setTouched]         = useState({});
  const navigate = useNavigate();

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const blur = name => setTouched(t => ({ ...t, [name]: true }));

  const errs = {};
  if (!form.primerNombre.trim())                                    errs.primerNombre    = 'Requerido';
  if (!form.primerApellido.trim())                                  errs.primerApellido  = 'Requerido';
  if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))             errs.email           = 'Correo inválido';
  if (!/^\d{7,10}$/.test(form.telefono))                           errs.telefono        = '7–10 dígitos';
  if (!form.ciudad.trim())                                          errs.ciudad          = 'Requerido';
  if (form.password.length < 8)                                     errs.password        = 'Mínimo 8 caracteres';
  if (form.confirmPassword !== form.password)                       errs.confirmPassword = 'Las contraseñas no coinciden';

  const show = f => touched[f] && errs[f];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(form).map(k => [k, true])));
    if (Object.keys(errs).length) return;
    setLoading(true);
    setError('');
    try {
      const { confirmPassword, ...payload } = form;
      await UserService.create(payload);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la cuenta. Verifica los datos.');
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text', placeholder = '', extra = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={`reg-${name}`}>{label}</label>
      <input
        id={`reg-${name}`}
        className={`form-input auth-input ${show(name) ? 'error' : ''}`}
        name={name}
        type={type}
        value={form[name]}
        onChange={handleChange}
        onBlur={() => blur(name)}
        placeholder={placeholder}
        aria-invalid={!!show(name)}
        {...extra}
      />
      {show(name) && <p className="form-error"><AlertCircle size={11} /> {errs[name]}</p>}
    </div>
  );

  return (
    <div className="auth-container" style={{ overflowY: 'auto' }}>
      <div className="auth-wrapper">

        {/* Panel izquierdo */}
        <div className="auth-panel-brand">
          <div className="auth-panel-brand-inner">
            <div className="auth-brand-logo">
              <BrandMark size={36} shadow={false} />
              <span>Debit</span>
            </div>
            <div>
              <h2 className="auth-panel-headline">Crea tu cuenta y empieza a ordenar tus finanzas</h2>
              <p className="auth-panel-sub">Gratis para siempre. Sin tarjetas de crédito requeridas.</p>
            </div>
            <ul className="auth-feature-list">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="auth-feature-item">
                  <span className="auth-feature-dot"><Icon size={13} /></span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="auth-panel-trust">
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              <span>Tus datos nunca se comparten con terceros</span>
            </div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className="auth-form-section">
          <div className="auth-form-container" style={{ maxWidth: 500 }}>

            <div className="auth-form-header">
              <div className="auth-logo">
                <BrandMark size={28} />
                <span className="auth-logo-text">Debit</span>
              </div>
              <h2>Crear cuenta</h2>
              <p>Completa el formulario para comenzar</p>
            </div>

            <div className="auth-form-card">
              {error && (
                <div className="auth-alert-error">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>

                {/* Nombre */}
                <p className="auth-section-label">Nombre completo</p>
                <div className="form-row-2" style={{ marginBottom: '0.75rem' }}>
                  {field('primerNombre',   'Primer nombre *',   'text', 'Juan')}
                  {field('segundoNombre',  'Segundo nombre',    'text', 'Opcional')}
                </div>
                <div className="form-row-2" style={{ marginBottom: '1rem' }}>
                  {field('primerApellido',  'Primer apellido *',  'text', 'Pérez')}
                  {field('segundoApellido', 'Segundo apellido',   'text', 'Opcional')}
                </div>

                {/* Contacto */}
                <p className="auth-section-label">Contacto</p>
                <div className="form-row-2" style={{ marginBottom: '0.75rem' }}>
                  {field('email',    'Correo electrónico *', 'email', 'correo@ejemplo.com', { autoComplete: 'email' })}
                  {field('telefono', 'Teléfono *',           'tel',   '3001234567',         { maxLength: 10 })}
                </div>
                <div className="form-row-2" style={{ marginBottom: '1rem' }}>
                  {field('ciudad', 'Ciudad *',   'text', 'Bogotá')}
                  {field('pais',   'País *',     'text', 'Colombia')}
                </div>

                {/* Contraseña */}
                <p className="auth-section-label">Contraseña</p>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-password">Contraseña *</label>
                  <div className="auth-pwd-wrap">
                    <input
                      id="reg-password"
                      className={`form-input auth-input ${show('password') ? 'error' : ''}`}
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
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

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-confirm">Confirmar contraseña *</label>
                  <div className="auth-pwd-wrap">
                    <input
                      id="reg-confirm"
                      className={`form-input auth-input ${show('confirmPassword') ? 'error' : ''}`}
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={handleChange}
                      onBlur={() => blur('confirmPassword')}
                      placeholder="Repite tu contraseña"
                      autoComplete="new-password"
                      aria-invalid={!!show('confirmPassword')}
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {show('confirmPassword') && <p className="form-error"><AlertCircle size={11} /> {errs.confirmPassword}</p>}
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? 'Creando cuenta…' : <><span>Crear mi cuenta</span><ArrowRight size={16} /></>}
                </button>
              </form>
            </div>

            <div className="auth-footer-link">
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
