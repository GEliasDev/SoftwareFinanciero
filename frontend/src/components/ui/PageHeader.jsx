/**
 * Encabezado de página estándar: título + subtítulo opcional + acciones.
 * Uso:
 *   <PageHeader title="Tarjetas" subtitle="..." actions={<button.../>} />
 */
export const PageHeader = ({ title, subtitle, actions, back }) => (
  <div className="page-header">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      {back}
      <div style={{ minWidth: 0 }}>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </div>
    {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
  </div>
);
