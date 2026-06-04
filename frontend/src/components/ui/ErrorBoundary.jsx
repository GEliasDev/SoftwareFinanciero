import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--neg-50)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1.25rem',
          }}>
            <AlertTriangle size={24} color="var(--neg-600)" />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: '0.5rem' }}>
            Algo salió mal
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Ocurrió un error inesperado. Recarga la página para continuar.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ minWidth: 160 }}
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}
