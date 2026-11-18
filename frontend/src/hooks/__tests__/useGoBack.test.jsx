import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useGoBack } from '../useGoBack';

const Edit = () => {
  const goBack = useGoBack('/credit-cards/4');
  return <button onClick={goBack}>atrás</button>;
};
const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const montar = (entradas, indice) => render(
  <MemoryRouter initialEntries={entradas} initialIndex={indice}>
    <Where />
    <Routes>
      <Route path="*" element={null} />
      <Route path="/credit-cards/4/edit" element={<Edit />} />
    </Routes>
  </MemoryRouter>
);

describe('useGoBack', () => {
  it('vuelve a la pestaña de la que venía el usuario', () => {
    montar(['/credit-cards/4/purchases', '/credit-cards/4/edit'], 1);
    fireEvent.click(screen.getByText('atrás'));
    expect(screen.getByTestId('where').textContent).toBe('/credit-cards/4/purchases');
  });

  it('abierta directo por URL (sin historial) usa el destino de respaldo', () => {
    montar(['/credit-cards/4/edit'], 0);
    fireEvent.click(screen.getByText('atrás'));
    expect(screen.getByTestId('where').textContent).toBe('/credit-cards/4');
  });
});
