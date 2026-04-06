# 💳 DebtTracker API

API REST para la gestión personal de deudas. Permite registrar créditos bancarios, tarjetas de crédito y suscripciones, con cálculo automático de cuotas, intereses y resúmenes financieros.

---

## 🚀 Tecnologías

- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Sequelize
- **Base de datos:** MySQL / PostgreSQL
- **Autenticación:** JWT (jsonwebtoken)
- **Validación:** Zod
- **Seguridad:** bcrypt
- **Variables de entorno:** dotenv

---

## 📁 Estructura del proyecto

```
src/
├── main.js                          # Punto de entrada, configuración de Express
├── db/
│   └── client.js                    # Conexión a la base de datos con Sequelize
├── middlewares/
│   ├── AppError.js                  # Clase de error personalizada
│   └── errorHandler.js              # Middleware global de manejo de errores
├── core/
│   └── middleware/
│       └── jwtMiddleware.js         # Middleware de autenticación JWT
└── modules/
    ├── user/
    │   ├── user.model.js
    │   ├── user.schema.js
    │   ├── user.service.js
    │   ├── user.controller.js
    │   ├── user.routes.js
    │   └── utils/
    │       └── generateToken.js
    ├── bankCredit/
    │   ├── bankCredit.model.js
    │   ├── bankCredit.schema.js
    │   ├── bankCredit.service.js
    │   ├── bankCredit.controller.js
    │   ├── bankCredit.routes.js
    │   └── utils/
    │       └── bankCreditCalculation.js
    ├── creditCard/
    │   ├── creditCard.model.js
    │   ├── creditCardPurchase.model.js
    │   ├── creditCard.schema.js
    │   ├── creditCard.service.js
    │   ├── creditCard.controller.js
    │   ├── creditCard.routes.js
    │   └── utils/
    │       └── creditCardCalculation.js
    └── subscription/
        ├── subscription.model.js
        ├── subscription.schema.js
        ├── subscription.service.js
        ├── subscription.controller.js
        ├── subscription.routes.js
        └── utils/
            └── subscriptionCalculation.js
```

---

## ⚙️ Instalación

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

## 🔐 Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con los siguientes valores:

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

## 🔒 Autenticación

La API usa **JWT (JSON Web Token)**. Para acceder a los endpoints protegidos, incluye el token en el header de cada petición:

```
Authorization: Bearer <token>
```

El token se obtiene al hacer login en `POST /users/login`.

---

## 📖 Endpoints

### 👤 Usuarios — `/users`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/users/login` | Iniciar sesión | ❌ |
| `POST` | `/users` | Registrar usuario | ❌ |
| `GET` | `/users` | Listar usuarios (paginado) | ✅ |
| `GET` | `/users/:id` | Obtener usuario por ID | ✅ |
| `PATCH` | `/users/:id` | Actualizar datos del usuario | ✅ |
| `PATCH` | `/users/:id/password` | Cambiar contraseña | ✅ |
| `DELETE` | `/users/:id` | Eliminar usuario | ✅ |

#### POST `/users/login`
```json
// Request
{
  "email": "usuario@gmail.com",
  "password": "mi_password"
}

// Response 200
{
  "message": "Inicio de sesión exitoso",
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
  "segundoNombre": "Andrés",
  "primerApellido": "López",
  "segundoApellido": "García",
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

### 🏦 Créditos Bancarios — `/bank-credits`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/bank-credits` | Registrar crédito bancario | ✅ |
| `GET` | `/bank-credits` | Listar créditos del usuario | ✅ |
| `GET` | `/bank-credits/:id` | Obtener crédito por ID | ✅ |
| `PATCH` | `/bank-credits/:id` | Actualizar crédito | ✅ |
| `PATCH` | `/bank-credits/:id/pay` | Registrar cuota pagada | ✅ |
| `DELETE` | `/bank-credits/:id` | Eliminar crédito | ✅ |

#### POST `/bank-credits`
```json
// Request
{
  "nombre": "Crédito Addi",
  "entidad": "Addi",
  "montoTotal": 5000000,
  "numeroCuotas": 12,
  "tasaInteres": 24,
  "tipoTasa": "anual",
  "cuotaAdministracion": 0,
  "diaPago": 15,
  "fechaInicio": "2026-04-01"
}

// Response 201 — campos calculados automáticamente
{
  "id": 1,
  "nombre": "Crédito Addi",
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

> **Nota:** Los campos `valorCuota`, `totalAPagar`, `totalIntereses`, `tasaMensual`, `saldoPendiente` y `fechaFin` son calculados automáticamente usando el sistema de amortización francés.
> La tasa puede ingresarse como **anual (EA)** o **mensual** — el sistema convierte automáticamente.

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

### 💳 Tarjetas de Crédito — `/credit-cards`

#### Tarjeta

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/credit-cards` | Registrar tarjeta | ✅ |
| `GET` | `/credit-cards` | Listar tarjetas del usuario | ✅ |
| `GET` | `/credit-cards/:id` | Obtener tarjeta con compras activas | ✅ |
| `GET` | `/credit-cards/:id/summary` | Resumen mensual de la tarjeta | ✅ |
| `PATCH` | `/credit-cards/:id` | Actualizar tarjeta | ✅ |
| `DELETE` | `/credit-cards/:id` | Eliminar tarjeta | ✅ |

#### Compras

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/credit-cards/:creditCardId/purchases` | Registrar compra | ✅ |
| `GET` | `/credit-cards/:creditCardId/purchases` | Listar compras de la tarjeta | ✅ |
| `PATCH` | `/credit-cards/:creditCardId/purchases/:purchaseId/pay` | Registrar cuota pagada | ✅ |
| `DELETE` | `/credit-cards/:creditCardId/purchases/:purchaseId` | Eliminar compra | ✅ |

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

// Response 201 — cuota calculada con interés compuesto
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

### 🔄 Suscripciones — `/subscriptions`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/subscriptions` | Registrar suscripción | ✅ |
| `GET` | `/subscriptions` | Listar suscripciones del usuario | ✅ |
| `GET` | `/subscriptions/summary` | Resumen total de suscripciones | ✅ |
| `GET` | `/subscriptions/:id` | Obtener suscripción por ID | ✅ |
| `PATCH` | `/subscriptions/:id` | Actualizar suscripción | ✅ |
| `DELETE` | `/subscriptions/:id` | Eliminar suscripción | ✅ |

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

// Request — suscripción anual
{
  "nombre": "iCloud 200GB",
  "monto": 35900,
  "moneda": "COP",
  "frecuencia": "anual",
  "diaCobro": 10,
  "fechaInicio": "2026-01-10"
}

// Response 201 — montoMensual calculado automáticamente
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

## ⚠️ Manejo de errores

Todos los errores siguen el mismo formato:

```json
{
  "status": "error",
  "message": "Descripción del error"
}
```

Errores de validación (Zod):
```json
{
  "status": "error",
  "message": "Datos inválidos",
  "errors": [
    {
      "field": "montoTotal",
      "message": "El monto debe ser mayor a 0"
    }
  ]
}
```

| Código | Significado |
|--------|-------------|
| `400` | Datos inválidos o lógica de negocio |
| `401` | No autenticado (token ausente o credenciales incorrectas) |
| `403` | Token inválido o expirado |
| `404` | Recurso no encontrado |
| `500` | Error interno del servidor |

---

## 🧮 Lógica de cálculo

### Crédito bancario — Sistema francés (cuota fija)

```
C = P × [i(1+i)^n] / [(1+i)^n - 1]
```

Donde:
- `C` = cuota mensual
- `P` = monto del crédito
- `i` = tasa mensual
- `n` = número de cuotas

Si la tasa ingresada es **anual efectiva (EA)**, se convierte a mensual:
```
i_mensual = (1 + i_anual)^(1/12) - 1
```

### Tarjeta de crédito — Cuota por compra

Usa la misma fórmula de sistema francés, aplicada por compra individual con la tasa mensual de la tarjeta. Las compras a 1 cuota no generan interés.

### Pago mínimo tarjeta

```
pagoMinimo = max(saldoUsado × 2%, $50.000 COP)
```

### Suscripciones — Equivalente mensual

```
// Suscripción anual
montoMensual = montoAnual / 12

// Suscripción mensual
montoMensual = monto
```

---

## 🗺️ Roadmap

- [x] Módulo de usuarios con autenticación JWT
- [x] Créditos bancarios con amortización francesa
- [x] Tarjetas de crédito con compras individuales
- [x] Suscripciones con equivalente mensual
- [x] Manejo centralizado de errores
- [ ] Módulo de recordatorios (Web Push)
- [ ] Notificaciones por email
- [ ] Dashboard financiero general
- [ ] Soporte para más tipos de deuda
- [ ] App móvil

---

## 📄 Licencia

MIT