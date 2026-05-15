import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wallet } from 'lucide-react';

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
      setError(err.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      width: '100vw',
      background: 'radial-gradient(circle at center, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%)'
    }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
        <div className="text-center mb-4">
          <div className="text-primary flex justify-center mb-2">
            <Wallet size={48} />
          </div>
          <h2 className="text-2xl font-bold">FinSoft</h2>
          <p className="text-muted">Inicia sesión en tu cuenta</p>
        </div>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <Input 
            label="Correo Electrónico" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            placeholder="ejemplo@correo.com"
          />
          <Input 
            label="Contraseña" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            placeholder="••••••••"
          />
          
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? 'Iniciando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
};
