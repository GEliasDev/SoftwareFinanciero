import jwt from 'jsonwebtoken';
import { GmailConnection } from './gmailConnection.model.js';
import { encryptToken, decryptToken, isTokenKeyConfigured } from './gmailToken.js';
import { AppError } from '../../middlewares/appError.js';
import logger from '../../utils/logger.js';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';
// Solo lectura: Debti nunca envía, modifica ni borra correos.
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const STATE_PURPOSE = 'gmail-oauth';

export const isConfigured = () => Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI
) && isTokenKeyConfigured();

const assertConfigured = () => {
    if (!isConfigured()) throw new AppError('Gmail no está configurado en el servidor', 503);
};

// El callback lo invoca el navegador desde Google, sin cabecera Authorization:
// la identidad viaja en `state`, un JWT de propósito especial (authenticateToken
// lo rechaza como sesión por llevar `purpose`).
const signState = (userId) => jwt.sign({ id: userId, purpose: STATE_PURPOSE }, process.env.JWT_SECRET, { expiresIn: '10m' });

const verifyState = (state) => {
    try {
        const payload = jwt.verify(state, process.env.JWT_SECRET);
        if (payload.purpose !== STATE_PURPOSE) throw new Error('purpose');
        return payload.id;
    } catch {
        throw new AppError('Estado de autorización inválido o vencido', 400);
    }
};

const postForm = async (url, params) => {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
};

export const GmailService = {
    getStatus: async (userId) => {
        const conn = await GmailConnection.findOne({ where: { userId } });
        return {
            configured: isConfigured(),
            connected: Boolean(conn),
            googleEmail: conn?.googleEmail ?? null,
            lastSyncAt: conn?.lastSyncAt ?? null,
        };
    },

    getAuthUrl: (userId) => {
        assertConfigured();
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            response_type: 'code',
            scope: SCOPE,
            access_type: 'offline',   // para recibir refresh_token
            prompt: 'consent',        // Google solo entrega refresh_token en el primer consentimiento
            state: signState(userId),
        });
        return `${AUTH_URL}?${params}`;
    },

    // Devuelve el userId conectado. Lanza AppError si algo falla.
    handleCallback: async (code, state) => {
        assertConfigured();
        const userId = verifyState(state);

        const tokens = await postForm(TOKEN_URL, {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        });
        if (!tokens.ok) {
            logger.warn(`Gmail OAuth: fallo al canjear el código (${tokens.status} ${tokens.body.error ?? ''})`);
            throw new AppError('Google rechazó la autorización', 400);
        }
        const { access_token: accessToken, refresh_token: refreshToken } = tokens.body;
        if (!refreshToken) throw new AppError('Google no entregó permiso de acceso continuo; vuelve a conectar', 400);

        const profile = await fetch(PROFILE_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!profile.ok) {
            const detalle = (await profile.json().catch(() => ({}))).error ?? {};
            logger.warn(`Gmail OAuth: perfil falló (${profile.status} ${detalle.status ?? ''} ${detalle.message ?? ''})`);
            // 403 con la API apagada: Google la nombra "Gmail API has not been used … or it is disabled".
            if (profile.status === 403) {
                throw new AppError('La API de Gmail no está activada en el proyecto de Google Cloud', 502);
            }
            throw new AppError('No se pudo leer el perfil de Gmail', 502);
        }
        const { emailAddress } = await profile.json();

        const values = { googleEmail: emailAddress, refreshToken: encryptToken(refreshToken), lastSyncAt: null };
        const existing = await GmailConnection.findOne({ where: { userId } });
        if (existing) await existing.update(values);
        else await GmailConnection.create({ userId, ...values });
        logger.info(`User ${userId} conectó Gmail`);
        return userId;
    },

    // Revoca el permiso en Google (best effort) y borra el token guardado.
    disconnect: async (userId) => {
        const conn = await GmailConnection.findOne({ where: { userId } });
        if (!conn) return;
        try {
            await postForm(REVOKE_URL, { token: decryptToken(conn.refreshToken) });
        } catch (e) {
            logger.warn(`Gmail: no se pudo revocar el token en Google (${e.message}); se borra igual`);
        }
        await conn.destroy();
        logger.info(`User ${userId} desconectó Gmail`);
    },
};
