import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { AuthBrand } from '../components/ui/AuthShowcase';

export const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="nf">
      <div className="nf-brand"><AuthBrand /></div>
      <div className="nf-body">
        <p className="nf-code n">404</p>
        <h1 className="page-title">No encontramos esta página</h1>
        <p className="page-subtitle" style={{ maxWidth: 360, margin: '8px auto 24px' }}>
          La dirección no existe o cambió. Revisa el enlace o vuelve a tu inicio.
        </p>
        <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/')}><Home size={16} /> Ir al inicio</button>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>Volver atrás</button>
        </div>
      </div>
    </div>
  );
};
