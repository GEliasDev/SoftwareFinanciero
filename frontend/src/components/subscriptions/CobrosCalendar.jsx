import { fmtK } from '../../utils/format';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MES = (d) => d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

/**
 * Calendario del mes en curso con los días de cobro de las suscripciones
 * resaltados (punto índigo + monto). El día de hoy se marca con borde.
 */
export const CobrosCalendar = ({ subscriptions }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();   // 0 = domingo
  const offset = (firstWeekday + 6) % 7;                    // semana inicia lunes

  // Cobros por día del mes.
  const byDay = {};
  subscriptions.forEach(s => {
    const d = Number(s.diaCobro);
    if (!d) return;
    (byDay[d] = byDay[d] || { total: 0, count: 0 }).total += Number(s.monto ?? 0);
    byDay[d].count += 1;
  });

  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const cobro = byDay[day];
          const isToday = day === todayDay;
          const isPast = day < todayDay;
          return (
            <div
              key={day}
              style={{
                minHeight: 52,
                borderRadius: 'var(--radius-sm)',
                border: isToday ? '1.5px solid var(--brand-600)' : '1px solid var(--border)',
                background: cobro ? 'var(--brand-50)' : 'var(--surface)',
                padding: '4px 6px',
                opacity: isPast && !cobro ? 0.5 : 1,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--brand-700)' : 'var(--text-3)' }}>{day}</span>
              {cobro && (
                <div style={{ lineHeight: 1.1 }}>
                  <div className="tabular" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--brand-700)' }}>{fmtK(cobro.total)}</div>
                  {cobro.count > 1 && <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{cobro.count} cobros</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '10px 0 0', textTransform: 'capitalize' }}>{MES(today)}</p>
    </div>
  );
};
