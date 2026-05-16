import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserService } from '../services/userService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wallet } from 'lucide-react';

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
      // Tras registro exitoso, redirigir al login
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
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      width: '100vw',
      background: 'radial-gradient(circle at center, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%)',
      padding: '2rem'
    }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '600px' }}>
        <div className="text-center mb-6">
          <div className="text-primary flex justify-center mb-2">
            <Wallet size={48} />
          </div>
          <h2 className="text-2xl font-bold">Registro FinSoft</h2>
          <p className="text-muted">Crea tu cuenta para comenzar</p>
        </div>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Primer Nombre" name="primerNombre" value={formData.primerNombre} onChange={handleChange} required />
            <Input label="Segundo Nombre" name="segundoNombre" value={formData.segundoNombre} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Primer Apellido" name="primerApellido" value={formData.primerApellido} onChange={handleChange} required />
            <Input label="Segundo Apellido" name="segundoApellido" value={formData.segundoApellido} onChange={handleChange} required />
          </div>
          <Input label="Correo Electrónico" type="email" name="email" value={formData.email} onChange={handleChange} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} required maxLength="10" />
            <Input label="País" name="pais" value={formData.pais} onChange={handleChange} required />
          </div>
          <Input label="Ciudad" name="ciudad" value={formData.ciudad} onChange={handleChange} required />
          <Input label="Contraseña" type="password" name="password" value={formData.password} onChange={handleChange} required />
          
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </Button>

          <p className="text-center text-muted mt-4 text-sm">
            ¿Ya tienes una cuenta? <Link to="/login" className="text-primary font-semibold">Inicia Sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
};
