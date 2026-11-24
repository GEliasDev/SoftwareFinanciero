// Panel de presentación de las pantallas de acceso: una vista previa estática
// (con cifras de ejemplo) de lo que el usuario verá en su Inicio.
export const AuthBrand = () => (
  <span className="brand-logo" aria-label="Debti">
    <span className="brand-mark" aria-hidden="true">D</span>
    <span className="brand-name">Debti</span>
  </span>
);

const PARTS = [
  { label: 'Tarjetas', value: '$3.400.000', color: 'var(--cat-1)', w: 34 },
  { label: 'Créditos', value: '$2.400.000', color: 'var(--cat-2)', w: 24 },
  { label: 'Suscripciones', value: '$360.000', color: 'var(--cat-3)', w: 4 },
  { label: 'Libre', value: '$2.340.000', color: 'var(--pos-500)', w: 23 },
];

export const AuthShowcase = ({ title = 'Tus finanzas, bajo control total', subtitle = 'Un panel unificado para gestionar deudas, tarjetas y créditos con claridad.' }) => (
  <div className="auth-show" aria-hidden="true">
    <h2 className="auth-show-title">{title}</h2>
    <p className="auth-show-sub">{subtitle}</p>
    <div className="card auth-show-card">
      <div className="row-between">
        <span className="text-sm text-secondary">Dinero libre del mes</span>
        <span className="badge badge-success">Buena · 72/100</span>
      </div>
      <p className="amount-lg" style={{ fontSize: 34, margin: '10px 0 14px' }}>$2.340.000</p>
      <div className="split-bar">{PARTS.map(p => <span key={p.label} style={{ flexGrow: p.w, background: p.color }} />)}</div>
      <div className="auth-show-legend">
        {PARTS.map(p => (
          <span key={p.label}><i style={{ background: p.color }} />{p.label}<b className="n">{p.value}</b></span>
        ))}
      </div>
    </div>
    <div className="card card-flush auth-show-card row-list">
      <div className="pay-row"><span style={{ flex: 1 }}><span className="cell-title">Visa Signature</span><span className="cell-sub">Tarjeta · Bancolombia</span></span><span className="badge badge-warning">En 3 días</span><b className="n">$1.850.000</b></div>
      <div className="pay-row"><span style={{ flex: 1 }}><span className="cell-title">Libre inversión</span><span className="cell-sub">Crédito · cuota 19 de 48</span></span><span className="text-sm text-secondary">En 8 días</span><b className="n">$1.420.000</b></div>
    </div>
    <p className="auth-show-foot">Pesos colombianos · Datos privados · Tarjetas, créditos, suscripciones e ingresos en un solo lugar</p>
  </div>
);
