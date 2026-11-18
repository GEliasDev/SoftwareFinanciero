# Backend — referencia (cargar solo si la tarea toca backend)

## Arquitectura
Cada recurso: `backend/src/modules/<nombre>/` con
`<nombre>.model.js` (Sequelize) · `.schema.js` (Zod) · `.service.js` (lógica; valida con Zod) ·
`.controller.js` (req/res → service) · `.routes.js` (Express + JWT) · `utils/` (cálculos puros).
El service lanza `throw new AppError('msg', status)`; `errorHandler` (`main.js`) lo vuelve JSON.

Módulos: `user | creditCard | bankCredit | suscription | analytics | income | search |
pushSubscription | netWorth | cardInbox`.
Typo histórico: la carpeta es `suscription` (sin "b").

Utils en `backend/src/utils/`: `emailService.js`, `logger.js` (winston), `currency.js`
(`toCOP(monto, moneda)`, env `TRM_USD`/`TRM_EUR`), `categories.js` (`CATEGORIAS`, taxonomía única de
gasto; la usa `creditCard.schema.js`; el frontend tiene su
propio `CATEGORIES` en `utils/creditCard.js` — mantener en sync a mano), `cycleDay.js`
(`effectiveDayInMonth`), `localDate.js` (`localToday`, `localMonth`).

## Base de datos
- PostgreSQL en Supabase. Credenciales en `backend/.env` (no leer). SSL automático salvo localhost.
- `sequelize.sync()` (sin `alter`) corre en cada arranque: crea tablas faltantes, **nunca modifica
  una existente**. Cambios de esquema → migración:
  1. Editar `<módulo>.model.js`.
  2. `npx sequelize-cli migration:generate --name algo` (`.cjs` en `src/db/migrations/`; `up`/`down` a mano con `queryInterface`).
  3. `npx sequelize-cli db:migrate` (`.sequelizerc` → `src/db/migrations-config.cjs`).
- Las FKs NO tienen `ON DELETE CASCADE`: borrar un padre exige borrar hijos antes en el service (error 23503).
- `sync({ alter: true })` duplicaba UNIQUE en cada arranque (298 en `users.email`, 52 en
  `push_subscriptions.endpoint`, 2026-07-10). Si reaparecen: `SELECT conname FROM pg_constraint
  WHERE conrelid='tabla'::regclass AND contype='u'` y `ALTER TABLE ... DROP CONSTRAINT` (dejar 1).
- Modelo NUEVO con `indexes:`: no guardar varios archivos seguidos (cada guardado reinicia nodemon;
  dos `sync()` solapados dan `42P07 relation already exists`, nodemon reintenta solo).

## Auth
- Access token 1h + refresh 30 días (rota en cada uso). `POST /users/login` devuelve ambos;
  `frontend/src/services/api.js` intercepta 401 → `POST /users/refresh-token` en silencio; si falla →
  `/login?expired=1`. Un slot de refresh por usuario (`User.refreshToken`): otro dispositivo invalida el anterior.
- 2FA opcional (TOTP, `otplib` **v13 API funcional/async**: `generate/verify/generateSecret/generateURI`,
  NO el objeto `authenticator` de v11/12). `twoFactorEnabled` solo pasa a `true` tras `/2fa/confirm`.
  Con 2FA activo, login devuelve `{ requiresTwoFactor, tempToken }` (JWT 5 min, solo sirve en
  `/users/2fa/login-verify`).

## CreditCardPurchase.tipo
| tipo | descripción | cupo-neutral |
|---|---|---|
| `compra` | compra en cuotas | no |
| `avance` | avance de efectivo | no |
| `comision` | comisión de avance (auto) | **sí** |
| `cuota_manejo` | cargo mensual cuota de manejo | **sí** |

Cupo-neutral (`comision`, `cuota_manejo`) NUNCA afecta `cupoDisponible` al crear, pagar ni borrar.
`createAdvance` descuenta solo `montoTotal`. Restauración/reversión/borrado/abono excluyen ambos
(`creditCard.service.js`, `scripts/fix-cupo-disponible.js`).

**Comisión de avance**: se paga automática con la **primera cuota** del avance
(`registerPurchasePayment`: `tipo==='avance' && nuevasCuotasPagadas===1` → comisión `{status:'pagada', cuotasPagadas:1}`);
se revierte en `undoPurchasePayment` y al cancelar el avance por abono. No es cuota aparte. Frontend:
`buildSchedule` la suma como línea `isCommission`, `CreditCardLayout.handlePayAll` la excluye del pago individual.
`getPurchaseById` adjunta `commission` al avance (el frontend lo lee como `purchase.commission`).

## Suscripciones ↔ tarjeta
`Subscription.creditCardId` (nullable; validado en `assertCardOwnership` en create y update; `null` desvincula).
Con tarjeta, `subscriptionChargeJob` crea un `CreditCardPurchase` normal (`tipo:'compra'`, 1 cuota, sin interés,
`subscriptionId` seteado — NO un `tipo` nuevo, para que entre solo a analytics).
- Idempotente (busca compra con ese `subscriptionId` y `fechaCompra` en el ciclo actual).
- `mensual` cobra cada mes en `diaCobro`; `anual` solo en el mes de `fechaInicio`.
- Monto a COP con `toCOP()`; sin cupo → salta esa suscripción ese ciclo (warning, sin reintento a mitad de mes).
- Cupo atómico (`literal` + `GREATEST`).
- **Doble conteo**: con `creditCardId` se excluyen de la suma de `montoMensual` en `analytics.service.js`
  (`getSummary`, `getMonthlyTrend`) y en la proyección de `Reports.jsx`. `SubscriptionService.getSummary`
  (total en `/subscriptions`) sí suma todas (informativo).
- `Subscription.status` es `'activa'` (femenino); `BankCredit`/`Income` usan `'activo'`;
  `CreditCardPurchase` `'activa'`. Verificar el enum antes de filtrar.
- Costo mensual = `montoMensual` (no `monto`) convertido con `subMonthlyCOP()` (front: `utils/currency.js`, espejo del backend).

## Módulos eliminados (2026-11-18)
Compromisos fijos (`personalDebt`), Metas de ahorro (`savingsGoal`) y Presupuesto (`budget`) se quitaron del
código (backend, frontend y dependientes: analytics, netWorth, búsqueda, export, Dashboard, Reportes, onboarding).
Las migraciones `20261118130000-drop-personal-debts` y `20261118140000-drop-savings-goals-and-budgets` borran las
tablas `personal_debts` (y `personal_debt_abonos`), `savings_goals`, `budgets` y `budget_expenses`; su `down`
solo recrea la estructura, no los datos.

## Tarjetas con número físico y digital
`CreditCard.ultimos4` (digital) y `ultimos4Fisica` (plástico, opcional). `cardInbox.service.js::resolverTarjeta`
compara el número del correo contra ambos; el avance (sin número) y un número desconocido caen a la única
tarjeta Rappi si hay una sola. Campo editable en `CreditCardEdit.jsx`.

## Jobs (`backend/src/jobs/`)
- `dailyChargesJob.js` — arranca en `main.js`; tick diario 8 AM → `cuotaManejoJob` + `subscriptionChargeJob`.
- `cuotaManejoJob.js` — cargos `cuota_manejo` idempotentes en la fecha de corte de cada tarjeta activa.
- `subscriptionChargeJob.js` — cargo automático de suscripciones con tarjeta.
- `bankCreditMoraJob.js` — marca créditos en mora.
- `weeklyDigestJob.js` — resumen semanal por email (opt-in `User.emailDigest`).
- `netWorthSnapshotJob.js` — día 1 congela `NetWorthSnapshot` del mes cerrado; el mes en curso se calcula en vivo
  (`netWorth.service.js::getHistory`). Activos = 0 (ya no hay fuente: se eliminó Metas de ahorro); pasivos = cupo de tarjeta usado +
  saldo de créditos.

## Analytics y Dashboard
`analytics.service.js::getSummary` devuelve totales + `breakdown` (cuotas mensuales por ítem: `creditCards`,
`bankCredits`, `subscriptions`; **la suma de cada lista = su total en `obligations`**)
+ `debtBreakdown` (SALDOS: `creditCards`, `bankCredits`). Ítem = `{ id, nombre, detalle, monto }`. Categoría
nueva → añadirla a las dos listas.

**Tarjetas en Inicio NO salen de `getSummary`**: Dashboard usa `CreditCardService.getAll()` +
`buildCardStats` (`frontend/src/utils/creditCard.js`, la misma que la página Tarjetas) y sustituye
`obligations.creditCards`/`breakdown.creditCards`, recalcula `total` por delta y `dineroLibre`. El backend conserva
su cálculo (`firstCutMonthIndex`, `nextCardPayment`, `esCompraPendiente`) porque `Reports.jsx` y `getMonthlyTrend`
lo consumen; si se toca, unificar ahí también.

```
dineroLibre = Σ Income.monto (activos)
            − (Subscription.montoMensual activas [sin creditCardId]
               + BankCredit.valorCuota + cuotaAdministracion (activos)
               + CreditCardPurchase.valorCuotaMensual (activas))
```

## Otros
- `GET /users/export`: un JSON con todo del usuario; usa SIEMPRE `req.user.id` (nunca id de URL); registrada ANTES de `/:id`.
- Push (`/api/push/*`): opcional; `webpush.setVapidDetails()` solo si hay llaves VAPID (`isEnabled()`); hoy nada dispara notificaciones.
- Búsqueda: escapa `%`/`_`.
- Scripts de reparación (dry-run; `--apply`): `scripts/fix-cupo-disponible.js` (recalcula cupo desde compras),
  `scripts/fix-comisiones-avances.js` (comisiones de avance `activa` con cuota 1 ya pagada).
- Deploy: frontend `debti-web.onrender.com` configurado a mano en Render (`render.yaml` NO es fuente de verdad;
  rewrites/headers viven en el dashboard). Manifest PWA sale como `binary/octet-stream` (Render no conoce
  `.webmanifest`); tolerable, o fijar header `Content-Type: application/json` en `/manifest.webmanifest`.

## cardInbox — movimientos por correo (en construcción)
Meta: leer alertas de tarjetas desde Gmail (OAuth `gmail.readonly`, un banco primero) y proponerlas en una bandeja de pendientes.
Hecho: `modules/cardInbox/parsers/rappicard.parser.js` (puro, con tests). RappiCard = remitente `noreply@rappicard.co`; tipos por asunto:
`Resumen de transacción` (compra: monto, `*1625`, autorización, comercio, fecha; NO trae cuotas), `Avance Digital` (monto, cuotas, tasas,
costo transaccional, total; NO trae tarjeta), `Comprobante de pago` (pago de la tarjeta). Extractos y publicidad se ignoran.
Montos es-CO (`$21.000`, `$50.000,00`) salvo `Costo Transaccional` (`7000.00`). Huella antidupe: `huella` del parser.
Bancolombia (`alertasynotificaciones@bancolombia.com.co`) solo trae débito/transferencias en este buzón: fuera de alcance.
Hecho también: tablas `gmail_connections` y `card_inbox_items` (migración `20261029170000`), conexión OAuth en
`cardInbox/gmail.service.js` + `gmail.routes.js` (`/api/gmail`: `status`, `auth-url`, `DELETE /`, `callback` público),
refresh token cifrado AES-256-GCM (`gmailToken.js`, clave `GMAIL_TOKEN_KEY` = 64 hex). `state` del OAuth = JWT con
`purpose:'gmail-oauth'` (el callback no lleva sesión). UI: sección "Movimientos desde Gmail" en `Profile.jsx`.
Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (debe coincidir con la autorizada en Google Cloud),
`GMAIL_TOKEN_KEY`, `FRONTEND_URL` (destino tras el callback; por defecto `http://localhost:5174`). Sin ellas `status.configured=false`.
Lectura: `cardInbox.service.js::syncUser` (Gmail `from:noreply@rappicard.co after:<lastSyncAt-1d>`, 1ª vez 30 días) → `gmailApi.js` (HTML→texto,
asunto RFC 2047) → parser → `CardInboxItem` `pendiente` (idempotente por `huella`). Job `jobs/cardInboxSyncJob.js` cada 15 min; manual
`POST /api/card-inbox/sync`; lista `GET /api/card-inbox?status=`. Tarjeta: `resolverTarjeta` (últimos 4; si no coincide y hay UNA sola tarjeta
Rappi → esa; una RappiCard tiene número físico y digital distintos, ej. *1625 y *7583). Cada sync reintenta asignar pendientes sin tarjeta.
Aprobación: `POST /api/card-inbox/:id/approve` (ajustes opcionales: `creditCardId`, `numeroCuotas`, `categoria`, `descripcion`) crea la compra
(`createPurchase`, 1 cuota por defecto) o el avance (`createAdvance`, con las cuotas del correo) por el flujo normal de tarjetas, así cupo e
intereses cuadran; `POST /:id/discard` descarta. Los pagos solo se descartan ("marcar como visto"): no hay registro de pago general.
Ojo: `createAdvance` usa `CreditCard.comisionAvance` de la tarjeta, no el costo transaccional del correo (pueden diferir: 6.500 vs 7.000).
