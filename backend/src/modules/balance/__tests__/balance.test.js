import { describe, it, expect } from 'vitest';
import { createSchema, updateSchema } from '../balance.schema.js';
import { periodoAnterior, filasCopiadas, errorDeActualizacion } from '../balance.logic.js';

const base = { anio: 2026, mes: 11 };

describe('createSchema', () => {
    it('acepta una fila manual con monto', () => {
        const r = createSchema.parse({ ...base, items: [{ tipo: 'gasto', descripcion: 'Aporte Casa', categoria: 'Hogar', monto: 80000 }] });
        expect(r.items[0]).toMatchObject({ origen: 'manual', estado: 'pendiente', origenId: null, monto: 80000 });
    });

    it('rechaza fila manual sin monto', () => {
        expect(() => createSchema.parse({ ...base, items: [{ tipo: 'gasto', descripcion: 'X', categoria: 'Otros' }] })).toThrow();
    });

    it('acepta tarjeta enlazada con monto automático (null)', () => {
        const r = createSchema.parse({ ...base, items: [{ tipo: 'gasto', descripcion: 'RappiCard', categoria: 'Tarjetas', origen: 'tarjeta', origenId: 3 }] });
        expect(r.items[0].monto).toBeNull();
    });

    it('rechaza origen enlazado sin origenId o con tipo incorrecto', () => {
        expect(() => createSchema.parse({ ...base, items: [{ tipo: 'gasto', descripcion: 'X', categoria: 'Tarjetas', origen: 'tarjeta' }] })).toThrow();
        expect(() => createSchema.parse({ ...base, items: [{ tipo: 'ingreso', descripcion: 'X', categoria: 'Tarjetas', origen: 'tarjeta', origenId: 1 }] })).toThrow();
    });

    it('rechaza estado que no corresponde al tipo', () => {
        expect(() => createSchema.parse({ ...base, items: [{ tipo: 'ingreso', descripcion: 'Sueldo', categoria: 'Sueldo', monto: 1, estado: 'pagado' }] })).toThrow();
        expect(() => createSchema.parse({ ...base, items: [{ tipo: 'gasto', descripcion: 'X', categoria: 'Otros', monto: 1, estado: 'recibido' }] })).toThrow();
    });

    it('rechaza mes fuera de rango', () => {
        expect(() => createSchema.parse({ anio: 2026, mes: 13, items: [{ tipo: 'gasto', descripcion: 'X', categoria: 'Otros', monto: 1 }] })).toThrow();
    });
});

describe('updateSchema', () => {
    it('permite volver a monto automático (null)', () => {
        expect(updateSchema.parse({ monto: null })).toEqual({ monto: null });
    });
});

describe('periodoAnterior', () => {
    it('enero pasa a diciembre del año anterior', () => {
        expect(periodoAnterior({ anio: 2027, mes: 1 })).toEqual({ anio: 2026, mes: 12 });
        expect(periodoAnterior({ anio: 2026, mes: 11 })).toEqual({ anio: 2026, mes: 10 });
    });
});

describe('filasCopiadas', () => {
    const origen = [
        { userId: 1, tipo: 'gasto', descripcion: 'Aporte Casa', categoria: 'Hogar', monto: '80000.00', estado: 'pagado', origen: 'manual', origenId: null },
        { userId: 1, tipo: 'gasto', descripcion: 'RappiCard', categoria: 'Tarjetas', monto: '1965000.00', estado: 'pagado', origen: 'tarjeta', origenId: 7 },
        { userId: 1, tipo: 'ingreso', descripcion: 'Bono', categoria: 'Ingresos extra', monto: null, estado: 'recibido', origen: 'ingreso', origenId: 9 },
        { userId: 1, tipo: 'ingreso', descripcion: 'Sueldo', categoria: 'Sueldo', monto: null, estado: 'recibido', origen: 'ingreso', origenId: 8 },
    ];
    const filas = filasCopiadas(origen, { anio: 2026, mes: 12 }, new Set([9]));

    it('pone todo en pendiente y en el mes destino', () => {
        expect(filas.every(f => f.estado === 'pendiente' && f.anio === 2026 && f.mes === 12)).toBe(true);
    });
    it('mantiene el monto de las manuales y vuelve automático el de las enlazadas', () => {
        expect(filas.find(f => f.descripcion === 'Aporte Casa').monto).toBe('80000.00');
        expect(filas.find(f => f.descripcion === 'RappiCard').monto).toBeNull();
    });
    it('no copia ingresos extra de Debti', () => {
        expect(filas.map(f => f.descripcion)).toEqual(['Aporte Casa', 'RappiCard', 'Sueldo']);
    });
});

describe('errorDeActualizacion', () => {
    it('valida estado según tipo y monto obligatorio en manuales', () => {
        expect(errorDeActualizacion({ tipo: 'ingreso', origen: 'manual' }, { estado: 'pagado' })).toMatch(/Estado/);
        expect(errorDeActualizacion({ tipo: 'gasto', origen: 'manual' }, { monto: null })).toMatch(/monto/);
        expect(errorDeActualizacion({ tipo: 'gasto', origen: 'tarjeta' }, { monto: null, estado: 'pagado' })).toBeNull();
    });
});
