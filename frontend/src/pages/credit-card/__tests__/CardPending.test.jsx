import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { CardPending } from '../CardPending';

// Monta CardPending como pestaña hija del layout, con el contexto que le pasa CreditCardLayout.
const renderTab = (pending) => render(
  <MemoryRouter initialEntries={['/credit-cards/4/pending']}>
    <Routes>
      <Route path="credit-cards/:id" element={<Outlet context={{ pending, reload: () => {} }} />}>
        <Route path="pending" element={<CardPending />} />
      </Route>
    </Routes>
  </MemoryRouter>
);

const compra = { id: 1, tipo: 'compra', comercio: 'NOVAVENTA', monto: '3200.00', fechaMovimiento: '2026-11-18', creditCardId: 4, numeroCuotas: null };
const pago = { id: 2, tipo: 'pago', comercio: null, monto: '42130.01', fechaMovimiento: '2026-10-30', creditCardId: 4, numeroCuotas: null };

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
});
