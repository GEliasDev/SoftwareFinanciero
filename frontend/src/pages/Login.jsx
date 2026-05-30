import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { TrendingUp, CreditCard, Bell, Landmark } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await AuthService.login(email, password);
      navigate('/');
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
        <div className="auth-image-section">
          <div className="auth-image-content">
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>Debti</span>
            </div>
            <h2>Toma el control de tus finanzas personales</h2>
            <p>Un panel unificado para gestionar suscripciones, tarjetas de crédito y créditos bancarios con claridad y precisión.</p>
            <div className="auth-image-features">
              {[
                { icon: TrendingUp, label: 'Seguimiento de gastos y deudas en tiempo real' },
                { icon: CreditCard, label: 'Gestión completa de tarjetas y compras a cuotas' },
                { icon: Landmark,   label: 'Control de créditos bancarios con calculadora' },
                { icon: Bell,       label: 'Recordatorios automáticos de vencimientos' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="auth-image-feature">
                  <div className="auth-feature-icon"><Icon size={14} color="white" /></div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className="auth-form-section">
          <div className="auth-form-container">

            <div className="auth-form-header">
              <div className="auth-logo">
                <span className="auth-logo-text">Debti</span>
              </div>
              <h2>Iniciar sesión</h2>
              <p>Bienvenido de vuelta a tu panel financiero</p>
            </div>

            <div className="auth-form-card">
              {error && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input className="form-input" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                    placeholder="ejemplo@correo.com" autoComplete="email" />
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input className="form-input" type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    placeholder="••••••••" autoComplete="current-password" />
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? 'Iniciando sesión...' : 'Ingresar a mi cuenta'}
                </button>
              </form>
            </div>

            <div className="auth-footer-link">
              ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
