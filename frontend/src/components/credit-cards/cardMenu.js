import { Eye, ShoppingBag, Check, FileText, Inbox, Banknote, Pencil, Trash2 } from 'lucide-react';
import { rememberCard } from '../../utils/lastCard';

/**
 * Acciones rápidas de una tarjeta (clic derecho / ⋯), compartidas por la lista
 * de Tarjetas e Inicio. "Pagar corte" reutiliza la confirmación del detalle
 * (`?accion=pagar`). `onDelete` es opcional: sin él no se ofrece eliminar.
 */
export const accionesTarjeta = (card, { navigate, porPagar = 0, pendientes = 0, onDelete }) => {
  const base = `/credit-cards/${card.id}`;
  return [
    { label: 'Ver tarjeta', icon: Eye, onSelect: () => navigate(base) },
    { label: 'Nueva compra', icon: ShoppingBag, onSelect: () => { rememberCard(card.id); navigate(`${base}/purchases/new`); } },
    porPagar > 0 && { label: 'Pagar corte', icon: Check, onSelect: () => navigate(`${base}?accion=pagar`) },
    { label: 'Ver extracto', icon: FileText, onSelect: () => navigate(`${base}/statement`) },
    pendientes > 0 && { label: `Por aprobar (${pendientes})`, icon: Inbox, onSelect: () => navigate(`${base}/pending`) },
    { label: 'Avance en efectivo', icon: Banknote, onSelect: () => navigate(`${base}/advances/new`) },
    { label: 'Editar tarjeta', icon: Pencil, onSelect: () => navigate(`${base}/edit`) },
    onDelete && 'sep',
    onDelete && { label: 'Eliminar tarjeta', icon: Trash2, danger: true, onSelect: () => onDelete(card) },
  ];
};
