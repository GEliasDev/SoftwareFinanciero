# ðŸ’³ DebtTracker API

API REST para la gestiÃ³n personal de deudas. Permite registrar crÃ©ditos bancarios, tarjetas de crÃ©dito y suscripciones, con cÃ¡lculo automÃ¡tico de cuotas, intereses y resÃºmenes financieros.

---

## ðŸš€ TecnologÃ­as

- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Sequelize
- **Base de datos:** MySQL / PostgreSQL
- **AutenticaciÃ³n:** JWT (jsonwebtoken)
- **ValidaciÃ³n:** Zod
- **Seguridad:** bcrypt
- **Variables de entorno:** dotenv

---

## ðŸ“ Estructura del proyecto

```
src/
â”œâ”€â”€ main.js                          # Punto de entrada, configuraciÃ³n de Express
â”œâ”€â”€ db/
â”‚   â””â”€â”€ client.js                    # ConexiÃ³n a la base de datos con Sequelize
â”œâ”€â”€ middlewares/
â”‚   â”œâ”€â”€ AppError.js                  # Clase de error personalizada
â”‚   â””â”€â”€ errorHandler.js              # Middleware global de manejo de errores
â”œâ”€â”€ core/
â”‚   â””â”€â”€ middleware/
â”‚       â””â”€â”€ jwtMiddleware.js         # Middleware de autenticaciÃ³n JWT
â””â”€â”€ modules/
    â”œâ”€â”€ user/
    â”‚   â”œâ”€â”€ user.model.js
    â”‚   â”œâ”€â”€ user.schema.js
    â”‚   â”œâ”€â”€ user.service.js
    â”‚   â”œâ”€â”€ user.controller.js
    â”‚   â”œâ”€â”€ user.routes.js
    â”‚   â””â”€â”€ utils/
    â”‚       â””â”€â”€ generateToken.js
    â”œâ”€â”€ bankCredit/
    â”‚   â”œâ”€â”€ bankCredit.model.js
    â”‚   â”œâ”€â”€ bankCredit.schema.js
    â”‚   â”œâ”€â”€ bankCredit.service.js
    â”‚   â”œâ”€â”€ bankCredit.controller.js
    â”‚   â”œâ”€â”€ bankCredit.routes.js
    â”‚   â””â”€â”€ utils/
    â”‚       â””â”€â”€ bankCreditCalculation.js
    â”œâ”€â”€ creditCard/
    â”‚   â”œâ”€â”€ creditCard.model.js
    â”‚   â”œâ”€â”€ creditCardPurchase.model.js
    â”‚   â”œâ”€â”€ creditCard.schema.js
    â”‚   â”œâ”€â”€ creditCard.service.js
    â”‚   â”œâ”€â”€ creditCard.controller.js
    â”‚   â”œâ”€â”€ creditCard.routes.js
    â”‚   â””â”€â”€ utils/
    â”‚       â””â”€â”€ creditCardCalculation.js
    â””â”€â”€ subscription/
        â”œâ”€â”€ subscription.model.js
        â”œâ”€â”€ subscription.schema.js
        â”œâ”€â”€ subscription.service.js
        â”œâ”€â”€ subscription.controller.js
        â”œâ”€â”€ subscription.routes.js
        â””â”€â”€ utils/
            â””â”€â”€ subscriptionCalculation.js
```

---

## âš™ï¸ InstalaciÃ³n

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/debttracker-api.git
cd debttracker-api

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Iniciar el servidor
npm run dev
```

---

## ðŸ” Variables de entorno

Crear un archivo `.env` en la raÃ­z del proyecto con los siguientes valores:

```env
PORT=3000
JWT_SECRET=tu_clave_secreta_aqui
JWT_EXPIRES_IN=7d

DB_HOST=localhost
DB_PORT=5432
DB_NAME=debttracker
DB_USER=tu_usuario
DB_PASSWORD=tu_password
```

---

## ðŸ”’ AutenticaciÃ³n

La API usa **JWT (JSON Web Token)**. Para acceder a los endpoints protegidos, incluye el token en el header de cada peticiÃ³n:

```
Authorization: Bearer <token>
```

El token se obtiene al hacer login en `POST /users/login`.

---

## ðŸ“– Endpoints

### ðŸ‘¤ Usuarios â€” `/users`

| MÃ©todo | Ruta | DescripciÃ³n | Auth |
|--------|------|-------------|------|
| `POST` | `/users/login` | Iniciar sesiÃ³n | âŒ |
| `POST` | `/users` | Registrar usuario | âŒ |
| `GET` | `/users` | Listar usuarios (paginado) | âœ… |
| `GET` | `/users/:id` | Obtener usuario por ID | âœ… |
| `PATCH` | `/users/:id` | Actualizar datos del usuario | âœ… |
| `PATCH` | `/users/:id/password` | Cambiar contraseÃ±a | âœ… |
| `DELETE` | `/users/:id` | Eliminar usuario | âœ… |

#### POST `/users/login`
```json
// Request
{
  "email": "usuario@gmail.com",
  "password": "mi_password"
}

// Response 200
{
  "message": "Inicio de sesiÃ³n exitoso",
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": 1,
    "primerNombre": "Gabriel",
    "email": "usuario@gmail.com"
  }
}
```

#### POST `/users`
```json
// Request
{
  "primerNombre": "Gabriel",
  "segundoNombre": "AndrÃ©s",
  "primerApellido": "LÃ³pez",
  "segundoApellido": "GarcÃ­a",
  "email": "gabriel@gmail.com",
  "telefono": "3001234567",
  "pais": "Colombia",
  "ciudad": "Cartagena",
  "password": "password123"
}
```

#### PATCH `/users/:id/password`
```json
// Request
{
  "currentPassword": "password_actual",
  "newPassword": "nuevo_password"
}
```

#### GET `/users?page=1&limit=20`
```json
// Response 200
{
  "total": 50,
  "page": 1,
  "totalPages": 3,
  "data": [...]
}
```

---

### ðŸ¦ CrÃ©ditos Bancarios â€” `/bank-credits`

| MÃ©todo | Ruta | DescripciÃ³n | Auth |
|--------|------|-------------|------|
| `POST` | `/bank-credits` | Registrar crÃ©dito bancario | âœ… |
| `GET` | `/bank-credits` | Listar crÃ©ditos del usuario | âœ… |
| `GET` | `/bank-credits/:id` | Obtener crÃ©dito por ID | âœ… |
| `PATCH` | `/bank-credits/:id` | Actualizar crÃ©dito | âœ… |
| `PATCH` | `/bank-credits/:id/pay` | Registrar cuota pagada | âœ… |
| `DELETE` | `/bank-credits/:id` | Eliminar crÃ©dito | âœ… |

#### POST `/bank-credits`
```json
// Request
{
  "nombre": "CrÃ©dito Addi",
  "entidad": "Addi",
  "montoTotal": 5000000,
  "numeroCuotas": 12,
  "tasaInteres": 24,
  "tipoTasa": "anual",
  "cuotaAdministracion": 0,
  "diaPago": 15,
  "fechaInicio": "2026-04-01"
}

// Response 201 â€” campos calculados automÃ¡ticamente
{
  "id": 1,
  "nombre": "CrÃ©dito Addi",
  "montoTotal": 5000000,
  "valorCuota": 474694.56,
  "totalAPagar": 5696334.72,
  "totalIntereses": 696334.72,
  "tasaMensual": 0.018265,
  "saldoPendiente": 5000000,
  "fechaFin": "2027-04-15",
  "status": "activo"
}
```

> **Nota:** Los campos `valorCuota`, `totalAPagar`, `totalIntereses`, `tasaMensual`, `saldoPendiente` y `fechaFin` son calculados automÃ¡ticamente usando el sistema de amortizaciÃ³n francÃ©s.
> La tasa puede ingresarse como **anual (EA)** o **mensual** â€” el sistema convierte automÃ¡ticamente.

#### PATCH `/bank-credits/:id/pay`
```json
// Response 200
{
  "message": "Cuota registrada exitosamente",
  "cuotasPagadas": 3,
  "cuotasRestantes": 9,
  "saldoPendiente": 4272251.04,
  "status": "activo"
}
```

---

### ðŸ’³ Tarjetas de CrÃ©dito â€” `/credit-cards`

#### Tarjeta

| MÃ©todo | Ruta | DescripciÃ³n | Auth |
|--------|------|-------------|------|
| `POST` | `/credit-cards` | Registrar tarjeta | âœ… |
| `GET` | `/credit-cards` | Listar tarjetas del usuario | âœ… |
| `GET` | `/credit-cards/:id` | Obtener tarjeta con compras activas | âœ… |
| `GET` | `/credit-cards/:id/summary` | Resumen mensual de la tarjeta | âœ… |
| `PATCH` | `/credit-cards/:id` | Actualizar tarjeta | âœ… |
| `DELETE` | `/credit-cards/:id` | Eliminar tarjeta | âœ… |

#### Compras

| MÃ©todo | Ruta | DescripciÃ³n | Auth |
|--------|------|-------------|------|
| `POST` | `/credit-cards/:creditCardId/purchases` | Registrar compra | âœ… |
| `GET` | `/credit-cards/:creditCardId/purchases` | Listar compras de la tarjeta | âœ… |
| `PATCH` | `/credit-cards/:creditCardId/purchases/:purchaseId/pay` | Registrar cuota pagada | âœ… |
| `DELETE` | `/credit-cards/:creditCardId/purchases/:purchaseId` | Eliminar compra | âœ… |

#### POST `/credit-cards`
```json
// Request
{
  "nombre": "Visa Bancolombia",
  "entidad": "Bancolombia",
  "cupoTotal": 10000000,
  "tasaInteresMensual": 2.5,
  "fechaCorte": 25,
  "fechaPago": 10
}

// Response 201
{
  "id": 1,
  "nombre": "Visa Bancolombia",
  "cupoTotal": 10000000,
  "cupoDisponible": 10000000,
  "status": "activa"
}
```

#### POST `/credit-cards/:creditCardId/purchases`
```json
// Request
{
  "descripcion": "iPhone 16",
  "montoTotal": 4000000,
  "numeroCuotas": 12,
  "fechaCompra": "2026-04-01"
}

// Response 201 â€” cuota calculada con interÃ©s compuesto
{
  "id": 1,
  "descripcion": "iPhone 16",
  "montoTotal": 4000000,
  "numeroCuotas": 12,
  "valorCuotaMensual": 377522.45,
  "totalAPagar": 4530269.40,
  "totalIntereses": 530269.40,
  "status": "activa"
}
```

#### GET `/credit-cards/:id/summary`
```json
// Response 200
{
  "tarjeta": "Visa Bancolombia",
  "entidad": "Bancolombia",
  "cupoTotal": 10000000,
  "cupoDisponible": 6000000,
  "saldoUsado": 4000000,
  "totalCuotasMes": 377522.45,
  "pagoMinimo": 80000,
  "fechaCorte": 25,
  "fechaPago": 10,
  "comprasActivas": 1
}
```

---

### ðŸ”„ Suscripciones â€” `/subscriptions`

| MÃ©todo | Ruta | DescripciÃ³n | Auth |
|--------|------|-------------|------|
| `POST` | `/subscriptions` | Registrar suscripciÃ³n | âœ… |
| `GET` | `/subscriptions` | Listar suscripciones del usuario | âœ… |
| `GET` | `/subscriptions/summary` | Resumen total de suscripciones | âœ… |
| `GET` | `/subscriptions/:id` | Obtener suscripciÃ³n por ID | âœ… |
| `PATCH` | `/subscriptions/:id` | Actualizar suscripciÃ³n | âœ… |
| `DELETE` | `/subscriptions/:id` | Eliminar suscripciÃ³n | âœ… |

#### POST `/subscriptions`
```json
// Request
{
  "nombre": "Netflix",
  "monto": 49900,
  "moneda": "COP",
  "frecuencia": "mensual",
  "diaCobro": 15,
  "fechaInicio": "2026-01-15"
}

// Request â€” suscripciÃ³n anual
{
  "nombre": "iCloud 200GB",
  "monto": 35900,
  "moneda": "COP",
  "frecuencia": "anual",
  "diaCobro": 10,
  "fechaInicio": "2026-01-10"
}

// Response 201 â€” montoMensual calculado automÃ¡ticamente
{
  "id": 2,
  "nombre": "iCloud 200GB",
  "monto": 35900,
  "montoMensual": 2991.67,
  "frecuencia": "anual",
  "status": "activa"
}
```

#### GET `/subscriptions/summary`
```json
// Response 200
{
  "totalSuscripciones": 3,
  "porMoneda": {
    "COP": {
      "totalMensual": 52891.67,
      "totalAnual": 634700,
      "items": [...]
    },
    "USD": {
      "totalMensual": 15.99,
      "totalAnual": 191.88,
      "items": [...]
    }
  }
}
```

---

## âš ï¸ Manejo de errores

Todos los errores siguen el mismo formato:

```json
{
  "status": "error",
  "message": "DescripciÃ³n del error"
}
```

Errores de validaciÃ³n (Zod):
```json
{
  "status": "error",
  "message": "Datos invÃ¡lidos",
  "errors": [
    {
      "field": "montoTotal",
      "message": "El monto debe ser mayor a 0"
    }
  ]
}
```

| CÃ³digo | Significado |
|--------|-------------|
| `400` | Datos invÃ¡lidos o lÃ³gica de negocio |
| `401` | No autenticado (token ausente o credenciales incorrectas) |
| `403` | Token invÃ¡lido o expirado |
| `404` | Recurso no encontrado |
| `500` | Error interno del servidor |

---

## ðŸ§® LÃ³gica de cÃ¡lculo

### CrÃ©dito bancario â€” Sistema francÃ©s (cuota fija)

```
C = P Ã— [i(1+i)^n] / [(1+i)^n - 1]
```

Donde:
- `C` = cuota mensual
- `P` = monto del crÃ©dito
- `i` = tasa mensual
- `n` = nÃºmero de cuotas

Si la tasa ingresada es **anual efectiva (EA)**, se convierte a mensual:
```
i_mensual = (1 + i_anual)^(1/12) - 1
```

### Tarjeta de crÃ©dito â€” Cuota por compra

Usa la misma fÃ³rmula de sistema francÃ©s, aplicada por compra individual con la tasa mensual de la tarjeta. Las compras a 1 cuota no generan interÃ©s.

### Pago mÃ­nimo tarjeta

```
pagoMinimo = max(saldoUsado Ã— 2%, $50.000 COP)
```

### Suscripciones â€” Equivalente mensual

```
// SuscripciÃ³n anual
montoMensual = montoAnual / 12

// SuscripciÃ³n mensual
montoMensual = monto
```

---

## ðŸ—ºï¸ Roadmap

- [x] MÃ³dulo de usuarios con autenticaciÃ³n JWT
- [x] CrÃ©ditos bancarios con amortizaciÃ³n francesa
- [x] Tarjetas de crÃ©dito con compras individuales
- [x] Suscripciones con equivalente mensual
- [x] Manejo centralizado de errores
- [ ] Notificaciones por email
- [ ] Dashboard financiero general
- [ ] Soporte para mÃ¡s tipos de deuda
- [ ] App mÃ³vil

---

## ðŸ“„ Licencia

MIT
