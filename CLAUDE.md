# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Debti — guía para Claude

App de **finanzas personales**. Gestiona tarjetas de crédito,
créditos bancarios, suscripciones y reportes. Español (es-CO, COP).

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
`user | creditCard | bankCredit | suscription | analytics | income | personalDebt | savingsGoal | budget | search | pushSubscription | netWorth`

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
- **Evitar doble conteo**: las suscripciones con `creditCardId` se excluyen de la suma
  directa de `Subscription.montoMensual` en **tres** sitios de
  `analytics.service.js`: `getSummary` y `getMonthlyTrend` (más la
  proyección de `Reports.jsx`), porque su obligación ya entra por
  `CreditCardPurchase.valorCuotaMensual`. Si se agrega otro cálculo que sume
  suscripciones y compras de tarjeta a la vez, aplicar el mismo filtro. `SubscriptionService.getSummary`
  (total mostrado en `/subscriptions`) SÍ sigue sumando todas, es informativo y no
  alimenta dineroLibre.

### Cron jobs (`backend/src/jobs/`)
- `dailyChargesJob.js` — se inicia en `main.js` al arrancar el servidor; tick diario
  (8 AM) que dispara `cuotaManejoJob` y `subscriptionChargeJob` (antes vivían dentro
  de `reminderJob`, eliminado junto con el módulo de recordatorios el 2026-09-07).
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
/subscriptions             → lista | /new | /:id | /:id/edit
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
/income                    → lista | /new | /:id/edit
/personal-debts            → lista | /new | /:id | /:id/edit
/savings                   → lista | /new | /:id | /:id/edit
/budget                    → Presupuesto mensual por categorías
/reports
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
- Backend: `cd backend && npm run dev` (nodemon, :3001) · `npm test` (vitest).

## Tests
Vitest en ambos lados. La cobertura se concentra a propósito en la **lógica de dinero
y fechas**, que es donde han salido todos los bugs reales:
- Frontend (`src/utils/__tests__/`): `format.test.js` (fechas, `parseLocalDate`,
  `effectiveDayInMonth`, `nextOccurrence`), `currency.test.js` (conversión USD/EUR,
  mensual vs anual), `bankCredit.test.js`.
- Backend (`src/**/__tests__/`): `cycleDay.test.js`, `localDate.test.js` (ambos usan
  `vi.useFakeTimers()` para congelar el reloj en casos de febrero, meses de 30,
  cruces de año y horas nocturnas), `bankCreditCalculation.test.js`.
- Al corregir un bug de cálculo, **agregar el test de regresión** que lo habría
  atrapado (patrón seguido en toda la auditoría de julio 2026).

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
  `SectionCard`, `Money`, `BrandMark`, `Stepper`, `TabNav`, `ErrorBoundary`,
  `LoadError` (estado de "no cargó" con reintento), `DayOfMonthPicker` (selector de
  día de ciclo tipo calendario con aviso 29-31). Por módulo:
  `components/credit-cards/`, `components/bank-credits/`, `components/subscriptions/`.
- **Formato** centralizado en `frontend/src/utils/format.js` (`fmt`, `fmtDateLong`,
  `parseLocalDate`, `effectiveDayInMonth`, `nextOccurrence`, `daysUntil`,
  `urgencyStyle`, `localISODate`, `monthKey`, `addMonths`, `capFirst`, ...). No
  duplicar. Conversión de moneda de suscripciones (USD/EUR→COP) en
  `frontend/src/utils/currency.js` (`toCOP`, `subMonthlyCOP`, `subAnnualCOP`),
  espejo de `backend/src/utils/currency.js`.
- **Estados vacíos**: usar las clases CSS `.empty-state`, `.empty-state-icon`,
  `.empty-state-title` dentro de un `.card` (patrón canónico en las 10 listas;
  el componente `EmptyState.jsx` se eliminó por duplicado/muerto).
- **Estado de error de carga**: usar `<LoadError onRetry={load} title="…" />`
  (`components/ui/LoadError.jsx`), NUNCA `.catch(console.error)` a secas. El catch
  mudo mostraba el estado VACÍO cuando en realidad la petición falló — el usuario no
  distinguía "no tengo datos" de "no cargó". Patrón: estado `error`, `load()` que
  hace `setError(false)` al inicio y `setError(true)` en el catch, y en el render
  `loading ? skeleton : error ? <LoadError/> : vacío/datos`. Aplicado en las 9
  páginas de lista/detalle.
- **Labels de formulario deben asociarse al input** (`htmlFor`/`id`). El helper
  `field(name, …)` que se repite en los formularios ya pone `htmlFor={name}` +
  `id={name}`; los `<label className="form-label">` sueltos junto a `<select>`
  inline aún no — al agregar uno nuevo, asócialo.
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
- **El formulario de edición debe ser espejo del de alta** (unificado 2026-07-23):
  mismo layout `wizard-grid` (vista previa a la izquierda + formulario a la derecha),
  mismos pasos, mismos textos de ayuda. La edición vive SIEMPRE en su propia ruta
  `/<modulo>/:id/edit` — nunca como formulario inline dentro del detalle.
  - Los campos que el `updateSchema` del backend NO acepta se muestran igual que los
    editables pero con `disabled` + hint con icono `Lock` explicando por qué
    (helper `lockedField` en `BankCreditEdit`/`SubscriptionEdit`). **No ocultarlos**:
    la consistencia visual con el alta es el objetivo, y así el usuario entiende que
    el dato existe pero es inmutable.
  - Motivo: antes cada edición era una versión recortada distinta (sin preview, a una
    columna) y, peor, `SubscriptionDetail` editaba inline enviando `monto`/`moneda`/
    `frecuencia`/`fechaInicio` que Zod descartaba en silencio — el usuario creía haber
    cambiado el precio y no pasaba nada. Ver gotcha de Zod más abajo.
  - Ingresos es el caso ideal: un solo `IncomeForm` sirve para alta y edición.
- Confirmaciones con **SweetAlert** (no `window.confirm`).

## Modelo de datos clave: CreditCardPurchase.tipo
El campo `tipo` distingue el origen del cargo:

| tipo | descripción | cupo-neutral |
|---|---|---|
| `compra` | compra en cuotas normal | no (descuenta/restaura cupo) |
| `avance` | avance de efectivo | no |
| `comision` | comisión por avance (generada automáticamente) | **sí** |
| `cuota_manejo` | cargo mensual por cuota de manejo | **sí** |

Los tipos cupo-neutral (`comision`, `cuota_manejo`) **nunca** deben afectar `cupoDisponible` al crearse, pagarse ni borrarse. Cualquier lógica de cupo debe respetar esta distinción. (Descuento del cupo en `createAdvance` solo por `montoTotal`, no comisión; restauración/reversión/borrado/abono de cupo excluyen `comision` y `cuota_manejo` en `creditCard.service.js` y en el script `fix-cupo-disponible.js`.)

**Comisión de avance → pagada automáticamente:** la comisión (`creditCardId` compra tipo `comision`, `avanceId` → avance) se paga junto con la **primera cuota** de su avance: en `registerPurchasePayment`, si `tipo==='avance' && nuevasCuotasPagadas===1` se marca la comisión `{status:'pagada', cuotasPagadas:1}` (y se revierte al deshacer esa primera cuota en `undoPurchasePayment`, y al cancelar el avance completo por abono). La comisión NO es una cuota pagable aparte. En el frontend, `buildSchedule` la suma como línea `isCommission` (para que el total del extracto incluya compras + avances + comisiones y el desglose cuadre) pero `CreditCardLayout.handlePayAll` la **excluye** del pago individual (`payItems = payableLines.filter(l => !l.isCommission)`), porque la paga el avance.

## Nomenclatura: "Gastos" (antes "Deudas Personales")
El módulo `personalDebt` se presenta al usuario como **"Gastos"** (sidebar, Dashboard,
Reportes, título de la lista) desde 2026-07-23. El motivo: sus dos tipos son
`gasto` (recurrente, con `montoCuota` → sí pesa en el compromiso mensual) y `deuda`
(préstamo informal, `montoCuota` en null → solo tiene saldo). Como únicamente los
`gasto` suman al mensual, la etiqueta "Deudas personales" describía mal lo que el
número mostraba. Las rutas, modelos y servicios siguen llamándose `personal-debts` /
`personalDebt` — el cambio es solo de cara al usuario.

## Desglose en el Dashboard (total arriba, detalle debajo)
`analytics.service.js::getSummary` devuelve, además de los totales:
- `breakdown` — cuotas mensuales por ítem de cada categoría (`creditCards`,
  `bankCredits`, `subscriptions`, `personalDebts`, `savings`). **La suma de cada
  lista cuadra exactamente con su total en `obligations`**, por eso las suscripciones
  con `creditCardId` se excluyen aquí también.
- `debtBreakdown` — SALDOS adeudados por ítem (`creditCards`, `bankCredits`,
  `personalDebts`). Aquí sí aparecen los `PersonalDebt` tipo `deuda`, que no tienen
  cuota mensual y por eso no salen en `breakdown`.

Cada ítem es `{ id, nombre, detalle, monto }`. El Dashboard los pinta como filas
desplegables (clases `.dist-legend-toggle` / `.dist-sublist` / `.dist-subrow`): el
total va en la fila y el detalle por ítem se despliega debajo. Si se agrega una
categoría nueva, añadirla a las dos listas para que el total siga cuadrando.

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
- **Tasa de usura de referencia**: constante única `TASA_USURA_EA` (= 28.5) en
  `frontend/src/utils/creditCard.js`. Antes estaba copiada a mano como `28.5` en 4
  archivos. Importarla, no volver a escribir el número.
- **Días de ciclo 29/30/31 hay que recortarlos al mes en curso.** `diaCobro` y
  `fechaCorte` se guardan como 1..31, pero con `if (hoy < diaCobro) continue` una
  suscripción con día 31 NUNCA se cobraba en abril, junio, septiembre, noviembre ni
  febrero (cuota perdida, dinero real), y `new Date(2026, 5, 31)` desbordaba a julio
  rompiendo la comprobación de idempotencia. Usar
  `effectiveDayInMonth(dia, año, mesIndex)` de `backend/src/utils/cycleDay.js` en
  cualquier job o cálculo con ciclo mensual (aplicado en `subscriptionChargeJob` y
  `cuotaManejoJob`). Cubierto por tests en `utils/__tests__/cycleDay.test.js`.
- **`budget.controller.js` calculaba el mes por defecto con `toISOString()`** (UTC):
  después de las ~7pm del último día del mes mostraba el mes siguiente. Ahora usa
  hora local, igual que `budget.service.js`.
- **El desborde del día 31 estaba en CINCO sitios fuera de los jobs** (barrido completo
  2026-07-24): `analytics.service.js::nextPaymentDate` (dashboard),
  `creditCard.service.js::getUpcomingPayments` y `::getOverview` (días al próximo pago),
  `bankCreditMoraJob.js::expectedCuotasPagadas` (la cuota se daba por vencida tarde) y
  `bankCreditCalculation.js` (la `fechaFin` guardada del crédito caía el 1 del mes
  siguiente — el comentario del código incluso afirmaba, en falso, que el constructor
  `Date(y,m,d)` evitaba el overflow: **sí desborda**). Todos usan ya
  `effectiveDayInMonth`. Al construir CUALQUIER fecha con un día 1..31, recortarlo.
  Si el mes puede salirse de 0..11, normalizar primero con `new Date(y, m, 1)`.
- **Fechas "de hoy" por defecto (abono de deuda, nombre de archivo del export)** usaban
  `new Date().toISOString().slice(0,10)` (UTC): de noche registraban el día siguiente.
  Usar `localToday()`/`localMonth()` de `backend/src/utils/localDate.js`. (Ojo: construir
  `new Date(año,mes,día).toISOString()` a medianoche local SÍ es seguro; el problema es
  `new Date()` con la hora actual.)
- **SEGURIDAD — bypass de 2FA (encontrado y cerrado 2026-07-24)**: `authenticateToken`
  (`core/middleware/jwtMiddleware.js`) verificaba la firma del JWT pero NO el claim
  `purpose`. El `tempToken` de 2FA (`purpose:'2fa-pending'`, emitido con solo la
  contraseña antes del código) era por tanto válido en TODA ruta protegida durante 5
  min — saltándose el 2FA por completo. Ahora el middleware rechaza cualquier token con
  `purpose` (los de sesión reales nunca lo llevan). Si se emite otro token de propósito
  especial (reset, etc.), NO usar `JWT_SECRET` para rutas de sesión sin este chequeo.
  Cubierto por `core/middleware/__tests__/jwtMiddleware.test.js`.
- **`new Date('YYYY-MM-DD').getMonth()` devuelve el mes ANTERIOR si el día es 1.**
  El string se parsea en UTC y se lee en local (UTC-5), así que `'2026-07-01'` cae en
  el 30 de junio local → `getMonth()` = junio. Reventó la rama `anual` de
  `subscriptionChargeJob` (la suscripción no cobraba en su mes aniversario). Para
  sacar año/mes de un DATEONLY, leer el string: `Number(str.slice(5,7)) - 1`.
- **Nunca `toISOString()` para fechas/meses "de hoy"**: en Colombia (UTC-5) después de
  las ~7 p. m. devuelve el día/mes siguiente, y `new Date('YYYY-MM-DD')` parsea en UTC
  (corría el mes en Presupuesto). Usar `localISODate()`, `monthKey()`, `addMonths()`
  y `fmtDate()` de `frontend/src/utils/format.js`.
- **Para MOSTRAR o comparar un DATEONLY, usar `parseLocalDate()`/`fmtDateLong()`, nunca
  `new Date(str)` directo.** `new Date('2026-07-01')` parsea en UTC y, leído en UTC-5,
  retrocede al 30 de junio: TODA fecha salía un día antes y un 1 de enero mostraba
  "31 dic del año anterior" (bug encontrado 2026-07-23 en 11 pantallas). `parseLocalDate` (en `utils/format.js`) construye
  el Date en hora local desde 'YYYY-MM-DD' y deja pasar los timestamps con hora (que sí
  son instantes reales). `fmtDateLong` ya lo usa. Cubierto por tests en
  `utils/__tests__/format.test.js`.
- **Selector de "día del mes" (cobro/corte/pago): usar `<DayOfMonthPicker>`, no un
  `<input type=number>` suelto.** El componente (`components/ui/DayOfMonthPicker.jsx`)
  muestra los 31 días como grilla tipo calendario, calcula la próxima fecha real en
  vivo y **advierte cuando el día 29-31 no existe en algún mes** (el cobro se corre al
  último día — ver `effectiveDayInMonth`). Ya conectado en los 7 formularios con día de
  ciclo (Suscripción, Tarjeta ×2, Crédito, Ingreso). `nextOccurrence` y el cálculo de
  fecha de pago en `CreditCards.jsx` también recortan el día con `effectiveDayInMonth`
  para no desbordar al mes siguiente.
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
- **`Subscription.status` es `'activa'` (femenino), NO `'activo'`.** Los demás
  módulos usan masculino (`BankCredit`/`PersonalDebt`/`Income` →
  `'activo'`; `CreditCardPurchase` → `'activa'`). Un filtro `s.status === 'activo'`
  sobre suscripciones no casa nunca y devuelve 0 sin error: pasó en la proyección de
  `Reports.jsx`, donde la columna "Suscripciones" mostró $0 durante mucho tiempo
  (corregido 2026-07-23). Al filtrar por estado, verificar el enum del modelo.
- **Costo mensual de una suscripción: usar `montoMensual`, no `monto`.** `monto` es
  el valor por cobro; para una suscripción anual, tratarlo como mensual multiplica el
  gasto por 12. `montoMensual` ya viene dividido por el backend. Convertir siempre a
  COP con `subMonthlyCOP()` de `frontend/src/utils/currency.js` (espejo de
  `backend/src/utils/currency.js`, mismas tasas — mantener ambos en sync).
- **Los totales de una lista deben filtrar por estado activo.** La lista de
  suscripciones sumaba también las canceladas/pausadas en "Costo mensual"
  (corregido 2026-07-23). Mostrar todas las filas está bien; sumarlas todas no.
- **Zod descarta en silencio las claves que no están en el schema** (comportamiento
  por defecto de `z.object`): si el frontend manda un campo que el `updateSchema` no
  declara, la petición responde 200 pero ese campo NUNCA se guarda, sin error visible.
  Bug real encontrado 2026-07-23: la edición inline de suscripciones enviaba `monto`,
  `moneda`, `frecuencia` y `fechaInicio`, ninguno presente en `subscriptionUpdateSchema` —
  editar el precio de una suscripción "guardaba" sin cambiar nada. Antes de agregar un
  campo a un formulario de edición, verificar que exista en el `updateSchema`; si no
  existe a propósito, mostrarlo como solo-lectura (ver convención de formularios arriba).
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
- **Datos históricos con comisiones de avance pendientes (bug 2026-09-07)**:
  los avances creados antes del fix de pago automático pueden tener la comisión
  aún `activa` (saldo fantasma) y el cupo descontado por comisión. Reparar con
  `node backend/scripts/fix-comisiones-avances.js` (dry-run; `--apply`):
  marca pagadas las comisiones de avances que ya pagaron su primera cuota y
  recalcula `cupoDisponible` excluyendo cupo-neutral.
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
- **Push, búsqueda e import — revisados 2026-07-24** (eran los 3 módulos sin auditar):
  - `PushSubscriptionService.unsubscribe` borraba **solo por `endpoint`**, sin filtrar
    por usuario: cualquier sesión podía dar de baja la suscripción de otro si conocía
    su endpoint. Ahora va scoped a `req.user.id` (mismo principio que el export).
  - `webpush.setVapidDetails()` se llamaba en el nivel del módulo y **lanza si faltan
    las llaves VAPID**, así que sin ellas el servidor entero no arrancaba — pese a que
    el push es opcional. Ahora se llama solo si existen; `isEnabled()` es la fuente
    única (y el único emisor de push era el `reminderJob`, ya eliminado — hoy el
    endpoint `/api/push/*` sigue existiendo pero nada dispara notificaciones).
  - `subscribe` no validaba el body: un `keys` ausente daba TypeError 500 en vez de 400.
  - **Import CSV: el delimitador se detecta** (`,`, `;` o tab). Excel en español exporta
    con `;` —porque aquí la coma es el separador decimal— y el archivo entero se
    parseaba como UNA columna. Los parsers viven ahora en `frontend/src/utils/csvImport.js`
    (fuera del componente, para poder testearlos): 15 tests cubren montos es-CO,
    fechas DD/MM/YYYY y los tres delimitadores.
  - Búsqueda: los comodines `%`/`_` se escapan (buscar "%" devolvía coincidencias
    raras); `GlobalSearch` descarta respuestas obsoletas por secuencia de petición
    (con red lenta, una consulta vieja pisaba los resultados de la nueva) y distingue
    "sin resultados" de "falló la búsqueda".
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

## Documentación técnica

Existe una documentación técnica completa del proyecto (arquitectura, base de datos, despliegue, seguridad, métricas) en:

`C:\Users\GabrielEliasValdelam\Desktop\Documentaciones\Documentacion-Tecnica-SoftwareFinanciero-Debti.md`

**Mantenla actualizada automáticamente**: cuando hagas un cambio significativo en el código de este repositorio (nuevo módulo o funcionalidad, endpoint nuevo, cambio de schema/migración, variable de entorno nueva, cambio de arquitectura o del proceso de despliegue), actualiza en ese mismo cambio la(s) sección(es) correspondientes de ese documento -- no esperes a que te lo pidan aparte. No hace falta regenerar el documento completo por cada edición menor, solo mantener sincronizadas las partes que dejen de reflejar la realidad del código.

## Documentos
- Spec de rediseño: `docs/superpowers/specs/2026-05-30-solventa-redesign-design.md` (histórico, cuando se llamaba Solventa).
- Auditoría completa (bugs, UI, responsive, brechas de producto): `docs/auditoria-2026-06-11.md`.
  Las secciones A–D ya fueron corregidas; la sección E (movimientos unificados,
  patrimonio neto, import CSV, 2FA…) sigue pendiente como roadmap.
