import { Link } from 'react-router-dom';

const CONTACTO = 'gvaldelamar2003@gmail.com';

export const PrivacyPolicy = () => (
  <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px', color: 'var(--text)', lineHeight: 1.6 }}>
    <p style={{ margin: '0 0 16px' }}><Link to="/login">← Volver a Debti</Link></p>
    <h1 style={{ fontSize: 26, margin: '0 0 4px' }}>Política de privacidad de Debti</h1>
    <p style={{ color: 'var(--text-3)', margin: '0 0 24px' }}>Última actualización: 29 de octubre de 2026</p>

    <h2>1. Qué es Debti</h2>
    <p>
      Debti es una aplicación de finanzas personales para llevar el control de tarjetas de crédito, créditos,
      suscripciones, ingresos, compromisos fijos, metas de ahorro y presupuesto.
    </p>

    <h2>2. Datos que guardamos</h2>
    <ul>
      <li>Datos de tu cuenta: nombre, correo y contraseña (almacenada con hash, nunca en texto plano).</li>
      <li>La información financiera que tú registras o importas en la aplicación.</li>
      <li>Si activas la verificación en dos pasos, el secreto necesario para generar los códigos.</li>
    </ul>

    <h2>3. Conexión con Gmail</h2>
    <p>
      Si decides conectar tu cuenta de Gmail, Debti solicita el permiso de solo lectura
      (<code>gmail.readonly</code>) con un único fin: detectar las alertas de transacciones que envía tu banco
      y proponerte los movimientos de tus tarjetas.
    </p>
    <ul>
      <li>Solo se buscan correos de los remitentes de los bancos que configuras; el resto de tu correo no se lee.</li>
      <li>De cada alerta se guardan únicamente los datos del movimiento (monto, comercio, fecha y últimos dígitos de la tarjeta), no el contenido completo del correo.</li>
      <li>Debti no envía, modifica, archiva ni borra ningún correo.</li>
      <li>El acceso es opcional y puedes desconectarlo en cualquier momento desde tu perfil; al hacerlo se elimina el token de acceso guardado.</li>
    </ul>
    <p>
      El uso que Debti hace de la información recibida de las APIs de Google se ajusta a la
      {' '}<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
      Política de datos de usuario de los servicios de las APIs de Google</a>, incluidos los requisitos de uso limitado.
    </p>

    <h2>4. Cómo usamos tus datos</h2>
    <p>
      Solo para prestarte el servicio: calcular tus obligaciones, mostrarte reportes y, si lo activas, proponerte
      movimientos pendientes para que los apruebes. No vendemos tus datos, no los compartimos con terceros con fines
      publicitarios y no los usamos para entrenar modelos de inteligencia artificial.
    </p>

    <h2>5. Almacenamiento y seguridad</h2>
    <p>
      Los datos se guardan en una base de datos PostgreSQL con conexión cifrada. El acceso a la aplicación usa
      sesiones con token y puedes activar verificación en dos pasos. Ningún sistema es infalible, pero aplicamos
      medidas razonables para proteger tu información.
    </p>

    <h2>6. Tus derechos</h2>
    <ul>
      <li>Descargar todos tus datos desde Perfil → "Exporta tus datos".</li>
      <li>Desconectar Gmail cuando quieras.</li>
      <li>Solicitar la eliminación de tu cuenta y de tus datos escribiendo al contacto indicado abajo.</li>
    </ul>

    <h2>7. Cambios a esta política</h2>
    <p>Si cambiamos esta política, actualizaremos la fecha al inicio de esta página.</p>

    <h2>8. Contacto</h2>
    <p>Para cualquier consulta sobre privacidad: <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.</p>
  </div>
);
