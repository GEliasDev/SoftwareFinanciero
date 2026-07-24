import { describe, it, expect } from 'vitest';
import { detectDelimiter, parseCSV, parseFecha, parseMonto } from '../csvImport';

describe('detectDelimiter', () => {
    it('detecta ; (Excel en español, el caso típico de un extracto local)', () => {
        expect(detectDelimiter('Fecha;Descripcion;Valor\n01/07/2026;Pan;5.000')).toBe(';');
    });

    it('detecta , cuando es el separador', () => {
        expect(detectDelimiter('Fecha,Descripcion,Valor\n2026-07-01,Pan,5000')).toBe(',');
    });

    it('detecta tabulador', () => {
        expect(detectDelimiter('Fecha\tDescripcion\tValor')).toBe('\t');
    });

    it('ignora separadores dentro de comillas', () => {
        expect(detectDelimiter('"Pago; cuota";Valor;Fecha')).toBe(';');
    });
});

describe('parseCSV', () => {
    it('parsea un CSV con ; en varias columnas (antes daba 1 sola)', () => {
        const rows = parseCSV('Fecha;Detalle;Valor\n01/07/2026;Mercado;150.000');
        expect(rows[0]).toEqual(['Fecha', 'Detalle', 'Valor']);
        expect(rows[1]).toEqual(['01/07/2026', 'Mercado', '150.000']);
    });

    it('respeta comillas y comas internas', () => {
        const rows = parseCSV('a,b\n"uno, dos",tres');
        expect(rows[1]).toEqual(['uno, dos', 'tres']);
    });

    it('maneja comillas escapadas ("")', () => {
        const rows = parseCSV('a\n"di ""hola"""');
        expect(rows[1][0]).toBe('di "hola"');
    });
});

describe('parseMonto (formato es-CO)', () => {
    it('interpreta el punto como separador de miles', () => {
        expect(parseMonto('150.000')).toBe(150000);
        expect(parseMonto('$1.500.000,50')).toBe(1500000.5);
    });

    it('interpreta el formato anglosajón', () => {
        expect(parseMonto('1,234.56')).toBe(1234.56);
    });

    it('limpia símbolos y espacios', () => {
        expect(parseMonto('$ 89.900')).toBe(89900);
    });

    it('soporta negativos y devuelve NaN si no hay número', () => {
        expect(parseMonto('-45.000')).toBe(-45000);
        expect(Number.isNaN(parseMonto('abc'))).toBe(true);
    });
});

describe('parseFecha', () => {
    it('acepta DD/MM/YYYY (formato de extracto colombiano)', () => {
        expect(parseFecha('05/07/2026')).toBe('2026-07-05');
    });

    it('acepta YYYY-MM-DD', () => {
        expect(parseFecha('2026-07-05')).toBe('2026-07-05');
    });

    it('rechaza fechas imposibles', () => {
        expect(parseFecha('99/99/9999')).toBeNull();
        expect(parseFecha('32/01/2026')).toBeNull();
        expect(parseFecha('')).toBeNull();
    });

    it('convierte un Date sin correr el día por zona horaria', () => {
        expect(parseFecha(new Date(2026, 6, 1))).toBe('2026-07-01');
    });
});
