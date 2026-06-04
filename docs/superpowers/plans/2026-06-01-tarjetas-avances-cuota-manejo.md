# Avances y Cuota de Manejo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar avances de efectivo (diferibles, con comisión fija por tarjeta) y cuota de manejo recurrente que se genera en cada corte.

**Architecture:** Reusar el mecanismo de compras. Un avance es una compra `tipo: 'avance'`; la comisión y la cuota de manejo son cargos de 1 cuota (`tipo: 'comision'` / `'cuota_manejo'`). `buildSchedule`, cupo y extracto no cambian — solo se agrega `tipo` para diferenciar. La cuota de manejo la genera el cron diario existente; es cupo-neutral.

**Tech Stack:** Node + Express + Sequelize + Zod (backend), React 19 + Vite (frontend), node-cron (job).

**Verificación:** El backend no tiene framework de tests. Se verifica vía la API corriendo (scripts Node en `%TEMP%/pw-runner/` siguiendo el patrón existente) y Playwright para UI, según `CLAUDE.md`.

**Spec:** `docs/superpowers/specs/2026-06-01-tarjetas-avances-cuota-manejo-design.md`

---

## File Structure

**Backend (modificar):**
- `backend/src/modules/creditCard/creditCard.model.js` — campos `comisionAvance`, `cuotaManejo`.
- `backend/src/modules/creditCard/creditCardPurchase.model.js` — campo `tipo`.
- `backend/src/modules/creditCard/creditCard.schema.js` — validación de los nuevos campos + `advanceCreateSchema`.
- `backend/src/modules/creditCard/creditCard.service.js` — `createAdvance` + cupo-neutral para `cuota_manejo`.
- `backend/src/modules/creditCard/creditCard.controller.js` — `createAdvance`.
- `backend/src/modules/creditCard/creditCard.routes.js` — ruta POST advances.
- `backend/src/jobs/cuotaManejoJob.js` — **crear**: lógica de generación.
- `backend/src/jobs/reminderJob.js` — invocar la generación dentro del cron diario.

**Frontend (modificar):**
- `frontend/src/services/creditCardService.js` — `createAdvance`.
- `frontend/src/utils/creditCard.js` — helper `getMovimientoVisual`.
- `frontend/src/pages/CreditCardNew.jsx` / `CreditCardEdit.jsx` — campos comisión + cuota de manejo.
- `frontend/src/components/credit-cards/CardStatement.jsx` — usar `getMovimientoVisual` en `LineRow`.
- `frontend/src/pages/credit-card/CardPurchases.jsx` — usar `getMovimientoVisual`.
- `frontend/src/pages/CreditCardAdvanceNew.jsx` — **crear**: flujo registrar avance.
- `frontend/src/App.jsx` — ruta del avance.
- `frontend/src/pages/credit-card/CardPurchases.jsx` — botón "Registrar avance".

---

## Task 1: Modelo de datos — campos nuevos

**Files:**
- Modify: `backend/src/modules/creditCard/creditCard.model.js`
- Modify: `backend/src/modules/creditCard/creditCardPurchase.model.js`

- [ ] **Step 1: Agregar `comisionAvance` y `cuotaManejo` a CreditCard**

En `creditCard.model.js`, dentro de `CreditCard.init({...})`, después del bloque `color` y antes de `status`, agregar:

```javascript
        comisionAvance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
        },
        cuotaManejo: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
        },
```

- [ ] **Step 2: Agregar `tipo` a CreditCardPurchase**

En `creditCardPurchase.model.js`, dentro de `CreditCardPurchase.init({...})`, después del bloque `status` y antes de `creditCardId`, agregar:

```javascript
        tipo: {
            type: DataTypes.ENUM('compra', 'avance', 'comision', 'cuota_manejo'),
            allowNull: false,
            defaultValue: 'compra',
        },
```

- [ ] **Step 3: Verificar que el sync aplica las columnas**

Run: `cd backend && npm run dev`
Expected: arranca sin error (`sequelize.sync({ alter: true })` agrega las columnas). Ver `Server running on...`. Detener con Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/creditCard/creditCard.model.js backend/src/modules/creditCard/creditCardPurchase.model.js
git commit -m "feat(tarjetas): campos comisionAvance, cuotaManejo y tipo en modelos"
```

---

## Task 2: Schema Zod — validación

**Files:**
- Modify: `backend/src/modules/creditCard/creditCard.schema.js`

- [ ] **Step 1: Agregar campos a los schemas de tarjeta**

En `creditCardCreateSchema`, después de la línea `color: z.union([...]).optional().default('blue'),`, agregar:

```javascript
    comisionAvance: z.number().nonnegative({ message: 'La comisión no puede ser negativa' }).optional().default(0),
    cuotaManejo: z.number().nonnegative({ message: 'La cuota de manejo no puede ser negativa' }).optional().default(0),
```

En `creditCardUpdateSchema`, después de la línea `color: z.union([...]).optional(),`, agregar:

```javascript
    comisionAvance: z.number().nonnegative().optional(),
    cuotaManejo: z.number().nonnegative().optional(),
```

- [ ] **Step 2: Agregar `advanceCreateSchema`**

Al final del archivo, después de `purchaseUpdateSchema`, agregar:

```javascript
export const advanceCreateSchema = z.object({
    descripcion: z.string().min(1, { message: 'La descripción es requerida' }),
    montoTotal: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
    numeroCuotas: z.number().int().min(1, { message: 'Debe ser mínimo 1 cuota' }),
    fechaCompra: z.string().date({ message: 'Formato de fecha inválido, use YYYY-MM-DD' }),
});
```

- [ ] **Step 3: Verificar import válido**

Run: `cd backend && node -e "import('./src/modules/creditCard/creditCard.schema.js').then(m => console.log(Object.keys(m)))"`
Expected: imprime un array que incluye `advanceCreateSchema`, `creditCardCreateSchema`, etc., sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/creditCard/creditCard.schema.js
git commit -m "feat(tarjetas): validación de comisión, cuota de manejo y avances"
```

---

## Task 3: Servicio — createAdvance + cupo-neutral

**Files:**
- Modify: `backend/src/modules/creditCard/creditCard.service.js`

- [ ] **Step 1: Importar el schema de avance**

En la línea de import de schemas (que dice `import { creditCardCreateSchema, creditCardUpdateSchema, purchaseCreateSchema, purchaseUpdateSchema } from './creditCard.schema.js';`), agregar `advanceCreateSchema`:

```javascript
import { creditCardCreateSchema, creditCardUpdateSchema, purchaseCreateSchema, purchaseUpdateSchema, advanceCreateSchema } from './creditCard.schema.js';
```

- [ ] **Step 2: Agregar `createAdvance` al objeto del servicio**

Después del método `createPurchase` (justo después de su `},` de cierre), agregar:

```javascript
    // ── Avances ───────────────────────────────────────────────

    createAdvance: async (creditCardId, data) => {
        const card = await CreditCard.findByPk(creditCardId);
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        if (card.status !== 'activa') throw new AppError('La tarjeta no está activa', 400);

        const parsed = advanceCreateSchema.parse(data);
        const comision = parseFloat(card.comisionAvance ?? 0);

        if (parsed.montoTotal + comision > parseFloat(card.cupoDisponible)) {
            throw new AppError(
                `Cupo insuficiente. Disponible: $${card.cupoDisponible} (avance + comisión: $${(parsed.montoTotal + comision).toFixed(2)})`,
                400
            );
        }

        const calculos = calcularCuotaCompra({
            montoTotal: parsed.montoTotal,
            numeroCuotas: parsed.numeroCuotas,
            tasaInteresMensual: parseFloat(card.tasaInteresMensual),
        });

        const avance = await CreditCardPurchase.create({
            descripcion: parsed.descripcion,
            montoTotal: parsed.montoTotal,
            numeroCuotas: parsed.numeroCuotas,
            fechaCompra: parsed.fechaCompra,
            categoria: 'otros',
            tipo: 'avance',
            ...calculos,
            creditCardId,
        });

        let comisionRecord = null;
        if (comision > 0) {
            comisionRecord = await CreditCardPurchase.create({
                descripcion: 'Comisión por avance',
                montoTotal: comision,
                numeroCuotas: 1,
                valorCuotaMensual: comision,
                totalAPagar: comision,
                totalIntereses: 0,
                categoria: 'otros',
                tipo: 'comision',
                fechaCompra: new Date().toISOString().split('T')[0],
                creditCardId,
            });
        }

        // El avance y la comisión ocupan cupo (su principal).
        await card.update({
            cupoDisponible: parseFloat((parseFloat(card.cupoDisponible) - parsed.montoTotal - comision).toFixed(2)),
        });

        return { avance, comision: comisionRecord };
    },
```

- [ ] **Step 3: Hacer `registerPurchasePayment` cupo-neutral para cuota_manejo**

En `registerPurchasePayment`, localizar el bloque que restaura cupo:

```javascript
        const card = purchase.CreditCard;
        const capitalPorCuota = parseFloat(purchase.montoTotal) / purchase.numeroCuotas;
        const nuevoCupo = parseFloat(
            (parseFloat(card.cupoDisponible) + capitalPorCuota).toFixed(2)
        );

        await card.update({ cupoDisponible: Math.min(nuevoCupo, parseFloat(card.cupoTotal)) });
```

Reemplazarlo por (envuelve la actualización de cupo en una condición):

```javascript
        const card = purchase.CreditCard;
        // La cuota de manejo es cupo-neutral: no restaura cupo al pagarse.
        if (purchase.tipo !== 'cuota_manejo') {
            const capitalPorCuota = parseFloat(purchase.montoTotal) / purchase.numeroCuotas;
            const nuevoCupo = parseFloat(
                (parseFloat(card.cupoDisponible) + capitalPorCuota).toFixed(2)
            );
            await card.update({ cupoDisponible: Math.min(nuevoCupo, parseFloat(card.cupoTotal)) });
        }
```

- [ ] **Step 4: Hacer `undoPurchasePayment` cupo-neutral para cuota_manejo**

En `undoPurchasePayment`, localizar:

```javascript
        const nuevasCuotasPagadas = purchase.cuotasPagadas - 1;
        const card = purchase.CreditCard;
        const capitalPorCuota = parseFloat(purchase.montoTotal) / purchase.numeroCuotas;

        // Revertir cupo: descontar capital que fue restaurado al pagar
        const nuevoCupo = parseFloat(
            (parseFloat(card.cupoDisponible) - capitalPorCuota).toFixed(2)
        );
        await card.update({ cupoDisponible: Math.max(0, nuevoCupo) });
```

Reemplazarlo por:

```javascript
        const nuevasCuotasPagadas = purchase.cuotasPagadas - 1;
        const card = purchase.CreditCard;

        // La cuota de manejo es cupo-neutral: no revierte cupo.
        if (purchase.tipo !== 'cuota_manejo') {
            const capitalPorCuota = parseFloat(purchase.montoTotal) / purchase.numeroCuotas;
            const nuevoCupo = parseFloat(
                (parseFloat(card.cupoDisponible) - capitalPorCuota).toFixed(2)
            );
            await card.update({ cupoDisponible: Math.max(0, nuevoCupo) });
        }
```

- [ ] **Step 5: Hacer `deletePurchase` cupo-neutral para cuota_manejo**

En `deletePurchase`, localizar:

```javascript
        // Restaurar cupo proporcional al capital no pagado (no intereses)
        const cuotasRestantes = purchase.numeroCuotas - purchase.cuotasPagadas;
        if (cuotasRestantes > 0) {
```

Reemplazar esa condición por (agrega el chequeo de tipo):

```javascript
        // Restaurar cupo proporcional al capital no pagado (no intereses).
        // La cuota de manejo es cupo-neutral: no restaura cupo.
        const cuotasRestantes = purchase.numeroCuotas - purchase.cuotasPagadas;
        if (cuotasRestantes > 0 && purchase.tipo !== 'cuota_manejo') {
```

- [ ] **Step 6: Verificar arranque sin errores de sintaxis**

Run: `cd backend && node --check src/modules/creditCard/creditCard.service.js`
Expected: sin salida (sintaxis válida).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/creditCard/creditCard.service.js
git commit -m "feat(tarjetas): servicio createAdvance y cupo-neutral para cuota de manejo"
```

---

## Task 4: Controller + ruta del avance

**Files:**
- Modify: `backend/src/modules/creditCard/creditCard.controller.js`
- Modify: `backend/src/modules/creditCard/creditCard.routes.js`

- [ ] **Step 1: Agregar `createAdvance` al controller**

Después del método `createPurchase` del controller (tras su `},`), agregar:

```javascript
    createAdvance: async (req, res, next) => {
        try {
            const result = await CreditCardService.createAdvance(
                req.params.creditCardId,
                req.body
            );
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    },
```

- [ ] **Step 2: Agregar la ruta**

En `creditCard.routes.js`, en la sección `// ── Compras ──`, después de la línea `router.post('/:creditCardId/purchases', ...)`, agregar:

```javascript
router.post('/:creditCardId/advances', authenticateToken, CreditCardController.createAdvance);
```

- [ ] **Step 3: Verificar endpoint vía API**

Crear `C:\Users\GabrielEliasValdelam\AppData\Local\Temp\pw-runner\verify-avance.js`:

```javascript
const { request } = require('playwright');
const BASE = 'http://localhost:5175/api';
const ts = Date.now();
const email = `qa_av_${ts}@test.com`, password = 'test1234';
(async () => {
  const api = await request.newContext();
  await api.post(`${BASE}/users`, { data: { primerNombre: 'QA', segundoNombre: '', primerApellido: 'Av', segundoApellido: '', email, telefono: '3001234567', pais: 'Colombia', ciudad: 'Bogota', password } });
  const { token } = await (await api.post(`${BASE}/users/login`, { data: { email, password } })).json();
  const auth = { Authorization: `Bearer ${token}` };
  const card = await (await api.post(`${BASE}/credit-cards`, { headers: auth, data: { nombre: 'Av Test', entidad: 'BancoQA', cupoTotal: 5000000, tasaInteresMensual: 2, fechaCorte: 30, fechaPago: 10, comisionAvance: 9900 } })).json();
  const res = await api.post(`${BASE}/credit-cards/${card.id}/advances`, { headers: auth, data: { descripcion: 'Avance cajero', montoTotal: 500000, numeroCuotas: 12, fechaCompra: '2026-06-01' } });
  console.log('status:', res.status());
  const body = await res.json();
  console.log('avance.tipo:', body.avance?.tipo, '| comision:', body.comision?.montoTotal);
  const purchases = await (await api.get(`${BASE}/credit-cards/${card.id}/purchases`, { headers: auth })).json();
  console.log('total registros:', purchases.length, '| tipos:', purchases.map(p => p.tipo).join(','));
  const cardAfter = await (await api.get(`${BASE}/credit-cards/${card.id}`, { headers: auth })).json();
  console.log('cupoDisponible:', cardAfter.cupoDisponible, '(esperado 4490100 = 5000000 - 500000 - 9900)');
  await api.dispose();
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
```

Run (con backend corriendo en :5175):
```
cd backend && npm run dev   # en otra terminal
cd C:\Users\GabrielEliasValdelam\AppData\Local\Temp\pw-runner && set "NODE_PATH=%APPDATA%\npm\node_modules" && node verify-avance.js
```
Expected:
```
status: 201
avance.tipo: avance | comision: 9900.00
total registros: 2 | tipos: avance,comision  (orden puede variar)
cupoDisponible: 4490100.00 (esperado 4490100 ...)
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/creditCard/creditCard.controller.js backend/src/modules/creditCard/creditCard.routes.js
git commit -m "feat(tarjetas): endpoint POST /credit-cards/:id/advances"
```

---

## Task 5: Job de cuota de manejo

**Files:**
- Create: `backend/src/jobs/cuotaManejoJob.js`
- Modify: `backend/src/jobs/reminderJob.js`

- [ ] **Step 1: Crear el job**

Crear `backend/src/jobs/cuotaManejoJob.js`:

```javascript
import { Op } from 'sequelize';
import { CreditCard } from '../modules/creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../modules/creditCard/creditCardPurchase.model.js';

const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Genera el cargo de cuota de manejo del ciclo vigente para las tarjetas que la
 * cobran. Idempotente: solo crea si ya llegó el corte de este mes y aún no existe
 * un cargo cuota_manejo en este ciclo. Se pone al día si el servidor estuvo apagado.
 * La cuota de manejo es cupo-neutral: NO descuenta cupoDisponible.
 */
export const generateCuotaManejoCharges = async () => {
    const cards = await CreditCard.findAll({ where: { status: 'activa' } });
    const today = new Date();
    const day = today.getDate();
    let creados = 0;

    for (const card of cards) {
        const cuota = parseFloat(card.cuotaManejo ?? 0);
        const cutDay = Number(card.fechaCorte);
        if (cuota <= 0) continue;
        if (day < cutDay) continue; // aún no llega el corte de este mes

        const lastCut = new Date(today.getFullYear(), today.getMonth(), cutDay);
        const existe = await CreditCardPurchase.findOne({
            where: {
                creditCardId: card.id,
                tipo: 'cuota_manejo',
                fechaCompra: { [Op.gte]: ymd(lastCut) },
            },
        });
        if (existe) continue;

        await CreditCardPurchase.create({
            descripcion: 'Cuota de manejo',
            montoTotal: cuota,
            numeroCuotas: 1,
            valorCuotaMensual: cuota,
            totalAPagar: cuota,
            totalIntereses: 0,
            categoria: 'otros',
            tipo: 'cuota_manejo',
            fechaCompra: ymd(today),
            creditCardId: card.id,
        });
        creados++;
    }

    if (creados > 0) console.log(`[CuotaManejoJob] ${creados} cuota(s) de manejo generada(s)`);
    return creados;
};
```

- [ ] **Step 2: Invocar el job desde el cron diario**

En `backend/src/jobs/reminderJob.js`, agregar el import al inicio (tras el import de `ReminderService`):

```javascript
import { generateCuotaManejoCharges } from './cuotaManejoJob.js';
```

Dentro del `cron.schedule('0 8 * * *', async () => {`, después del bloque `try {...} catch {...}` de los recordatorios (justo antes de cerrar la función del schedule), agregar:

```javascript
        try {
            await generateCuotaManejoCharges();
        } catch (err) {
            console.error('[CuotaManejoJob] Error:', err.message);
        }
```

- [ ] **Step 3: Verificar la lógica del job vía API**

Crear `C:\Users\GabrielEliasValdelam\AppData\Local\Temp\pw-runner\verify-cuota-manejo.js`:

```javascript
const { request } = require('playwright');
const BASE = 'http://localhost:5175/api';
const ts = Date.now();
const email = `qa_cm_${ts}@test.com`, password = 'test1234';
(async () => {
  const api = await request.newContext();
  await api.post(`${BASE}/users`, { data: { primerNombre: 'QA', segundoNombre: '', primerApellido: 'CM', segundoApellido: '', email, telefono: '3001234567', pais: 'Colombia', ciudad: 'Bogota', password } });
  const { token } = await (await api.post(`${BASE}/users/login`, { data: { email, password } })).json();
  const auth = { Authorization: `Bearer ${token}` };
  // fechaCorte=1 garantiza day >= cutDay hoy
  const card = await (await api.post(`${BASE}/credit-cards`, { headers: auth, data: { nombre: 'CM Test', entidad: 'BancoQA', cupoTotal: 5000000, tasaInteresMensual: 2, fechaCorte: 1, fechaPago: 10, cuotaManejo: 30000 } })).json();
  console.log('cupo inicial:', card.cupoDisponible);
  // Disparar el job manualmente (mismo módulo que usa el cron)
  await api.dispose();
  console.log('Ahora ejecutar el job en una terminal del backend (ver Step 4).');
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
```

Como el job corre dentro del proceso del backend, verificarlo ejecutando la función directamente con el backend conectado a la DB. En la carpeta `backend`, correr:

```
cd backend && node -e "import('./src/jobs/cuotaManejoJob.js').then(async m => { const n = await m.generateCuotaManejoCharges(); console.log('creados:', n); const n2 = await m.generateCuotaManejoCharges(); console.log('segunda corrida (idempotente, esperado 0):', n2); process.exit(0); })"
```
Expected:
```
[CuotaManejoJob] N cuota(s) de manejo generada(s)
creados: N            (>= 1 si hay tarjetas con cuotaManejo>0 y day>=cutDay)
segunda corrida (idempotente, esperado 0): 0
```
(Nota: este `node -e` carga el módulo que abre la conexión Sequelize vía `db/client.js`; requiere el `.env` con las credenciales de Supabase.)

- [ ] **Step 4: Verificar que el cargo es cupo-neutral**

Tras correr el job del Step 3, consultar la tarjeta CM Test (vía API o un GET) y confirmar que `cupoDisponible` **no cambió** respecto al inicial, y que existe un registro `tipo: 'cuota_manejo'` por $30.000.

- [ ] **Step 5: Commit**

```bash
git add backend/src/jobs/cuotaManejoJob.js backend/src/jobs/reminderJob.js
git commit -m "feat(tarjetas): job de cuota de manejo recurrente (cupo-neutral)"
```

---

## Task 6: Service frontend — createAdvance

**Files:**
- Modify: `frontend/src/services/creditCardService.js`

- [ ] **Step 1: Agregar el método**

En `creditCardService.js`, en la sección `// ── Compras ──`, después del método `createPurchase`, agregar:

```javascript
  createAdvance: async (creditCardId, data) => {
    const response = await api.post(`/credit-cards/${creditCardId}/advances`, data);
    return response.data;
  },
```

- [ ] **Step 2: Verificar build**

Run: `cd frontend && npm run build`
Expected: build exitoso sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/creditCardService.js
git commit -m "feat(tarjetas): cliente createAdvance"
```

---

## Task 7: Campos de comisión y cuota de manejo en formularios

**Files:**
- Modify: `frontend/src/pages/CreditCardNew.jsx`
- Modify: `frontend/src/pages/CreditCardEdit.jsx`

- [ ] **Step 1: CreditCardNew — estado inicial**

En `CreditCardNew.jsx`, en el `useState(formData)`, agregar los campos al objeto inicial:

```javascript
  const [formData, setFormData] = useState({
    nombre: '', entidad: '', cupoTotal: '',
    tasaInteresMensual: '', fechaCorte: '', fechaPago: '', ultimos4: '', color: 'blue',
    comisionAvance: '', cuotaManejo: '',
  });
```

- [ ] **Step 2: CreditCardNew — campos en el paso Financiero**

En el `{step === 1 && (...)}`, dentro del `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>` que contiene cupo y tasa, agregar DESPUÉS de ese grid (antes de cerrar el `<div>` del step) un segundo grid:

```javascript
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {field('comisionAvance', 'Comisión por avance (COP)', 'Déjalo en 0 si la tarjeta no cobra avances', { type: 'number', min: '0', step: '0.01', placeholder: 'Ej: 9900' })}
                  {field('cuotaManejo', 'Cuota de manejo (COP)', 'Cargo fijo que se agrega en cada corte. 0 si no aplica', { type: 'number', min: '0', step: '0.01', placeholder: 'Ej: 30000' })}
                </div>
```

- [ ] **Step 3: CreditCardNew — enviar los campos**

En `handleSubmit`, dentro del objeto que pasa a `CreditCardService.create({...})`, agregar antes de `color: formData.color,`:

```javascript
        comisionAvance: Number(formData.comisionAvance) || 0,
        cuotaManejo: Number(formData.cuotaManejo) || 0,
```

- [ ] **Step 4: CreditCardEdit — cargar y enviar**

En `CreditCardEdit.jsx`, en el `useState(data)` inicial agregar `comisionAvance: '', cuotaManejo: '',`. En el `.then(card => setData({...}))` agregar:

```javascript
        comisionAvance: card.comisionAvance ?? '', cuotaManejo: card.cuotaManejo ?? '',
```

En el `{step === 1 && (...)}`, después del grid de cupo/tasa, agregar el mismo segundo grid del Step 2 (usando el helper `field` de este archivo):

```javascript
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {field('comisionAvance', 'Comisión por avance (COP)', 'Déjalo en 0 si la tarjeta no cobra avances', { type: 'number', min: '0', step: '0.01', placeholder: 'Ej: 9900' })}
                  {field('cuotaManejo', 'Cuota de manejo (COP)', 'Cargo fijo que se agrega en cada corte. 0 si no aplica', { type: 'number', min: '0', step: '0.01', placeholder: 'Ej: 30000' })}
                </div>
```

En `handleSubmit`, dentro del objeto de `CreditCardService.update(id, {...})`, agregar antes de `status: data.status,`:

```javascript
        comisionAvance: Number(data.comisionAvance) || 0,
        cuotaManejo: Number(data.cuotaManejo) || 0,
```

- [ ] **Step 5: Verificar visualmente (Playwright)**

Con backend + frontend corriendo, crear una tarjeta nueva llenando comisión $9.900 y cuota de manejo $30.000, guardar, editarla y confirmar que los valores persisten en el paso Financiero. Capturar screenshot del paso 2 y abrirlo con Read.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/CreditCardNew.jsx frontend/src/pages/CreditCardEdit.jsx
git commit -m "feat(tarjetas): campos de comisión de avance y cuota de manejo en formularios"
```

---

## Task 8: Helper visual + diferenciar tipos en extracto y compras

**Files:**
- Modify: `frontend/src/utils/creditCard.js`
- Modify: `frontend/src/components/credit-cards/CardStatement.jsx`
- Modify: `frontend/src/pages/credit-card/CardPurchases.jsx`

- [ ] **Step 1: Crear `getMovimientoVisual` en utils**

En `frontend/src/utils/creditCard.js`, el archivo ya importa íconos de `lucide-react` en la cabecera (línea 1-3: `import { Utensils, Car, Heart, ... } from 'lucide-react';`). **Agregar `Banknote, Receipt, Wallet` a esa lista existente** (NO crear un import nuevo). Por ejemplo:

```javascript
import {
  Utensils, Car, Heart, Tv2, Home, Laptop, Tag, BookOpen, Plane, Package,
  Banknote, Receipt, Wallet,
} from 'lucide-react';
```

Luego, después de la función `getCat`, agregar:

```javascript
/**
 * Visual (ícono, label, color) de un movimiento según su tipo.
 * Para 'compra' usa la categoría; el resto tiene su propio distintivo.
 */
export const getMovimientoVisual = (tipo, categoria) => {
  switch (tipo) {
    case 'avance':       return { Icon: Banknote, label: 'Avance',          color: '#0891b2' };
    case 'comision':     return { Icon: Receipt,  label: 'Comisión',        color: '#b45309' };
    case 'cuota_manejo': return { Icon: Wallet,   label: 'Cuota de manejo', color: '#7c3aed' };
    default: {
      const cat = getCat(categoria);
      return { Icon: cat.Icon, label: cat.label, color: cat.color };
    }
  }
};
```

- [ ] **Step 2: Usar el helper en CardStatement `LineRow`**

En `frontend/src/components/credit-cards/CardStatement.jsx`:
- En el import de `'../../utils/creditCard'`, agregar `getMovimientoVisual`.
- En el componente `LineRow`, reemplazar `const cat = getCat(line.categoria);` por:

```javascript
    const vis = getMovimientoVisual(line.tipo, line.categoria);
```

- Reemplazar los usos de `cat.color` por `vis.color` y `<cat.Icon ... />` por `<vis.Icon ... />` dentro de `LineRow`.
- En el bloque de subtítulo (donde dice `Cuota {line.cuotaActual}/{line.numeroCuotas}`), anteponer la etiqueta del tipo cuando no sea compra:

```javascript
            {line.tipo && line.tipo !== 'compra' && (
              <span style={{ fontWeight: 700, color: vis.color }}>{vis.label} · </span>
            )}
            Cuota {line.cuotaActual}/{line.numeroCuotas}
```

- [ ] **Step 3: Pasar `tipo` en buildSchedule**

En `frontend/src/utils/creditCard.js`, dentro de `buildSchedule`, en el `acc.push({...})` que arma cada línea, agregar el campo `tipo: p.tipo,` (junto a `categoria`). Así `LineRow` recibe el tipo.

- [ ] **Step 4: Usar el helper en CardPurchases**

En `frontend/src/pages/credit-card/CardPurchases.jsx`:
- En el import de `'../../utils/creditCard'`, agregar `getMovimientoVisual`.
- Reemplazar `const cat = getCat(p.categoria || 'otros');` por:

```javascript
                      const cat = getMovimientoVisual(p.tipo, p.categoria || 'otros');
```

(El resto del código usa `cat.color`/`cat.Icon`, que siguen siendo válidos porque el helper devuelve la misma forma `{ Icon, color, label }`.)
- En la línea del nombre/descripción, cuando `p.tipo !== 'compra'`, mostrar un chip del tipo. Localizar el `<span>` con `{p.descripcion}` y envolver así:

```javascript
                              <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {p.tipo && p.tipo !== 'compra' && (
                                  <span style={{ background: `${cat.color}1a`, color: cat.color, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>{cat.label}</span>
                                )}
                                {p.descripcion}
                              </span>
```

- [ ] **Step 5: Verificar visualmente (Playwright)**

Con datos que incluyan un avance (con comisión) y una cuota de manejo, abrir la pestaña Extracto y la pestaña Compras. Confirmar: avance con ícono billete y etiqueta "Avance"; comisión con "Comisión"; cuota de manejo con "Cuota de manejo". Capturar screenshots y abrirlos con Read.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/creditCard.js frontend/src/components/credit-cards/CardStatement.jsx frontend/src/pages/credit-card/CardPurchases.jsx
git commit -m "feat(tarjetas): distinción visual de avances, comisiones y cuota de manejo"
```

---

## Task 9: Página "Registrar avance" + ruta + botón

**Files:**
- Create: `frontend/src/pages/CreditCardAdvanceNew.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/credit-card/CardPurchases.jsx`

- [ ] **Step 1: Crear la página de avance**

Crear `frontend/src/pages/CreditCardAdvanceNew.jsx` (basada en `CreditCardPurchaseNew.jsx`, adaptada para avance + comisión):

```javascript
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CreditCardService } from '../services/creditCardService';
import { ArrowLeft, Banknote, Check, DollarSign, ChevronRight } from 'lucide-react';
import { getCardGradient } from '../utils/cardColors';

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

function calcCuota(monto, cuotas, tasaPct) {
  if (!monto || !cuotas || cuotas < 1) return 0;
  if (cuotas === 1) return monto;
  const i = tasaPct / 100;
  const f = Math.pow(1 + i, cuotas);
  return monto * (i * f) / (f - 1);
}

export const CreditCardAdvanceNew = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [card, setCard]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({
    descripcion: 'Avance en efectivo',
    montoTotal: '',
    numeroCuotas: '1',
    fechaCompra: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    CreditCardService.getById(id)
      .then(setCard)
      .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la tarjeta.' }))
      .finally(() => setLoading(false));
  }, [id]);

  const tasaMensual  = card ? parseFloat(card.tasaInteresMensual) : 0;
  const comision     = card ? parseFloat(card.comisionAvance ?? 0) : 0;
  const cuotaPreview = form.montoTotal && form.numeroCuotas
    ? calcCuota(Number(form.montoTotal), Number(form.numeroCuotas), tasaMensual)
    : 0;
  const totalPreview = cuotaPreview * Number(form.numeroCuotas || 1);
  const totalConCupo = Number(form.montoTotal || 0) + comision;

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!card) return;
    if (totalConCupo > parseFloat(card.cupoDisponible)) {
      Swal.fire({ icon: 'warning', title: 'Cupo insuficiente', text: `Avance + comisión (${fmt(totalConCupo)}) supera el cupo disponible (${fmt(card.cupoDisponible)}).` });
      return;
    }
    setSaving(true);
    try {
      await CreditCardService.createAdvance(id, {
        descripcion: form.descripcion,
        montoTotal: Number(form.montoTotal),
        numeroCuotas: Number(form.numeroCuotas),
        fechaCompra: form.fechaCompra,
      });
      Swal.fire({ icon: 'success', title: '¡Avance registrado!', timer: 1500, showConfirmButton: false });
      navigate(`/credit-cards/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar el avance.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: 360, borderRadius: 'var(--radius-md)' }} />
        <div className="skeleton" style={{ height: 360, borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: '0.625rem' }}>
          <button onClick={() => navigate('/credit-cards')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: 0 }}>Tarjetas</button>
          <ChevronRight size={12} />
          <button onClick={() => navigate(`/credit-cards/${id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: 0 }}>{card?.nombre ?? '—'}</button>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Registrar avance</span>
        </div>
        <div className="page-header" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate(`/credit-cards/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>Registrar Avance</h1>
              {card && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                  {card.nombre} · Cupo disponible: <strong>{fmt(card.cupoDisponible)}</strong>
                  {comision > 0 && <> · Comisión: <strong>{fmt(comision)}</strong></>}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {card && (
            <div style={{ borderRadius: 'var(--radius-md)', background: getCardGradient(card.color), padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
              <div style={{ position: 'absolute', top: '-30%', right: '-15%', width: 130, height: 130, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: '0 0 0.15rem', fontWeight: 600, letterSpacing: '0.1em' }}>{card.entidad.toUpperCase()}</p>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 0.875rem' }}>{card.nombre}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 0.2rem', letterSpacing: '0.08em', fontWeight: 600 }}>CUPO DISPONIBLE</p>
              <p style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{fmt(card.cupoDisponible)}</p>
            </div>
          )}

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <Banknote size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-secondary)' }}>Vista previa</span>
            </div>
            {cuotaPreview > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cuota mensual del avance</p>
                  <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0, letterSpacing: '-0.02em' }}>{fmt(cuotaPreview)}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>{form.numeroCuotas} cuota{Number(form.numeroCuotas) !== 1 ? 's' : ''}</p>
                </div>
                {[
                  { label: 'Total del avance', value: fmt(totalPreview), color: '#dc2626' },
                  { label: 'Comisión (este corte)', value: comision > 0 ? fmt(comision) : '—', color: 'var(--color-warning)' },
                  { label: 'Ocupa cupo', value: fmt(totalConCupo), color: 'var(--color-text-secondary)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.275rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.25rem 0' }}>
                Ingresa el monto para ver la simulación.
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Descripción *</label>
              <input className="form-input" value={form.descripcion} onChange={set('descripcion')} required placeholder="Ej: Avance en cajero" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Monto del avance *</label>
                <input className="form-input" type="number" value={form.montoTotal} onChange={set('montoTotal')} required min="0.01" step="0.01" placeholder="0.00" />
                {card && totalConCupo > parseFloat(card.cupoDisponible) && (
                  <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Avance + comisión supera el cupo</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Cuotas *</label>
                <input className="form-input" type="number" value={form.numeroCuotas} onChange={set('numeroCuotas')} required min="1" step="1" placeholder="1" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha del avance *</label>
              <input className="form-input" type="date" value={form.fechaCompra} onChange={set('fechaCompra')} required />
            </div>

            {comision > 0 && (
              <div className="info-box primary" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
                <DollarSign size={13} />
                Se cobrará una comisión fija de <strong>{fmt(comision)}</strong> en el corte vigente, además de las cuotas del avance.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate(`/credit-cards/${id}`)}>
                <ArrowLeft size={14} /> Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                <Check size={14} /> {saving ? 'Registrando…' : 'Registrar avance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Registrar la ruta**

En `frontend/src/App.jsx`:
- Agregar el import (junto a los otros de tarjetas): `import { CreditCardAdvanceNew } from './pages/CreditCardAdvanceNew';`
- Agregar la ruta después de `credit-cards/:id/purchases/new`:

```javascript
          <Route path="credit-cards/:id/advances/new" element={<CreditCardAdvanceNew />} />
```

- [ ] **Step 3: Botón "Registrar avance" en CardPurchases**

En `frontend/src/pages/credit-card/CardPurchases.jsx`, en el `<div style={{ display: 'flex', gap: '0.5rem' }}>` del header (donde está "Nueva compra"), agregar ANTES del botón de Nueva compra:

```javascript
          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: 12 }} onClick={() => navigate(`/credit-cards/${id}/advances/new`)}><Banknote size={13} /> Avance</button>
```

Y agregar `Banknote` al import de `lucide-react` en ese archivo.

- [ ] **Step 4: Verificar el flujo completo (Playwright)**

Con backend + frontend corriendo: entrar a una tarjeta con `comisionAvance > 0`, click en "Avance", llenar monto $500.000 a 12 cuotas, registrar. Verificar redirección y que en Extracto aparece el avance (diferido) + comisión (corte vigente) con sus etiquetas. Capturar screenshot y abrir con Read.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CreditCardAdvanceNew.jsx frontend/src/App.jsx frontend/src/pages/credit-card/CardPurchases.jsx
git commit -m "feat(tarjetas): flujo registrar avance con comisión"
```

---

## Task 10: Verificación end-to-end

- [ ] **Step 1: Escenario completo con Playwright**

Crear una tarjeta con `comisionAvance: 9900` y `cuotaManejo: 30000`, fechaCorte tal que el job genere la cuota. Registrar un avance. Ejecutar `generateCuotaManejoCharges`. Verificar en el Extracto:
- El avance aparece diferido a N cuotas con etiqueta "Avance".
- La comisión $9.900 aparece como cargo de 1 cuota en el corte vigente con etiqueta "Comisión".
- La cuota de manejo $30.000 aparece con etiqueta "Cuota de manejo".
- El total del corte vigente incluye los tres.
- El cupo disponible refleja avance + comisión, pero NO la cuota de manejo.

Capturar screenshot del extracto y abrirlo con Read.

- [ ] **Step 2: Verificar consistencia de "por pagar este mes"**

Confirmar que el banner de la lista de tarjetas y el KPI del Dashboard incluyen el avance, la comisión y la cuota de manejo del ciclo (derivan de `buildSchedule`, así que deberían salir solos).

---

## Notas de implementación

- **Gotcha decimales:** `comisionAvance`, `cuotaManejo`, `valorCuotaMensual` llegan como STRING desde Sequelize → usar `parseFloat()` antes de operar.
- **Gotcha selects/inputs number:** convertir con `Number()` antes de enviar (Zod usa `z.number()` sin coerción).
- **Edge cutDay > días del mes** (ej: 31 en febrero): el job no dispara ese mes porque `day` nunca alcanza 31. Es consistente con el manejo de fechas del resto de la app; no se aborda aquí.
- **`weekendToFriday`:** el job usa el día de corte crudo, no ajustado a viernes. El ajuste a viernes es solo de presentación en el extracto; la generación del cargo por día calendario es suficiente.
