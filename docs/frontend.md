# Frontend — referencia (cargar solo si la tarea toca frontend)

React 19 + Vite 8, react-router-dom 7, recharts, xlsx, Radix, vaul, sonner. CSS plano con variables (`frontend/src/index.css`). Auth JWT en
`localStorage`; `baseURL: '/api'` (proxy de Vite). Sistema de diseño: ver la sección al final.

## Rutas (App.jsx)
```
/                          Dashboard
/subscriptions             lista | /new | /:id | /:id/edit
/credit-cards              lista | /new
/credit-cards/:id          CreditCardLayout (tabs anidados): index=CardOverview, /statement, /purchases, /pending (movimientos por aprobar de esa tarjeta, detectados en Gmail)
/credit-cards/:id/edit
/credit-cards/:id/purchases/new      CreditCardPurchaseForm (compartido con edición)
/credit-cards/:id/purchases/import   importar CSV/Excel
/credit-cards/:id/advances/new
/credit-cards/:id/purchases/:purchaseId  [/edit → CreditCardPurchaseForm]
/bank-credits              lista | /new
/bank-credits/:id          BankCreditLayout: index=BankCreditOverview, /schedule, /analysis
/bank-credits/:id/edit
/income                    lista | /new | /:id/edit
/reports  /profile  /onboarding
/login /register /forgot-password /reset-password   (públicas)
/privacy                   política de privacidad (pública; la exige Google para publicar la app OAuth de Gmail)
```
Detalles con pestañas = layout + rutas anidadas reales; estado compartido con `<Outlet context>` + `useOutletContext`.

## Piezas
- Code-splitting: páginas protegidas con `React.lazy` vía `lazyNamed(loader, name)` (adapta `export const X` a `default`); `Suspense`
  con `RouteFallback`. Login/Register/ForgotPassword/ResetPassword NO son lazy.
- `GlobalSearch` (Ctrl+K → módulo `search`), dark mode (`data-theme` en `<html>`, `localStorage['debti-theme']`),
  PWA (`sw.js` + workbox).
- Utilidades — no duplicar: `utils/format.js` (`fmt`, `fmtDateLong`, `parseLocalDate`, `effectiveDayInMonth`, `nextOccurrence`,
  `daysUntil`, `urgencyStyle`, `localISODate`, `capFirst`, `parseMoneyInput`, `formatMoneyInput`),
  `utils/currency.js` (`toCOP`, `subMonthlyCOP`, `subAnnualCOP`; espejo de backend), `utils/creditCard.js` (`CATEGORIES`,
  `TASA_USURA_EA`, `buildSchedule`, `buildCardStats`), `utils/csvImport.js`.
- Componentes funcionales en `components/ui/`: `MoneyInput` (muestra `$`/`COP`), `DayOfMonthPicker`, `LoadError`, `ErrorBoundary`,
  `ConfirmHost`, `FormLayout` (`FormHeader`, `FormSection`, `ChoiceChips`, `CardMini`, `FormActions`), `AuthShowcase`; además `TabNav`, `Stepper`.

## Movimientos por aprobar (Gmail)
Ya no hay página ni entrada en el sidebar (se quitó `/card-inbox`). Se ven en la pestaña **Por aprobar** de cada tarjeta
(`pages/credit-card/CardPending.jsx`, badge con la cantidad; `CreditCardLayout` los carga y los pasa por el contexto del `Outlet`).
En la lista `CreditCards.jsx` cada tarjeta con pendientes muestra el badge "N por aprobar" y arriba aparece la sección
**Movimientos sin tarjeta asignada** (con selector de tarjeta). Piezas compartidas: `components/credit-cards/PendingMovements.jsx`
(`PendingList`, `SyncButton`). `PendingList` tiene selección, **Aprobar/Descartar seleccionados** (en serie, no en paralelo: cada aprobación mueve el cupo; los pagos se omiten al aprobar y la compra sin tarjeta también) y es dueño de lo editado por fila (cuotas, categoría, tarjeta). "Sincronizar ahora" vive en la pestaña.

## Navegación hacia atrás
- Flujos que cuelgan de una pestaña (detalle/alta de compra, alta de avance) vuelven a `/credit-cards/:id/purchases`, no al Resumen.
- "Editar tarjeta" y "Editar crédito" se abren desde el encabezado (cualquier pestaña): usan `hooks/useGoBack.js` (`navigate(-1)`; si la
  página se abrió directo por URL, va al destino de respaldo). Guardar sigue yendo al detalle.

## Sistema de diseño (rediseño 2026-11-24)
- Tokens en `src/index.css` (claro y `[data-theme="dark"]`): neutros (`--bg`, `--surface`, `--surface-2/3`, `--border`, `--divider`,
  `--text`…`--text-4`), un acento (`--brand-600` #047857, `--accent-text`), estados (`--pos-*`, `--warn-*`, `--neg-*`) y categorías de
  gasto en grises (`--cat-1..4`). Fuente Inter (`@fontsource-variable/inter`); cifras con clase `.n` (números tabulares).
- Prohibido: degradados, bordes laterales de color, emojis. Colores de tarjeta sólidos (`utils/cardColors.js`, `getCardColor`).
- Estilos: `styles/components.css` (botones, inputs, cards, badges, capas flotantes), `layout.css` (shell y responsive),
  `pages.css` (utilidades e Inicio), `tarjetas.css`, `forms.css`, `creditos.css` (créditos, suscripciones, ingresos, reportes, perfil).
  Utilidades de visibilidad: `.desktop-only`, `.mobile-only`, `.desktop-flex`, `.desktop-table`, `.mobile-list` (corte en 768 px).
- Shell (`components/layout/`): `Sidebar` (PC; solo íconos 768–1023), `Navbar` (barra superior PC: búsqueda Ctrl K, `AlertsBell`,
  "Registrar movimiento"), `BottomNav` (teléfono, con botón +), vista `/more` (`pages/More.jsx`). Estado compartido en `ShellContext`
  (`openSearch`, `openRegistrar`, `pendingCount`, `payAlert`, `useThemeState`).
- `RegistrarMovimiento`: panel (PC) o bottom sheet `vaul` (teléfono). "Pago de tarjeta" y "Pago de cuota" navegan con
  `?accion=pagar` y el layout del detalle abre la confirmación de pago. Última tarjeta usada: `utils/lastCard.js`.
- Avisos y confirmaciones: `utils/alerts.js` conserva la forma `Swal.fire(opts)` → toast de `sonner` o diálogo Radix (`ConfirmHost`
  montado en `App.jsx`). `html` se muestra como texto plano (contenido del usuario). Acciones destructivas van en el menú ⋯.
- `fmt` (COP) devuelve `$1.250.000` sin espacio tras el signo.
