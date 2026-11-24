import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { CardPending } from '../CardPending';
import { CardInboxService } from '../../../services/cardInboxService';

vi.mock('../../../services/cardInboxService', () => ({
  CardInboxService: { list: vi.fn(), sync: vi.fn(), approve: vi.fn(), discard: vi.fn() },
}));
// Todos los diálogos se confirman solos.
vi.mock('../../../utils/alerts', () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));

// Monta CardPending como pestaña hija del layout, con el contexto que le pasa CreditCardLayout.
const reload = vi.fn();
const renderTab = (pending) => render(
  <MemoryRouter initialEntries={['/credit-cards/4/pending']}>
    <Routes>
      <Route path="credit-cards/:id" element={<Outlet context={{ pending, reload }} />}>
        <Route path="pending" element={<CardPending />} />
      </Route>
    </Routes>
  </MemoryRouter>
);

const compra = { id: 1, tipo: 'compra', comercio: 'NOVAVENTA', monto: '3200.00', fechaMovimiento: '2026-11-18', creditCardId: 4, numeroCuotas: null };
const compraGuama = { id: 3, tipo: 'compra', comercio: 'QUEST N 33', monto: '100900.00', fechaMovimiento: '2026-10-31', creditCardId: 4, numeroCuotas: 3 };
const pago = { id: 2, tipo: 'pago', comercio: null, monto: '42130.01', fechaMovimiento: '2026-10-30', creditCardId: 4, numeroCuotas: null };

beforeEach(() => {
  vi.clearAllMocks();
  CardInboxService.approve.mockResolvedValue({});
  CardInboxService.discard.mockResolvedValue({});
});

describe('CardPending', () => {
  it('sin movimientos muestra el estado vacío y el botón de sincronizar', () => {
    renderTab([]);
    expect(screen.getByText('No hay movimientos pendientes')).toBeTruthy();
    expect(screen.getByText('Sincronizar ahora')).toBeTruthy();
  });

  it('lista los movimientos de la tarjeta y permite aprobar compras sin elegir tarjeta', () => {
    renderTab([compra, pago]);
    expect(screen.getByText('NOVAVENTA')).toBeTruthy();
    // La compra ya trae su tarjeta: no hay selector, y Aprobar queda habilitado.
    expect(screen.queryByLabelText('Tarjeta')).toBeNull();
    expect(screen.getByText('Aprobar').closest('button').disabled).toBe(false);
    // El pago solo se marca como visto.
    expect(screen.getByText('Marcar como visto')).toBeTruthy();
  });

  it('las cuotas que trae el correo llegan precargadas y marcadas como "del correo"', () => {
    renderTab([compra, compraGuama]);
    expect(screen.getByLabelText('Cuotas (del correo)').value).toBe('3');
    expect(screen.getByLabelText('Cuotas').value).toBe('1');
  });

  it('los botones masivos están deshabilitados hasta seleccionar algo', () => {
    renderTab([compra, pago]);
    expect(screen.getByText(/Aprobar seleccionados \(0\)/).closest('button').disabled).toBe(true);
    expect(screen.getByText(/Descartar seleccionados \(0\)/).closest('button').disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Seleccionar todos/));
    expect(screen.getByText(/Aprobar seleccionados \(2\)/).closest('button').disabled).toBe(false);
  });

  it('aprobar seleccionados registra las compras con las cuotas de cada fila y omite los pagos', async () => {
    renderTab([compra, compraGuama, pago]);
    fireEvent.change(screen.getByLabelText('Cuotas'), { target: { value: '6' } }); // edita la compra sin cuotas del correo
    fireEvent.click(screen.getByLabelText(/Seleccionar todos/));
    fireEvent.click(screen.getByText(/Aprobar seleccionados \(3\)/));

    await waitFor(() => expect(CardInboxService.approve).toHaveBeenCalledTimes(2));
    expect(CardInboxService.approve).toHaveBeenCalledWith(1, { creditCardId: 4, numeroCuotas: 6, categoria: 'otros' });
    expect(CardInboxService.approve).toHaveBeenCalledWith(3, { creditCardId: 4, numeroCuotas: 3, categoria: 'otros' });
    expect(CardInboxService.discard).not.toHaveBeenCalled();
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it('descartar seleccionados descarta todo lo elegido, pagos incluidos', async () => {
    renderTab([compra, pago]);
    fireEvent.click(screen.getByLabelText(/Seleccionar todos/));
    fireEvent.click(screen.getByText(/Descartar seleccionados \(2\)/));

    await waitFor(() => expect(CardInboxService.discard).toHaveBeenCalledTimes(2));
    expect(CardInboxService.approve).not.toHaveBeenCalled();
  });

  it('si una aprobación falla sigue con las demás', async () => {
    CardInboxService.approve.mockRejectedValueOnce(new Error('sin cupo')).mockResolvedValue({});
    renderTab([compra, compraGuama]);
    fireEvent.click(screen.getByLabelText(/Seleccionar todos/));
    fireEvent.click(screen.getByText(/Aprobar seleccionados \(2\)/));

    await waitFor(() => expect(CardInboxService.approve).toHaveBeenCalledTimes(2));
  });
});
