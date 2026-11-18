# Debti

App de **finanzas personales** (es-CO, COP): tarjetas de crédito, créditos bancarios, suscripciones, ingresos,
reportes y movimientos por aprobar desde Gmail. Las reglas globales (`~/.claude/CLAUDE.md`) aplican; este
archivo solo agrega contexto del proyecto y se mantiene corto a propósito (se carga en cada sesión).

## Stack y comandos
- Frontend `frontend/`: React 19 + Vite 8, react-router-dom 7, recharts, sweetalert2, xlsx. CSS plano con variables.
- Backend `backend/`: Node + Express + Sequelize + Zod. PostgreSQL en Supabase (credenciales en `backend/.env`: no leer).
- Todo junto: `npm run dev` (raíz). Frontend: `cd frontend && npm run dev` (:5174) · `build` · `lint` · `test`.
  Backend: `cd backend && npm run dev` (nodemon :3001) · `test`.

## Mapa del backend
`backend/src/modules/<nombre>/` con `.model.js` · `.schema.js` (Zod) · `.service.js` (lógica; lanza `AppError`) ·
`.controller.js` · `.routes.js`. Módulos: `user creditCard bankCredit suscription(sin "b") analytics income
search cardInbox`. Cron en `backend/src/jobs/`. Utils en `backend/src/utils/`.
Compromisos fijos, Metas de ahorro, Presupuesto, Patrimonio neto y Notificaciones push se eliminaron el 2026-11-18 (código y tablas).

## Reglas que no se negocian
- **Esquema**: `sequelize.sync()` no modifica tablas existentes; cambios de esquema van por migración
  (`npx sequelize-cli migration:generate` → `db:migrate`). Detalle en `docs/backend.md`.
- **Dinero**: DECIMAL llega como STRING (`parseFloat`); cupo de tarjeta solo con `literal` atómico (`LEAST`/`GREATEST`);
  `comision` y `cuota_manejo` son cupo-neutral; inputs de dinero con `<MoneyInput>`, nunca `type="number"`.
- **Fechas (UTC-5)**: nunca `toISOString()` ni `new Date('YYYY-MM-DD')` para "hoy"/mostrar; usar `localISODate`,
  `parseLocalDate`, `localToday`; días de ciclo 29-31 con `effectiveDayInMonth`.
- **Seguridad**: todo endpoint que lee/escribe datos de un usuario verifica dueño (`req.user.id`, `findOwnedCard`/
  `findOwnedPurchase`); `authenticateToken` rechaza tokens con `purpose`.
- **Zod** descarta claves desconocidas sin error: confirmar que el campo exista en el `updateSchema`.
- **Estados**: `Subscription.status` = `'activa'`; `BankCredit`/`Income` = `'activo'`.
- Al corregir un bug de cálculo, agregar test de regresión (Vitest; foco en dinero y fechas).

## Documentación bajo demanda (leer solo lo que la tarea necesite)
- `docs/backend.md` — arquitectura, BD y migraciones, auth/2FA, tipos de compra, suscripciones↔tarjeta, jobs, analytics.
- `docs/gotchas.md` — bugs reales ya encontrados (dinero, fechas, seguridad, formularios, PWA).
- `docs/frontend.md` — rutas, utilidades y componentes funcionales.
- `docs/testing.md` — tests y verificación visual con Playwright (`%TEMP%\pw-runner\`).
- `docs/auditoria-2026-06-11.md` — auditoría histórica; la sección E (movimientos unificados, patrimonio neto, import CSV, 2FA) es roadmap.
- Documentación técnica externa (arquitectura, BD, despliegue, seguridad):
  `C:\Users\GabrielEliasValdelam\Desktop\Documentaciones\Documentación Mis Proyectos\Documentacion-Tecnica-SoftwareFinanciero-Debti.md`.
  Actualizar sus secciones cuando un cambio significativo (módulo, endpoint, migración, variable de entorno, despliegue) las deje desfasadas.

## Diseño
No hay reglas de diseño vigentes (retiradas 2026-10-29; se hará un rediseño). No inventar convenciones visuales: seguir el código existente.

## Mantenimiento
Gotchas, decisiones y rutas nuevas van en el archivo de `docs/` que corresponda, no aquí. Mantener este archivo bajo ~80 líneas.
Skills útiles: `superpowers:brainstorming` (antes de features), `superpowers:systematic-debugging`, `superpowers:test-driven-development`,
`superpowers:verification-before-completion`.
