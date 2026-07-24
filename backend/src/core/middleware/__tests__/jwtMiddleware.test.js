import { describe, it, expect, beforeAll, vi } from 'vitest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { authenticateToken } = await import('../jwtMiddleware.js');

const run = (token) => {
    const req = { headers: token ? { authorization: `Bearer ${token}` } : {}, originalUrl: '/x' };
    const res = {};
    return new Promise((resolve) => {
        authenticateToken(req, res, (err) => resolve({ err, req }));
    });
};

describe('authenticateToken', () => {
    it('acepta un token de sesión normal (sin purpose)', async () => {
        const t = jwt.sign({ id: 6, email: 'a@b.co', isAdmin: false }, process.env.JWT_SECRET);
        const { err, req } = await run(t);
        expect(err).toBeUndefined();
        expect(req.user.id).toBe(6);
    });

    it('RECHAZA el tempToken de 2FA (purpose:2fa-pending) — cierra el bypass', async () => {
        const temp = jwt.sign({ id: 6, purpose: '2fa-pending' }, process.env.JWT_SECRET);
        const { err } = await run(temp);
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
    });

    it('rechaza cualquier token con un purpose desconocido', async () => {
        const t = jwt.sign({ id: 6, purpose: 'password-reset' }, process.env.JWT_SECRET);
        const { err } = await run(t);
        expect(err).toBeDefined();
    });

    it('rechaza si no hay token', async () => {
        const { err } = await run(null);
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
    });

    it('rechaza un token con firma inválida', async () => {
        const t = jwt.sign({ id: 6 }, 'otro-secreto');
        const { err } = await run(t);
        expect(err).toBeDefined();
    });
});
