import { describe, it, expect } from 'vitest';
import { attachAdvanceCommission } from '../creditCard';

describe('attachAdvanceCommission', () => {
  it('une la comisión al avance correspondiente sin duplicarla en la lista', () => {
    const purchases = [
      { id: 10, tipo: 'avance', descripcion: 'Avance en efectivo', status: 'activa' },
      { id: 11, tipo: 'comision', avanceId: 10, descripcion: 'Comisión por avance', montoTotal: 25000, status: 'activa' },
      { id: 12, tipo: 'compra', descripcion: 'Compra normal', status: 'activa' },
    ];

    const result = attachAdvanceCommission(purchases);

    expect(result).toHaveLength(2);
    expect(result[0].tipo).toBe('avance');
    expect(result[0].commission).toMatchObject({ id: 11, avanceId: 10, montoTotal: 25000 });
    expect(result[1].tipo).toBe('compra');
  });

  it('deja las comisiones sin avance como registros independientes', () => {
    const purchases = [
      { id: 7, tipo: 'comision', descripcion: 'Comisión aislada', status: 'activa' },
    ];

    expect(attachAdvanceCommission(purchases)).toEqual(purchases);
  });
});
