# PsychoCore — Prompts de Implementación por Fase

> **Archivos base obligatorios en TODOS los prompts:**
> - `src/theme.js`
> - `src/components/ui/index.jsx`
>
> Estos dos archivos son el sistema de diseño del proyecto. Sin ellos el modelo
> generará colores y componentes incorrectos.

---

## FASE 1 — Base sólida (Semana 1)
### Un solo prompt · 5 cambios en 4 archivos

---

### 📋 Prompt 1 — Fase 1 completa

**Archivos que debes adjuntar:**
- `src/theme.js` ← siempre obligatorio
- `src/components/ui/index.jsx` ← siempre obligatorio
- `src/modules/Sessions.jsx`
- `src/modules/Finance.jsx`
- `src/modules/Dashboard.jsx`

---

```
Eres un desarrollador senior React trabajando en PsychoCore, una PWA clínica
para psicólogos construida con React + Vite. El proyecto usa CSS-in-JS con un
objeto de tokens `T` importado desde `src/theme.js`. No usa Tailwind ni ningún
framework CSS externo. Los iconos son exclusivamente de lucide-react. Los
componentes base están en `src/components/ui/index.jsx`.

Reglas de entrega:
- Devuelve siempre el archivo COMPLETO modificado, nunca fragmentos ni "...resto
  igual".
- No cambies ninguna lógica de datos (Supabase, estados, props) que no esté
  explícitamente mencionada.
- No añadas dependencias npm nuevas.
- Mantén todos los comentarios de sección existentes.

Necesito que implementes los siguientes 5 cambios:

─────────────────────────────────────────
CAMBIO 1 — EmptyState con prop `action`
Archivo: src/components/ui/index.jsx
─────────────────────────────────────────
El componente `EmptyState` actualmente recibe: `icon`, `title`, `desc`.
Añade un cuarto prop opcional `action` (tipo ReactNode). Si se pasa, se renderiza
debajo de `desc` con un margen superior de 20px. Si no se pasa, el componente
debe comportarse exactamente igual que hoy. No rompas ningún uso existente.

─────────────────────────────────────────
CAMBIO 2 — Prefill de paciente en modal de sesión
Archivo: src/modules/Sessions.jsx
─────────────────────────────────────────
El componente ya recibe el prop `prefill` con la forma `{ patientId, date }`.
Revisa el código actual y confirma que cuando `prefill.patientId` tiene valor,
el `<Select>` de paciente en el formulario de nueva sesión quede preseleccionado
con ese `patientId` al montar el modal. Si ya funciona, déjalo. Si no, corrígelo
sin cambiar ninguna otra lógica.

Adicionalmente: cuando `prefill.patientId` tiene valor (es decir, se llegó con
contexto de una cita específica), el campo Select de paciente debe mostrarse como
texto de solo lectura (el nombre del paciente) en lugar de un dropdown editable.
Esto evita que el usuario cambie accidentalmente el paciente. Añade un pequeño
enlace "Cambiar" junto al nombre que restaure el Select editable si el usuario lo
necesita.

─────────────────────────────────────────
CAMBIO 3 — Botón "Cobrar" inline en cobros pendientes
Archivo: src/modules/Finance.jsx
─────────────────────────────────────────
En la sección donde se listan los pagos con `status === "pendiente"`, añade un
botón "Cobrar" al final de cada fila. Al hacer click, debe abrir el modal de
registro de pago existente con el `patientId` del pago ya cargado. Cuando el modal
se abre desde este botón, el campo de selección de paciente no debe mostrarse
(ya está implícito); en su lugar muestra el nombre del paciente como texto fijo
en la parte superior del modal con la etiqueta "Paciente".

─────────────────────────────────────────
CAMBIO 4 — Normalizar espaciado en Dashboard
Archivo: src/modules/Dashboard.jsx
─────────────────────────────────────────
Reemplaza los siguientes valores de margin/padding/gap que no pertenecen a la
escala de 4px del sistema (4, 8, 12, 16, 24, 32, 48):
- 7px → 8px
- 13px → 12px  
- 15px → 16px
- 18px → 16px  (en contextos de padding interior de cards)
- 22px → 24px
- 26px → 24px
Solo afecta valores de spacing. No cambies font-size, border-radius ni colores.

─────────────────────────────────────────
CAMBIO 5 — Feedback visual al generar PDF de recibo
Archivo: src/modules/Finance.jsx
─────────────────────────────────────────
Actualmente cuando se genera un recibo PDF se llama a `window.open()` y si el
navegador bloquea la ventana emergente aparece un `alert()` nativo del browser.

Reemplaza ese `alert()` por un mensaje de feedback inline. Implementa un estado
local `pdfMsg` (string | null) en el componente Finance. Cuando la generación
del PDF falla (window.open retorna null), muestra un div con fondo `T.warA`,
borde `T.war`, border-radius 10px, padding "10px 14px", que diga:
"Permite ventanas emergentes en tu navegador para exportar el PDF."
Este mensaje debe desaparecer automáticamente después de 5 segundos
(usa setTimeout + setNull). Cuando la generación es exitosa, muestra el mismo
div pero con fondo `T.sucA` y borde `T.suc` con el texto:
"Recibo abierto en nueva pestaña."
con el mismo auto-dismiss de 3 segundos. Posiciona este div justo arriba de la
lista de pagos, no en posición fixed.

─────────────────────────────────────────

Entrega los siguientes archivos completos en este orden:
1. src/components/ui/index.jsx
2. src/modules/Sessions.jsx
3. src/modules/Finance.jsx
4. src/modules/Dashboard.jsx
```

---

## FASE 2 — Densidad y flujos (Semana 2–3)
### Dividida en 3 prompts por tamaño de archivos

---

### 📋 Prompt 2A — Vista compacta + filtros de pacientes

**Archivos que debes adjuntar:**
- `src/theme.js` ← siempre obligatorio
- `src/components/ui/index.jsx` ← usa el entregado en el Prompt 1
- `src/modules/Patients.jsx`

> ⚠️ Patients.jsx es el archivo más largo del proyecto. Este prompt solo
> toca ese archivo para no saturar el contexto.

---

```
Eres un desarrollador senior React trabajando en PsychoCore, una PWA clínica
para psicólogos. CSS-in-JS con objeto `T` de theme.js. Sin Tailwind. Iconos
lucide-react. Componentes base en src/components/ui/index.jsx.

Reglas de entrega:
- Devuelve el archivo COMPLETO, nunca fragmentos.
- No cambies lógica de datos, Supabase ni props del componente.
- No añadas dependencias npm.

Necesito implementar 2 cambios en src/modules/Patients.jsx:

─────────────────────────────────────────
CAMBIO 1 — Vista compacta expandible (t6)
─────────────────────────────────────────
La lista de pacientes actualmente muestra cada paciente en una card extendida.
Transforma esta vista al siguiente patrón de "fila compacta + expansión progresiva":

Estado COLAPSADO (por defecto):
- Una sola fila por paciente con altura de ~56px
- Contenido visible: avatar con inicial del nombre (fondo T.pA, color T.p; si
  riesgo alto/inminente usar T.errA / T.err), nombre completo, diagnóstico
  principal (si existe, en texto T.tl tamaño 11.5px), cantidad de sesiones,
  estado (Badge semántico usando los colores de STATUS_CONFIG que ya existen),
  badge de saldo pendiente en T.warA/T.war si payments del paciente tienen
  status "pendiente", y un ChevronDown de 16px en T.tl al final de la fila.
- La fila entera es clickeable y hace toggle del estado expandido.
- Hover: background T.cardAlt con transición 150ms.
- Si el paciente tiene riesgo alto o inminente (según el último riskAssessment),
  el borde izquierdo de la fila es 3px solid T.err y el fondo tiene un tinte
  muy sutil de T.errA (opacity 0.03).

Estado EXPANDIDO:
- Se revela un bloque debajo de la fila (misma card, sin nueva navegación).
- El bloque muestra 3 mini-KPIs en fila: diagnóstico completo con código CIE-11,
  sesiones totales, último estado de ánimo (con el color semántico correspondiente
  de moodColor).
- Debajo de los KPIs: una fila de botones de acción contextuales:
  * "Ver expediente" (variante ghost) → navega al detalle existente del paciente
    (usa la lógica que ya existe para abrir el expediente completo)
  * "Nueva sesión" (variante primary) → debe llamar a la misma función que hoy
    llama el QuickBar, pasando el patientId
  * Si tiene saldo pendiente: "Registrar pago $XXX" (variante con fondo T.warA,
    color T.war) → abre el modal de pago con patientId precargado usando onQuickNav
- El ChevronDown rota 180° cuando está expandido (transition: transform 200ms).
- Mantén completamente intacta toda la lógica del expediente completo (el drawer
  o vista de detalle que ya existe). La vista compacta es solo una nueva capa
  encima de la lista; el detalle completo sigue existiendo y sigue siendo
  accesible desde el botón "Ver expediente".

─────────────────────────────────────────
CAMBIO 2 — Chips de filtro rápido (t7)
─────────────────────────────────────────
Añade una fila de chips pill encima de la lista de pacientes, justo debajo del
PageHeader y la barra de búsqueda existente. Los chips son:

- "Todos" → muestra todos
- "Activos (N)" → filtra status === "activo", N es el conteo dinámico
- "Con saldo (N)" → filtra pacientes que tengan al menos un pago con
  status "pendiente", N es el conteo
- "Riesgo alto (N)" → filtra pacientes cuyo último riskAssessment sea
  "alto" o "inminente", N es el conteo
- "Alta (N)" → filtra status === "alta"

Estilos del chip activo: fondo T.p, color "#fff", border none.
Estilos del chip inactivo: fondo T.cardAlt, color T.tm, border none.
Todos los chips: border-radius 9999px, padding "5px 14px", font-size 12.5px,
font-weight 600, font-family T.fB, cursor pointer, transition all 150ms.

El filtro de chips se combina con la búsqueda por texto existente (ambos pueden
estar activos simultáneamente — el chip filtra primero, luego la búsqueda filtra
dentro del resultado del chip).

Entrega: src/modules/Patients.jsx completo.
```

---

### 📋 Prompt 2B — KPI cards hover + Toast system

**Archivos que debes adjuntar:**
- `src/theme.js` ← siempre obligatorio
- `src/components/ui/index.jsx` ← usa el entregado en el Prompt 1
- `src/modules/Dashboard.jsx` ← usa el entregado en el Prompt 1
- `src/components/SyncToast.jsx`
- `src/lib/eventBus.js`

---

```
Eres un desarrollador senior React trabajando en PsychoCore, una PWA clínica
para psicólogos. CSS-in-JS con objeto `T` de theme.js. Sin Tailwind. Iconos
lucide-react.

Reglas de entrega:
- Devuelve cada archivo COMPLETO.
- No añadas dependencias npm.
- No cambies la API pública de SyncToast (los eventos sync:start/done/error
  del eventBus deben seguir funcionando igual).

─────────────────────────────────────────
CAMBIO 1 — Hover real en KpiCard (t8)
Archivo: src/modules/Dashboard.jsx
─────────────────────────────────────────
En el componente `KpiCard` dentro de Dashboard.jsx, el efecto de hover
(translateY -2px y shadow más profunda) actualmente está en los handlers
`onMouseEnter`/`onMouseLeave` del componente `<Card>`, pero los style overrides
en JS no están funcionando correctamente porque Card no reexpone esos eventos.

Solución: mueve el estado de hover (`const [hover, setHover] = useState(false)`)
al propio KpiCard, y aplica los `onMouseEnter`/`onMouseLeave` directamente sobre
el div wrapper más externo del Card, no sobre el componente Card en sí. Usa
inline styles con la lógica:
- Normal:  boxShadow T.sh,  transform "translateY(0)"
- Hover:   boxShadow T.shM, transform "translateY(-2px)"
Transición: "all 0.15s ease".
Aplica el mismo fix a `FinKpiCard`.

─────────────────────────────────────────
CAMBIO 2 — Toast system generalizado (t10)
Archivos: src/components/SyncToast.jsx + src/lib/eventBus.js
─────────────────────────────────────────
El eventBus actual tiene eventos: sync:start, sync:done, sync:error,
session:created, risk:elevated, task:assigned, payment:created.

Amplía el sistema para soportar toasts de propósito general:

En src/lib/eventBus.js:
- Añade al catálogo de eventos:
  `ui:toast  { message: string, type: "success"|"warn"|"error"|"info", duration?: number }`
- Añade al objeto `emit` el helper:
  `toast: (message, type = "success", duration = 3000) => bus.emit("ui:toast", { message, type, duration })`

En src/components/SyncToast.jsx:
- Renombra el componente a `AppToast` (actualiza el export default).
- Además de seguir escuchando sync:start/done/error como hasta ahora (sin
  cambiar ese comportamiento), añade un segundo stack de toasts para "ui:toast".
- Los toasts de ui:toast se muestran apilados encima del toast de sync, con
  gap de 8px entre ellos. Máximo 3 toasts visibles simultáneamente (si llegan
  más, descarta el más antiguo).
- Cada toast de ui:toast tiene:
  * success → fondo T.suc, texto "#fff"
  * warn    → fondo T.war, texto "#fff"
  * error   → fondo T.err, texto "#fff"
  * info    → fondo T.p,   texto "#fff"
  * Se auto-descarta según `duration` (default 3000ms).
  * Icono: ✓ para success, ! para warn/error, i para info (texto, no SVG).
- Exporta también el componente con el nombre `SyncToast` como alias para no
  romper el import en App.jsx:
  `export { AppToast as SyncToast };`
  `export default AppToast;`

Entrega en este orden:
1. src/lib/eventBus.js
2. src/components/SyncToast.jsx
3. src/modules/Dashboard.jsx
```

---

### 📋 Prompt 2C — Agenda: vista día con timeline

**Archivos que debes adjuntar:**
- `src/theme.js` ← siempre obligatorio
- `src/components/ui/index.jsx` ← usa el entregado en el Prompt 1
- `src/modules/Agenda.jsx`
- `src/lib/eventBus.js` ← usa el entregado en el Prompt 2B

> ⚠️ Agenda.jsx también es un archivo extenso. Este prompt es solo para
> ese módulo. Asegúrate de subir la versión de eventBus.js del Prompt 2B
> (que ya tiene el helper `emit.toast`).

---

```
Eres un desarrollador senior React trabajando en PsychoCore, una PWA clínica
para psicólogos. CSS-in-JS con objeto `T` de theme.js. Sin Tailwind. Iconos
lucide-react.

Reglas de entrega:
- Devuelve el archivo COMPLETO. Nunca fragmentos.
- No cambies la lógica del calendario mensual existente ni los modales de
  nueva cita/edición que ya funcionan.
- No añadas dependencias npm.

─────────────────────────────────────────
CAMBIO — Vista Día mejorada con timeline (t9)
Archivo: src/modules/Agenda.jsx
─────────────────────────────────────────
El módulo Agenda ya tiene una vista "Día" (DayView). Mejora esa vista de la
siguiente manera:

1. TIMELINE VERTICAL:
   Renderiza un eje de horas en el lado izquierdo (de 08:00 a 20:00, cada hora).
   Cada franja horaria es un div de altura fija (60px por hora). Las horas sin
   citas muestran el fondo T.cardAlt con muy baja opacidad (0.35). La hora
   actual (si el día seleccionado es hoy) tiene un marcador de línea roja
   horizontal con un círculo de 8px en el eje, igual que Google Calendar.

2. BLOQUES DE CITA:
   Cada cita del día se renderiza como un bloque posicionado en su hora
   correspondiente. El bloque muestra: hora de inicio, nombre del paciente
   (sin apellidos si es mobile), tipo de cita, y el Badge de status.
   El bloque tiene borde izquierdo de 4px con el color semántico del status
   (usa STATUS_CONFIG que ya existe en Agenda.jsx), border-radius 0 en el lado
   izquierdo y 8px en el derecho.

3. BOTÓN "INICIAR SESIÓN" EN CADA BLOQUE:
   Si la cita tiene status "pendiente" y su fecha es hoy, el bloque incluye
   un botón pequeño "Iniciar sesión" (variante ghost, tamaño small). Al hacer
   click, debe llamar al mismo handler que hoy usa el botón equivalente del
   Dashboard. Si el componente Agenda no recibe ese handler como prop hoy,
   usa `emit.toast("Abre el módulo de Sesiones para registrar esta nota", "info")`
   desde eventBus como fallback temporal, e imprime en console.warn un mensaje
   claro: "[Agenda] onStartSession prop no recibido — conectar desde App.jsx".
   No rompas nada si el prop no está disponible.

4. PRESERVAR VISTAS EXISTENTES:
   La vista mensual (calendario de cuadrícula) y la vista semanal (si existe)
   deben seguir funcionando exactamente igual. Solo estás mejorando la vista
   diaria.

Entrega: src/modules/Agenda.jsx completo.
```

---

## FASE 3 — Inteligencia clínica y lanzamiento (Semana 4–5)
### 4 prompts independientes, uno por tarea

---

### 📋 Prompt 3A — Stats: gráfica de adherencia

**Archivos que debes adjuntar:**
- `src/theme.js` ← siempre obligatorio
- `src/components/ui/index.jsx` ← usa el más reciente
- `src/modules/Stats.jsx`

---

```
Eres un desarrollador senior React trabajando en PsychoCore, una PWA clínica
para psicólogos. CSS-in-JS con objeto `T` de theme.js. Sin Tailwind. Iconos
lucide-react. El proyecto ya tiene recharts instalado.

Reglas de entrega:
- Devuelve el archivo COMPLETO.
- No añadas dependencias npm nuevas (recharts ya está instalado).
- Los colores en recharts deben ser hex fijos, nunca CSS vars
  (las CSS vars no funcionan en atributos SVG de recharts).

─────────────────────────────────────────
CAMBIO — Gráfica de adherencia por paciente (t11)
Archivo: src/modules/Stats.jsx
─────────────────────────────────────────
Añade una nueva sección en Stats.jsx llamada "Adherencia terapéutica" con dos
visualizaciones:

1. HEATMAP DE ASISTENCIA (SVG puro, sin recharts):
   - Muestra los últimos 12 meses en una cuadrícula de semanas.
   - Cada celda es un cuadrado de 14px con gap de 2px.
   - Colores por densidad de sesiones en esa semana:
     * 0 sesiones → T.bdrL (fondo neutro)
     * 1 sesión   → "#5DCAA5" (teal 40%)
     * 2 sesiones → "#1D9E75" (teal 60%)
     * 3+ sesiones → "#0F6E56" (teal 80%)
   - Etiquetas de mes encima de las columnas correspondientes.
   - Los datos vienen del prop `sessions` que ya recibe Stats.jsx.
   - En mobile (useIsMobile), reduce a 6 meses para que quepa.

2. LÍNEA DE PROGRESO TERAPÉUTICO (recharts AreaChart):
   - Eje X: últimas 10 sesiones del paciente seleccionado.
   - Eje Y: valor numérico del progreso (mapea: "mejora" → 3, "estable" → 2,
     "retroceso" → 1, sin datos → null).
   - Selector de paciente: un <Select> de los componentes UI existentes arriba
     del gráfico, que permite elegir cualquier paciente activo.
   - Si no hay paciente seleccionado, muestra EmptyState con mensaje
     "Selecciona un paciente para ver su progreso terapéutico".
   - Colores recharts (hex fijos): línea "#2D9B91", área fill "#2D9B91" con
     stopOpacity 0.15.
   - Tooltip custom con el mismo estilo que el ChartTooltip que ya existe
     en Dashboard.jsx (cópialo o reimpleméntalo localmente).

Posiciona la sección "Adherencia terapéutica" justo antes de la última sección
del módulo Stats (si hay una sección de "cierre" o resumen, esta va antes).
Si no hay una posición clara, añádela al final.

Entrega: src/modules/Stats.jsx completo.
```

---

### 📋 Prompt 3B — Dark mode: auditoría de contraste

**Archivos que debes adjuntar:**
- `src/theme.js` ← siempre obligatorio
- El archivo CSS global de variables (busca `index.css` o `global.css` o
  el archivo donde estén definidas las `--bg`, `--primary`, etc. como
  CSS custom properties)

> ⚠️ Para encontrar el archivo CSS correcto, busca en `src/` el archivo
> que contenga `:root {` y `[data-theme="dark"]` o
> `@media (prefers-color-scheme: dark)`.

---

```
Eres un desarrollador senior React trabajando en PsychoCore, una PWA clínica
para psicólogos. El sistema de colores usa CSS custom properties definidas en
un archivo CSS global, consumidas como `var(--bg)`, `var(--primary)`, etc.
El objeto `T` en theme.js es solo un mapeo de nombres semánticos a esas vars.

Reglas de entrega:
- Devuelve solo los archivos CSS modificados, completos.
- No toques theme.js (el mapeo de nombres es correcto).
- No toques ningún componente .jsx.
- Cada valor hex que propongas debe pasar ratio WCAG AA mínimo (4.5:1 para
  texto normal, 3:1 para texto grande y UI components).

─────────────────────────────────────────
CAMBIO — Dark mode: paleta desaturada correcta (t12)
─────────────────────────────────────────
Audita y corrige los valores del dark mode siguiendo estas reglas del sistema
de diseño de PsychoCore:

FONDOS (nunca negro puro):
- --bg (fondo base)       debe ser #0F1F1E
- --card (superficie)     debe ser #162524
- --card-alt (alternativa)debe ser #1E3130
- --nav (sidebar/topbar)  debe ser #0D1A19 (más oscuro que el fondo base)

TEXTOS (nunca blanco puro):
- --text (primario)       debe ser #EDF1F0
- --text-mid (secundario) debe ser #9BAFAD
- --text-light (terciario)debe ser #6A8A87

BORDES (muy sutiles):
- --border   debe ser rgba(255,255,255,0.12)
- --border-l debe ser rgba(255,255,255,0.07)

COLORES SEMÁNTICOS en dark — deben ser versiones desaturadas, nunca los mismos
hex que en light:
- --success en dark: #3d7a50 (verde más oscuro y menos saturado)
- --success-a en dark: rgba(61,122,80,0.18)
- --warn en dark: #a07d0a (ámbar más oscuro)
- --warn-a en dark: rgba(160,125,10,0.18)
- --error en dark: #a04545 (rojo más oscuro)
- --error-a en dark: rgba(160,69,69,0.18)
- --primary en dark: #4D8A8D (versión más clara del teal para contraste)
- --primary-l en dark: #5E9E9E
- --primary-a en dark: rgba(77,138,141,0.18)
- --accent en dark: #c47a4a (igual o muy similar al light, buen contraste)
- --accent-a en dark: rgba(196,122,74,0.18)

SOMBRAS en dark (reemplazar box-shadow por borders sutiles):
- --shadow   debe ser none (en dark mode las sombras se reemplazan por bordes)
- --shadow-m debe ser none

Verifica que cada cambio que hagas pase el test mental WCAG: texto --text sobre
fondo --card debe tener ratio > 7:1 (AAA), texto --text-mid sobre --card debe
tener > 4.5:1 (AA).

Entrega: el archivo CSS con las variables completo.
```

---

### 📋 Prompt 3C — Onboarding: deep-links a Settings

**Archivos que debes adjuntar:**
- `src/theme.js` ← siempre obligatorio
- `src/components/ui/index.jsx` ← usa el más reciente
- `src/modules/Dashboard.jsx` ← usa la versión más reciente (Prompt 1 o 2B)
- `src/modules/Settings.jsx`
- `src/App.jsx`

---

```
Eres un desarrollador senior React trabajando en PsychoCore, una PWA clínica
para psicólogos. CSS-in-JS con objeto `T` de theme.js. Sin Tailwind. Iconos
lucide-react.

Reglas de entrega:
- Devuelve cada archivo COMPLETO.
- No cambies la lógica de autenticación ni Supabase en App.jsx.
- No cambies ningún tab existente de Settings ni su contenido.

─────────────────────────────────────────
CAMBIO — Deep-links desde ProfileSetupBar a tabs de Settings (t13)
─────────────────────────────────────────
Contexto: En Dashboard.jsx existe el componente `ProfileSetupBar`. Cada ítem
incompleto tiene un botón "Configurar" que hoy llama a `onNavigate("settings")`
sin más contexto, llevando al usuario a la primera pestaña de Settings siempre.

El componente Settings actualmente tiene un estado `const [tab, setTab] = useState("profile")`.
Los tabs disponibles son: "profile", y otros que debes identificar en el código
que te adjunto.

Necesito tres cambios coordinados:

1. En src/modules/Settings.jsx:
   - Añade el prop `initialTab` (string, opcional, default "profile").
   - Usa `useState(initialTab || "profile")` en lugar del "profile" hardcodeado.
   - Identifica cuál tab contiene la foto de perfil, cuál la cédula, cuál los
     servicios y cuál el horario. Si alguno no existe como tab separado y está
     en el mismo tab "profile", está bien — el deep-link solo necesita llevar
     al tab correcto, no a un anchor específico dentro del tab.

2. En src/App.jsx:
   - El case "settings" en el renderModule actualmente renderiza:
     `<Settings {...props} />`
   - Modifícalo para que acepte un parámetro adicional en `openAction`:
     `openAction?.module === "settings" && openAction?.tab`
   - Pasa ese tab como prop: `<Settings {...props} initialTab={openAction?.tab || "profile"} />`
   - La función `quickNav` ya recibe `(mod, action)`. Añade soporte para un tercer
     parámetro: `quickNav(mod, action, tab)` que guarde `tab` en el openAction state.
     Si no se pasa tab, behavior actual sin cambios.

3. En src/modules/Dashboard.jsx, en el componente `ProfileSetupBar`:
   - Cada ítem tiene un botón "Configurar" que llama a `onNavigate("settings")`.
   - El componente `ProfileSetupBar` recibe `onNavigate` como prop.
   - Cambia `onNavigate` por `onQuickNav` en ProfileSetupBar (si no lo recibe ya),
     o añade un segundo prop `onSettingsDeepLink` con firma
     `(tab: string) => void`.
   - Mapea cada ítem a su tab correspondiente:
     * "photo"    → tab "profile"
     * "cedula"   → tab "profile"  
     * "services" → identifica el tab correcto leyendo Settings.jsx
     * "schedule" → identifica el tab correcto leyendo Settings.jsx
   - El botón "Configurar" de cada ítem debe llamar al deep-link con el tab
     correspondiente en lugar del navigate genérico.

Entrega en este orden:
1. src/modules/Settings.jsx
2. src/App.jsx
3. src/modules/Dashboard.jsx
```

---

### 📋 Prompt 3D — Mobile audit: revisión de viewport 390px

**⚠️ Este prompt se ejecuta en múltiples partes. Empieza por los módulos
con más uso diario y avanza de a uno.**

**Archivos para la primera ejecución:**
- `src/theme.js` ← siempre obligatorio
- `src/components/ui/index.jsx` ← usa el más reciente
- `src/modules/Dashboard.jsx` ← más reciente
- `src/modules/Patients.jsx` ← más reciente (Prompt 2A)
- `src/modules/Finance.jsx` ← más reciente (Prompt 1)

**Si los archivos son muy largos, divide en dos conversaciones:**
- Conversación 3D-1: Dashboard + Finance
- Conversación 3D-2: Patients + Sessions + Agenda

---

```
Eres un desarrollador senior React trabajando en PsychoCore, una PWA clínica
para psicólogos. CSS-in-JS con objeto `T` de theme.js. Sin Tailwind. Iconos
lucide-react. El proyecto es mobile-first y el psicólogo trabaja desde su
teléfono (viewport típico: 390px ancho).

Reglas de entrega:
- Devuelve cada archivo COMPLETO.
- Solo corriges problemas de layout en mobile. No cambies lógica, no cambies
  colores, no cambies tamaños de fuente salvo que sean ilegibles en mobile.
- Si un problema no afecta mobile, no lo toques.

─────────────────────────────────────────
AUDITORÍA MOBILE — viewport 390px (t14)
─────────────────────────────────────────
Para cada archivo adjunto, identifica y corrige los siguientes patrones
problemáticos en pantallas de 390px de ancho:

1. GRIDS DE 4 COLUMNAS que no colapsan:
   Cualquier `gridTemplateColumns: "repeat(4, 1fr)"` fijo debe convertirse a
   `gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)"`.
   El hook `useIsMobile()` ya está importado en todos los módulos.

2. TABLAS SIN OVERFLOW:
   Cualquier `<table>` o estructura de columnas múltiples que no tenga un
   wrapper con `overflowX: "auto"` debe recibirlo. El wrapper debe tener
   `-webkit-overflow-scrolling: "touch"`.

3. MODALES SIN ALTURA MÁXIMA CORRECTA:
   El componente `<Modal>` en ui/index.jsx ya tiene `maxHeight: "90vh"` y
   `overflowY: "auto"`. Verifica que ningún modal custom (divs con position
   fixed que actúen como modal) en los módulos adjuntos exceda la pantalla.
   Si alguno no tiene `maxHeight`, añádele `maxHeight: "90vh", overflowY: "auto"`.

4. TEXTOS QUE SE CORTAN (overflow: hidden sin ellipsis):
   Cualquier div con `overflow: "hidden"` y texto largo que no tenga
   `textOverflow: "ellipsis"` y `whiteSpace: "nowrap"` debe recibirlos.
   Solo aplica si el div tiene ancho fijo o `flex: 1` (puede crecer).

5. BOTONES CON TEXTO QUE SE DESBORDA:
   En mobile, filas de múltiples botones deben poder hacer `flexWrap: "wrap"`.
   Si ves una fila de botones con `display: "flex"` sin `flexWrap`, añade
   `flexWrap: "wrap"` y ajusta el gap a 8px si era mayor.

6. PAGEHEADER CON ACCIONES QUE SE SOLAPAN:
   El componente PageHeader tiene un prop `action` que puede tener varios
   botones. En mobile con nombre de módulo largo, el título y los botones
   se solapan. Verifica que el PageHeader existente en ui/index.jsx ya tenga
   `flexWrap: "wrap"` en el contenedor principal. Si no lo tiene, añádelo.

Para cada corrección que hagas, añade un comentario de una línea justo encima
del cambio con el formato: `// [mobile-audit] descripción del fix`
Esto facilita hacer diff en GitHub y ver exactamente qué se cambió.

Entrega los archivos en el mismo orden en que te los adjunté.
```

---

## Referencia rápida de archivos por prompt

| Prompt | Archivos a adjuntar | Archivos que entrega |
|--------|--------------------|--------------------|
| **1** (Fase 1) | theme.js · ui/index.jsx · Sessions.jsx · Finance.jsx · Dashboard.jsx | ui/index.jsx · Sessions.jsx · Finance.jsx · Dashboard.jsx |
| **2A** (Pacientes) | theme.js · ui/index.jsx¹ · Patients.jsx | Patients.jsx |
| **2B** (KPI + Toast) | theme.js · ui/index.jsx¹ · Dashboard.jsx¹ · SyncToast.jsx · eventBus.js | eventBus.js · SyncToast.jsx · Dashboard.jsx |
| **2C** (Agenda) | theme.js · ui/index.jsx¹ · Agenda.jsx · eventBus.js² | Agenda.jsx |
| **3A** (Stats) | theme.js · ui/index.jsx² · Stats.jsx | Stats.jsx |
| **3B** (Dark mode) | theme.js · archivo CSS con variables | archivo CSS |
| **3C** (Onboarding) | theme.js · ui/index.jsx² · Dashboard.jsx² · Settings.jsx · App.jsx | Settings.jsx · App.jsx · Dashboard.jsx |
| **3D** (Mobile) | theme.js · ui/index.jsx² · módulos seleccionados | módulos corregidos |

> ¹ Versión entregada en el Prompt 1
> ² Versión más reciente disponible

---

*Generado como parte de la auditoría de diseño PsychoCore · Marzo 2026*
