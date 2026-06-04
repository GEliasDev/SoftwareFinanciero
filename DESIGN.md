---
name: Solventa
description: Dashboard unificado de finanzas personales para Colombia — tarjetas, créditos, suscripciones.
colors:
  brand:           "#047857"
  brand-deep:      "#065F46"
  brand-deepest:   "#064E3B"
  brand-mid:       "#10B981"
  brand-tint:      "#ECFDF5"
  brand-tint-strong: "#D1FAE5"
  semantic-positive: "#059669"
  semantic-warning:  "#D97706"
  semantic-danger:   "#DC2626"
  bg:              "#F8FAFC"
  surface:         "#FFFFFF"
  surface-raised:  "#F1F5F9"
  border:          "#E2E8F0"
  border-strong:   "#CBD5E1"
  text-primary:    "#0F172A"
  text-secondary:  "#475569"
  text-muted:      "#94A3B8"
typography:
  display:
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 2.5vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
  numeric:
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    fontFeature: '"tnum" 1'
rounded:
  sm:   "5px"
  md:   "8px"
  lg:   "10px"
  xl:   "14px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.semantic-danger}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "20px 24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 12px"
  badge-success:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.brand}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-danger:
    backgroundColor: "#FEF2F2"
    textColor: "{colors.semantic-danger}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Solventa

## 1. Overview

**Creative North Star: "The Precision Engine"**

Solventa se opera, no se admira. Es una herramienta de poder para colombianos con compromisos financieros reales — créditos de Addi, cuotas de tarjeta, suscripciones digitales, fechas de corte — y su diseño lo sabe. Cada pantalla entrega el máximo de información útil dentro del espacio disponible. El silencio visual no es elegancia aquí: es espacio desperdiciado.

El sistema está construido sobre IBM Plex Sans porque transmite autoridad técnica sin frialdad corporativa. El verde esmeralda profundo (#047857 — Emerald Authority) habla de solvencia y control, no de dinero fácil. El fondo slate-50 (#F8FAFC) es neutral puro; toda la calidez viene de los datos y el verde, no del fondo. Los números monetarios son el verdadero contenido: usan figuras tabulares obligatoriamente para que las columnas de valores no bailen.

Lo que este sistema rechaza explícitamente: la condescendencia de las apps de finanzas personales con cerditos animados, colores primarios y tono de juego para niños. El peso burocrático de las apps bancarias colombianas tradicionales con formularios pesados y sin identidad. El ruido visual del SaaS AI genérico 2025 con gradientes morado-rosa, glassmorphism decorativo y big-number hero metrics que no dicen nada.

**Key Characteristics:**
- Densidad informativa alta por defecto; el espacio vacío se justifica
- IBM Plex Sans en todos los pesos: jerarquía a través de peso y tamaño, no de familias tipográficas distintas
- Un solo color de acento (Emerald Authority) con una función semántica precisa: acción confirmada, saldo positivo, estado activo
- Dark mode como ciudadano de primera clase, no un afterthought
- Números financieros con figuras tabulares obligatorias (`.tabular`)
- Bordes y sombras sutiles para separar capas sin distraer de los datos

## 2. Colors: The Emerald Authority Palette

Un color de marca profundo y comprometido, anclado en semántica financiera clara: verde es solvencia, rojo es deuda/riesgo, ámbar es alerta, el slate neutro es el canvas.

### Primary
- **Emerald Authority** (`#047857`): El verde de la solvencia. Usado en botones primarios, nav items activos, indicadores de progreso, el panel izquierdo de auth y cualquier acción confirmada. Nunca decorativo.
- **Emerald Deep** (`#065F46`): Estado hover del primario. Auth panel background en gradiente. Headers de tarjetas.
- **Emerald Deepest** (`#064E3B`): Reservado para contraste máximo, sombras de color, gradientes de fondo profundos.
- **Emerald Mid** (`#10B981`): Variante más brillante para gráficas recharts y elementos secundarios que necesitan distinción sin competir con el primario.

### Secondary
- **Emerald Tint** (`#ECFDF5`): Fondo de badges de éxito, highlight de nav item activo, boxes informativas. El positivo más suave.
- **Emerald Tint Strong** (`#D1FAE5`): Variante con más saturación para componentes de estado positivo que necesitan más presencia.

### Tertiary (Semántica funcional)
- **Positive** (`#059669`): Valores positivos en gráficas, capital en tablas de amortización, indicadores de progreso verde. Nunca usado en botones.
- **Warning Amber** (`#D97706`): Alertas de mora, vencimientos próximos, indicadores de carga de interés alta. Fondo tint `#FFFBEB`.
- **Danger Red** (`#DC2626`): Errores de formulario, botones destructivos (solo borde+texto, nunca fondo sólido en estado rest), badges de deuda, valores negativos. Fondo tint `#FEF2F2`.

### Neutral
- **Canvas** (`#F8FAFC`): Fondo de página (slate-50). Neutro frío puro, sin tinte cálido.
- **Surface** (`#FFFFFF`): Fondo de cards, modales, inputs. Blanco puro.
- **Surface Raised** (`#F1F5F9`): Hover states, inputs deshabilitados, code blocks. Slate-100.
- **Border** (`#E2E8F0`): Divisores, bordes de cards e inputs en rest. Slate-200.
- **Border Strong** (`#CBD5E1`): Bordes de inputs en hover, separadores con más peso. Slate-300.
- **Text Primary** (`#0F172A`): Headings, valores monetarios principales, texto importante. Slate-900. Contraste 15.5:1 sobre surface.
- **Text Secondary** (`#475569`): Labels, subtítulos, texto de soporte. Slate-600. Contraste 5.9:1.
- **Text Muted** (`#94A3B8`): Placeholders, leyendas de gráficas, metadata menor. Slate-400. Solo en tamaños grandes o contextos no-críticos.

**The Emerald Authority Rule.** El primario (`#047857`) aparece en ≤15% de cualquier pantalla. Su escasez es su autoridad. Un dashboard lleno de verde es un dashboard sin foco. Cuando todo es acento, nada es acento.

**The No-Warm-Background Rule.** El fondo nunca es crema, arena, marfil, parchment ni ninguna variante del espectro cálido-neutro. `#F8FAFC` (slate-50) es el canvas. La calidez de Solventa viene del dato correcto y el verde, no del fondo.

## 3. Typography

**Display / Body / Label Font:** IBM Plex Sans (400, 500, 600, 700) — un solo sistema tipográfico.

**Character:** IBM Plex Sans combina legibilidad técnica (diseñada para interfaces de IBM) con calor humano. A 700 se siente como un instrumento de precisión. A 400 como un reporte claro. La jerarquía se construye exclusivamente con peso y tamaño dentro de esta familia; no se introducen typefaces adicionales.

### Hierarchy
- **Display** (700, clamp(1.375rem → 1.75rem), leading 1.2, tracking -0.02em): Títulos de página (`h1`), encabezados de panels de auth. Una sola línea por pantalla.
- **Headline** (700, 1.25rem / 20px, leading 1.3, tracking -0.015em): Encabezados de secciones principales, nombres de tarjetas y créditos en listas.
- **Title** (600, 0.9375rem / 15px, leading 1.4): Headers de cards, labels de sección con peso, nombres de módulos en la nav.
- **Body** (400, 0.875rem / 14px, leading 1.5): Todo el texto de párrafo, descripciones, help text. Línea máxima: 65ch en desktop.
- **Label** (600, 0.6875rem / 11px, leading 1.4, tracking 0.05em, uppercase): Eyebrows de categoría en stat cards (ej: "CUOTA MENSUAL"), valores de metadata, headers de columnas de tabla. Uso restringido: máximo 4 palabras, no en cuerpo de párrafo.
- **Numeric** (700, variable según contexto, figuras tabulares `font-variant-numeric: tabular-nums`): Obligatorio en cualquier valor monetario, porcentaje en columna o fecha en tabla. Sin esta clase, los valores en COP bailan.

**The Single Family Rule.** Una sola familia tipográfica en toda la app. Si se siente monótona, el problema es la jerarquía de peso y tamaño, no la falta de una segunda familia. Agregar una segunda familia resuelve la sensación con otro problema.

**The Tabular Numbers Rule.** Todo valor COP, porcentaje en tabla o contador numérico usa la clase `.tabular`. Sin ella, los dígitos de ancho variable hacen que las columnas de saldos se vean como texto, no como datos.

## 4. Elevation

El sistema usa sombras funcionales y tenues, no decorativas. La profundidad comunica jerarquía de superficie, no dramatismo visual. Las capas se separan con color (surface vs surface-raised) como primera opción; las sombras refuerzan esa separación cuando se necesita énfasis adicional.

### Shadow Vocabulary
- **XS** (`0 1px 2px rgba(15,23,42,0.04)`): Botones en rest, chips. Casi imperceptible; confirma que el elemento es interactivo.
- **SM** (`0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)`): Cards en estado rest. El default de cualquier card container.
- **MD** (`0 4px 12px -2px rgba(15,23,42,0.08)`): Cards hover, modales de baja altura, popovers. Cuando el elemento necesita separarse claramente del canvas.
- **LG** (`0 12px 28px -6px rgba(15,23,42,0.12)`): Modales principales, sidebar en mobile cuando está abierto. Reservado para overlays.

**The Flat-By-Default Rule.** Las superficies en rest no tienen sombra o tienen XS. Las sombras aparecen como respuesta a interacción (hover, focus, elevation de estado). Una pantalla con 8 cards con shadow-MD parece una tienda de adornos, no un dashboard financiero.

**Dark mode:** Los valores de alpha aumentan (0.04 → 0.4) porque las sombras sobre fondos oscuros necesitan más opacidad para ser visibles sin resultar pesadas.

## 5. Components

### Buttons
Táctiles y directos. Feedback visual inmediato. Nunca ambiguos sobre qué acción desencadenan.

- **Shape:** Gently curved (8px radius, `--radius-md`)
- **Primary:** `#047857` background, blanco text, padding `0 16px`, height `36px`. Sombra XS en rest. Hover: `#065F46`, sin transform. Focus: `box-shadow: 0 0 0 3px #D1FAE5`.
- **Secondary:** Transparente, borde `1px solid #CBD5E1`, texto `#475569`. Hover: fondo `#F8FAFC`, texto `#0F172A`.
- **Danger:** Transparente en rest, borde `1px solid #DC2626`, texto `#DC2626`. Hover: fondo `#FEF2F2`. Nunca fondo sólido rojo en rest — reservado para `btn-danger-solid` en confirmaciones destructivas únicas.
- **Ghost / Link:** Sin borde, sin fondo. Solo texto con cursor pointer. Para acciones terciarias o links de navegación.
- **Success:** `#059669` sólido. Solo para confirmaciones positivas de alta importancia (pagar cuota, guardar éxito).

### Cards / Containers
- **Corner Style:** Gently rounded (14px, `--radius-xl`)
- **Background:** `#FFFFFF` (surface)
- **Shadow:** SM en rest, MD en hover interactivo
- **Border:** `1px solid #E2E8F0`
- **Internal Padding:** 20px–24px estándar, reducido a 16px en mobile

**The No-Nested-Cards Rule.** Cards dentro de cards están prohibidas. Si el contenido dentro de una card necesita separación, usar divisores (`border-top: 1px solid #E2E8F0`) o espaciado interno. El anidamiento visual genera ruido sin estructura.

### Inputs / Fields
- **Style:** Borde `1px solid #CBD5E1`, fondo `#FFFFFF`, radius `5px` (`--radius-sm`), height `36px` (44px en pantallas auth con clase `.auth-input`)
- **Focus:** `border-color: #047857`, `box-shadow: 0 0 0 3px #ECFDF5`. Sin outline nativo; el ring verde es el estado de focus.
- **Error:** `border-color: #DC2626`, `box-shadow: 0 0 0 3px #FEF2F2`. Mensaje de error en rojo debajo del campo, nunca solo en la parte superior del formulario.
- **Disabled:** Fondo `#F8FAFC`, texto `#94A3B8`, cursor `not-allowed`.
- **Password toggle:** Botón ojo posicionado absolutamente dentro del input (clase `.auth-eye-btn`). Target: 32×32px mínimo.

### Navigation (Sidebar)
- **Desktop:** Sidebar fijo de 220px. Items con `height: 40px`, `border-radius: 8px`, `padding: 0 10px`.
- **Active state:** Fondo `#ECFDF5`, texto `#047857`, borde izquierdo de 3px `#047857` posicionado absoluto.
- **Hover:** Fondo `#F8FAFC`.
- **Mobile:** Transform slide-in desde la izquierda con overlay semitransparente. Badge de sección activa en el botón hamburger (ícono verde 14px).
- **Logo mark:** BrandMark SVG (cuadrado esmeralda con línea ascendente, 28–36px). Drop shadow verde sutil.

### Stat Cards
Componente distintivo de Solventa. Jerarquía: label (uppercase 11px) → valor principal (22–26px, 700) → delta (12px, muted).

- **Tones:** `pos` (verde), `neg` (rojo), `warn` (ámbar), `neutral` (brand), `brand` (verde primary)
- **Icon:** 16px, alineado a la derecha, color según tone
- **Clickable variant:** Cursor pointer, hover con leve elevación (shadow SM→MD)

### Badges / Chips
- **Success:** Fondo `#ECFDF5`, texto `#047857`, radius full, padding `2px 8px`, weight 600, font-size 11px
- **Danger:** Fondo `#FEF2F2`, texto `#DC2626`
- **Warning:** Fondo `#FFFBEB`, texto `#D97706`
- **Primary (neutral brand):** Fondo `#ECFDF5`, texto `#065F46`

### Info Boxes
Contenedores de contexto informativo in-form. Cuatro variantes: `primary` (brand tint), `success`, `danger`, `warning`. Bordes izquierdos de 1px de color semántico. Padding `10px 14px`. Font-size 12–13px.

**The No-Side-Stripe Rule.** Las info boxes usan `border-left: 3px solid` solo cuando es parte de una convención establecida en el sistema. En cards, list items o alerts nuevos: borde completo o fondo tint, nunca stripe lateral como único elemento visual.

## 6. Do's and Don'ts

### Do:
- **Do** usar `.tabular` en todo valor COP, porcentaje en columna o contador. Sin excepción.
- **Do** mostrar la fecha de vencimiento, el saldo pendiente y la cuota mensual en el mismo componente de lista. El usuario no debería ir a otra pantalla para tomar una decisión de pago.
- **Do** usar Emerald Authority (`#047857`) para una sola cosa por pantalla: el botón primario o el estado activo. No ambos en el mismo foco visual.
- **Do** establecer dark mode con `[data-theme="dark"]` en `document.documentElement` al cargar, antes del primer render, para evitar el flash de tema claro.
- **Do** dejar que los números hablen. Un stat card de $2.514.386 no necesita ícono decorativo, gradiente de fondo ni ilustración. El número es el diseño.
- **Do** usar SweetAlert2 para todas las confirmaciones destructivas (eliminar cuenta, eliminar crédito, eliminar tarjeta) y para errores de servidor. Los errores de validación de campo van inline, debajo del campo.
- **Do** usar `aria-invalid`, `aria-describedby` y `htmlFor` en todos los campos de formulario. Las pantallas de auth y avances de tarjeta ya lo implementan; mantener la convención.

### Don't:
- **Don't** usar animaciones, ilustraciones, monedas, cerditos, estrellas, confeti, ni ningún elemento lúdico. Solventa trata al usuario como adulto que gestiona obligaciones reales, no como jugador de un sistema de recompensas.
- **Don't** usar gradientes morado-rosa, glassmorphism decorativo, big-number hero metrics con label genérico, eyebrows uppercase en cada sección de contenido. Esto es el AI slop que el sistema rechaza explícitamente.
- **Don't** usar fondo crema, arena, marfil, hueso ni ninguna variante cálido-neutral. El canvas es `#F8FAFC` (slate-50 frío) o `#0F172A` (slate-900 en dark). La calidez viene del verde, no del fondo.
- **Don't** anidar cards. Si el contenido dentro de una card necesita subdivisión, usar divisores y espaciado interno.
- **Don't** usar `border-left: 4px solid` como único elemento visual de diferenciación en un componente. Es el stripe lateral prohibido.
- **Don't** mezclar familias tipográficas. Si la jerarquía se siente plana, ajustar pesos y tamaños dentro de IBM Plex Sans, no agregar una segunda familia.
- **Don't** mostrar errores de formulario solo en la parte superior de la página. Cada error va inmediatamente debajo del campo que lo causó, con `form-error` (rojo, ícono AlertCircle 11px).
- **Don't** usar el fondo rojo sólido en botones destructivos en estado rest. El patrón es borde + texto rojo en rest, fondo tint rojo en hover. El rojo sólido solo en el `confirmButtonColor` del SweetAlert de confirmación.
- **Don't** mostrar decimales en valores COP si no son necesarios. `$2.514.386` no `$2.514.386,00`. El usuario colombiano no necesita los centavos en la mayoría de contextos.
- **Don't** referenciar Bancolombia, Nequi ni ninguna entidad financiera colombiana como referente visual positivo. Son anti-referencias explícitas: interfaces torpes, color corporativo forzado, formularios pesados.
