import { useNavigate } from 'react-router-dom';

export const EmptyState = ({ icon: Icon, title, description, actionLabel, actionTo, onAction }) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) { onAction(); return; }
    if (actionTo) navigate(actionTo);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center',
      gap: '1rem',
    }}>
      {Icon && (
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '0.25rem',
        }}>
          <Icon size={28} style={{ color: 'var(--text-3)' }} />
        </div>
      )}
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 0.4rem' }}>{title}</p>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5, maxWidth: 320 }}>{description}</p>
        )}
      </div>
      {(actionLabel && (actionTo || onAction)) && (
        <button className="btn btn-primary" onClick={handleAction} style={{ marginTop: '0.25rem' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};
