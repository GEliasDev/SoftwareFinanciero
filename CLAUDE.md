# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Debti — guía para Claude

App de **finanzas personales**. Gestiona tarjetas de crédito,
créditos bancarios, suscripciones, recordatorios y reportes. Español (es-CO, COP).

## Stack
- **Frontend:** React 19 + Vite 8, react-router-dom 7, recharts, sweetalert2, xlsx.
  CSS plano con variables (sin Tailwind). `frontend/`.
- **Backend:** Node + Express + Sequelize, Zod para validación. `backend/`.
- Auth por JWT en `localStorage`. El frontend usa `baseURL: '/api'` (proxy de Vite).
- **Access token (1h) + refresh token (30 días, rota en cada uso)**: `POST /users/login`
  devuelve ambos; `frontend/src/services/api.js` intercepta cualquier 401 y llama a
  `POST /users/refresh-token` en silencio antes de reintentar la petición original —
  antes un formulario largo (ej. cargar un extracto a mano) perdía todo lo no
  guardado cuando expiraba el JWT sin aviso. Solo si el refresh también falla
  redirige a `/login?expired=1` (Login.jsx muestra el aviso). Un solo slot de
  refresh token por usuario (`User.refreshToken`): iniciar sesión en otro
  dispositivo invalida la sesión anterior.
- **2FA opcional (TOTP)**: `Profile.jsx` → "Verificación en dos pasos" genera un QR
  (`/users/2fa/setup`, librería `otplib` — usa la API funcional/async de v13,
  `generate`/`verify`/`generateSecret`/`generateURI`, NO el objeto `authenticator`
  de v11/v12 que asumen la mayoría de tutoriales). `twoFactorEnabled` solo pasa a
  `true` tras confirmar un código real (`/2fa/confirm`), nunca solo con generar el QR.
  Con 2FA activo, `POST /users/login` NO devuelve `token`: devuelve
  `{ requiresTwoFactor: true, tempToken }` (JWT de 5 min, solo sirve para
  `/users/2fa/login-verify`, sin acceso a ninguna otra ruta). `Login.jsx` maneja
  el paso 2 con un input de 6 dígitos.

## Base de datos
- **PostgreSQL** alojado en Supabase. Credenciales en `backend/.env`.
- `sequelize.sync()` (sin `alter`) corre en cada arranque: crea tablas que falten en una BD
  vacía, pero **nunca modifica una tabla que ya existe**.
- **Cambios de esquema a tablas existentes van por migraciones versionadas**
  (`backend/src/db/migrations/`, `sequelize-cli`). Flujo:
  1. Editar el modelo en `<módulo>.model.js` (agregar campo/índice/etc.).
  2. `npx sequelize-cli migration:generate --name algo-descriptivo` (genera un
     `.cjs` en `migrations/`; escribir `up`/`down` a mano con `queryInterface`).
  3. `npx sequelize-cli db:migrate` para aplicarla (usa `.sequelizerc` →
     `src/db/migrations-config.cjs`, mismas variables de `.env`).
  - Se adoptó 2026-07-10 tras encontrar 298 constraints UNIQUE duplicados en
    `users.email` (y 52 en `push_subscriptions.endpoint`): con `alter: true`,
    Sequelize no siempre detecta un UNIQUE ya existente y crea uno nuevo en
    cada arranque. Ver gotcha correspondiente más abajo.
- SSL habilitado automáticamente para hosts que no sean `localhost`/`127.0.0.1`.

## Arquitectura del backend
Cada recurso vive en `backend/src/modules/<nombre>/` con estos archivos:

```
<nombre>.model.js      — Sequelize Model (define tabla y asociaciones)
<nombre>.schema.js     — Schemas Zod para validar entrada
<nombre>.service.js    — Lógica de negocio (valida con Zod, opera sobre modelos)
<nombre>.controller.js — Extrae req/res, llama al service
<nombre>.routes.js     — Define rutas Express + middleware JWT
utils/                 — Cálculos puros (sin efectos secundarios)
```

El service lanza `throw new AppError('mensaje', statusCode)` para errores esperados; el middleware `errorHandler` en `main.js` los captura y los convierte en JSON.

### Módulos existentes
`user | creditCard | bankCredit | suscription | reminder | analytics | income | personalDebt | savingsGoal | budget | activityLog | search | pushSubscription | netWorth`

> El módulo de suscripciones tiene un typo histórico: la carpeta es `suscription` (sin "b"), no `subscription`.

Utilidades transversales en `backend/src/utils/`: `emailService.js`, `logger.js` (winston),
`currency.js` (`toCOP(monto, moneda)` — tasas aproximadas, configurables vía env `TRM_USD`/`TRM_EUR`),
`categories.js` (`CATEGORIAS` — taxonomía única de categorías de gasto, compartida entre
`creditCard.schema.js` y `personalDebt.schema.js` para que Presupuesto no vuelva a
desincronizarse; el frontend tiene su propio `CATEGORIES` en `utils/creditCard.js` con
icono/color, debe mantenerse en sync manualmente con la lista del backend).

### Presupuesto ↔ gastos personales recurrentes
`PersonalDebt` tipo `gasto` (ej. arriendo, mercado) tiene un campo opcional `categoria`
(mismo enum que las compras de tarjeta). `budget.service.js::getMonth` sólo suma estos
gastos activos con categoría a `gastadoPorCategoria` cuando el mes consultado es el
**mes calendario real en curso** (`currentMes()`) — nunca en meses pasados o futuros que
el usuario esté navegando, porque a diferencia de `CreditCardPurchase` (que tiene
`fechaCompra`), `PersonalDebt` no registra desde/hasta cuándo estuvo activo en cada mes;
sumarlo siempre habría contaminado el historial con el gasto de hoy. El picker de
categoría (chips, mismo patrón que `Budget.jsx`) aparece en `PersonalDebtNew.jsx` /
`PersonalDebtEdit.jsx` solo para tipo `gasto` (las deudas no tienen categoría).

### Suscripciones ↔ cobro automático con tarjeta
`Subscription.creditCardId` (nullable) vincula una suscripción a una tarjeta propia y
activa (validado en `subscription.service.js::assertCardOwnership`, tanto en create
como en update — se puede desvincular mandando `creditCardId: null`). Cuando está
seteado, `subscriptionChargeJob.js` genera el cargo real cada ciclo en vez de dejarlo
como obligación solo informativa:
- Se registra como `CreditCardPurchase` normal (`tipo: 'compra'`, `numeroCuotas: 1`,
  sin interés) con `subscriptionId` seteado — a propósito NO se usa un `tipo` nuevo,
  así el cargo aparece automáticamente en Presupuesto/analytics/listados sin tocar
  cada sitio que filtra `tipo === 'compra'`.
- Idempotente igual que `cuotaManejoJob.js`: busca un `CreditCardPurchase` con ese
  `subscriptionId` y `fechaCompra` dentro del ciclo actual antes de crear otro.
- Respeta `frecuencia`: `mensual` cobra cada mes en `diaCobro`; `anual` solo cobra una
  vez, en el mes de `fechaInicio` (nunca cobra el equivalente mensual todos los
  meses — eso cobraría 12× el valor real).
- Monto convertido a COP con `toCOP()` (suscripción puede ser USD/EUR); si el cupo
  disponible no alcanza, se salta esa suscripción ese ciclo (log de warning, no
  bloquea las demás) — no hay reintento a mitad de mes, se pone al día en el próximo
  día que el cron corra con cupo suficiente.
- Cupo descontado de forma atómica (`literal` con `GREATEST`, mismo patrón que
  `registerPurchasePayment`/`undoPurchasePayment`), no read-modify-write.
- **Evitar doble conteo en dineroLibre**: `analytics.service.js` excluye las
  suscripciones con `creditCardId` seteado de la suma directa de `Subscription.montoMensual`
  (en `getSummary` y `getRecommendations`) porque su obligación ya entra por el lado de
  `CreditCardPurchase.valorCuotaMensual` de la tarjeta. `SubscriptionService.getSummary`
  (total mostrado en `/subscriptions`) SÍ sigue sumando todas, es informativo y no
  alimenta dineroLibre.

### Cron jobs (`backend/src/jobs/`)
- `reminderJob.js` — se inicia en `main.js` al arrancar el servidor; en el mismo tick
  diario (8 AM) también dispara `cuotaManejoJob` y `subscriptionChargeJob`.
- `cuotaManejoJob.js` — genera cargos `cuota_manejo` idempotentemente al llegar la fecha de corte de cada tarjeta activa.
- `subscriptionChargeJob.js` — genera el cargo automático de suscripciones con tarjeta vinculada (ver arriba).
- `bankCreditMoraJob.js` — marca créditos en mora.
- `weeklyDigestJob.js` — resumen semanal por email (opt-in con `User.emailDigest`).
- `netWorthSnapshotJob.js` — día 1 de cada mes congela `NetWorthSnapshot` (activos −
  pasivos) del mes recién cerrado, por usuario. El mes en curso (sin snapshot aún) se
  calcula en vivo — ver `netWorth.service.js::getHistory`. Activos = ahorro acumulado
  (`SavingsGoal.montoAcumulado`); pasivos = cupo de tarjeta usado + saldo de créditos +
  `PersonalDebt` tipo `deuda` (no `gasto`, que es recurrente sin saldo).

### Rutas frontend completas (App.jsx)
```
/                          → Dashboard
/subscriptions             → lista | /new | /:id
/credit-cards              → lista | /new
/credit-cards/:id          → CreditCardLayout (tabs anidados)
  index                    → CardOverview
  /statement               → CardStatementPage
  /purchases               → CardPurchases
  /analysis                → CardAnalysis
/credit-cards/:id/edit
/credit-cards/:id/purchases/new
/credit-cards/:id/purchases/import  → importar CSV/Excel (mapeo de columnas)
/credit-cards/:id/advances/new
/credit-cards/:id/purchases/:purchaseId
/bank-credits              → lista | /new
/bank-credits/:id          → BankCreditLayout (tabs anidados)
  index                    → BankCreditOverview
  /schedule                → BankCreditSchedule
  /analysis                → BankCreditAnalysis
/bank-credits/:id/edit
/reminders                 → lista | /new
/income                    → lista | /new | /:id/edit
/personal-debts            → lista | /new | /:id | /:id/edit
/savings                   → lista | /new | /:id | /:id/edit
/budget                    → Presupuesto mensual por categorías
/reports
/activity                  → ActivityLog
/profile
/onboarding                → tras registro
/login /register /forgot-password /reset-password (públicas)
```

Otras piezas de frontend: `GlobalSearch` (Ctrl+K, módulo `search` del backend),
dark mode (`data-theme` en `<html>`, persistido en `localStorage['debti-theme']`),
PWA con service worker (`sw.js` + workbox), notificaciones push (`pushService.js`).

**Code-splitting por ruta** (`App.jsx`): todas las páginas protegidas se cargan con
`React.lazy` vía el helper `lazyNamed(loader, name)` — adapta el `export const X`
de cada página (no hay default exports) al `default` que exige `lazy()`, sin tocar
los archivos de página. Antes todo iba en un solo chunk de ~1.4 MB descargado
incluso para ver el login; ahora el chunk de entrada bajó a ~335 KB y cada ruta
trae su propio JS bajo demanda (verificado: entrar a Reportes solo descarga
`Reports-*.js` + `AreaChart-*.js`, no todas las páginas). `Suspense` envuelve
`<Routes>` con un fallback tipo skeleton (`RouteFallback`). Login/Register/
ForgotPassword/ResetPassword NO son lazy (es lo primero que ve un usuario sin
sesión — evitar el parpadeo de carga ahí).

## Comandos
- Todo junto: `npm run dev` (raíz) — levanta backend y frontend.
- Frontend: `cd frontend && npm run dev` (Vite, :5174) · `npm run build` · `npm run lint` · `npm test` (vitest).
- Backend: `cd backend && npm run dev` (nodemon, :3001).

## Verificación visual (importante)
No hay navegador integrado. **Playwright + Chromium están instalados localmente en
`%TEMP%\pw-runner\`** (npm project propio; ya NO hay instalación global — si falta,
`cd %TEMP%\pw-runner && npm i playwright && npx playwright install chromium`).
Para revisar pantallas: escribir el script dentro de `%TEMP%\pw-runner\` y correr
`node script.js` desde ahí (resuelve `require('playwright')` del node_modules local),
guardar PNG y abrirlo con Read.
Las pantallas internas requieren login: `POST /api/users/login` devuelve
`{ token, user }`; inyectar ambos en `localStorage` (`token` y `user` como JSON)
vía `context.addInitScript` antes de navegar. Viewport móvil de referencia: 390×844.
Ojo: si el puerto 5174 está ocupado, Vite usa 5175.

## Regla de diseño (PERMANENTE)
**Usar SIEMPRE la skill `ui-ux-pro-max` para CUALQUIER cambio de frontend**
(nuevas vistas, componentes, formularios, estilos, color, layout). Consultar su
motor antes de decidir:
`py -3 <skill>/scripts/search.py "<consulta>" --domain ux|color|typography ...`
(la skill vive en el cache de plugins; `py -3`, no `python`).

## Sistema de diseño (Debti)
- **Estilo:** fintech corporativo limpio (Stripe/Mercury/Ramp).
- **Tokens** en `frontend/src/index.css :root`. Usar variables, nunca hex crudo:
  - Marca verde esmeralda: `--brand-600 #047857` (rampa 50..800, ver `index.css`).
    Evitar gradientes morado→rosa "AI". (Nota: versiones antiguas de este documento
    decían "índigo-violeta #5B4DF1" — ese color nunca se usó en el CSS real; corregido
    2026-07-10 tras encontrar la discrepancia en auditoría.)
  - Positivo `--pos-600 #059669`, alerta `--warn-600`, peligro `--neg-600`.
  - Neutros slate: `--bg --surface --surface-2 --border --text --text-2 --text-3`.
  - Alias `--color-*` re-apuntan a la rampa nueva (compatibilidad; no romper).
  - Espaciado `--space-1..10`, sombras `--shadow-xs..lg`, radios `--radius-*`.
- **Tipografía:** IBM Plex Sans (pesos 400-700). Dinero/números con `.tabular`
  (figuras tabulares).
- **Componentes base** en `frontend/src/components/ui/`: `PageHeader`, `StatCard`,
  `SectionCard`, `Money`, `BrandMark`. Por módulo:
  `components/credit-cards/`, `components/bank-credits/`, `components/subscriptions/`.
- **Formato** centralizado en `frontend/src/utils/format.js` (`fmt`, `fmtDateLong`,
  `nextOccurrence`, `daysUntil`, `urgencyStyle`, `localISODate`, `monthKey`,
  `addMonths`, `capFirst`, ...). No duplicar.
- **Estados vacíos**: usar las clases CSS `.empty-state`, `.empty-state-icon`,
  `.empty-state-title` dentro de un `.card` (patrón canónico en las 10 listas;
  el componente `EmptyState.jsx` se eliminó por duplicado/muerto).
- **Grilla de KPIs**: clase `.kpi-grid` (auto-fit en desktop, 2 columnas en
  tablet/móvil). No usar grids inline para filas de StatCards.
- **Filas de formulario a 2 columnas**: usar la clase `.form-row-2` (colapsa a
  1 columna en ≤640px), NUNCA `style={{ gridTemplateColumns: '1fr 1fr' }}` inline —
  los estilos inline no pueden ser anulados por media queries y rompen móvil
  (bug corregido en 12 formularios el 2026-07-06). Márgenes/gap extra sí pueden
  ir inline junto a la clase.
- **Swatches de color**: clase `.color-swatch` (extiende el área táctil a 44px+).
- **A11y**: hay skip-link en `MainLayout` (`#main-content`) y anillo `:focus-visible`
  global; las gráficas clave llevan `role="img"` + `aria-label` con resumen.

## Convenciones de UI (acordadas con el usuario)
- **Ancho completo**: las páginas usan todo el ancho tras el sidebar (sin `max-width`
  centrado). El texto largo sí se limita por legibilidad; los datos (KPIs, tablas,
  grillas) llenan el ancho.
- **Detalles = rutas separadas con pestañas**: cada detalle es un layout con cabecera
  + barra de pestañas, y cada pestaña es una ruta anidada real (no apilar todo en una
  pantalla). Ej: `/credit-cards/:id` (Resumen), `/:id/statement`, `/:id/purchases`,
  `/:id/analysis`. Estado compartido vía `<Outlet context=...>` + `useOutletContext`.
- **Navegación móvil (≤767px)**: NO hay bottom nav global (se eliminó a pedido del
  usuario); la navegación es la hamburguesa fija arriba a la izquierda que abre el
  sidebar como drawer (cierre: X dentro del header del sidebar, nunca superpuesta
  al logo). En los DETALLES, la `TabNav` se ancla abajo como barra fija de secciones
  (CSS en components.css; el layout raíz lleva la clase `detail-layout` para el
  padding inferior). En desktop/tablet las pestañas siguen arriba.
- **Formularios de alta = asistente por pasos** (wizard) con indicador de progreso,
  validación en vivo (onBlur), feedback de envío y **vista previa en vivo**. Los
  formularios simples pueden ser de una página seccionada.
- Confirmaciones con **SweetAlert** (no `window.confirm`).

## Modelo de datos clave: CreditCardPurchase.tipo
El campo `tipo` distingue el origen del cargo:

| tipo | descripción | cupo-neutral |
|---|---|---|
| `compra` | compra en cuotas normal | no (descuenta/restaura cupo) |
| `avance` | avance de efectivo | no |
| `comision` | comisión por avance (generada automáticamente) | **sí** |
| `cuota_manejo` | cargo mensual por cuota de manejo | **sí** |

Los tipos cupo-neutral (`comision`, `cuota_manejo`) **nunca** deben afectar `cupoDisponible` al crearse, pagarse ni borrarse. Cualquier lógica de cupo debe respetar esta distinción.

## Cálculo "Dinero Libre"

```
dineroLibre = Σ Income.monto (activos)
            − Σ obligaciones mensuales:
                Subscription.montoMensual (activas)
                + BankCredit.valorCuota + cuotaAdministracion (activos)
                + CreditCardPurchase.valorCuotaMensual (activas)
                + PersonalDebt.montoCuota (activos)
            − Σ SavingsGoal.aporteMensual (activas)
```

Calculado en `analytics.service.getSummary()` → campo `dineroLibre` en la respuesta.
Visible en el Dashboard como StatCard (verde si ≥ 0, rojo si < 0).

## Gotchas (bugs reales ya encontrados — no repetir)
- **Sequelize DECIMAL llega como STRING** (`tasaMensual`, `montoTotal`, `saldoPendiente`,
  `valorCuota`, etc.). SIEMPRE `parseFloat(x)` antes de `.toFixed()` u operaciones.
- **`BankCredit.tasaMensual` se persiste como FRACCIÓN, no porcentaje**: 1,62% M.V.
  se guarda como `0.0162` (el backend hace `tasaInteres/100`). En cambio
  `CreditCard.tasaInteresMensual` SÍ es porcentaje (`2.18`). No volver a dividir entre
  100 la del crédito (bug histórico: el plan de pagos mostraba interés ~100× menor).
- **Nunca `toISOString()` para fechas/meses "de hoy"**: en Colombia (UTC-5) después de
  las ~7 p. m. devuelve el día/mes siguiente, y `new Date('YYYY-MM-DD')` parsea en UTC
  (corría el mes en Presupuesto). Usar `localISODate()`, `monthKey()`, `addMonths()`
  y `fmtDate()` de `frontend/src/utils/format.js`.
- **Suscripciones pueden ser USD/EUR**: convertir con `toCOP()` (`backend/src/utils/currency.js`)
  antes de sumarlas con valores COP en analytics.
- **`XLSX.read()` de SheetJS corrompe números/fechas en formato es-CO al leer
  CSV**: con `raw:true` coacciona texto tipo `"150.000,50"` a `150` (corta en
  el primer punto decimal, `.` es separador de miles aquí, no decimal); con
  `cellDates:true` además "adivina" fechas `DD/MM/YYYY` con heurísticas
  propias que a veces no coinciden con `parseFecha` propio. Por eso
  `CreditCardImport.jsx` NUNCA usa `XLSX.read` para `.csv` — tiene su propio
  parser CSV (`parseCSV`) que entrega texto crudo sin coacciones; `XLSX.read`
  solo se usa para `.xlsx`/`.xls` reales (con `raw:false` para igual evitar
  la coacción numérica).
- **Los `<select>` devuelven STRING.** El backend valida con Zod `z.number()` (sin
  coerción): convertir con `Number()` antes de enviar IDs/numéricos.
- `text-transform: capitalize` capitaliza preposiciones ("Junio De 2026"); usar
  `capFirst(monthLabel(m))` de format.js para etiquetas de mes.
- Patrón `useEffect(() => { load(); }, [id])` dispara el lint `set-state-in-effect`
  en varias páginas; es pre-existente y no bloquea el build.
- `git` advierte `LF will be replaced by CRLF` (Windows) — inofensivo.
- **Actualizaciones de `cupoDisponible` deben ser atómicas en SQL** (`literal`
  con `LEAST`/`GREATEST`), NUNCA leer-modificar-guardar en JS: "Pagar corte"
  dispara N pagos en `Promise.all` y el read-modify-write perdía los incrementos
  concurrentes (bug real: pagar un extracto de 12 compras solo restauraba el
  capital de ~1). Ver `registerPurchasePayment`/`undoPurchasePayment`.
  Si un cupo queda inconsistente: `node backend/scripts/fix-cupo-disponible.js`
  (dry-run; `--apply` para corregir) lo recalcula desde las compras.
- **Las FKs NO tienen `ON DELETE CASCADE`**: borrar un padre (p. ej. tarjeta)
  exige borrar sus hijos primero en el service (error 23503 si no).
- **`sequelize.sync({ alter: true })` duplicaba constraints UNIQUE en cada
  arranque** (298 en `users.email`, 52 en `push_subscriptions.endpoint` —
  encontrados y limpiados 2026-07-10): Sequelize no siempre reconoce que ya
  existe un UNIQUE equivalente y crea uno nuevo con nombre autogenerado. Por
  eso ahora `main.js` usa `sync()` sin `alter` (ver sección "Base de datos"
  arriba) y los cambios de esquema van por migraciones. Si vuelven a
  aparecer duplicados: `SELECT conname FROM pg_constraint WHERE conrelid =
  'tabla'::regclass AND contype = 'u'` para listarlos y `ALTER TABLE ...
  DROP CONSTRAINT` los sobrantes (dejar 1).
- **Al agregar un modelo NUEVO con `indexes:` declarados, evita guardar varios
  archivos seguidos** (cada guardado reinicia nodemon): si dos arranques de
  `sync()` se solapan mientras la tabla aún no existe, ambos intentan crear el
  mismo índice y el segundo revienta con `42P07 relation ... already exists`
  (pasó con `net_worth_snapshots`). No es un bug real de datos — nodemon
  reintenta solo y arranca bien en el siguiente intento — pero conviene
  esperar a que el backend termine de reiniciar antes de guardar el próximo
  archivo relacionado.
- **Exportación de datos**: `GET /users/export` (Profile.jsx → "Exporta tus datos")
  arma un solo JSON con todo lo del usuario (tarjetas+compras, créditos, suscripciones,
  ingresos, deudas, metas, presupuesto, historial, patrimonio neto). Siempre usa
  `req.user.id` de la sesión — nunca un id de la URL — para que nadie pueda pedir el
  export de otra cuenta. Registrada ANTES de `/:id` en las rutas (si no, Express
  interpretaría "export" como un id).
- **El manifest PWA apuntaba a iconos inexistentes** (`pwa-192.svg` etc. nunca
  existieron en `public/`) — Chrome nunca ofrecía instalar. Iconos reales en
  `frontend/public/icon-192.png` / `icon-512.png` (generados desde
  `src/assets/icono.png`, fondo blanco sólido porque iOS rellena de negro las
  zonas transparentes del apple-touch-icon). `beforeinstallprompt` no dispara
  en Chromium headless/Playwright (limitación de automatización, no bug real);
  para probar instalación real usar `npm run preview` + Chrome de verdad.
- **Deploy en Render**: el frontend (`debti-web.onrender.com`) se configuró a mano desde
  el dashboard de Render, **no** desde `render.yaml` (ese archivo tiene un `repo:` con
  placeholder sin rellenar — no es la fuente de verdad real; se dejó actualizado como
  referencia por si algún día se migra a Blueprint). Las reglas de rewrite/headers
  también viven en el dashboard (pestaña Redirects/Rewrites y Headers del servicio
  estático), no en el repo.
- **Tras arreglar los iconos PWA (2026-07-10), el sitio no ofrecía instalar aunque
  todo estaba bien**: verificado con `Page.getInstallabilityErrors` (Chrome DevTools
  Protocol, vía Playwright) contra la URL real → `installabilityErrors: []`, cero
  errores. La causa real: el celular del usuario tenía cacheado el veredicto de "no
  instalable" de una visita anterior a que el fix se propagara (Cloudflare frente a
  Render, `cf-cache-status: HIT`). Se resolvió borrando datos del sitio en Chrome
  (⋮ → Configuración → Configuración de sitios → buscar el dominio → Borrar y
  restablecer) y volviendo a entrar — Chrome no siempre re-evalúa instalabilidad en
  cada visita. Si vuelve a pasar tras un deploy: comprobar primero con
  `Page.getInstallabilityErrors` antes de asumir que es un bug de código.
  De paso se encontró y corrigió: `frontend/src/sw.js` (el push handler) seguía
  apuntando a `/pwa-192.svg` y `/favicon.svg` (iconos viejos ya eliminados) — ahora
  usa `/icon-192.png`. El manifest se sirve con `Content-Type: binary/octet-stream`
  en vez de `application/json` (Render no reconoce `.webmanifest`) — Chrome lo tolera
  bien, pero para corregirlo: Headers del servicio en Render → path
  `/manifest.webmanifest` → `Content-Type: application/json`.

## Skills disponibles relevantes
`ui-ux-pro-max` (diseño, OBLIGATORIO en frontend), `superpowers:brainstorming`
(antes de construir features), `superpowers:systematic-debugging` (bugs),
`superpowers:verification-before-completion`, `superpowers:test-driven-development`.

## Mantenimiento de este archivo
**Actualizar este CLAUDE.md con cada cambio relevante** al proyecto: nuevos módulos, rutas, convenciones, gotchas descubiertos, decisiones de arquitectura o cambios al sistema de diseño. El objetivo es que siempre refleje el estado actual del repositorio.

## Documentos
- Spec de rediseño: `docs/superpowers/specs/2026-05-30-solventa-redesign-design.md` (histórico, cuando se llamaba Solventa).
- Auditoría completa (bugs, UI, responsive, brechas de producto): `docs/auditoria-2026-06-11.md`.
  Las secciones A–D ya fueron corregidas; la sección E (movimientos unificados,
  patrimonio neto, import CSV, 2FA…) sigue pendiente como roadmap.
