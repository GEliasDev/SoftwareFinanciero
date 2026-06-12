# Auditoría completa — Debti (2026-06-11)

Revisión integral: funcionalidades faltantes, inconsistencias de vistas y comportamiento responsive.
Metodología: análisis estático de las 45 páginas, revisión de los 14 módulos de backend, y verificación
visual real con Playwright (18 rutas × 3 viewports: 375 / 768 / 1440 px, modo claro y oscuro, con datos
sembrados vía API).

---

## A. Bugs reales encontrados (corregir primero)

### A1. Plan de pagos de créditos bancarios: interés ~100× menor (CRÍTICO)
- **Evidencia:** crédito de $950.000 a 1,62% M.V. muestra "Interés $84" en la cuota 10 y
  "Total intereses $1.601". Lo correcto: ~$10.000 por cuota y ~$204.000 totales.
- **Causa raíz:** convención de unidades inconsistente. El backend guarda `tasaMensual` como
  **fracción** (`tasaInteres/100` → `0.0162`) en `bankCreditCalculation.js`, pero el frontend la trata
  como **porcentaje** y divide de nuevo:
  - `frontend/src/utils/bankCredit.js:15` → `i = parseFloat(credit.tasaMensual) / 100` (doble división).
  - `frontend/src/pages/bank-credit/BankCreditOverview.jsx:51` → muestra "Tasa mensual 0.0162%" en vez de 1.62%.
  - Revisar también `BankCreditAnalysis.jsx` (usa el mismo schedule).
- Nota: el módulo de tarjetas guarda `tasaInteresMensual` como porcentaje (2.18) — unificar la convención.

### A2. Presupuesto: mes corrido por zona horaria (off-by-one UTC)
- **Evidencia:** con datos de junio (`mes=2026-06`), el selector muestra "Mayo De 2026".
- **Causa:** `frontend/src/pages/Budget.jsx:11-14`:
  - `new Date('2026-06-01')` se interpreta como medianoche UTC → en Colombia (UTC-5) es 31 de mayo.
  - `currentMes()` y el `fecha` por defecto usan `toISOString()` → después de las ~7 p. m. hora Colombia
    devuelven el día/mes **siguiente** (un gasto registrado a las 8 p. m. del 11 queda fechado el 12).
- **Fix:** formatear con fecha local (`new Date(y, m-1, 1)`) y derivar `YYYY-MM-DD` de getFullYear/getMonth/getDate locales.

### A3. Fechas crudas sin formatear en Presupuesto
- `Budget.jsx:187` renderiza `{exp.fecha}` → se ve "2026-06-12" en vez del formato es-CO usado en el
  resto de la app (`fmtDateLong`). Inconsistencia visible en la captura.

### A4. Topes de validación irreales para COP
- `creditCard.schema.js`: `cupoTotal ≤ 1.000.000`.
- `bankCredit.schema.js`: `montoTotal ≤ 1.000.000`, `cuotaAdministracion ≤ 10.000`, `seguro ≤ 10.000`.
- En Colombia un cupo de tarjeta típico es $2M–$50M y un crédito de libre inversión $5M–$100M; una cuota
  de manejo real ronda $25.000–$35.000 (ese campo sí está sin tope). **Hoy es imposible registrar una
  tarjeta o crédito real.** Subir topes (p. ej. 10.000 M) o eliminarlos.

### A5. Suscripciones en USD/EUR sin conversión
- El schema permite `moneda: COP|USD|EUR`, pero `analytics.service.js` suma `montoMensual` sin convertir:
  un Netflix de USD 15 entra como $15 COP en "Dinero Libre" y en compromisos mensuales.
- Opciones: quitar USD/EUR hasta tener TRM, o integrar una tasa de cambio (manual o API).

---

## B. Inconsistencias de UI detectadas

| # | Hallazgo | Dónde |
|---|---|---|
| B1 | Botones de acción cortados en móvil: "Deshacer pago / Editar / Eliminar" no caben y "Eliminar" queda recortado sin affordance | `BankCreditLayout.jsx:122` (fila flex sin `flex-wrap`) |
| B2 | Logo recortado en el sidebar rail de tablet (768–1024 px): se ve "deb" — la imagen del logo incluye el wordmark, ocultar `.sidebar-logo-name` no basta | `layout.css:777` + `BrandMark.jsx` |
| B3 | Logo "debti" casi ilegible en modo oscuro (verde oscuro sobre fondo oscuro); existe filtro dark solo para el logo de auth (`layout.css:935`) | Sidebar |
| B4 | "Mayo De 2026", "Junio De 2026" — `text-transform: capitalize` capitaliza la preposición "de" | Budget, CardStatement |
| B5 | `EmptyState.jsx` es código muerto: ninguna página lo importa; todas duplican el patrón a mano con clases `.empty-state` | `components/ui/EmptyState.jsx` |
| B6 | Inline styles masivos: Reports (138), CreditCardPurchaseDetail (131), Dashboard (80), CreditCardNew (69)… dificulta consistencia y dark mode | páginas grandes |
| B7 | Hex crudos pese a la regla de tokens: CreditCardPurchaseDetail (45), Reports (38), BankCreditAnalysis (14)… | ídem |
| B8 | Título duplicado en móvil: navbar dice "Reportes y Analítica" y el PageHeader lo repite inmediatamente debajo | Reports y otras |
| B9 | Tabs con overflow horizontal sin indicador de scroll (fade/chevron): en 375 px "Comparación MoM" y "Análisis" quedan ocultos | TabNav en Reports, detalles |
| B10 | Targets táctiles < 36 px: CreditCardNew (11 elementos), Budget (8–10), Profile (5), Income tablet (6) — swatches de color, botones ± y de iconos | formularios y budget |
| B11 | `AmortizationSchedule` usa scroll lateral (`overflow-x`) en vez del patrón `responsive-table` con `data-label` que ya existe y usan Reports/Subscriptions | `components/bank-credits/AmortizationSchedule.jsx` |
| B12 | 26 páginas no usan `PageHeader` (auth/wizards/layouts de detalle tienen estructura propia — verificar cuáles son intencionales) | varias |

## C. Responsive — resultado de la verificación real

**Muy bueno.** En 18 rutas × 3 viewports: **0 px de overflow horizontal en todas**, sin errores de consola.

Fortalezas confirmadas: bottom nav móvil (4 ítems + "Más" correcto), sidebar drawer con overlay,
rail de 64 px en tablet, `env(safe-area-inset-bottom)`, inputs de 44 px/16 px (evita zoom iOS),
tablas responsive con `data-label`, `prefers-reduced-motion`, dark mode con tokens.

Mejoras menores:
- **Móvil:** los 5 StatCards del Dashboard van a 1 columna → mucho scroll antes del contenido útil; caben 2 columnas (ya se hace en card-overview).
- **Tablet:** grilla de KPIs 3+1 deja "Deuda Total" huérfana; usar 2×2 o 4 columnas.
- B1/B9/B11 de arriba son los únicos defectos responsive reales.

## D. Accesibilidad

- Falta **skip-link** y estilos `:focus-visible` consistentes (solo 3 reglas en todo el CSS).
- Gráficas recharts sin alternativa textual (resumen `aria-label` o tabla de datos).
- Color no es el único canal en la mayoría de los casos (bien), `html lang="es"` (bien), aria-labels presentes en nav (bien).

## E. Funcionalidades faltantes para nivel "muy profesional"

Priorizadas por impacto/esfuerzo:

1. **Registro unificado de movimientos/gastos reales.** Hoy el gasto real solo vive en Presupuesto (manual
   por categoría). Falta un libro de movimientos (fecha, monto, categoría, cuenta/medio de pago) que
   alimente presupuesto, reportes y un "Dinero Libre real vs proyectado". Es la brecha #1 frente a apps
   profesionales (YNAB, Monarch, Fintonic).
2. **Patrimonio neto (net worth) con histórico.** Ya hay activos (metas de ahorro) y pasivos (deudas);
   falta la serie temporal mensual y su gráfica en Reportes.
3. **Presupuesto: copiar mes anterior / plantillas y rollover de sobrantes.** Hoy cada mes arranca vacío.
4. **Importación CSV/Excel** de movimientos (la exportación ya existe).
5. **Multi-moneda real con TRM** (o retirar USD/EUR — ver A5).
6. **Adjuntos** (foto del recibo/factura) en compras y gastos.
7. **Filtros/orden persistentes** en listas y paginación en ActivityLog.
8. **Seguridad:** refresh tokens (hoy JWT en localStorage sin renovación), 2FA opcional, bloqueo por
   intentos. Ya hay: helmet, rate-limit, bcrypt, reset por email. Falta `compression` y log de requests
   (winston existe pero no como middleware HTTP).
9. **Tests:** solo 2 archivos en todo el repo (1 backend, 1 frontend de utils). Cero pruebas sobre los
   cálculos de tarjetas en frontend, cero E2E. El bug A1 lo habría atrapado un test del schedule.
10. **Exportación total de datos / takeout** al eliminar cuenta.

## F. CLAUDE.md desactualizado

No documenta: módulos `budget`, `activityLog`, `search`, `pushSubscription`; jobs `weeklyDigestJob` y
`bankCreditMoraJob`; rutas `/budget`, `/activity`, `/onboarding`, `/forgot-password`, `/reset-password`;
pestaña `analysis` de bank-credits; dark mode; PWA/service worker; GlobalSearch (Ctrl+K).

---

### Datos de la verificación
- Usuario de prueba: `audit117530@test.com` (datos sembrados vía API en la BD de Supabase).
- Capturas: `%TEMP%/pw-runner/shots/` (18 rutas × 3 viewports + dark mode).
- Scripts reproducibles: `%TEMP%/pw-runner/audit.js` y `dark.js`.
