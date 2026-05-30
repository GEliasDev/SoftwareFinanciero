# Rediseño Solventa — Spec de Diseño

**Fecha:** 2026-05-30
**Estado:** Aprobado por el usuario. En ejecución (Fase 1).

> Punto de retorno: si la sesión se interrumpe, retomar leyendo este spec + la
> lista de tareas. Escribir "continúa" para seguir desde la fase pendiente.

## Decisiones fijadas
- **Marca:** Solventa (wordmark `◆ Solventa`). Antes "Debti". Razón: encuadre
  positivo (solvencia), alcance amplio (no solo deuda), raíz en español.
  Pendiente del usuario: verificar dominio/marca antes de producción.
- **Estilo:** Fintech corporativo limpio (Stripe / Mercury / Ramp). Superficies
  claras, bordes finos, sombras muy sutiles, un acento de color seguro, fuerte
  jerarquía de datos.
- **Paleta:** Índigo profundo + Esmeralda.
- **Ejecución:** Sistema de diseño primero (Fase 1), luego módulo a módulo.
- **Densidad:** equilibrada (ni trading apretado ni excesivamente aireado).
- **Modo oscuro:** tokens arquitectados para soportarlo después; NO se construye ahora.

## Estrategia clave (bajo costo, bajo riesgo)
Las páginas existentes usan variables `--color-*`. En vez de editar cada archivo,
**re-apuntamos esas variables a la paleta nueva** y añadimos tokens nuevos. Así
toda la app adopta la paleta al instante y luego subimos componentes de forma
progresiva, sin romper nada.

## 1. Tokens (`frontend/src/index.css :root`)

### Color
```css
/* Marca — Índigo */
--brand-50:#EEF2FF; --brand-100:#E0E7FF; --brand-200:#C7D2FE;
--brand-500:#6366F1; --brand-600:#4F46E5; --brand-700:#4338CA; --brand-800:#3730A3;
/* Positivo — Esmeralda */
--pos-50:#ECFDF5; --pos-600:#059669; --pos-700:#047857;
/* Alerta — Ámbar */
--warn-50:#FFFBEB; --warn-600:#D97706; --warn-700:#B45309;
/* Peligro — Rojo */
--neg-50:#FEF2F2; --neg-600:#DC2626; --neg-700:#B91C1C;
/* Neutros — Slate */
--bg:#F8FAFC; --surface:#FFFFFF; --surface-2:#F1F5F9;
--border:#E2E8F0; --border-strong:#CBD5E1;
--text:#0F172A; --text-2:#475569; --text-3:#94A3B8;

/* Alias de compatibilidad (las páginas actuales siguen funcionando) */
--color-primary:var(--brand-600); --color-primary-hover:var(--brand-700);
--color-primary-light:var(--brand-50);
--color-success:var(--pos-600); --color-success-bg:var(--pos-50);
--color-warning:var(--warn-600); --color-warning-bg:var(--warn-50);
--color-danger:var(--neg-600);  --color-danger-bg:var(--neg-50);
--color-bg:var(--bg); --color-surface:var(--surface);
--color-border:var(--border); --color-border-strong:var(--border-strong);
--color-text-primary:var(--text); --color-text-secondary:var(--text-2);
--color-text-muted:var(--text-3);
```

### Tipografía
- Fuente: **Inter** (importar pesos 400;500;600;700;800).
- Números monetarios: `.tabular { font-variant-numeric: tabular-nums; }` —
  aplicar a TODA cifra de dinero (alineación en columnas = look financiero).
- Títulos: `letter-spacing:-0.02em`.

### Espaciado
```css
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
--space-5:20px; --space-6:24px; --space-8:32px; --space-10:48px;
```

### Sombras (sutiles, por capas)
```css
--shadow-xs:0 1px 2px rgba(15,23,42,0.04);
--shadow-sm:0 1px 3px rgba(15,23,42,0.06),0 1px 2px rgba(15,23,42,0.04);
--shadow-md:0 4px 12px -2px rgba(15,23,42,0.08);
--shadow-lg:0 12px 28px -6px rgba(15,23,42,0.12);
```

## 2. Componentes base (`frontend/src/components/ui/`)
Eliminan el estilo inline duplicado. Cada uno: una responsabilidad, props claras.
- `PageHeader` — `{ title, subtitle?, actions? }`.
- `StatCard` — `{ label, value, delta?, trend?, icon?, tone?, onClick? }`.
- `SectionCard` — card con header (icono + título + acción opcional).
- `Money` — `{ value, currency?, tone? }` con `.tabular` y color semántico.
- `Badge` — refinar el existente (variants: primary/success/warning/danger/neutral).
- `Button` — alinear al sistema (ya existe).
- `EmptyState`, `DataList`/`ListRow`, skeletons.
- `utils/format.js` — `fmt`, `fmtDate`, etc. centralizados (hoy duplicados en ~6 archivos).

## 3. Shell
- **Sidebar** claro, acentos índigo: `◆ Solventa`, nav agrupada, item activo con
  **barra de acento izquierda** + fondo `--brand-50`, badge vivo de obligación,
  mini-resumen "Este mes" abajo.
- **Navbar**: título de página + **pill "Por pagar este mes $X · próximo en Nd"**
  + avatar con menú (Perfil / Cerrar sesión) reemplazando el `confirm()` nativo.

## 4. Fases
1. **Fundación** — tokens + componentes base + shell. *(en curso)*
2. **Dashboard** — KPIs con StatCard, distribución de deuda, timeline de vencimientos.
3. **Créditos bancarios** — al nivel de Tarjetas (amortización/extracto).
4. **Suscripciones** — calendario de cobros + costo anualizado.
5. **Recordatorios** — agenda visual.
6. **Reportes** — pulido sobre el sistema nuevo.
7. **Perfil + Auth (Login/Register)** — coherencia final.

Cada fase se verifica con `npm run build` + lint y se commitea por separado.

## Referencia del estado actual
- App: "Debti", React 19 + Vite 8 + react-router 7, recharts, sweetalert2.
- Módulos: Dashboard, Suscripciones, Tarjetas (ya pulido), Créditos bancarios,
  Recordatorios, Reportes, Perfil, Auth.
- CSS: `index.css` (tokens), `styles/components.css`, `styles/layout.css`.
- Tarjetas ya migrado parcialmente: `utils/creditCard.js`,
  `components/credit-cards/CardStatement.jsx`.
