import { z } from 'zod';

const ESTADOS_INGRESO = ['pendiente', 'recibido'];
const ESTADOS_GASTO   = ['pendiente', 'comprometido', 'pagado'];
const ORIGEN_TIPO = { tarjeta: 'gasto', credito: 'gasto', suscripcion: 'gasto', ingreso: 'ingreso' };

export const periodoSchema = z.object({
    anio: z.coerce.number().int().min(2000).max(2100),
    mes:  z.coerce.number().int().min(1).max(12),
});

// Reglas cruzadas: estado según tipo; filas enlazadas con tipo fijo y origenId;
// filas manuales siempre con monto (las enlazadas pueden ir en NULL = automático).
const itemSchema = z.object({
    tipo:        z.enum(['ingreso', 'gasto']),
    descripcion: z.string().trim().min(1).max(100),
    categoria:   z.string().trim().min(1).max(40),
    monto:       z.number().positive().max(1e13).nullable().optional().default(null),
    estado:      z.enum(['pendiente', 'comprometido', 'pagado', 'recibido']).optional().default('pendiente'),
    origen:      z.enum(['manual', 'tarjeta', 'credito', 'suscripcion', 'ingreso']).optional().default('manual'),
    origenId:    z.number().int().positive().nullable().optional().default(null),
}).superRefine((it, ctx) => {
    const estados = it.tipo === 'ingreso' ? ESTADOS_INGRESO : ESTADOS_GASTO;
    if (!estados.includes(it.estado)) ctx.addIssue({ code: 'custom', path: ['estado'], message: 'Estado no válido para este tipo' });
    if (it.origen === 'manual') {
        if (it.monto == null) ctx.addIssue({ code: 'custom', path: ['monto'], message: 'El monto es obligatorio' });
        if (it.origenId != null) ctx.addIssue({ code: 'custom', path: ['origenId'], message: 'Una fila manual no lleva origen' });
    } else {
        if (it.origenId == null) ctx.addIssue({ code: 'custom', path: ['origenId'], message: 'Falta el elemento enlazado' });
        if (ORIGEN_TIPO[it.origen] !== it.tipo) ctx.addIssue({ code: 'custom', path: ['tipo'], message: 'Tipo no válido para este origen' });
    }
});

export const createSchema = periodoSchema.extend({
    items: z.array(itemSchema).min(1).max(50),
});

// tipo/origen no se cambian después de crear la fila; las reglas por tipo se validan en el service.
export const updateSchema = z.object({
    descripcion: z.string().trim().min(1).max(100).optional(),
    categoria:   z.string().trim().min(1).max(40).optional(),
    monto:       z.number().positive().max(1e13).nullable().optional(),
    estado:      z.enum(['pendiente', 'comprometido', 'pagado', 'recibido']).optional(),
});

export { ESTADOS_INGRESO, ESTADOS_GASTO };
