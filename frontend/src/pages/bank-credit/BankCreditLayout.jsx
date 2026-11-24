import { useState, useEffect } from 'react';
import { useNavigate, useParams, Outlet, Link, useSearchParams } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Swal from '../../utils/alerts';
import { ArrowLeft, Pencil, Trash2, RotateCcw, MoreHorizontal, Landmark } from 'lucide-react';
import { BankCreditService } from '../../services/bankCreditService';
import { TabNav } from '../../components/ui/TabNav';
import { fmt } from '../../utils/format';

const STATUS_BADGE = {
  activo:    { label: 'Activo',    tone: 'success' },
  pagado:    { label: 'Pagado',    tone: 'neutral' },
  en_mora:   { label: 'En mora',   tone: 'danger' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
};

export const BankCreditLayout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCredit(await BankCreditService.getById(id));
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el crédito.' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);
  const [params, setParams] = useSearchParams();

  const handlePay = async () => {
    const result = await Swal.fire({
      title: 'Registrar pago de cuota',
      html: `Se registrará la cuota ${(credit?.cuotasPagadas ?? 0) + 1} de ${credit?.numeroCuotas} de ${credit?.nombre}.<br/>Valor: ${fmt(credit?.valorCuota)}`,
      icon: 'question', showCancelButton: true,
      confirmButtonText: 'Registrar pago', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setPaying(true);
    try {
      await BankCreditService.registerPayment(id);
      await load();
      Swal.fire({ icon: 'success', title: '¡Cuota registrada!', timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Error al registrar el pago.' });
    } finally {
      setPaying(false);
    }
  };

  const handleUndo = async () => {
    const result = await Swal.fire({
      title: 'Deshacer último pago',
      html: `Se revertirá la cuota ${credit?.cuotasPagadas} de <b>${credit?.nombre}</b>.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Sí, deshacer', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setUndoing(true);
    try {
      await BankCreditService.undoPayment(id);
      await load();
      Swal.fire({ icon: 'success', title: 'Pago revertido', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo revertir el pago.' });
    } finally {
      setUndoing(false);
    }
  };

  // Pago desde "Registrar movimiento" (?accion=pagar).
  useEffect(() => {
    if (loading || params.get('accion') !== 'pagar') return;
    setParams({}, { replace: true });
    if (credit?.status === 'activo' && credit.cuotasPagadas < credit.numeroCuotas) handlePay(); // eslint-disable-line react-hooks/set-state-in-effect
    else Swal.fire({ icon: 'info', title: 'Este crédito no tiene cuotas pendientes' });
  }, [loading, params]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Eliminar este crédito?', text: 'Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await BankCreditService.delete(id);
      navigate('/bank-credits');
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el crédito.' });
    }
  };

  if (loading) return (
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 56, width: 360, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 40, marginBottom: 20 }} />
      <div className="bc-grid">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />)}</div>
    </div>
  );

  const base = `/bank-credits/${id}`;
  const st = STATUS_BADGE[credit?.status] || STATUS_BADGE.activo;
  const tabs = [
    { to: '', label: 'Resumen', end: true },
    { to: 'schedule', label: 'Cronograma' },
    { to: 'analysis', label: 'Análisis' },
  ];
  const canUndo = credit?.cuotasPagadas > 0 && credit?.status !== 'pagado';

  return (
    <div className="animate-fade-in detail-layout">
      <nav className="breadcrumb desktop-flex" aria-label="Ruta">
        <Link to="/bank-credits">Créditos</Link><span aria-hidden="true">/</span><span>{credit?.nombre}</span>
      </nav>

      <div className="detail-head">
        <button className="icon-btn ghost mobile-only" onClick={() => navigate('/bank-credits')} aria-label="Volver a créditos"><ArrowLeft size={20} /></button>
        <span className="list-icon lg desktop-only"><Landmark size={20} /></span>
        <div className="detail-head-text">
          <div className="row" style={{ gap: 10 }}>
            <h1 className="page-title">{credit?.nombre}</h1>
            <span className={`badge badge-${st.tone} desktop-only`}>{st.label}</span>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>{credit?.entidad}{credit?.numeroReferencia ? ` · Obligación ${credit.numeroReferencia}` : ''}</p>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary desktop-flex" onClick={() => navigate(`${base}/edit`)}><Pencil size={16} /> Editar</button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="icon-btn" aria-label="Más acciones"><MoreHorizontal size={18} /></button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="menu-content" align="end" sideOffset={6}>
                <DropdownMenu.Item className="menu-item mobile-flex" onSelect={() => navigate(`${base}/edit`)}><Pencil size={16} /> Editar crédito</DropdownMenu.Item>
                {canUndo && (
                  <DropdownMenu.Item className="menu-item" disabled={undoing} onSelect={handleUndo}>
                    <RotateCcw size={16} /> <span style={{ flex: 1 }}>Deshacer último pago</span><span className="text-sm text-muted">cuota {credit.cuotasPagadas}</span>
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Separator className="menu-sep" />
                <DropdownMenu.Item className="menu-item danger" onSelect={handleDelete}><Trash2 size={16} /> Eliminar crédito</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <TabNav tabs={tabs} base={base} />
      <Outlet context={{ credit, reload: load, handlePay, paying, handleUndo, undoing }} />
    </div>
  );
};
