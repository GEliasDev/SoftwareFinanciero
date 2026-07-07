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

## Base de datos
- **PostgreSQL** alojado en Supabase. Credenciales en `backend/.env`.
- `sequelize.sync({ alter: true })` corre en cada arranque del servidor — **no hay migraciones manuales**. Los cambios al modelo se aplican automáticamente.
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
`user | creditCard | bankCredit | suscription | reminder | analytics | income | personalDebt | savingsGoal | budget | activityLog | search | pushSubscription`

> El módulo de suscripciones tiene un typo histórico: la carpeta es `suscription` (sin "b"), no `subscription`.

Utilidades transversales en `backend/src/utils/`: `emailService.js`, `logger.js` (winston),
`currency.js` (`toCOP(monto, moneda)` — tasas aproximadas, configurables vía env `TRM_USD`/`TRM_EUR`).

### Cron jobs (`backend/src/jobs/`)
- `reminderJob.js` — se inicia en `main.js` al arrancar el servidor.
- `cuotaManejoJob.js` — genera cargos `cuota_manejo` idempotentemente al llegar la fecha de corte de cada tarjeta activa.
- `bankCreditMoraJob.js` — marca créditos en mora.
- `weeklyDigestJob.js` — resumen semanal por email (opt-in con `User.emailDigest`).

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
  - Marca índigo-violeta: `--brand-600 #5B4DF1` (+ rampa 50..800). Evitar gradientes
    morado→rosa "AI".
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
- `sequelize.sync` usa `alter: { drop: false }`: con `alter: true` a secas
  intentaba `DROP CONSTRAINT` de FKs con nombre distinto en la BD y el
  arranque fallaba intermitentemente (error 42704).

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
