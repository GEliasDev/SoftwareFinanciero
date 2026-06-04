# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Solventa — guía para Claude

App de **finanzas personales** (antes "Debti"). Gestiona tarjetas de crédito,
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
`user | creditCard | bankCredit | suscription | reminder | analytics`

> El módulo de suscripciones tiene un typo histórico: la carpeta es `suscription` (sin "b"), no `subscription`.

### Cron jobs (`backend/src/jobs/`)
- `reminderJob.js` — se inicia en `main.js` al arrancar el servidor.
- `cuotaManejoJob.js` — genera cargos `cuota_manejo` idempotentemente al llegar la fecha de corte de cada tarjeta activa.

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
/bank-credits/:id/edit
/reminders                 → lista | /new
/reports
/profile
```

## Comandos
- Todo junto: `npm run dev` (raíz) — levanta backend y frontend.
- Frontend: `cd frontend && npm run dev` (Vite, normalmente :5174) · `npm run build` · `npm run lint`.
- Backend: `cd backend && npm run dev` (nodemon).

## Verificación visual (importante)
No hay navegador integrado, pero **Playwright global + Chromium están instalados**.
Para revisar pantallas: script en `%TEMP%/pw-runner/`, ejecutar con
`NODE_PATH="$(npm root -g)" node script.js`, guardar PNG y abrirlo con Read.
Las pantallas internas requieren login: registrar usuario de prueba vía
`POST /api/users` e inyectar el token en `localStorage` antes de navegar.

## Regla de diseño (PERMANENTE)
**Usar SIEMPRE la skill `ui-ux-pro-max` para CUALQUIER cambio de frontend**
(nuevas vistas, componentes, formularios, estilos, color, layout). Consultar su
motor antes de decidir:
`py -3 <skill>/scripts/search.py "<consulta>" --domain ux|color|typography ...`
(la skill vive en el cache de plugins; `py -3`, no `python`).

## Sistema de diseño (Solventa)
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
  `nextOccurrence`, `daysUntil`, `urgencyStyle`, ...). No duplicar.

## Convenciones de UI (acordadas con el usuario)
- **Ancho completo**: las páginas usan todo el ancho tras el sidebar (sin `max-width`
  centrado). El texto largo sí se limita por legibilidad; los datos (KPIs, tablas,
  grillas) llenan el ancho.
- **Detalles = rutas separadas con pestañas**: cada detalle es un layout con cabecera
  + barra de pestañas, y cada pestaña es una ruta anidada real (no apilar todo en una
  pantalla). Ej: `/credit-cards/:id` (Resumen), `/:id/statement`, `/:id/purchases`,
  `/:id/analysis`. Estado compartido vía `<Outlet context=...>` + `useOutletContext`.
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

## Gotchas (bugs reales ya encontrados — no repetir)
- **Sequelize DECIMAL llega como STRING** (`tasaMensual`, `montoTotal`, `saldoPendiente`,
  `valorCuota`, etc.). SIEMPRE `parseFloat(x)` antes de `.toFixed()` u operaciones.
- **Los `<select>` devuelven STRING.** El backend valida con Zod `z.number()` (sin
  coerción): convertir con `Number()` antes de enviar IDs/numéricos.
- Patrón `useEffect(() => { load(); }, [id])` dispara el lint `set-state-in-effect`
  en varias páginas; es pre-existente y no bloquea el build.
- `git` advierte `LF will be replaced by CRLF` (Windows) — inofensivo.

## Skills disponibles relevantes
`ui-ux-pro-max` (diseño, OBLIGATORIO en frontend), `superpowers:brainstorming`
(antes de construir features), `superpowers:systematic-debugging` (bugs),
`superpowers:verification-before-completion`, `superpowers:test-driven-development`.

## Mantenimiento de este archivo
**Actualizar este CLAUDE.md con cada cambio relevante** al proyecto: nuevos módulos, rutas, convenciones, gotchas descubiertos, decisiones de arquitectura o cambios al sistema de diseño. El objetivo es que siempre refleje el estado actual del repositorio.

## Documentos
- Spec de rediseño: `docs/superpowers/specs/2026-05-30-solventa-redesign-design.md`.
