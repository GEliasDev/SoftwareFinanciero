# Financial Control Modules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar tres módulos (Ingresos, Obligaciones Personales, Metas de Ahorro) para que Debti conozca qué entra y hacia dónde va el dinero, mostrando "Dinero libre" en el dashboard.

**Architecture:** Tres módulos backend independientes bajo `backend/src/modules/`, cada uno con el patrón estándar del proyecto (model → schema → service → controller → routes). El frontend agrega pages + services para cada módulo y actualiza App.jsx, Sidebar, Dashboard y Analytics.

**Tech Stack:** Node/Express/Sequelize/Zod (backend), React 19/react-router-dom 7/recharts (frontend), PostgreSQL via Sequelize `alter:true`.

**Spec:** `docs/superpowers/specs/2026-06-10-financial-control-modules-design.md`

---

## Archivos a crear / modificar

### Backend — crear
```
backend/src/modules/income/income.model.js
backend/src/modules/income/income.schema.js
backend/src/modules/income/income.service.js
backend/src/modules/income/income.controller.js
backend/src/modules/income/income.routes.js

backend/src/modules/personalDebt/personalDebt.model.js
backend/src/modules/personalDebt/personalDebt.schema.js
backend/src/modules/personalDebt/personalDebt.service.js
backend/src/modules/personalDebt/personalDebt.controller.js
backend/src/modules/personalDebt/personalDebt.routes.js

backend/src/modules/savingsGoal/savingsGoal.model.js
backend/src/modules/savingsGoal/savingsGoal.schema.js
backend/src/modules/savingsGoal/savingsGoal.service.js
backend/src/modules/savingsGoal/savingsGoal.controller.js
backend/src/modules/savingsGoal/savingsGoal.routes.js
```

### Backend — modificar
```
backend/src/main.js                                  — registrar 3 nuevas rutas
backend/src/modules/analytics/analytics.service.js  — income + dineroLibre en getSummary
```

### Frontend — crear
```
frontend/src/services/incomeService.js
frontend/src/services/personalDebtService.js
frontend/src/services/savingsGoalService.js

frontend/src/pages/Income.jsx
frontend/src/pages/IncomeForm.jsx
frontend/src/pages/PersonalDebts.jsx
frontend/src/pages/PersonalDebtNew.jsx
frontend/src/pages/PersonalDebtDetail.jsx
frontend/src/pages/PersonalDebtEdit.jsx
frontend/src/pages/Savings.jsx
frontend/src/pages/SavingsNew.jsx
frontend/src/pages/SavingsDetail.jsx
frontend/src/pages/SavingsEdit.jsx
```

### Frontend — modificar
```
frontend/src/App.jsx
frontend/src/components/layout/Sidebar.jsx
frontend/src/pages/Dashboard.jsx
```

---

## Task 1: Income — Backend

**Files:**
- Create: `backend/src/modules/income/income.model.js`
- Create: `backend/src/modules/income/income.schema.js`
- Create: `backend/src/modules/income/income.service.js`
- Create: `backend/src/modules/income/income.controller.js`
- Create: `backend/src/modules/income/income.routes.js`
- Modify: `backend/src/main.js`

- [ ] **Crear `income.model.js`**

```js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class Income extends Model {}

Income.init(
    {
        id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre:   { type: DataTypes.STRING,  allowNull: false },
        monto:    { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        diaCobro: { type: DataTypes.INTEGER, allowNull: false },
        status:   { type: DataTypes.ENUM('activo', 'inactivo'), allowNull: false, defaultValue: 'activo' },
        userId:   { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'Income', tableName: 'incomes' }
);

Income.belongsTo(User, { foreignKey: 'userId' });
```

- [ ] **Crear `income.schema.js`**

```js
import { z } from 'zod';

export const incomeCreateSchema = z.object({
    nombre:   z.string().min(1).max(100),
    monto:    z.number().positive(),
    diaCobro: z.number().int().min(1).max(31),
    status:   z.enum(['activo', 'inactivo']).optional().default('activo'),
});

export const incomeUpdateSchema = z.object({
    nombre:   z.string().min(1).max(100).optional(),
    monto:    z.number().positive().optional(),
    diaCobro: z.number().int().min(1).max(31).optional(),
    status:   z.enum(['activo', 'inactivo']).optional(),
});
```

- [ ] **Crear `income.service.js`**

```js
import { Income } from './income.model.js';
import { incomeCreateSchema, incomeUpdateSchema } from './income.schema.js';
import { AppError } from '../../middlewares/appError.js';

export const IncomeService = {
    getAll: async (userId) => Income.findAll({ where: { userId } }),

    getById: async (id, userId) => {
        const income = await Income.findByPk(id);
        if (!income) throw new AppError('Ingreso no encontrado', 404);
        if (income.userId !== userId) throw new AppError('No autorizado', 403);
        return income;
    },

    create: async (data) => {
        const parsed = incomeCreateSchema.parse(data);
        return Income.create({ ...parsed, userId: data.userId });
    },

    update: async (id, data, userId) => {
        const income = await Income.findByPk(id);
        if (!income) throw new AppError('Ingreso no encontrado', 404);
        if (income.userId !== userId) throw new AppError('No autorizado', 403);
        const parsed = incomeUpdateSchema.parse(data);
        return income.update(parsed);
    },

    delete: async (id, userId) => {
        const income = await Income.findByPk(id);
        if (!income) throw new AppError('Ingreso no encontrado', 404);
        if (income.userId !== userId) throw new AppError('No autorizado', 403);
        await income.destroy();
    },
};
```

- [ ] **Crear `income.controller.js`**

```js
import { IncomeService } from './income.service.js';

export const IncomeController = {
    getAll: async (req, res, next) => {
        try { res.json(await IncomeService.getAll(req.user.id)); }
        catch (err) { next(err); }
    },
    getById: async (req, res, next) => {
        try { res.json(await IncomeService.getById(req.params.id, req.user.id)); }
        catch (err) { next(err); }
    },
    create: async (req, res, next) => {
        try { res.status(201).json(await IncomeService.create({ ...req.body, userId: req.user.id })); }
        catch (err) { next(err); }
    },
    update: async (req, res, next) => {
        try { res.json(await IncomeService.update(req.params.id, req.body, req.user.id)); }
        catch (err) { next(err); }
    },
    delete: async (req, res, next) => {
        try { await IncomeService.delete(req.params.id, req.user.id); res.status(204).send(); }
        catch (err) { next(err); }
    },
};
```

- [ ] **Crear `income.routes.js`**

```js
import { Router } from 'express';
import { IncomeController } from './income.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.get('/',    authenticateToken, IncomeController.getAll);
router.post('/',   authenticateToken, IncomeController.create);
router.get('/:id', authenticateToken, IncomeController.getById);
router.patch('/:id', authenticateToken, IncomeController.update);
router.delete('/:id', authenticateToken, IncomeController.delete);
export default router;
```

- [ ] **Registrar en `main.js`** — agregar después de la línea `import analyticsRoutes ...`:

```js
import incomeRoutes from './modules/income/income.routes.js';
```

Y después de `app.use('/api/analytics', analyticsRoutes);`:

```js
app.use('/api/income', incomeRoutes);
```

- [ ] **Verificar**: reiniciar backend (`npm run dev` en `/backend`), confirmar que aparece `income` en los logs de Sequelize sync y que `GET /api/income` responde 401 sin token.

- [ ] **Commit**

```bash
git add backend/src/modules/income/ backend/src/main.js
git commit -m "feat: módulo income — fuentes de ingreso mensual"
```

---

## Task 2: Income — Frontend

**Files:**
- Create: `frontend/src/services/incomeService.js`
- Create: `frontend/src/pages/Income.jsx`
- Create: `frontend/src/pages/IncomeForm.jsx`

- [ ] **Crear `incomeService.js`**

```js
import api from './api';

export const IncomeService = {
  getAll:  async ()       => (await api.get('/income')).data,
  getById: async (id)     => (await api.get(`/income/${id}`)).data,
  create:  async (data)   => (await api.post('/income', data)).data,
  update:  async (id, data) => (await api.patch(`/income/${id}`, data)).data,
  delete:  async (id)     => (await api.delete(`/income/${id}`)).data,
};
```

- [ ] **Crear `Income.jsx`** (página lista)

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IncomeService } from '../services/incomeService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Plus, Wallet, Pencil, Trash2 } from 'lucide-react';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

const STATUS_BADGE = {
  activo:   'badge badge-success',
  inactivo: 'badge badge-neutral',
};

export const Income = () => {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => IncomeService.getAll().then(setIncomes).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const totalMensual = incomes.filter(i => i.status === 'activo').reduce((a, i) => a + parseFloat(i.monto ?? 0), 0);

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar fuente de ingreso?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--neg-600)',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
    });
    if (!isConfirmed) return;
    await IncomeService.delete(id);
    load();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ingresos"
        subtitle="Fuentes de ingreso mensual recurrentes"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/income/new')}>
            <Plus size={15} /> Agregar fuente
          </button>
        }
      />

      {!loading && incomes.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <StatCard
            label="Total mensual"
            value={fmt(totalMensual)}
            delta={`${incomes.filter(i => i.status === 'activo').length} fuente(s) activa(s)`}
            icon={Wallet}
            tone="pos"
          />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : incomes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Wallet size={24} /></div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin fuentes de ingreso</p>
            <p>Agrega tu salario u otras fuentes para calcular tu dinero libre mensual.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/income/new')}>
              <Plus size={14} /> Agregar fuente
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {incomes.map((inc, idx) => (
            <div
              key={inc.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px',
                borderBottom: idx < incomes.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{inc.nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Día {inc.diaCobro} · <span className={STATUS_BADGE[inc.status] || STATUS_BADGE.activo}>{inc.status}</span></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="tabular" style={{ fontWeight: 700, fontSize: 15, color: 'var(--pos-600)' }}>{fmt(inc.monto)}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/income/${inc.id}/edit`)} title="Editar"><Pencil size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(inc.id)} title="Eliminar" style={{ color: 'var(--neg-600)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Crear `IncomeForm.jsx`** (crea y edita — modo depende de si hay `:id`)

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IncomeService } from '../services/incomeService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const IncomeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ nombre: '', monto: '', diaCobro: '1', status: 'activo' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    IncomeService.getById(id).then(inc =>
      setForm({ nombre: inc.nombre, monto: String(inc.monto), diaCobro: String(inc.diaCobro), status: inc.status })
    );
  }, [id, isEdit]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { nombre: form.nombre, monto: Number(form.monto), diaCobro: Number(form.diaCobro), status: form.status };
      if (isEdit) { await IncomeService.update(id, payload); }
      else { await IncomeService.create(payload); }
      navigate('/income');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title={isEdit ? 'Editar fuente de ingreso' : 'Nueva fuente de ingreso'} subtitle="Ingreso mensual recurrente" />
      <div className="card" style={{ maxWidth: 480, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre <span style={{ color: 'var(--neg-600)' }}>*</span></label>
            <input className="form-input" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Salario Bancolombia" required />
          </div>
          <div className="form-group">
            <label className="form-label">Monto mensual (COP) <span style={{ color: 'var(--neg-600)' }}>*</span></label>
            <input className="form-input" type="number" min="1" value={form.monto} onChange={set('monto')} placeholder="3500000" required />
          </div>
          <div className="form-group">
            <label className="form-label">Día en que llega (1-31) <span style={{ color: 'var(--neg-600)' }}>*</span></label>
            <input className="form-input" type="number" min="1" max="31" value={form.diaCobro} onChange={set('diaCobro')} required />
          </div>
          {isEdit && (
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-input" value={form.status} onChange={set('status')}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/income')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear fuente'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Commit**

```bash
git add frontend/src/services/incomeService.js frontend/src/pages/Income.jsx frontend/src/pages/IncomeForm.jsx
git commit -m "feat: páginas de ingresos (lista + formulario)"
```

---

## Task 3: PersonalDebt — Backend

**Files:**
- Create: `backend/src/modules/personalDebt/personalDebt.model.js`
- Create: `backend/src/modules/personalDebt/personalDebt.schema.js`
- Create: `backend/src/modules/personalDebt/personalDebt.service.js`
- Create: `backend/src/modules/personalDebt/personalDebt.controller.js`
- Create: `backend/src/modules/personalDebt/personalDebt.routes.js`
- Modify: `backend/src/main.js`

- [ ] **Crear `personalDebt.model.js`**

```js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class PersonalDebt extends Model {}

PersonalDebt.init(
    {
        id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre:         { type: DataTypes.STRING,  allowNull: false },
        descripcion:    { type: DataTypes.TEXT,    allowNull: true },
        prestamista:    { type: DataTypes.STRING,  allowNull: false },
        montoTotal:     { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        saldoPendiente: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        montoCuota:     { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        cuotasPagadas:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        numeroCuotas:   { type: DataTypes.INTEGER, allowNull: false },
        diaPago:        { type: DataTypes.INTEGER, allowNull: false },
        status:         { type: DataTypes.ENUM('activo', 'pagado'), allowNull: false, defaultValue: 'activo' },
        userId:         { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'PersonalDebt', tableName: 'personal_debts' }
);

PersonalDebt.belongsTo(User, { foreignKey: 'userId' });
```

- [ ] **Crear `personalDebt.schema.js`**

```js
import { z } from 'zod';

export const personalDebtCreateSchema = z.object({
    nombre:       z.string().min(1).max(100),
    descripcion:  z.string().optional(),
    prestamista:  z.string().min(1).max(100),
    montoTotal:   z.number().positive(),
    montoCuota:   z.number().positive(),
    diaPago:      z.number().int().min(1).max(31),
    cuotasPagadas: z.number().int().min(0).optional().default(0),
});

export const personalDebtUpdateSchema = z.object({
    nombre:      z.string().min(1).max(100).optional(),
    descripcion: z.string().optional(),
    prestamista: z.string().min(1).max(100).optional(),
    montoCuota:  z.number().positive().optional(),
    diaPago:     z.number().int().min(1).max(31).optional(),
    status:      z.enum(['activo', 'pagado']).optional(),
});

export const abonoSchema = z.object({
    monto: z.number().positive(),
});
```

- [ ] **Crear `personalDebt.service.js`**

```js
import { PersonalDebt } from './personalDebt.model.js';
import { personalDebtCreateSchema, personalDebtUpdateSchema, abonoSchema } from './personalDebt.schema.js';
import { AppError } from '../../middlewares/appError.js';

export const PersonalDebtService = {
    getAll: async (userId) => PersonalDebt.findAll({ where: { userId } }),

    getById: async (id, userId) => {
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        return debt;
    },

    create: async (data) => {
        const parsed = personalDebtCreateSchema.parse(data);
        const numeroCuotas = Math.ceil(parsed.montoTotal / parsed.montoCuota);
        const saldoPendiente = Math.max(0, parsed.montoTotal - parsed.cuotasPagadas * parsed.montoCuota);
        return PersonalDebt.create({ ...parsed, numeroCuotas, saldoPendiente, userId: data.userId });
    },

    update: async (id, data, userId) => {
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        return debt.update(personalDebtUpdateSchema.parse(data));
    },

    delete: async (id, userId) => {
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        await debt.destroy();
    },

    registerAbono: async (id, data, userId) => {
        const { monto } = abonoSchema.parse(data);
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        if (debt.status === 'pagado') throw new AppError('Esta obligación ya está pagada', 400);

        const nuevoSaldo = Math.max(0, parseFloat(debt.saldoPendiente) - monto);
        const nuevoStatus = nuevoSaldo <= 0 ? 'pagado' : 'activo';
        return debt.update({ saldoPendiente: nuevoSaldo, cuotasPagadas: debt.cuotasPagadas + 1, status: nuevoStatus });
    },
};
```

- [ ] **Crear `personalDebt.controller.js`**

```js
import { PersonalDebtService } from './personalDebt.service.js';

export const PersonalDebtController = {
    getAll:   async (req, res, next) => { try { res.json(await PersonalDebtService.getAll(req.user.id)); } catch (e) { next(e); } },
    getById:  async (req, res, next) => { try { res.json(await PersonalDebtService.getById(req.params.id, req.user.id)); } catch (e) { next(e); } },
    create:   async (req, res, next) => { try { res.status(201).json(await PersonalDebtService.create({ ...req.body, userId: req.user.id })); } catch (e) { next(e); } },
    update:   async (req, res, next) => { try { res.json(await PersonalDebtService.update(req.params.id, req.body, req.user.id)); } catch (e) { next(e); } },
    delete:   async (req, res, next) => { try { await PersonalDebtService.delete(req.params.id, req.user.id); res.status(204).send(); } catch (e) { next(e); } },
    registerAbono: async (req, res, next) => {
        try {
            const debt = await PersonalDebtService.registerAbono(req.params.id, req.body, req.user.id);
            res.json({ message: 'Abono registrado', saldoPendiente: debt.saldoPendiente, cuotasPagadas: debt.cuotasPagadas, status: debt.status });
        } catch (e) { next(e); }
    },
};
```

- [ ] **Crear `personalDebt.routes.js`**

```js
import { Router } from 'express';
import { PersonalDebtController } from './personalDebt.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.get('/',           authenticateToken, PersonalDebtController.getAll);
router.post('/',          authenticateToken, PersonalDebtController.create);
router.get('/:id',        authenticateToken, PersonalDebtController.getById);
router.patch('/:id',      authenticateToken, PersonalDebtController.update);
router.delete('/:id',     authenticateToken, PersonalDebtController.delete);
router.post('/:id/abono', authenticateToken, PersonalDebtController.registerAbono);
export default router;
```

- [ ] **Registrar en `main.js`** — agregar import:

```js
import personalDebtRoutes from './modules/personalDebt/personalDebt.routes.js';
```

Y registro:

```js
app.use('/api/personal-debts', personalDebtRoutes);
```

- [ ] **Verificar**: reiniciar backend, confirmar tabla `personal_debts` creada en sync.

- [ ] **Commit**

```bash
git add backend/src/modules/personalDebt/ backend/src/main.js
git commit -m "feat: módulo personalDebt — obligaciones personales sin interés"
```

---

## Task 4: PersonalDebt — Frontend

**Files:**
- Create: `frontend/src/services/personalDebtService.js`
- Create: `frontend/src/pages/PersonalDebts.jsx`
- Create: `frontend/src/pages/PersonalDebtNew.jsx`
- Create: `frontend/src/pages/PersonalDebtDetail.jsx`
- Create: `frontend/src/pages/PersonalDebtEdit.jsx`

- [ ] **Crear `personalDebtService.js`**

```js
import api from './api';

export const PersonalDebtService = {
  getAll:         async ()         => (await api.get('/personal-debts')).data,
  getById:        async (id)       => (await api.get(`/personal-debts/${id}`)).data,
  create:         async (data)     => (await api.post('/personal-debts', data)).data,
  update:         async (id, data) => (await api.patch(`/personal-debts/${id}`, data)).data,
  delete:         async (id)       => (await api.delete(`/personal-debts/${id}`)).data,
  registerAbono:  async (id, monto) => (await api.post(`/personal-debts/${id}/abono`, { monto })).data,
};
```

- [ ] **Crear `PersonalDebts.jsx`** (lista)

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Plus, Handshake, ChevronRight, TrendingDown } from 'lucide-react';
import { fmt } from '../utils/format';

const STATUS_BADGE = { activo: 'badge badge-warning', pagado: 'badge badge-success' };

export const PersonalDebts = () => {
  const navigate = useNavigate();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PersonalDebtService.getAll().then(setDebts).catch(console.error).finally(() => setLoading(false));
  }, []);

  const activas = debts.filter(d => d.status === 'activo');
  const totalSaldo = activas.reduce((a, d) => a + parseFloat(d.saldoPendiente ?? 0), 0);
  const totalCuota = activas.reduce((a, d) => a + parseFloat(d.montoCuota ?? 0), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Obligaciones Personales"
        subtitle="Deudas sin interés con personas o entidades informales"
        actions={<button className="btn btn-primary" onClick={() => navigate('/personal-debts/new')}><Plus size={15} /> Nueva obligación</button>}
      />

      {!loading && debts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
          <StatCard label="Saldo total pendiente" value={fmt(totalSaldo)} delta="Por pagar" icon={TrendingDown} tone="neg" />
          <StatCard label="Cuota mensual total" value={fmt(totalCuota)} delta="Comprometido por mes" icon={Handshake} tone="warn" />
          <StatCard label="Obligaciones activas" value={`${activas.length}`} delta={`de ${debts.length} total`} icon={Handshake} tone="brand" />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : debts.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon"><Handshake size={24} /></div>
          <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin obligaciones</p>
          <p>Registra deudas informales para llevar el control de tus pagos.</p>
          <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/personal-debts/new')}><Plus size={14} /> Nueva obligación</button>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {debts.map(debt => {
            const pct = debt.numeroCuotas ? (debt.cuotasPagadas / debt.numeroCuotas) * 100 : 0;
            return (
              <div
                key={debt.id} className="card" role="button" tabIndex={0}
                style={{ padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => navigate(`/personal-debts/${debt.id}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/personal-debts/${debt.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', margin: 0 }}>{debt.nombre}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>A: {debt.prestamista} · Día {debt.diaPago}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={STATUS_BADGE[debt.status] || STATUS_BADGE.activo}>{debt.status}</span>
                    <span className="tabular" style={{ fontWeight: 700, fontSize: 15 }}>{fmt(debt.saldoPendiente)}</span>
                    <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
                <div className="progress-track" style={{ marginBottom: 6 }}>
                  <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)' }}>
                  <span>Cuota: {fmt(debt.montoCuota)}/mes</span>
                  <span>{debt.cuotasPagadas}/{debt.numeroCuotas} cuotas · {pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Crear `PersonalDebtNew.jsx`** (formulario de alta)

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const PersonalDebtNew = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', descripcion: '', prestamista: '', montoTotal: '', montoCuota: '', diaPago: '1', cuotasPagadas: '0' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await PersonalDebtService.create({
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        prestamista: form.prestamista,
        montoTotal: Number(form.montoTotal),
        montoCuota: Number(form.montoCuota),
        diaPago: Number(form.diaPago),
        cuotasPagadas: Number(form.cuotasPagadas),
      });
      navigate('/personal-debts');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Nueva Obligación Personal" subtitle="Deuda sin interés con persona o entidad informal" />
      <div className="card" style={{ maxWidth: 520, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre de la obligación *</label>
            <input className="form-input" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Préstamo Juan" required />
          </div>
          <div className="form-group">
            <label className="form-label">A quién le debes *</label>
            <input className="form-input" value={form.prestamista} onChange={set('prestamista')} placeholder="Ej: Juan García" required />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" value={form.descripcion} onChange={set('descripcion')} placeholder="Opcional" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Monto total (COP) *</label>
              <input className="form-input" type="number" min="1" value={form.montoTotal} onChange={set('montoTotal')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Cuota mensual (COP) *</label>
              <input className="form-input" type="number" min="1" value={form.montoCuota} onChange={set('montoCuota')} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Día de pago (1-31) *</label>
              <input className="form-input" type="number" min="1" max="31" value={form.diaPago} onChange={set('diaPago')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Cuotas ya pagadas</label>
              <input className="form-input" type="number" min="0" value={form.cuotasPagadas} onChange={set('cuotasPagadas')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/personal-debts')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Crear obligación'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Crear `PersonalDebtDetail.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { TrendingDown, Wallet, Percent, Pencil, Plus } from 'lucide-react';
import { fmt, fmtDateLong } from '../utils/format';
import Swal from 'sweetalert2';

export const PersonalDebtDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [debt, setDebt] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => PersonalDebtService.getById(id).then(setDebt).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const handleAbono = async () => {
    const { value: montoStr, isConfirmed } = await Swal.fire({
      title: 'Registrar abono',
      input: 'number',
      inputLabel: 'Monto a abonar (COP)',
      inputValue: debt?.montoCuota,
      inputAttributes: { min: 1 },
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-600)',
      inputValidator: (v) => !v || Number(v) <= 0 ? 'Ingresa un monto válido' : null,
    });
    if (!isConfirmed) return;
    try {
      await PersonalDebtService.registerAbono(id, Number(montoStr));
      load();
      Swal.fire({ icon: 'success', title: 'Abono registrado', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar', confirmButtonColor: 'var(--brand-600)' });
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)', margin: 24 }} />;
  if (!debt) return null;

  const pct = debt.numeroCuotas ? (debt.cuotasPagadas / debt.numeroCuotas) * 100 : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={debt.nombre}
        subtitle={`A: ${debt.prestamista}`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {debt.status === 'activo' && <button className="btn btn-primary" onClick={handleAbono}><Plus size={14} /> Registrar abono</button>}
            <button className="btn btn-secondary" onClick={() => navigate(`/personal-debts/${id}/edit`)}><Pencil size={14} /> Editar</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Saldo pendiente" value={fmt(debt.saldoPendiente)} delta={`de ${fmt(debt.montoTotal)} original`} icon={TrendingDown} tone="neg" />
        <StatCard label="Cuota mensual" value={fmt(debt.montoCuota)} delta={`Día ${debt.diaPago} de cada mes`} icon={Wallet} tone="neutral" />
        <StatCard label="Progreso" value={`${pct.toFixed(0)}%`} delta={`${debt.cuotasPagadas}/${debt.numeroCuotas} cuotas`} icon={Percent} tone="pos" />
      </div>

      <SectionCard title="Detalle">
        <div className="progress-track" style={{ marginBottom: 12 }}>
          <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'A quién', value: debt.prestamista },
            { label: 'Monto original', value: fmt(debt.montoTotal) },
            { label: 'Cuotas restantes', value: `${debt.numeroCuotas - debt.cuotasPagadas}` },
            { label: 'Estado', value: debt.status },
            ...(debt.descripcion ? [{ label: 'Descripción', value: debt.descripcion }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 2 }}>{label}</p>
              <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
```

- [ ] **Crear `PersonalDebtEdit.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const PersonalDebtEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', descripcion: '', prestamista: '', montoCuota: '', diaPago: '', status: 'activo' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PersonalDebtService.getById(id).then(d =>
      setForm({ nombre: d.nombre, descripcion: d.descripcion || '', prestamista: d.prestamista, montoCuota: String(d.montoCuota), diaPago: String(d.diaPago), status: d.status })
    );
  }, [id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await PersonalDebtService.update(id, { nombre: form.nombre, descripcion: form.descripcion || undefined, prestamista: form.prestamista, montoCuota: Number(form.montoCuota), diaPago: Number(form.diaPago), status: form.status });
      navigate(`/personal-debts/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Editar Obligación" subtitle="Modifica los datos de esta obligación personal" />
      <div className="card" style={{ maxWidth: 520, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={form.nombre} onChange={set('nombre')} required /></div>
          <div className="form-group"><label className="form-label">A quién le debes *</label><input className="form-input" value={form.prestamista} onChange={set('prestamista')} required /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={form.descripcion} onChange={set('descripcion')} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">Cuota mensual *</label><input className="form-input" type="number" min="1" value={form.montoCuota} onChange={set('montoCuota')} required /></div>
            <div className="form-group"><label className="form-label">Día de pago *</label><input className="form-input" type="number" min="1" max="31" value={form.diaPago} onChange={set('diaPago')} required /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-input" value={form.status} onChange={set('status')}>
              <option value="activo">Activo</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/personal-debts/${id}`)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Commit**

```bash
git add frontend/src/services/personalDebtService.js frontend/src/pages/PersonalDebts.jsx frontend/src/pages/PersonalDebtNew.jsx frontend/src/pages/PersonalDebtDetail.jsx frontend/src/pages/PersonalDebtEdit.jsx
git commit -m "feat: páginas de obligaciones personales (lista, alta, detalle, edición)"
```

---

## Task 5: SavingsGoal — Backend

**Files:**
- Create: `backend/src/modules/savingsGoal/savingsGoal.model.js`
- Create: `backend/src/modules/savingsGoal/savingsGoal.schema.js`
- Create: `backend/src/modules/savingsGoal/savingsGoal.service.js`
- Create: `backend/src/modules/savingsGoal/savingsGoal.controller.js`
- Create: `backend/src/modules/savingsGoal/savingsGoal.routes.js`
- Modify: `backend/src/main.js`

- [ ] **Crear `savingsGoal.model.js`**

```js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class SavingsGoal extends Model {}

SavingsGoal.init(
    {
        id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre:         { type: DataTypes.STRING,  allowNull: false },
        emoji:          { type: DataTypes.STRING(10), allowNull: true },
        montoMeta:      { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        montoAcumulado: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        aporteMensual:  { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        fechaMeta:      { type: DataTypes.DATEONLY, allowNull: true },
        status:         { type: DataTypes.ENUM('activo', 'completado', 'pausado'), allowNull: false, defaultValue: 'activo' },
        userId:         { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'SavingsGoal', tableName: 'savings_goals' }
);

SavingsGoal.belongsTo(User, { foreignKey: 'userId' });
```

- [ ] **Crear `savingsGoal.schema.js`**

```js
import { z } from 'zod';

export const savingsGoalCreateSchema = z.object({
    nombre:        z.string().min(1).max(100),
    emoji:         z.string().optional(),
    montoMeta:     z.number().positive(),
    aporteMensual: z.number().min(0).optional().default(0),
    fechaMeta:     z.string().date().optional(),
    montoAcumulado: z.number().min(0).optional().default(0),
});

export const savingsGoalUpdateSchema = z.object({
    nombre:        z.string().min(1).max(100).optional(),
    emoji:         z.string().optional().nullable(),
    montoMeta:     z.number().positive().optional(),
    aporteMensual: z.number().min(0).optional(),
    fechaMeta:     z.string().date().optional().nullable(),
    status:        z.enum(['activo', 'completado', 'pausado']).optional(),
});

export const aporteSchema = z.object({
    monto: z.number().positive(),
});
```

- [ ] **Crear `savingsGoal.service.js`**

```js
import { SavingsGoal } from './savingsGoal.model.js';
import { savingsGoalCreateSchema, savingsGoalUpdateSchema, aporteSchema } from './savingsGoal.schema.js';
import { AppError } from '../../middlewares/appError.js';

export const SavingsGoalService = {
    getAll: async (userId) => SavingsGoal.findAll({ where: { userId } }),

    getById: async (id, userId) => {
        const goal = await SavingsGoal.findByPk(id);
        if (!goal) throw new AppError('Meta no encontrada', 404);
        if (goal.userId !== userId) throw new AppError('No autorizado', 403);
        return goal;
    },

    create: async (data) => {
        const parsed = savingsGoalCreateSchema.parse(data);
        const status = parseFloat(parsed.montoAcumulado) >= parseFloat(parsed.montoMeta) ? 'completado' : 'activo';
        return SavingsGoal.create({ ...parsed, status, userId: data.userId });
    },

    update: async (id, data, userId) => {
        const goal = await SavingsGoal.findByPk(id);
        if (!goal) throw new AppError('Meta no encontrada', 404);
        if (goal.userId !== userId) throw new AppError('No autorizado', 403);
        return goal.update(savingsGoalUpdateSchema.parse(data));
    },

    delete: async (id, userId) => {
        const goal = await SavingsGoal.findByPk(id);
        if (!goal) throw new AppError('Meta no encontrada', 404);
        if (goal.userId !== userId) throw new AppError('No autorizado', 403);
        await goal.destroy();
    },

    registerAporte: async (id, data, userId) => {
        const { monto } = aporteSchema.parse(data);
        const goal = await SavingsGoal.findByPk(id);
        if (!goal) throw new AppError('Meta no encontrada', 404);
        if (goal.userId !== userId) throw new AppError('No autorizado', 403);
        if (goal.status === 'completado') throw new AppError('Esta meta ya está completada', 400);

        const nuevoAcumulado = parseFloat(goal.montoAcumulado) + monto;
        const nuevoStatus = nuevoAcumulado >= parseFloat(goal.montoMeta) ? 'completado' : goal.status;
        return goal.update({ montoAcumulado: nuevoAcumulado, status: nuevoStatus });
    },
};
```

- [ ] **Crear `savingsGoal.controller.js`**

```js
import { SavingsGoalService } from './savingsGoal.service.js';

export const SavingsGoalController = {
    getAll:   async (req, res, next) => { try { res.json(await SavingsGoalService.getAll(req.user.id)); } catch (e) { next(e); } },
    getById:  async (req, res, next) => { try { res.json(await SavingsGoalService.getById(req.params.id, req.user.id)); } catch (e) { next(e); } },
    create:   async (req, res, next) => { try { res.status(201).json(await SavingsGoalService.create({ ...req.body, userId: req.user.id })); } catch (e) { next(e); } },
    update:   async (req, res, next) => { try { res.json(await SavingsGoalService.update(req.params.id, req.body, req.user.id)); } catch (e) { next(e); } },
    delete:   async (req, res, next) => { try { await SavingsGoalService.delete(req.params.id, req.user.id); res.status(204).send(); } catch (e) { next(e); } },
    registerAporte: async (req, res, next) => {
        try {
            const goal = await SavingsGoalService.registerAporte(req.params.id, req.body, req.user.id);
            res.json({ message: 'Aporte registrado', montoAcumulado: goal.montoAcumulado, status: goal.status });
        } catch (e) { next(e); }
    },
};
```

- [ ] **Crear `savingsGoal.routes.js`**

```js
import { Router } from 'express';
import { SavingsGoalController } from './savingsGoal.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.get('/',             authenticateToken, SavingsGoalController.getAll);
router.post('/',            authenticateToken, SavingsGoalController.create);
router.get('/:id',          authenticateToken, SavingsGoalController.getById);
router.patch('/:id',        authenticateToken, SavingsGoalController.update);
router.delete('/:id',       authenticateToken, SavingsGoalController.delete);
router.post('/:id/aporte',  authenticateToken, SavingsGoalController.registerAporte);
export default router;
```

- [ ] **Registrar en `main.js`** — agregar import:

```js
import savingsGoalRoutes from './modules/savingsGoal/savingsGoal.routes.js';
```

Y registro:

```js
app.use('/api/savings', savingsGoalRoutes);
```

- [ ] **Verificar**: reiniciar backend, confirmar tabla `savings_goals` en Sequelize sync.

- [ ] **Commit**

```bash
git add backend/src/modules/savingsGoal/ backend/src/main.js
git commit -m "feat: módulo savingsGoal — metas de ahorro"
```

---

## Task 6: SavingsGoal — Frontend

**Files:**
- Create: `frontend/src/services/savingsGoalService.js`
- Create: `frontend/src/pages/Savings.jsx`
- Create: `frontend/src/pages/SavingsNew.jsx`
- Create: `frontend/src/pages/SavingsDetail.jsx`
- Create: `frontend/src/pages/SavingsEdit.jsx`

- [ ] **Crear `savingsGoalService.js`**

```js
import api from './api';

export const SavingsGoalService = {
  getAll:          async ()         => (await api.get('/savings')).data,
  getById:         async (id)       => (await api.get(`/savings/${id}`)).data,
  create:          async (data)     => (await api.post('/savings', data)).data,
  update:          async (id, data) => (await api.patch(`/savings/${id}`, data)).data,
  delete:          async (id)       => (await api.delete(`/savings/${id}`)).data,
  registerAporte:  async (id, monto) => (await api.post(`/savings/${id}/aporte`, { monto })).data,
};
```

- [ ] **Crear `Savings.jsx`** (lista de metas)

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import { Plus, Target, ChevronRight } from 'lucide-react';
import { fmt } from '../utils/format';

const STATUS_BADGE = { activo: 'badge badge-primary', completado: 'badge badge-success', pausado: 'badge badge-neutral' };

export const Savings = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SavingsGoalService.getAll().then(setGoals).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Metas de Ahorro"
        subtitle="Objetivos de ahorro con seguimiento de progreso"
        actions={<button className="btn btn-primary" onClick={() => navigate('/savings/new')}><Plus size={15} /> Nueva meta</button>}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon"><Target size={24} /></div>
          <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin metas de ahorro</p>
          <p>Define una meta para darle dirección a tu dinero libre mensual.</p>
          <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/savings/new')}><Plus size={14} /> Nueva meta</button>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {goals.map(goal => {
            const pct = parseFloat(goal.montoMeta) > 0 ? Math.min(100, (parseFloat(goal.montoAcumulado) / parseFloat(goal.montoMeta)) * 100) : 0;
            const restante = Math.max(0, parseFloat(goal.montoMeta) - parseFloat(goal.montoAcumulado));
            const mesesEst = goal.aporteMensual > 0 ? Math.ceil(restante / parseFloat(goal.aporteMensual)) : null;
            return (
              <div
                key={goal.id} className="card" role="button" tabIndex={0}
                style={{ padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => navigate(`/savings/${goal.id}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/savings/${goal.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', margin: 0 }}>
                      {goal.emoji && <span style={{ marginRight: 6 }}>{goal.emoji}</span>}{goal.nombre}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                      {fmt(goal.montoAcumulado)} de {fmt(goal.montoMeta)}
                      {mesesEst ? ` · ~${mesesEst} meses restantes` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={STATUS_BADGE[goal.status] || STATUS_BADGE.activo}>{goal.status}</span>
                    <span className="tabular" style={{ fontWeight: 700, fontSize: 15, color: 'var(--pos-600)' }}>{pct.toFixed(0)}%</span>
                    <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})`, background: pct >= 100 ? 'var(--pos-600)' : undefined }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Crear `SavingsNew.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const SavingsNew = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', emoji: '', montoMeta: '', aporteMensual: '', fechaMeta: '', montoAcumulado: '0' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await SavingsGoalService.create({
        nombre: form.nombre,
        emoji: form.emoji || undefined,
        montoMeta: Number(form.montoMeta),
        aporteMensual: Number(form.aporteMensual) || 0,
        fechaMeta: form.fechaMeta || undefined,
        montoAcumulado: Number(form.montoAcumulado) || 0,
      });
      navigate('/savings');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Nueva Meta de Ahorro" subtitle="Define cuánto quieres ahorrar y para cuándo" />
      <div className="card" style={{ maxWidth: 480, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Emoji</label>
              <input className="form-input" value={form.emoji} onChange={set('emoji')} placeholder="🎯" style={{ textAlign: 'center', fontSize: 20 }} maxLength={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre de la meta *</label>
              <input className="form-input" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Fondo de emergencia" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Monto objetivo (COP) *</label>
            <input className="form-input" type="number" min="1" value={form.montoMeta} onChange={set('montoMeta')} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Aporte mensual planeado</label>
              <input className="form-input" type="number" min="0" value={form.aporteMensual} onChange={set('aporteMensual')} placeholder="0" />
              <span className="form-hint">Referencia para estimar cuándo llegas</span>
            </div>
            <div className="form-group">
              <label className="form-label">Ya tengo ahorrado</label>
              <input className="form-input" type="number" min="0" value={form.montoAcumulado} onChange={set('montoAcumulado')} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha objetivo (opcional)</label>
            <input className="form-input" type="date" value={form.fechaMeta} onChange={set('fechaMeta')} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/savings')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Crear meta'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Crear `SavingsDetail.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { Target, Wallet, Calendar, Pencil, Plus, CheckCircle } from 'lucide-react';
import { fmt, fmtDateLong } from '../utils/format';
import Swal from 'sweetalert2';

export const SavingsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => SavingsGoalService.getById(id).then(setGoal).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const handleAporte = async () => {
    const { value: montoStr, isConfirmed } = await Swal.fire({
      title: 'Registrar aporte',
      input: 'number',
      inputLabel: 'Monto aportado (COP)',
      inputValue: goal?.aporteMensual || '',
      inputAttributes: { min: 1 },
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-600)',
      inputValidator: (v) => !v || Number(v) <= 0 ? 'Ingresa un monto válido' : null,
    });
    if (!isConfirmed) return;
    try {
      await SavingsGoalService.registerAporte(id, Number(montoStr));
      load();
      Swal.fire({ icon: 'success', title: 'Aporte registrado', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar', confirmButtonColor: 'var(--brand-600)' });
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)', margin: 24 }} />;
  if (!goal) return null;

  const pct = parseFloat(goal.montoMeta) > 0 ? Math.min(100, (parseFloat(goal.montoAcumulado) / parseFloat(goal.montoMeta)) * 100) : 0;
  const restante = Math.max(0, parseFloat(goal.montoMeta) - parseFloat(goal.montoAcumulado));
  const mesesEst = parseFloat(goal.aporteMensual) > 0 ? Math.ceil(restante / parseFloat(goal.aporteMensual)) : null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`${goal.emoji ? goal.emoji + ' ' : ''}${goal.nombre}`}
        subtitle={goal.status === 'completado' ? '¡Meta completada!' : `${fmt(restante)} restante`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {goal.status !== 'completado' && <button className="btn btn-primary" onClick={handleAporte}><Plus size={14} /> Registrar aporte</button>}
            <button className="btn btn-secondary" onClick={() => navigate(`/savings/${id}/edit`)}><Pencil size={14} /> Editar</button>
          </div>
        }
      />

      {goal.status === 'completado' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--color-success-bg)', border: '1px solid var(--pos-600)', borderRadius: 'var(--radius-md)', marginBottom: 16, color: 'var(--pos-600)', fontWeight: 600 }}>
          <CheckCircle size={18} /> ¡Felicitaciones! Alcanzaste esta meta.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Ahorrado" value={fmt(goal.montoAcumulado)} delta={`de ${fmt(goal.montoMeta)} meta`} icon={Wallet} tone="pos" />
        <StatCard label="Progreso" value={`${pct.toFixed(0)}%`} delta={`${fmt(restante)} restante`} icon={Target} tone={pct >= 100 ? 'pos' : 'brand'} />
        {mesesEst !== null && <StatCard label="Meses estimados" value={`${mesesEst}`} delta={`A ${fmt(goal.aporteMensual)}/mes`} icon={Calendar} tone="neutral" />}
      </div>

      <SectionCard title="Progreso">
        <div className="progress-track" style={{ height: 12, marginBottom: 16 }}>
          <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})`, background: pct >= 100 ? 'var(--pos-600)' : undefined }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Monto objetivo', value: fmt(goal.montoMeta) },
            { label: 'Aporte mensual plan', value: fmt(goal.aporteMensual) },
            ...(goal.fechaMeta ? [{ label: 'Fecha objetivo', value: fmtDateLong(goal.fechaMeta) }] : []),
            { label: 'Estado', value: goal.status },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 2 }}>{label}</p>
              <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
```

- [ ] **Crear `SavingsEdit.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const SavingsEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', emoji: '', montoMeta: '', aporteMensual: '', fechaMeta: '', status: 'activo' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    SavingsGoalService.getById(id).then(g =>
      setForm({ nombre: g.nombre, emoji: g.emoji || '', montoMeta: String(g.montoMeta), aporteMensual: String(g.aporteMensual), fechaMeta: g.fechaMeta || '', status: g.status })
    );
  }, [id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await SavingsGoalService.update(id, { nombre: form.nombre, emoji: form.emoji || null, montoMeta: Number(form.montoMeta), aporteMensual: Number(form.aporteMensual) || 0, fechaMeta: form.fechaMeta || null, status: form.status });
      navigate(`/savings/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Editar Meta de Ahorro" subtitle="Modifica los parámetros de tu meta" />
      <div className="card" style={{ maxWidth: 480, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">Emoji</label><input className="form-input" value={form.emoji} onChange={set('emoji')} style={{ textAlign: 'center', fontSize: 20 }} maxLength={2} /></div>
            <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={form.nombre} onChange={set('nombre')} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">Monto objetivo *</label><input className="form-input" type="number" min="1" value={form.montoMeta} onChange={set('montoMeta')} required /></div>
            <div className="form-group"><label className="form-label">Aporte mensual</label><input className="form-input" type="number" min="0" value={form.aporteMensual} onChange={set('aporteMensual')} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">Fecha objetivo</label><input className="form-input" type="date" value={form.fechaMeta} onChange={set('fechaMeta')} /></div>
            <div className="form-group"><label className="form-label">Estado</label>
              <select className="form-input" value={form.status} onChange={set('status')}>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="completado">Completado</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/savings/${id}`)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Commit**

```bash
git add frontend/src/services/savingsGoalService.js frontend/src/pages/Savings.jsx frontend/src/pages/SavingsNew.jsx frontend/src/pages/SavingsDetail.jsx frontend/src/pages/SavingsEdit.jsx
git commit -m "feat: páginas de metas de ahorro (lista, alta, detalle, edición)"
```

---

## Task 7: Analytics — Agregar income + dineroLibre

**Files:**
- Modify: `backend/src/modules/analytics/analytics.service.js`

- [ ] **En `analytics.service.js`**, agregar import de `Income` y `PersonalDebt` al inicio del archivo (después de los imports existentes):

```js
import { Income } from '../income/income.model.js';
import { PersonalDebt } from '../personalDebt/personalDebt.model.js';
import { SavingsGoal } from '../savingsGoal/savingsGoal.model.js';
```

- [ ] **En `getSummary`**, en el `Promise.all` existente agregar tres nuevas queries al array:

Cambiar:
```js
const [subscriptions, bankCredits, creditCards] = await Promise.all([
    Subscription.findAll({ where: { userId } }),
    BankCredit.findAll({ where: { userId } }),
    CreditCard.findAll({ ... }),
]);
```

Por:
```js
const [subscriptions, bankCredits, creditCards, incomes, personalDebts, savingsGoals] = await Promise.all([
    Subscription.findAll({ where: { userId } }),
    BankCredit.findAll({ where: { userId } }),
    CreditCard.findAll({
        where: { userId },
        include: [{ model: CreditCardPurchase, as: 'CreditCardPurchases' }],
    }),
    Income.findAll({ where: { userId, status: 'activo' } }),
    PersonalDebt.findAll({ where: { userId, status: 'activo' } }),
    SavingsGoal.findAll({ where: { userId, status: 'activo' } }),
]);
```

- [ ] **En `getSummary`**, calcular `totalIncome` y `dineroLibre` justo antes del `return`:

```js
const totalIncome = incomes.reduce((a, i) => a + toNum(i.monto), 0);

const monthlyPersonalDebts = personalDebts.reduce((a, d) => a + toNum(d.montoCuota), 0);
const monthlySavings = savingsGoals.reduce((a, g) => a + toNum(g.aporteMensual), 0);
const totalObligaciones = monthlySubscriptions + monthlyBankCredits + monthlyCreditCards + monthlyPersonalDebts;
const dineroLibre = totalIncome - totalObligaciones - monthlySavings;
```

- [ ] **En el `return` de `getSummary`**, agregar los nuevos campos:

```js
return {
    obligations: {
        subscriptions: monthlySubscriptions,
        bankCredits: monthlyBankCredits,
        creditCards: monthlyCreditCards,
        personalDebts: monthlyPersonalDebts,
        savings: monthlySavings,
        total: totalObligaciones,
    },
    income: { total: totalIncome },
    dineroLibre,
    debt: { ... },   // sin cambios
    counts: { ... }, // sin cambios
    health: ...,     // sin cambios
    upcoming: ...,   // sin cambios
};
```

- [ ] **Verificar**: `GET /api/analytics/summary` devuelve los campos `income` y `dineroLibre`.

- [ ] **Commit**

```bash
git add backend/src/modules/analytics/analytics.service.js
git commit -m "feat: analytics — income y dineroLibre en getSummary"
```

---

## Task 8: Dashboard — Dinero Libre

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **En `Dashboard.jsx`**, usar el campo `dineroLibre` que ya viene de `AnalyticsService.getSummary()`. El dashboard ya carga el summary; solo hay que agregar el StatCard.

En la sección de KPIs (donde está el `StatCard "Compromiso mensual"`), agregar un cuarto StatCard:

```jsx
<StatCard
  label="Dinero libre"
  value={fmt(summary?.dineroLibre ?? 0)}
  delta="Ingresos − obligaciones − metas"
  icon={Wallet}
  tone={summary?.dineroLibre >= 0 ? 'pos' : 'neg'}
/>
```

> **Nota:** Asegúrate de que `summary` esté disponible — ya se carga con `AnalyticsService.getSummary()` en el `useEffect` del Dashboard. Si el `summary` no estaba siendo cargado en Dashboard, añadir la carga. Revisar el `useEffect` existente y confirmar que `setSummary` se llama con la respuesta.

Si el Dashboard no carga el analytics summary actualmente, agregar al `Promise.allSettled`:

```js
AnalyticsService.getSummary(),
```

Y en el `.then`:

```js
if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
```

Con el state:

```js
const [summary, setSummary] = useState(null);
```

- [ ] **Verificar**: el dashboard muestra el StatCard "Dinero libre" con el cálculo correcto.

- [ ] **Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: dashboard — StatCard dinero libre"
```

---

## Task 9: Routing y Sidebar

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/layout/Sidebar.jsx`

- [ ] **En `App.jsx`**, agregar imports de los nuevos módulos (después de `import { Reminders } ...`):

```jsx
// Ingresos
import { Income } from './pages/Income';
import { IncomeForm } from './pages/IncomeForm';

// Obligaciones personales
import { PersonalDebts } from './pages/PersonalDebts';
import { PersonalDebtNew } from './pages/PersonalDebtNew';
import { PersonalDebtDetail } from './pages/PersonalDebtDetail';
import { PersonalDebtEdit } from './pages/PersonalDebtEdit';

// Metas de ahorro
import { Savings } from './pages/Savings';
import { SavingsNew } from './pages/SavingsNew';
import { SavingsDetail } from './pages/SavingsDetail';
import { SavingsEdit } from './pages/SavingsEdit';
```

- [ ] **En `App.jsx`**, agregar las rutas dentro de `<Route path="/" element={<ProtectedRoute>...`>, después de las rutas de reminders:

```jsx
{/* Ingresos */}
<Route path="income" element={<Income />} />
<Route path="income/new" element={<IncomeForm />} />
<Route path="income/:id/edit" element={<IncomeForm />} />

{/* Obligaciones personales */}
<Route path="personal-debts" element={<PersonalDebts />} />
<Route path="personal-debts/new" element={<PersonalDebtNew />} />
<Route path="personal-debts/:id" element={<PersonalDebtDetail />} />
<Route path="personal-debts/:id/edit" element={<PersonalDebtEdit />} />

{/* Metas de ahorro */}
<Route path="savings" element={<Savings />} />
<Route path="savings/new" element={<SavingsNew />} />
<Route path="savings/:id" element={<SavingsDetail />} />
<Route path="savings/:id/edit" element={<SavingsEdit />} />
```

- [ ] **En `Sidebar.jsx`**, agregar imports de iconos (agregar `Wallet, Handshake, Target` a la importación de lucide-react):

```jsx
import {
  LayoutDashboard, Repeat, Bell, CreditCard, Landmark,
  Menu, X, BarChart2, Wallet, Handshake, Target,
} from 'lucide-react';
```

- [ ] **En `Sidebar.jsx`**, agregar al objeto `SECTION_ICONS`:

```js
'/income':        Wallet,
'/personal-debts': Handshake,
'/savings':       Target,
```

- [ ] **En `Sidebar.jsx`**, agregar los tres NavItems después de `<NavItem to="/bank-credits" ...>` y antes del segundo `<div className="nav-divider" />`:

```jsx
<NavItem to="/income"         icon={Wallet}    label="Ingresos"       onClick={close} />
<NavItem to="/personal-debts" icon={Handshake} label="Obligaciones"   onClick={close} />
<NavItem to="/savings"        icon={Target}    label="Metas de Ahorro" onClick={close} />
```

- [ ] **Verificar**: navegar a `/income`, `/personal-debts`, `/savings` — todas cargan sin error 404, el sidebar muestra las tres nuevas secciones y el indicador de sección activa funciona correctamente.

- [ ] **Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/layout/Sidebar.jsx
git commit -m "feat: routing y sidebar — ingresos, obligaciones, metas"
```

---

## Task 10: CLAUDE.md — Actualizar documentación

**Files:**
- Modify: `CLAUDE.md`

- [ ] **En la sección `### Módulos existentes`**, agregar los tres nuevos módulos:

```
`user | creditCard | bankCredit | suscription | reminder | analytics | income | personalDebt | savingsGoal`
```

- [ ] **En la sección `### Rutas frontend completas (App.jsx)`**, agregar:

```
/income                    → lista | /new | /:id/edit
/personal-debts            → lista | /new | /:id | /:id/edit
/savings                   → lista | /new | /:id | /:id/edit
```

- [ ] **Agregar sección `## Dinero libre`** (después de `## Modelo de datos clave`):

```markdown
## Cálculo Dinero Libre

`dineroLibre = Σ Income.monto (activos) − Σ obligaciones mensuales (subs + créditos + tarjetas + personalDebt.montoCuota) − Σ SavingsGoal.aporteMensual (activas)`

Calculado en `analytics.service.getSummary()`. Visible en el Dashboard.
```

- [ ] **Commit**

```bash
git add CLAUDE.md
git commit -m "docs: actualizar CLAUDE.md con módulos income, personalDebt, savingsGoal"
```

---

## Verificación final

- [ ] `npm run dev` desde la raíz — backend y frontend levantan sin errores
- [ ] Navegar por las tres secciones nuevas en el browser
- [ ] Crear un ingreso → verificar que el Dashboard muestra `dineroLibre` actualizado
- [ ] Crear una obligación personal → registrar un abono → verificar progreso
- [ ] Crear una meta de ahorro → registrar un aporte → verificar que llega a 100% y cambia a `completado`
- [ ] Verificar que `GET /api/analytics/summary` incluye `income.total` y `dineroLibre`
