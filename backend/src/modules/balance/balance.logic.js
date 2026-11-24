import { ESTADOS_INGRESO, ESTADOS_GASTO } from './balance.schema.js';

// Lógica pura del balance (sin BD), separada para poder probarla.

export const periodoAnterior = ({ anio, mes }) =>
    mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };

/**
 * Filas nuevas al copiar un mes en otro: todo vuelve a "pendiente", las filas
 * enlazadas vuelven a monto automático (se recalcula para el mes destino) y los
 * ingresos extra de Debti no se copian (solo cuentan el mes en que llegaron).
 */
export const filasCopiadas = (origen, destino, extraIncomeIds = new Set()) =>
    origen
        .filter(it => !(it.origen === 'ingreso' && extraIncomeIds.has(it.origenId)))
        .map(it => ({
            userId:      it.userId,
            anio:        destino.anio,
            mes:         destino.mes,
            tipo:        it.tipo,
            descripcion: it.descripcion,
            categoria:   it.categoria,
            monto:       it.origen === 'manual' ? it.monto : null,
            estado:      'pendiente',
            origen:      it.origen,
            origenId:    it.origenId,
        }));

/** Valida un cambio contra la fila existente (tipo y origen no cambian). Devuelve un mensaje de error o null. */
export const errorDeActualizacion = (item, cambios) => {
    if (cambios.estado !== undefined) {
        const estados = item.tipo === 'ingreso' ? ESTADOS_INGRESO : ESTADOS_GASTO;
        if (!estados.includes(cambios.estado)) return 'Estado no válido para este tipo';
    }
    if (cambios.monto === null && item.origen === 'manual') return 'El monto es obligatorio';
    return null;
};
