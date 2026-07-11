// Taxonomía de categorías de gasto — compartida entre CreditCardPurchase y
// PersonalDebt (tipo 'gasto') para que Presupuesto pueda sumarlas juntas por
// categoría. Debe coincidir con `frontend/src/utils/creditCard.js::CATEGORIES`
// (mismos `value`, ahí también llevan label/ícono/color para la UI).
export const CATEGORIAS = [
    'comida', 'transporte', 'salud', 'entretenimiento', 'hogar',
    'tecnologia', 'ropa', 'educacion', 'viajes', 'otros',
];
