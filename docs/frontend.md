# Frontend — referencia (cargar solo si la tarea toca frontend)

React 19 + Vite 8, react-router-dom 7, recharts, sweetalert2, xlsx. CSS plano con variables (`frontend/src/index.css`). Auth JWT en
`localStorage`; `baseURL: '/api'` (proxy de Vite). Nota: el sistema de diseño se retiró de la documentación (2026-10-29) a la espera
de un rediseño; no hay reglas visuales vigentes.

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
- Componentes funcionales en `components/ui/`: `MoneyInput`, `DayOfMonthPicker`, `LoadError`, `ErrorBoundary`; resto (`PageHeader`,
  `StatCard`, `SectionCard`, `TabNav`, `Stepper`, …) son presentación y pueden cambiar con el rediseño.

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
