import { describe, it, expect } from 'vitest';
import { resolverTarjeta } from '../cardInbox.service.js';

const rappi = { id: 4, nombre: 'RappiCard', entidad: 'Rappi', ultimos4: '7583' };
const nu = { id: 22, nombre: 'Tarjeta Abre Caminos', entidad: 'Nu Bank', ultimos4: null };

describe('resolverTarjeta', () => {
    it('prefiere la coincidencia exacta de últimos 4', () => {
        expect(resolverTarjeta([rappi, nu], { ultimos4: '7583' })).toBe(4);
    });

    it('una RappiCard con número físico distinto sigue siendo la única de Rappi', () => {
        expect(resolverTarjeta([rappi, nu], { ultimos4: '1625' })).toBe(4);
    });

    it('el avance (sin últimos 4) va a la única tarjeta Rappi', () => {
        expect(resolverTarjeta([rappi, nu], { ultimos4: null })).toBe(4);
    });

    it('con dos tarjetas Rappi y sin coincidencia exacta no adivina', () => {
        const otra = { id: 30, nombre: 'RappiCard 2', entidad: 'Rappi', ultimos4: '1111' };
        expect(resolverTarjeta([rappi, otra], { ultimos4: '1625' })).toBeNull();
        expect(resolverTarjeta([rappi, otra], { ultimos4: '1111' })).toBe(30);
    });

    it('con dos tarjetas Rappi, el número físico de cada una resuelve exacto', () => {
        const conFisica = { ...rappi, ultimos4Fisica: '1625' };
        const otra = { id: 30, nombre: 'RappiCard 2', entidad: 'Rappi', ultimos4: '1111', ultimos4Fisica: null };
        expect(resolverTarjeta([conFisica, otra], { ultimos4: '1625' })).toBe(4);
        expect(resolverTarjeta([conFisica, otra], { ultimos4: '7583' })).toBe(4);
        expect(resolverTarjeta([conFisica, otra], { ultimos4: '1111' })).toBe(30);
    });

    it('sin últimos 4, cada fuente cae a la única tarjeta de su entidad', () => {
        const bancolombia = { id: 7, nombre: 'Bancolombia Mastercard', entidad: 'Bancolombia', ultimos4: '7439' };
        const guama = { id: 8, nombre: 'Guama', entidad: 'Guama', ultimos4: '7315' };
        const tarjetas = [rappi, nu, bancolombia, guama];
        expect(resolverTarjeta(tarjetas, { fuente: 'guama', ultimos4: null })).toBe(8);
        expect(resolverTarjeta(tarjetas, { fuente: 'nu', ultimos4: '8063' })).toBe(22);
        expect(resolverTarjeta(tarjetas, { fuente: 'bancolombia', ultimos4: '9999' })).toBe(7);
        expect(resolverTarjeta(tarjetas, { fuente: 'rappicard', ultimos4: '1625' })).toBe(4);
    });

    it('sin ninguna tarjeta Rappi queda sin asignar', () => {
        expect(resolverTarjeta([nu], { ultimos4: '1625' })).toBeNull();
    });
});
