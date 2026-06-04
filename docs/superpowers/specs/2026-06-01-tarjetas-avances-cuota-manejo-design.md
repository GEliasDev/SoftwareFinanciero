# Avances y Cuota de Manejo en Tarjetas de Crédito

Fecha: 2026-06-01

## Resumen

Hoy una tarjeta de crédito solo maneja **compras a cuotas**. Este diseño agrega dos
conceptos que faltan:

1. **Avances** — retiros de efectivo. Se comportan como una compra (diferible a N
   cuotas con interés), pero generan un **cobro fijo adicional** configurable por
   tarjeta, que aparece como cargo suelto en el corte vigente.
2. **Cuota de manejo** — cargo fijo recurrente que se agrega automáticamente en cada
   fecha de corte.

Principio de diseño: **reusar el mecanismo de compras existente**. Un avance es una
compra con `tipo: 'avance'`; la comisión y la cuota de manejo son cargos de 1 cuota
(`tipo: 'comision'` / `tipo: 'cuota_manejo'`). Así `buildSchedule`, el cálculo de cupo
y el extracto siguen funcionando sin cambios estructurales — solo se agrega el campo
`tipo` para diferenciar visualmente.

## Modelo de datos

### `CreditCard` (credit_cards)
Campos nuevos (ambos con default → no rompen registros existentes):
- `comisionAvance` — `DECIMAL(15,2)`, `allowNull: true`, `defaultValue: 0`. Monto fijo
  que cobra la tarjeta por cada avance.
- `cuotaManejo` — `DECIMAL(15,2)`, `allowNull: true`, `defaultValue: 0`. Monto fijo de
  la cuota de manejo recurrente. `0` = la tarjeta no cobra cuota de manejo.

### `CreditCardPurchase` (credit_card_purchases)
Campo nuevo:
- `tipo` — `ENUM('compra', 'avance', 'comision', 'cuota_manejo')`, `allowNull: false`,
  `defaultValue: 'compra'`.
  - `compra` — compra normal (comportamiento actual).
  - `avance` — retiro de efectivo, diferido a N cuotas con interés.
  - `comision` — cobro fijo por avance, 1 cuota, sin interés.
  - `cuota_manejo` — cuota de manejo recurrente, 1 cuota, sin interés.

Como `tipo` tiene default `'compra'`, todas las compras existentes quedan correctas.

## Backend

### Schema (Zod) — `creditCard.schema.js`
- `creditCardCreateSchema` / `creditCardUpdateSchema`: agregar
  - `comisionAvance: z.number().nonnegative().optional().default(0)` (create) / `.optional()` (update)
  - `cuotaManejo: z.number().nonnegative().optional().default(0)` (create) / `.optional()` (update)
- Nuevo `advanceCreateSchema`:
  - `descripcion: z.string().min(1)`
  - `montoTotal: z.number().positive()`
  - `numeroCuotas: z.number().int().min(1)`
  - `fechaCompra: z.string().date()`

### Servicio — `creditCard.service.js`

**`createAdvance(creditCardId, data)`**
1. Cargar tarjeta; validar `status === 'activa'`.
2. Parsear con `advanceCreateSchema`.
3. Validar cupo: `montoTotal + comisionAvance ≤ cupoDisponible`. Si no, `AppError 400`.
4. Calcular cuota del avance con `calcularCuotaCompra` (misma tasa de la tarjeta).
5. Crear el registro del avance: `tipo: 'avance'`, con los cálculos.
6. Si `card.comisionAvance > 0`: crear el cargo de comisión:
   - `tipo: 'comision'`, `descripcion: 'Comisión por avance'`, `montoTotal:
     comisionAvance`, `numeroCuotas: 1`, `valorCuotaMensual: comisionAvance`,
     `totalAPagar: comisionAvance`, `totalIntereses: 0`, `fechaCompra: hoy`,
     `categoria: 'otros'`.
7. Descontar del cupo `montoTotal + comisionAvance` (el principal del avance + la
   comisión sí ocupan cupo; los intereses no, igual que en compras).
8. Devolver `{ avance, comision }`.

**Cuota de manejo — job en `reminderJob.js` (cron diario existente)**

Agregar al job diario una pasada por las tarjetas:
```
para cada tarjeta activa con cuotaManejo > 0:
  diaCorte = tarjeta.fechaCorte
  hoy = día del mes actual
  si hoy >= diaCorte:                         # llegó o ya pasó el corte de este ciclo
    existe = ¿hay un cargo tipo 'cuota_manejo' de esta tarjeta
              con fechaCompra dentro del ciclo de corte vigente?
    si no existe:
      crear cargo: tipo 'cuota_manejo', descripcion 'Cuota de manejo',
                   montoTotal = cuotaManejo, numeroCuotas 1, valorCuotaMensual = cuotaManejo,
                   totalAPagar = cuotaManejo, totalIntereses 0, fechaCompra = hoy,
                   categoria 'otros'
      # NO descontar cupo: la cuota de manejo es cupo-neutral (ver abajo)
```
- **Idempotencia + ponerse al día:** la condición `hoy >= diaCorte` con el chequeo de
  "ya existe en este ciclo" garantiza que (a) no se duplica si el job corre varias
  veces, y (b) si el servidor estaba apagado el día exacto del corte, se crea el primer
  día que el servidor arranque dentro de ese ciclo.
- **Definición de "ciclo de corte vigente":** el rango desde el último día de corte
  (incl.) hasta el próximo. Para el chequeo de existencia basta con buscar un cargo
  `cuota_manejo` cuya `fechaCompra` sea ≥ la fecha del último corte.

### Rutas — `creditCard.routes.js`
- `POST /credit-cards/:id/advances` → `createAdvance`.

## Frontend

### Formularios de tarjeta (`CreditCardNew.jsx`, `CreditCardEdit.jsx`)
- En el paso **Financiero**, agregar dos campos opcionales:
  - "Comisión por avance (COP)" → `comisionAvance`
  - "Cuota de manejo (COP)" → `cuotaManejo`
- Ambos default 0, con hint explicativo ("Déjalo en 0 si la tarjeta no lo cobra").
- Convertir con `Number()` antes de enviar (gotcha conocido de selects/inputs).

### Registrar avance (nuevo flujo)
- Página similar a `CreditCardPurchaseNew.jsx`: descripción, monto, cuotas, fecha.
- **Vista previa en vivo:** "Avance $500.000 a 12 cuotas (≈ $X/mes) + comisión $9.900
  este corte". Si `comisionAvance === 0`, omitir la línea de comisión.
- Botón **"Registrar avance"** en el detalle de la tarjeta, junto a "Nueva compra".
- Llama a `CreditCardService.createAdvance(id, data)`.

### Visualización (extracto y lista de compras)
- `CardStatement` (`LineRow`) y `CardPurchases`: diferenciar por `tipo`.
  - `avance` → ícono de billete/efectivo + etiqueta "Avance".
  - `comision` → etiqueta "Comisión".
  - `cuota_manejo` → etiqueta "Cuota de manejo".
  - `compra` → comportamiento actual (ícono por categoría).
- Un helper `getMovimientoVisual(tipo, categoria)` centraliza ícono/label/color para no
  dispersar la lógica.

### Service — `creditCardService.js`
- Agregar `createAdvance(cardId, data)` → `POST /credit-cards/:id/advances`.

## Qué NO cambia

- `buildSchedule` — avances (N cuotas) y cargos (1 cuota) ya fluyen por la lógica
  existente. La cuota de manejo, al ser un cargo real de 1 cuota, también.
- Cálculo de cupo usado / disponible — avances y comisiones ocupan cupo como cualquier
  compra y se restauran al pagarse. **La cuota de manejo es la excepción (cupo-neutral).**
- `registerPurchasePayment` — paga 1 cuota de cada cargo activo; comisión y cuota de
  manejo (1 cuota) quedan `pagada` al primer pago. **Excepción cupo:** para
  `tipo === 'cuota_manejo'` NO restaurar cupo (ver "Cupo neutral").
- Banner/KPIs de "por pagar este ciclo" — al derivarse de `buildSchedule`, incluyen
  automáticamente avances, comisiones y cuotas de manejo del ciclo.

## Cupo neutral (cuota de manejo)

La cuota de manejo **no ocupa cupo**: representa un cargo del banco que no consume tu
límite de crédito disponible. Para mantener la consistencia, `tipo === 'cuota_manejo'`
debe tratarse como cupo-neutral en TODOS los puntos que tocan cupo:
- **Creación (job):** no descontar `cupoDisponible`.
- **`registerPurchasePayment`:** no restaurar cupo al pagarla.
- **`undoPurchasePayment`:** no revertir cupo.
- **`deletePurchase`:** no restaurar cupo al borrarla.
- **`registerAbono`:** no aplica (la cuota de manejo es de 1 cuota, sin abonos).

Avances y comisiones **sí** ocupan cupo (comportamiento normal de compra).

## Casos borde

- **Cupo insuficiente para avance + comisión:** error 400 antes de crear nada.
- **`comisionAvance = 0`:** se crea solo el avance, sin cargo de comisión.
- **`cuotaManejo = 0`:** el job ignora la tarjeta.
- **Servidor apagado en la fecha de corte:** el job se pone al día al próximo arranque
  dentro del ciclo (condición `hoy >= diaCorte` + chequeo de existencia).
- **Tarjeta no activa:** no se generan avances ni cuota de manejo.
- **Cuotas pasadas anteriores a activar la función:** no se rellenan (limitación
  aceptada).

## Pruebas

- **Unit (cálculo):** `createAdvance` calcula la cuota del avance y crea el cargo de
  comisión correcto; respeta `comisionAvance = 0`; falla con cupo insuficiente.
- **Unit (job):** crea cuota de manejo cuando corresponde; es idempotente (no duplica
  en el mismo ciclo); se pone al día si `hoy > diaCorte`; ignora `cuotaManejo = 0`.
- **Integración/manual (Playwright):** registrar un avance y verificar en el extracto
  que aparecen el avance (diferido) y la comisión (corte vigente); configurar cuota de
  manejo y verificar que el cargo aparece tras el corte.
