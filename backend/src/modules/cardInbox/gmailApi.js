import { AppError } from '../../middlewares/appError.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

// ── Texto del correo ────────────────────────────────────────────────────────

const ENTIDADES = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
    Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ',
};

const decodeEntities = (s) => s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTIDADES[n] ?? m);

// HTML → texto plano con celdas separadas por espacios (el parser normaliza el resto).
export const htmlToText = (html) => decodeEntities(
    String(html)
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<br\s*\/?>|<\/(td|th|tr|p|div|li|h[1-6]|table)>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
).replace(/\s+/g, ' ').trim();

const b64url = (data) => Buffer.from(String(data), 'base64url').toString('utf8');

// Candidatos de texto del mensaje: text/plain primero, luego el HTML convertido.
export const extractTexts = (payload) => {
    const plain = [];
    const html = [];
    const walk = (part) => {
        if (!part) return;
        if (part.body?.data) {
            if (part.mimeType === 'text/plain') plain.push(b64url(part.body.data));
            else if (part.mimeType === 'text/html') html.push(htmlToText(b64url(part.body.data)));
        }
        (part.parts ?? []).forEach(walk);
    };
    walk(payload);
    return [...plain, ...html];
};

// Asuntos con tildes pueden venir como "=?UTF-8?B?...?=" (RFC 2047).
export const decodeMimeWords = (value) => String(value ?? '').replace(
    /=\?([\w-]+)\?([bBqQ])\?([^?]*)\?=/g,
    (_, charset, enc, text) => {
        try {
            const bytes = enc.toUpperCase() === 'B'
                ? Buffer.from(text, 'base64')
                : Buffer.from(text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16))), 'latin1');
            return new TextDecoder(charset).decode(bytes);
        } catch {
            return text;
        }
    }
);

// ── Llamadas a Gmail ────────────────────────────────────────────────────────

export const getAccessToken = async (refreshToken) => {
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        // invalid_grant = el usuario revocó el acceso (o el token caducó): hay que reconectar.
        if (body.error === 'invalid_grant') throw new AppError('Gmail se desconectó; vuelve a conectarlo desde el perfil', 401);
        throw new AppError('No se pudo renovar el acceso a Gmail', 502);
    }
    return body.access_token;
};

const gmailGet = async (accessToken, path) => {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new AppError(`Gmail respondió ${res.status}`, 502);
    return res.json();
};

export const listMessageIds = async (accessToken, query, max = 50) => {
    const params = new URLSearchParams({ q: query, maxResults: String(max) });
    const data = await gmailGet(accessToken, `/messages?${params}`);
    return (data.messages ?? []).map(m => m.id);
};

export const getMessage = async (accessToken, id) => {
    const msg = await gmailGet(accessToken, `/messages/${id}?format=full`);
    const header = (name) => msg.payload?.headers?.find(h => h.name.toLowerCase() === name)?.value;
    return {
        id: msg.id,
        subject: decodeMimeWords(header('subject')),
        from: header('from') ?? '',
        texts: extractTexts(msg.payload),
    };
};
