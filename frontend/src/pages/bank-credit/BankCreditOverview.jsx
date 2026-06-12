import { useOutletContext } from 'react-router-dom';
import { TrendingDown, Wallet, Percent, Receipt, Info } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { SectionCard } from '../../components/ui/SectionCard';
import { fmt, fmtDateLong } from '../../utils/format';

const TIPO_LABEL = {
  libre_inversion: 'Libre inversión',
  consumo: 'Consumo',
  libranza: 'Libranza',
  vehiculo: 'Vehículo',
  hipotecario: 'Hipotecario',
  fintech: 'Fintech',
  otro: 'Otro',
};

const InfoRow = ({ label, value, money }) => (
  <div>
    <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
    <p className={money ? 'tabular' : ''} style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5 }}>{value}</p>
  </div>
);

export const BankCreditOverview = () => {
  const { credit } = useOutletContext();
  const pct = credit ? (credit.cuotasPagadas / credit.numeroCuotas) * 100 : 0;
  const seguro = parseFloat(credit?.seguro ?? 0);
  const admin = parseFloat(credit?.cuotaAdministracion ?? 0);

  const cuotaDetalle = [
    admin > 0 ? `Admin ${fmt(admin)}` : null,
    seguro > 0 ? `Seguro ${fmt(seguro)}` : null,
  ].filter(Boolean).join(' · ') || 'Solo capital e intereses';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Saldo pendiente" value={fmt(credit?.saldoPendiente)} delta={`${credit?.numeroCuotas - credit?.cuotasPagadas} cuotas restantes`} icon={TrendingDown} tone="neg" />
        <StatCard label="Cuota mensual total" value={fmt(credit?.valorCuota)} delta={cuotaDetalle} icon={Wallet} tone="neutral" />
        <StatCard label="Progreso" value={`${pct.toFixed(0)}%`} delta={`${credit?.cuotasPagadas}/${credit?.numeroCuotas} cuotas`} icon={Percent} tone="pos" />
        <StatCard label="Intereses totales" value={fmt(credit?.totalIntereses)} delta={`${credit?.tasaInteres}% ${credit?.tipoTasa === 'mensual' ? 'M.V.' : 'E.A.'}`} icon={Receipt} tone="neutral" />
      </div>

      <SectionCard title="Detalles del crédito" icon={Info}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <InfoRow label="Entidad" value={credit?.entidad} />
          <InfoRow label="Tipo de crédito" value={TIPO_LABEL[credit?.tipoCredito] ?? 'Otro'} />
          {credit?.numeroReferencia && <InfoRow label="N.° referencia" value={credit.numeroReferencia} />}
          <InfoRow label="Tipo de tasa" value={credit?.tipoTasa === 'mensual' ? 'Mensual (M.V.)' : 'Anual (E.A.)'} />
          <InfoRow label="Tasa de interés" value={`${credit?.tasaInteres}%`} />
          {/* tasaMensual se persiste como fracción (0.0162 = 1,62%) */}
          <InfoRow label="Tasa mensual" value={`${(parseFloat(credit?.tasaMensual ?? 0) * 100).toFixed(2)}%`} />
          <InfoRow label="Monto original" value={fmt(credit?.montoTotal)} money />
          <InfoRow label="Total a pagar" value={fmt(credit?.totalAPagar)} money />
          {admin > 0 && <InfoRow label="Cuota administración" value={fmt(admin)} money />}
          {seguro > 0 && <InfoRow label="Seguro mensual" value={fmt(seguro)} money />}
          <InfoRow label="Día de pago" value={`Día ${credit?.diaPago}`} />
          <InfoRow label="Fecha inicio" value={fmtDateLong(credit?.fechaInicio)} />
          <InfoRow label="Fecha fin est." value={fmtDateLong(credit?.fechaFin)} />
        </div>
      </SectionCard>
    </div>
  );
};
