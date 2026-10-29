import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptToken, decryptToken, isTokenKeyConfigured } from '../gmailToken.js';

const CLAVE = 'a'.repeat(64);

describe('gmailToken', () => {
    let original;
    beforeEach(() => { original = process.env.GMAIL_TOKEN_KEY; process.env.GMAIL_TOKEN_KEY = CLAVE; });
    afterEach(() => { process.env.GMAIL_TOKEN_KEY = original; if (original === undefined) delete process.env.GMAIL_TOKEN_KEY; });

    it('cifra y descifra de ida y vuelta', () => {
        const token = '1//0gRefreshTokenDeEjemplo-abc_123';
        expect(decryptToken(encryptToken(token))).toBe(token);
    });

    it('el token guardado no contiene el texto plano y cambia en cada cifrado (IV aleatorio)', () => {
        const a = encryptToken('secreto');
        const b = encryptToken('secreto');
        expect(a).not.toContain('secreto');
        expect(a).not.toBe(b);
    });

    it('un token alterado no se descifra (GCM autentica)', () => {
        const [iv, tag, data] = encryptToken('secreto').split('.');
        const roto = [iv, tag, Buffer.from('otra-cosa').toString('base64')].join('.');
        expect(() => decryptToken(roto)).toThrow();
        expect(() => decryptToken([iv, Buffer.from('x'.repeat(16)).toString('base64'), data].join('.'))).toThrow();
    });

    it('falla con 503 si la clave no está configurada o es inválida', () => {
        delete process.env.GMAIL_TOKEN_KEY;
        expect(isTokenKeyConfigured()).toBe(false);
        expect(() => encryptToken('x')).toThrow(/GMAIL_TOKEN_KEY/);
        process.env.GMAIL_TOKEN_KEY = 'corta';
        expect(isTokenKeyConfigured()).toBe(false);
        expect(() => encryptToken('x')).toThrow(/GMAIL_TOKEN_KEY/);
    });
});
