import crypto from 'crypto';
import { AppError } from '../../middlewares/appError.js';

// Cifrado del refresh token de Gmail en reposo: AES-256-GCM con la clave
// GMAIL_TOKEN_KEY (64 caracteres hex = 32 bytes). Formato guardado: iv.tag.datos (base64).
const getKey = () => {
    const hex = process.env.GMAIL_TOKEN_KEY;
    if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new AppError('Gmail no está configurado en el servidor (GMAIL_TOKEN_KEY inválida o ausente)', 503);
    }
    return Buffer.from(hex, 'hex');
};

export const isTokenKeyConfigured = () => /^[0-9a-fA-F]{64}$/.test(process.env.GMAIL_TOKEN_KEY ?? '');

export const encryptToken = (plain) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join('.');
};

export const decryptToken = (stored) => {
    const [iv, tag, data] = String(stored).split('.').map(p => Buffer.from(p, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};
