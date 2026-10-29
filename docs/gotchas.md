# Gotchas — bugs reales ya encontrados (cargar al tocar dinero, fechas, auth o formularios)

## Dinero y datos
- **Sequelize DECIMAL llega como STRING**: `parseFloat(x)` antes de `.toFixed()` u operar.
- **`BankCredit.tasaMensual` es FRACCIÓN** (1,62% → `0.0162`; el backend hace `tasaInteres/100`). `CreditCard.tasaInteresMensual`
  SÍ es porcentaje (`2.18`). No dividir otra vez entre 100.
- **`TASA_USURA_EA`** (= 28.5): constante única en `frontend/src/utils/creditCard.js`; importarla.
- **Cupo atómico**: `cupoDisponible` se actualiza con `literal` (`LEAST`/`GREATEST`), NUNCA leer-modificar-guardar
  ("Pagar corte" dispara N pagos en `Promise.all` y perdía incrementos). Aplica a `registerPurchasePayment`,
  `undoPurchasePayment`, `registerAbono`, `deletePurchase`, `updatePurchase` (delta de capital).
- **`registerAbono`** recalcula `totalAPagar`/`totalIntereses` (parcial: `numeroCuotas*valorCuotaMensual`; total: lo desembolsado).
  Frontend: "Ya pagado" usa `totalAPagar` si la compra está `pagada`.
- **Editar compra**: ruta propia `/credit-cards/:id/purchases/:purchaseId/edit` con el MISMO `CreditCardPurchaseForm`.
  Siempre editables `descripcion`/`categoria`; `montoTotal`/`numeroCuotas`/`fechaCompra` solo con `cuotasPagadas === 0` y
  `tipo === 'compra'` (`updatePurchase` lo bloquea si no). Recalcula con `calcularCuotaCompra`; si el delta sube y no
  alcanza el cupo → 400. Campos bloqueados se muestran `disabled` + candado `Lock`.
- **`buildSchedule`** genera todo el historial de cortes pasados (`monthsBack` se deriva de la compra más antigua, cap 120).
  Un `monthsBack` explícito se respeta (`Reports.jsx` manda `0`). `CardStatement` muestra 3 cortes pagados + todos los pendientes;
  "Ver más extractos" solo agrega.
- **Suscripciones USD/EUR**: `toCOP()` antes de sumar con COP. **Totales de lista**: filtrar por estado activo (mostrar todas está bien, sumar todas no).
- **Zod descarta en silencio claves fuera del schema**: un campo que el `updateSchema` no declara responde 200 y nunca se guarda
  (bug: la edición inline de suscripciones mandaba `monto/moneda/frecuencia/fechaInicio`). Antes de agregar un campo a un form de
  edición, verificar el `updateSchema`; si es inmutable a propósito, mostrarlo `disabled` + `Lock` + motivo (no ocultarlo).
- **Los `<select>` devuelven STRING**: `Number()` antes de enviar IDs/numéricos (Zod `z.number()` sin coerción).
- **Datos con comisiones de avance pendientes** (pre 2026-09-07): `node backend/scripts/fix-comisiones-avances.js` (dry-run; `--apply`).
  Cupo inconsistente: `node backend/scripts/fix-cupo-disponible.js` (dry-run; `--apply`).

## Fechas (UTC-5: Colombia)
- **Nunca `toISOString()` para "hoy"/mes**: tras ~7 p. m. da el día/mes siguiente. Frontend: `localISODate()`, `monthKey()`,
  `addMonths()`, `fmtDate()` (`utils/format.js`). Backend: `localToday()`/`localMonth()` (`utils/localDate.js`).
  (`new Date(a,m,d).toISOString()` a medianoche local SÍ es seguro; el problema es `new Date()` con hora actual.)
- **`new Date('YYYY-MM-DD')` parsea en UTC** y retrocede un día en local (`'2026-07-01'.getMonth()` = junio; un 1 de enero
  mostraba "31 dic"). Para MOSTRAR/comparar un DATEONLY: `parseLocalDate()`/`fmtDateLong()`. Para año/mes de un DATEONLY:
  `Number(str.slice(5,7)) - 1`.
- **Días de ciclo 29/30/31**: recortar con `effectiveDayInMonth(dia, año, mesIndex)` (`backend/src/utils/cycleDay.js`;
  frontend `utils/format.js`). `new Date(y,m,31)` DESBORDA al mes siguiente (sí, incluso el constructor). Aplicado en
  `subscriptionChargeJob`, `cuotaManejoJob`, `analytics::nextPaymentDate`, `creditCard.service::getUpcomingPayments/getOverview`,
  `bankCreditMoraJob::expectedCuotasPagadas`, `bankCreditCalculation`. Si el mes puede salir de 0..11, normalizar con `new Date(y,m,1)`.
- `budget.controller.js` calcula el mes por defecto en hora local (antes UTC).
- `text-transform: capitalize` capitaliza preposiciones; usar `capFirst(monthLabel(m))`.
- Selector de día de ciclo: `<DayOfMonthPicker>` (avisa 29-31), no `<input type=number>`.

## Formularios y UI funcional
- **Dinero es-CO: `<MoneyInput>`, NUNCA `<input type="number">`** (`type=number` pinta `26000,00` sin miles). Máscara en vivo
  (`1.200.000`, `26.000,50`), `onChange` entrega el canónico (`'1200000.50'`); lógica en `utils/format.js::parseMoneyInput/formatMoneyInput`.
  En forms con helper `field(nombre, label, hint, { type: 'money' })`; los inputs inline usan `<MoneyInput>` directo.
  NO migrar porcentajes, cuentas (`numeroCuotas`, `diaCobro…`) ni el `input:'number'` de SweetAlert (`SavingsDetail.handleAporte`).
- **Error de carga ≠ vacío**: usar `<LoadError onRetry={load} title="…" />` (patrón: estado `error`; `load()` hace `setError(false)` al
  inicio y `setError(true)` en el catch; render `loading ? skeleton : error ? <LoadError/> : datos/vacío`). NUNCA `.catch(console.error)` a secas.
- **Import CSV**: NO usar `XLSX.read` para `.csv` (corrompe `"150.000,50"` → `150` y adivina fechas); parsers propios en
  `frontend/src/utils/csvImport.js` (detecta delimitador `,` `;` tab; montos es-CO; fechas DD/MM/YYYY). `XLSX.read` solo para `.xlsx/.xls` (`raw:false`).
- `GlobalSearch` descarta respuestas obsoletas por secuencia y distingue "sin resultados" de "falló".
- Lint: `useEffect(() => { load(); }, [id])` dispara `set-state-in-effect`; pre-existente, no bloquea el build.
- `git` avisa `LF will be replaced by CRLF` (Windows): inofensivo.

## Seguridad
- **JWT con `purpose`**: `authenticateToken` rechaza cualquier token con claim `purpose` (el `tempToken` de 2FA, `purpose:'2fa-pending'`,
  saltaba el 2FA en toda ruta). Token de propósito especial nuevo → no usarlo como sesión sin ese chequeo. Test: `core/middleware/__tests__/jwtMiddleware.test.js`.
- **IDOR**: todo endpoint de tarjeta/compra debe verificar dueño con `findOwnedCard`/`findOwnedPurchase` (`creditCard.service.js`;
  pasar `userId`/`isAdmin`) y cruzar `:creditCardId` de la URL con `purchase.creditCardId`.
- `PushSubscriptionService.unsubscribe` va scoped a `req.user.id`; `subscribe` valida el body (400, no TypeError 500).

## PWA
- Iconos reales: `frontend/public/icon-192.png`/`icon-512.png` (fondo blanco sólido por iOS); `sw.js` usa `/icon-192.png`.
- `beforeinstallprompt` no dispara en Chromium headless. Si "no ofrece instalar" tras un deploy: primero `Page.getInstallabilityErrors`
  (CDP vía Playwright); suele ser el veredicto cacheado en el celular (borrar datos del sitio en Chrome), no un bug de código.
