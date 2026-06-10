# Diseño: Módulos de Control Financiero
**Fecha:** 2026-06-10  
**Estado:** Aprobado por el usuario  
**Proyecto:** Debti

---

## Contexto

Debti actualmente controla lo que el usuario *debe* (tarjetas de crédito, créditos bancarios, suscripciones). Este spec agrega tres módulos para controlar lo que el usuario *tiene* y *hacia dónde va* su dinero, con mínima disciplina de registro.

**Principio rector:** "Págate primero" — cubre obligaciones y metas, lo demás fluye libre sin rastrear cada peso.

---

## Módulos a implementar

### 1. Ingresos (`income`)

Fuentes de ingreso mensual fijo (salario, etc.). El usuario registra sus fuentes una vez; el sistema las trata como recurrentes.

**Modelo de datos:**
```
Income
  id          UUID / serial
  userId      FK → User
  nombre      string         ej: "Salario Bancolombia"
  monto       DECIMAL        monto mensual en COP
  diaCobro    int (1-31)     día del mes en que llega
  status      enum           'activo' | 'inactivo'
```

**Sin historial mensual** — las fuentes son recurrentes por definición. El total = suma de activas.

**API:**
```
GET    /api/income          → lista todas las fuentes del usuario
POST   /api/income          → crear fuente
PUT    /api/income/:id      → editar
DELETE /api/income/:id      → eliminar
```

**Frontend:**
- Ruta: `/income` y `/income/new`, `/income/:id/edit`
- Una sola página tipo lista (sin detalle con tabs — no lo necesita)
- KPI prominente: "Total mensual: $X"

---

### 2. Obligaciones Personales (`personalDebt`)

Deudas sin interés: dinero prestado por amigos/familia, pagos a plazos informales.

**Modelo de datos:**
```
PersonalDebt
  id              UUID / serial
  userId          FK → User
  nombre          string         ej: "Prestamo Juan"
  descripcion     string?        detalle opcional
  prestamista     string         a quién se le debe
  montoTotal      DECIMAL        monto original
  saldoPendiente  DECIMAL        saldo actual (se reduce con abonos)
  montoCuota      DECIMAL        cuota acordada mensual
  cuotasPagadas   int            contador de abonos
  numeroCuotas    int            total de cuotas planeadas
  diaPago         int (1-31)     día de pago acordado
  status          enum           'activo' | 'pagado'
```

**Regla de negocio:** `numeroCuotas = ceil(montoTotal / montoCuota)` al crear. Cada abono reduce `saldoPendiente` e incrementa `cuotasPagadas`. Cuando `saldoPendiente <= 0`, status → `'pagado'` automáticamente.

**Sin tasa de interés** — cálculo lineal puro, sin amortización francesa.

**API:**
```
GET    /api/personal-debts              → lista
POST   /api/personal-debts              → crear
GET    /api/personal-debts/:id          → detalle
PUT    /api/personal-debts/:id          → editar
DELETE /api/personal-debts/:id          → eliminar
POST   /api/personal-debts/:id/abono    → registrar pago (reduce saldo)
```

**Frontend:**
- Rutas: `/personal-debts`, `/personal-debts/new`, `/personal-debts/:id`, `/personal-debts/:id/edit`
- Página de detalle con tabs: **Resumen** (overview + botón abonar) | **Historial** (lista de abonos)
- Barra de progreso igual a la de créditos bancarios

---

### 3. Metas de Ahorro (`savingsGoal`)

Objetivos de ahorro con seguimiento de progreso. El usuario define una meta, hace aportes manuales mensualmente.

**Modelo de datos:**
```
SavingsGoal
  id               UUID / serial
  userId           FK → User
  nombre           string         ej: "Fondo de Emergencia"
  emoji            string?        ej: "🛡️" (opcional, visual)
  montoMeta        DECIMAL        cuánto quiere ahorrar
  montoAcumulado   DECIMAL        cuánto lleva (actualiza con aportes)
  aporteMensual    DECIMAL        referencia de cuánto planea aportar/mes
  fechaMeta        date?          fecha objetivo (opcional)
  status           enum           'activo' | 'completado' | 'pausado'
```

**Sin tabla de historial de aportes** — `montoAcumulado` se actualiza directamente. Mantiene la implementación simple.

**Regla de negocio:** cuando `montoAcumulado >= montoMeta`, status → `'completado'` automáticamente.

**API:**
```
GET    /api/savings              → lista
POST   /api/savings              → crear
GET    /api/savings/:id          → detalle
PUT    /api/savings/:id          → editar
DELETE /api/savings/:id          → eliminar
POST   /api/savings/:id/aporte   → registrar aporte (suma a montoAcumulado)
```

**Frontend:**
- Rutas: `/savings`, `/savings/new`, `/savings/:id`, `/savings/:id/edit`
- Página de detalle simple: progreso visual + botón "Registrar aporte"
- Mostrar: % completado, monto restante, meses estimados a `aporteMensual`

---

## Cálculo "Dinero Libre"

Nuevo KPI central visible en el Dashboard y en Analítica.

```
dineroLibre = Σ Income.monto (activos)
            − Σ obligaciones mensuales fijas:
                Subscription.montoMensual (activas)
                + BankCredit.valorCuota + BankCredit.cuotaAdministracion (activos)
                + Σ CreditCardPurchase.valorCuotaMensual (activas, tipos cupo-afectantes)
                + PersonalDebt.montoCuota (activos)
            − Σ SavingsGoal.aporteMensual (activas)
```

**Dónde aparece:**
- Dashboard: nuevo StatCard "Dinero libre" (tono `pos` si > 0, `neg` si < 0)
- Analítica (`analytics.service.getSummary`): incluir `income` y `dineroLibre` en el response

---

## Arquitectura backend

Cada módulo sigue el patrón estándar de Debti:

```
backend/src/modules/income/
  income.model.js
  income.schema.js
  income.service.js
  income.controller.js
  income.routes.js

backend/src/modules/personalDebt/
  personalDebt.model.js
  personalDebt.schema.js
  personalDebt.service.js
  personalDebt.controller.js
  personalDebt.routes.js

backend/src/modules/savingsGoal/
  savingsGoal.model.js
  savingsGoal.schema.js
  savingsGoal.service.js
  savingsGoal.controller.js
  savingsGoal.routes.js
```

Rutas registradas en `main.js` bajo `/api/income`, `/api/personal-debts`, `/api/savings`.

---

## Navegación frontend

**Sidebar** — tres nuevas entradas (después de Suscripciones):
```
💰 Ingresos          → /income
🤝 Obligaciones      → /personal-debts
🎯 Metas de Ahorro   → /savings
```

**Rutas completas en App.jsx:**
```
/income                → IncomeList
/income/new            → IncomeForm
/income/:id/edit       → IncomeForm (modo edición)

/personal-debts        → PersonalDebtList
/personal-debts/new    → PersonalDebtNew (wizard)
/personal-debts/:id    → PersonalDebtLayout
  index                → PersonalDebtOverview
  /history             → PersonalDebtHistory
/personal-debts/:id/edit

/savings               → SavingsList
/savings/new           → SavingsNew
/savings/:id           → SavingsDetail
/savings/:id/edit
```

---

## Actualizaciones a módulos existentes

| Módulo | Cambio |
|---|---|
| `analytics.service.js` | Incluir `income` en `getSummary`, agregar campo `dineroLibre` |
| `Dashboard.jsx` | Nuevo StatCard "Dinero libre" |
| `CLAUDE.md` | Actualizar módulos, rutas y modelo de cálculo |

---

## Fuera de alcance

- Historial de aportes a metas (puede agregarse después)
- Tracking de gastos variables (requiere disciplina diaria — descartado)
- Registro de activos/patrimonio neto (feature futura)
- Notificaciones de vencimiento para obligaciones personales (puede reutilizar `reminderJob`)
