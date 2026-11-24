// Última tarjeta usada para registrar una compra: "Registrar movimiento" la ofrece primero.
const LAST_CARD_KEY = 'debti-last-card';
export const rememberCard = (id) => { try { localStorage.setItem(LAST_CARD_KEY, String(id)); } catch { /* sin almacenamiento */ } };
export const lastCardId = () => localStorage.getItem(LAST_CARD_KEY);
