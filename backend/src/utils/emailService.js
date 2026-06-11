import nodemailer from 'nodemailer';
import logger from './logger.js';

const isConfigured = () =>
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

const FROM = () => process.env.SMTP_FROM || `Debti <${process.env.SMTP_USER}>`;

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

export const emailService = {
  sendWeeklyDigest: async ({ to, nombre, dineroLibre, totalIngresos, obligacionesMensuales, proximosRecordatorios }) => {
    if (!isConfigured()) {
      logger.warn('[emailService] SMTP not configured — skipping weekly digest');
      return;
    }

    const libre = Number(dineroLibre ?? 0);
    const libreColor = libre >= 0 ? '#059669' : '#DC2626';
    const libreLabel = libre >= 0 ? 'Dinero libre este mes' : 'Déficit este mes';

    const reminderRows = (proximosRecordatorios || [])
      .slice(0, 5)
      .map(r => `
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#334155;">${r.titulo}</td>
          <td style="padding:6px 0;font-size:13px;color:#64748b;text-align:right;">${r.fecha}</td>
        </tr>`)
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(15,23,42,.08)">
    <!-- Header -->
    <div style="background:#5B4DF1;padding:28px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;background:rgba(255,255,255,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:22px;font-weight:700;line-height:1">D</span>
      </div>
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px">Debti</span>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <p style="margin:0 0 4px;font-size:13px;color:#64748b;">Resumen semanal</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0f172a;">Hola, ${nombre} 👋</h1>

      <!-- Dinero libre -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">${libreLabel}</p>
        <p style="margin:0;font-size:32px;font-weight:700;color:${libreColor};font-variant-numeric:tabular-nums">${fmt(libre)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;">Ingresos ${fmt(totalIngresos)} — Obligaciones ${fmt(obligacionesMensuales)}</p>
      </div>

      ${reminderRows ? `
      <!-- Próximos recordatorios -->
      <h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#0f172a;">Recordatorios próximos</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tbody>${reminderRows}</tbody>
      </table>` : ''}

      <a href="${process.env.APP_URL || 'https://debti.app'}"
         style="display:block;text-align:center;background:#5B4DF1;color:#fff;font-size:14px;font-weight:600;padding:14px 24px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
        Ver mi dashboard →
      </a>

      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
        Recibes este correo porque activaste el resumen semanal en tu perfil.<br>
        <a href="${process.env.APP_URL || 'https://debti.app'}/profile" style="color:#5B4DF1;">Desactivar</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      const transport = createTransport();
      await transport.sendMail({
        from: FROM(),
        to,
        subject: `Tu resumen semanal Debti — ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}`,
        html,
      });
      logger.info(`[emailService] Weekly digest sent to ${to}`);
    } catch (err) {
      logger.error(`[emailService] Failed to send to ${to}: ${err.message}`);
    }
  },

  sendPasswordReset: async ({ to, nombre, resetUrl }) => {
    if (!isConfigured()) {
      logger.warn('[emailService] SMTP not configured — skipping password reset email');
      return;
    }

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:32px;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 4px rgba(15,23,42,.08)">
    <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px">Restablecer contraseña</h1>
    <p style="color:#334155;font-size:14px;margin:0 0 24px">Hola ${nombre}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
    <a href="${resetUrl}" style="display:block;text-align:center;background:#5B4DF1;color:#fff;font-size:14px;font-weight:600;padding:14px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
      Restablecer contraseña
    </a>
    <p style="color:#94a3b8;font-size:12px;margin:0;">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.</p>
  </div>
</body>
</html>`;

    try {
      const transport = createTransport();
      await transport.sendMail({
        from: FROM(),
        to,
        subject: 'Restablecer contraseña — Debti',
        html,
      });
      logger.info(`[emailService] Password reset email sent to ${to}`);
    } catch (err) {
      logger.error(`[emailService] Failed to send password reset to ${to}: ${err.message}`);
    }
  },
};
