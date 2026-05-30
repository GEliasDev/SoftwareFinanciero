/**
 * Card con cabecera estándar (icono + título + subtítulo + acción opcional).
 * Uso:
 *   <SectionCard title="Próximos pagos" icon={Calendar} action={<button.../>}>
 *     ...contenido...
 *   </SectionCard>
 */
export const SectionCard = ({ title, subtitle, icon: Icon, action, children, style, bodyStyle }) => (
  <div className="card" style={style}>
    <div className="card-header" style={{ marginBottom: 16, paddingBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {Icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 'var(--radius-md)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--brand-50)', color: 'var(--brand-600)',
          }}>
            <Icon size={16} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div style={bodyStyle}>{children}</div>
  </div>
);
