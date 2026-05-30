import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserService } from '../services/userService';
import { ShieldCheck, LineChart, Bell } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    email: '',
    telefono: '',
    pais: '',
    ciudad: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await UserService.create(formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar la cuenta. Verifica los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-container" style={{ overflow: 'auto', height: '100vh' }}>
      <div className="auth-wrapper">

        {/* Panel izquierdo decorativo */}
        <div className="auth-image-section">
          <div className="auth-image-content">
            <h2>Crea tu cuenta y toma el control de tus finanzas</h2>
            <p>Regístrate gratis y accede a todas las herramientas financieras que necesitas.</p>
            <div className="auth-image-features">
              <div className="auth-image-feature">
                <div className="auth-feature-icon"><ShieldCheck size={14} color="white" /></div>
                <span>Datos seguros y cifrados</span>
              </div>
              <div className="auth-image-feature">
                <div className="auth-feature-icon"><LineChart size={14} color="white" /></div>
                <span>Análisis de gastos mensuales</span>
              </div>
              <div className="auth-image-feature">
                <div className="auth-feature-icon"><Bell size={14} color="white" /></div>
                <span>Alertas de vencimientos automáticas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho con formulario */}
        <div className="auth-form-section">
          <div className="auth-form-container" style={{ maxWidth: 520 }}>

            <div className="auth-form-header">
              <div className="auth-logo">
                <span className="sidebar-logo-mark">S</span>
                <span className="auth-logo-text">Solventa</span>
              </div>
              <h2>Crear cuenta</h2>
              <p>Completa el formulario para comenzar</p>
            </div>

            <div className="auth-form-card">
            {error && (
              <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>
            )}

            <form onSubmit={handleRegister}>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Primer Nombre</label>
                  <input className="form-input" name="primerNombre" value={formData.primerNombre} onChange={handleChange} required placeholder="Ej: Juan" />
                </div>
                <div className="form-group">
                  <label className="form-label">Segundo Nombre</label>
                  <input className="form-input" name="segundoNombre" value={formData.segundoNombre} onChange={handleChange} placeholder="Opcional" />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Primer Apellido</label>
                  <input className="form-input" name="primerApellido" value={formData.primerApellido} onChange={handleChange} required placeholder="Ej: Pérez" />
                </div>
                <div className="form-group">
                  <label className="form-label">Segundo Apellido</label>
                  <input className="form-input" name="segundoApellido" value={formData.segundoApellido} onChange={handleChange} placeholder="Opcional" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input className="form-input" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="ejemplo@correo.com" />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" name="telefono" value={formData.telefono} onChange={handleChange} required maxLength="10" placeholder="3001234567" />
                </div>
                <div className="form-group">
                  <label className="form-label">País</label>
                  <input className="form-input" name="pais" value={formData.pais} onChange={handleChange} required placeholder="Colombia" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ciudad</label>
                <input className="form-input" name="ciudad" value={formData.ciudad} onChange={handleChange} required placeholder="Bogotá" />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input className="form-input" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Mínimo 8 caracteres" />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
              </button>
            </form>
            </div>

            <div className="auth-footer-link">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login">Inicia sesión</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
