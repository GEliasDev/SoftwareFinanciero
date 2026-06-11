import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { BrandMark } from '../components/ui/BrandMark';

export const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem', textAlign: 'center',
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <BrandMark size={72} />
      </div>

      <p style={{ fontSize: 72, fontWeight: 800, color: 'var(--brand-600)', lineHeight: 1, marginBottom: '0.5rem', fontVariantNumeric: 'tabular-nums' }}>
        404
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>
        Página no encontrada
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 340, marginBottom: '2rem' }}>
        La dirección que buscas no existe o fue movida.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <Compass size={14} /> Ir al Dashboard
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Volver atrás
        </button>
      </div>
    </div>
  );
};
