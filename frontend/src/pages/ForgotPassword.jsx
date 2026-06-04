import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Mail, CheckCircle2, Copy, Check } from 'lucide-react';
import { UserService } from '../services/userService';
import { BrandMark } from '../components/ui/BrandMark';

export const ForgotPassword = () => {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [devToken, setDevToken] = useState('');
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Ingresa un correo válido.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await UserService.forgotPassword(email);
      setSent(true);
      // El backend devuelve el token mientras no haya servidor de correo configurado
      if (res.resetToken) setDevToken(res.resetToken);
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(devToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="auth-container">
      <div style={{
        margin: 'auto', width: '100%', maxWidth: 440,
        padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 24,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={32} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Solventa</span>
        </div>

        {!sent ? (
          <div className="auth-form-card">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--brand-50)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Mail size={20} color="var(--brand-600)" />
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                ¿Olvidaste tu contraseña?
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.55 }}>
                Ingresa tu correo y te enviaremos instrucciones para restablecerla.
              </p>
            </div>

            {error && (
              <div className="auth-alert-error">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-email">Correo electrónico</label>
                <input
                  id="fp-email"
                  className="form-input auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar instrucciones'}
              </button>
            </form>

            <div className="auth-footer-link" style={{ marginTop: 16 }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <ArrowLeft size={13} /> Volver al inicio de sesión
              </Link>
            </div>
          </div>

        ) : (
          <div className="auth-form-card">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--pos-50)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <CheckCircle2 size={22} color="var(--pos-600)" />
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 19, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Solicitud enviada
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
                Si <strong style={{ color: 'var(--text-2)' }}>{email}</strong> está registrado,{' '}
                recibirás un correo con el enlace de restablecimiento.
              </p>
            </div>

            {/* Token de desarrollo — mostrar solo si no hay email configurado */}
            {devToken && (
              <div style={{
                background: 'var(--warn-50)', border: '1px solid rgba(217,119,6,0.25)',
                borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 20,
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn-600)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Modo desarrollo — sin correo configurado
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Copia este token y úsalo en la página de restablecimiento.
                  En producción esto llegaría al correo.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{
                    flex: 1, fontSize: 11, background: 'var(--surface-2)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    padding: '6px 10px', wordBreak: 'break-all',
                    color: 'var(--text)', fontFamily: 'monospace',
                  }}>
                    {devToken}
                  </code>
                  <button
                    onClick={handleCopy}
                    style={{
                      flexShrink: 0, background: copied ? 'var(--pos-600)' : 'var(--surface)',
                      border: '1px solid var(--border)', borderRadius: 6,
                      padding: '6px 10px', cursor: 'pointer', color: copied ? 'white' : 'var(--text-2)',
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, transition: 'all 0.2s',
                    }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <Link to="/reset-password" className="auth-submit-btn" style={{ textDecoration: 'none', display: 'flex' }}>
              Restablecer contraseña
            </Link>

            <div className="auth-footer-link" style={{ marginTop: 16 }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <ArrowLeft size={13} /> Volver al inicio de sesión
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
