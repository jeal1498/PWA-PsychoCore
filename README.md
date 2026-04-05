# PsychoCore — Sistema de Gestión Clínica para Psicólogos

> **PWA progresiva, offline-first, construida con React + Vite + Supabase.**  
> Centraliza la gestión de pacientes, sesiones, escalas clínicas, planes de tratamiento, finanzas y tareas terapéuticas en una sola aplicación instalable desde el navegador.

---

## Descripción

Los psicólogos clínicos en consulta privada operan con herramientas fragmentadas: agendas físicas, hojas de cálculo, formularios de papel y aplicaciones genéricas que no contemplan el flujo clínico real. PsychoCore resuelve esto ofreciendo un entorno integrado donde el profesional puede gestionar toda su práctica —desde la primera cita hasta el alta— con datos cifrados en la nube y acceso desde cualquier dispositivo.

El paciente tiene también acceso a un **portal propio** (sin registro) donde puede consultar sus citas, firmar el consentimiento informado y responder tareas terapéuticas asignadas por su psicólogo, directamente desde WhatsApp.

---

## Características principales

### Dashboard
- KPIs en tiempo real: pacientes activos, sesiones del mes, ingresos y alertas de riesgo.
- Gráficas de tendencia de los últimos 6 meses (ingresos + sesiones) via Recharts.
- **Alerta de saldo pendiente**: bandera automática al inicio de la jornada con el total de pacientes y monto por cobrar.
- **Barra de progreso de configuración**: guía visual del perfil incompleto (foto, cédula, servicios, tarifas) con acceso rápido a cada sección.
- **Onboarding para usuarios nuevos**: flujo de bienvenida que desaparece una vez completados los pasos esenciales.
- Contador reactivo de tareas terapéuticas pendientes de revisión.
- Proyección de ingresos a 30 días basada en citas agendadas y tarifas configuradas.

### Gestión clínica
- **Expedientes de pacientes** con datos demográficos, motivo de consulta, estado clínico e historial completo.
- **Anamnesis clínica** estructurada en 4 secciones (primera impresión, antecedentes personales, antecedentes familiares, contexto actual) con badge de completitud y soporte para reingreso.
- **Flujo de reingreso (Readmission)**: reactiva un expediente dado de alta, registra la fecha de reingreso y genera un nuevo ciclo de anamnesis sin perder el historial previo; incluye renovación de consentimiento informado.
- **Agenda** con vista mensual/semanal, gestión de citas (fecha, hora, modalidad, estado) y routing inteligente hacia el registro de sesión.
- **Registro de sesiones** con notas clínicas, estado de ánimo, duración y prefill automático desde la agenda. Incluye modal de Protocolo de Admisión para primera cita.
- **Planes de tratamiento** con formulación biopsicosocial, objetivos terapéuticos y seguimiento de progreso.
- **Evaluación de riesgo** (suicidio/autolesión) con sugerencia automática de nivel y plan de seguridad exportable a PDF.
- **Escalas clínicas estandarizadas**: PHQ-9, GAD-7 y otras, con historial de puntuaciones y detección de tendencias.
- **Registros entre sesiones** (inter-sessions): autorregistros de estado emocional enviados por el paciente.
- **Consentimiento informado** digital con firma en canvas, almacenamiento por secciones y flujo de renovación en reingreso.
- **Reportes clínicos** generables en PDF: evaluación inicial, evolución terapéutica y alta clínica.

### Finanzas
- Registro de pagos con folio automático `YYYY-MM-NNNN` y recibo exportable a PDF/imagen.
- **Registro de gastos** categorizado (renta, servicios, materiales, software, formación, publicidad, honorarios, otros) con filtro por período.
- **Catálogo de servicios** con precios por modalidad (presencial/remoto) e historial de cambios de tarifa.
- Dashboard financiero con ingresos por período (mes/trimestre/año) y desglose de gastos.
- **4 reportes financieros exportables a PDF:**
  - **R1 — Ingresos por período**: detalle de pagos recibidos en el rango seleccionado.
  - **R2 — Ranking de ingresos**: top 10 por paciente o por servicio en el año.
  - **R3 — Balance ingresos vs. gastos**: comparativo por período con saldo neto.
  - **R4 — Proyección de ingresos**: estimación basada en citas agendadas y tarifas configuradas.

### Tareas terapéuticas
- Biblioteca de plantillas categorizadas (mindfulness, psicoeducación, registros conductuales, etc.).
- Asignación a paciente con enlace directo vía **WhatsApp**.
- Seguimiento de estado: pendiente → completado, con respuestas visibles en el módulo.

### Portal del paciente (`/p`)
- Acceso sin cuenta, solo con número de teléfono.
- Vista de citas próximas, tareas pendientes y consentimiento informado.
- Firma digital del consentimiento (canvas) con persistencia en Supabase.
- Envío de respuestas a tareas con formulario interactivo.

### UX y rendimiento
- Modo claro / oscuro / automático (detecta preferencia del sistema operativo).
- Instalable como PWA (Android, iOS, escritorio) con service worker Workbox.
- Lazy loading por módulo — solo descarga el código cuando el usuario abre ese módulo.
- Búsqueda global (`GlobalSearch`) entre pacientes, sesiones y citas.
- Notificaciones internas con campana y contadores reactivos vía `eventBus`.

### Autenticación y datos
- **Google OAuth** via Supabase Auth (flujo completo con redirect).
- Todos los datos almacenados en **Supabase** con Row Level Security por usuario.
- Modelo de acceso: trial de 30 días → suscripción activa.
- Pantalla de bloqueo (`LockScreen`) mientras la sesión no está confirmada.

---

## Requisitos previos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| **Node.js** | 18 LTS | Requerido para Vite y el build |
| **npm** | 9+ | Incluido con Node 18 |
| **Cuenta Supabase** | — | Proyecto con Auth (Google) habilitado y tablas creadas |
| **Cuenta Google OAuth** | — | Credenciales configuradas en Supabase Auth |

> **Variables de entorno necesarias** (crear `.env.local` en la raíz):
>
> ```env
> VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
> VITE_SUPABASE_ANON_KEY=<tu-anon-key>
> ```
> Sin estas variables el proyecto caerá a los valores hardcodeados del proyecto de desarrollo.

---

## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/jeal1498/psychocore.git
cd psychocore

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local   # editar con tus credenciales de Supabase

# 4. Levantar servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

```bash
# Build de producción
npm run build

# Previsualizar el build localmente
npm run preview
```

> **Despliegue en Vercel:** el repositorio incluye `vercel.json` preconfigurado con rewrite de rutas SPA. Basta conectar el repo en Vercel y agregar las variables de entorno en el dashboard.

---

## Estructura de archivos

```
psychocore/
├── public/
│   ├── icons/               # Iconos PWA (192×192, 512×512)
│   ├── favicon.svg
│   ├── privacidad.html      # Página de Política de Privacidad (estática)
│   └── terminos.html        # Términos y Condiciones (estática)
│
├── scripts/
│   └── generate-icons.mjs   # Script para regenerar los iconos PWA
│
├── src/
│   ├── main.jsx             # Punto de entrada — monta App y registra el SW
│   ├── App.jsx              # Shell: auth, navegación, tema, lazy routing
│   ├── theme.js             # Design tokens (CSS custom properties → JS)
│   ├── utils.js             # Helpers de fecha, formato y uid
│   ├── sampleData.js        # Perfil por defecto para onboarding
│   │
│   ├── context/
│   │   └── AppStateContext.jsx  # Proveedor global de datos (Supabase → React state)
│   │
│   ├── hooks/
│   │   ├── useSupabaseStorage.js  # Hook genérico: leer/escribir colección en Supabase
│   │   ├── useIsMobile.js         # Detecta viewport móvil
│   │   └── useNotifications.js    # Lógica de notificaciones internas
│   │
│   ├── lib/
│   │   ├── supabase.js        # Cliente Supabase, Auth helpers, CRUD de tareas y portal
│   │   ├── taskTemplates.js   # Biblioteca de plantillas de tareas terapéuticas
│   │   └── eventBus.js        # Bus de eventos (emit/on) para comunicación entre módulos
│   │
│   ├── utils/
│   │   └── pdfUtils.js        # Generación de PDFs vía window.print + HTML dinámico
│   │
│   ├── components/
│   │   ├── ui/                # Componentes base reutilizables (Card, Modal, Btn, Badge…)
│   │   ├── Sidebar.jsx        # Navegación principal lateral
│   │   ├── GlobalSearch.jsx   # Búsqueda global entre entidades
│   │   ├── LockScreen.jsx     # Pantalla de carga/bloqueo pre-auth
│   │   ├── Onboarding.jsx     # Flujo de bienvenida para usuarios nuevos
│   │   ├── NotificationBell.jsx
│   │   └── SyncToast.jsx      # Toast de estado de sincronización
│   │
│   └── modules/               # Vistas principales (lazy-loaded)
│       ├── Dashboard.jsx
│       ├── Patients.jsx
│       ├── Agenda.jsx
│       ├── Sessions.jsx
│       ├── InterSessions.jsx
│       ├── RiskAssessment.jsx
│       ├── Scales.jsx
│       ├── TreatmentPlan.jsx
│       ├── Consent.jsx
│       ├── Reports.jsx
│       ├── Tasks.jsx
│       ├── PatientPortal.jsx
│       ├── Finance.jsx
│       ├── Stats.jsx
│       └── Settings.jsx
│
├── index.html
├── vite.config.js             # Vite + PWA plugin + code splitting por módulo
├── vercel.json                # Rewrite SPA para Vercel
└── package.json
```

---

## Módulos — Desglose detallado

Cada módulo se carga de forma lazy desde el sidebar. A continuación se documenta el contenido, botones, modales y flujos de cada uno.

---

### Navegación principal (Sidebar)

El sidebar agrupa los módulos en tres secciones:

**Clínica diaria**
- Inicio → `Dashboard`
- Agenda → `Agenda`
- Sesiones → `Sessions`
- Pacientes → `Patients`

**Herramientas clínicas**
- Riesgo *(con indicador de alerta)* → `RiskAssessment`
- Tratamiento → `TreatmentPlan`
- Escalas → `Scales`
- Tareas → `Tasks`

**Gestión**
- Finanzas → `Finance`
- Informes → `Reports`
- Estadísticas → `Stats`

Parte inferior fija: acceso a `Settings` y botón de **Cerrar sesión**.

---

### Dashboard (`Dashboard.jsx`)

Panel de control con KPIs y accesos rápidos al inicio del día.

**Secciones principales**

- **KPIs superiores**: pacientes activos, sesiones del mes, ingresos del mes, alertas de riesgo activas.
- **Alerta de saldo pendiente**: card colapsable que lista los pacientes con saldo por cobrar y el total acumulado.
- **Barra de configuración de perfil**: barra de progreso con los pasos incompletos (foto, cédula, servicios, tarifas). Cada paso tiene un botón **Configurar** que navega directamente a la pestaña correspondiente en `Settings`.
- **Cita próxima**: card con la próxima cita del día y botón **Iniciar sesión** que navega a `Sessions` con prefill.
- **Alertas de riesgo**: lista de pacientes con nivel de riesgo activo y acceso directo a su evaluación en `RiskAssessment`.
- **Pacientes sin sesión reciente**: lista de pacientes con más de N días sin contacto.
- **Onboarding** *(usuarios nuevos)*: tarjetas de pasos con botón de navegación a cada módulo correspondiente.

**Barra de acciones rápidas (QuickBar — móvil)**

| Botón | Destino / Acción |
|---|---|
| Nuevo Paciente | Abre `Patients` con modal de nuevo expediente |
| Agendar Cita | Abre `Agenda` con modal de nueva cita |
| Registrar Pago | Abre `Finance` con modal de nuevo pago |
| Reporte Mensual | Navega a `Reports` |

**Panel lateral de acciones rápidas (QuickSidebar — escritorio)**

| Botón | Destino / Acción |
|---|---|
| Nueva nota clínica | Dispara flujo de nueva sesión en `Sessions` |
| Agendar cita | Abre `Agenda` en modal de nueva cita |
| Registrar pago | Abre `Finance` en modal de nuevo pago |
| Nuevo paciente | Abre `Patients` en modal de nuevo expediente |

**Flujos de navegación desde cards**

- Clic en **Ver evaluaciones** → navega a `RiskAssessment`
- Clic en paciente en riesgo → navega a `RiskAssessment` con paciente seleccionado
- Clic en paciente ausente → navega a `Patients` con expediente abierto
- Clic en **Agendar cita** *(estado vacío)* → navega a `Agenda`
- Clic en **Ver agenda** → navega a `Agenda`
- Clic en **Iniciar sesión** sobre cita → navega a `Sessions` con prefill de datos de la cita
- Clic en **Ver tareas** → navega a `Tasks`

---

### Pacientes (`Patients.jsx`)

Gestión completa de expedientes clínicos.

**Vista de lista**

Filtros rápidos por chip: Todos · Activos · Riesgo · Con saldo · Alta.

| Botón / Acción | Flujo |
|---|---|
| **+ Nuevo paciente** (ícono o FAB) | Abre `PrimerContactoModal` — formulario de primer contacto |
| Clic en fila de paciente | Abre panel de detalle del expediente |
| Clic en ícono sesión (fila) | Abre detalle del paciente directo en pestaña **Sesiones** |
| Clic en ícono pago (fila, escritorio) | Abre detalle del paciente directo en pestaña **Pagos** |

**Panel de detalle del expediente**

Pestañas internas del expediente:

| Pestaña | Contenido |
|---|---|
| **Anamnesis** ✅/🟠 | Formulario de 4 secciones clínicas con badge de completitud |
| **Sesiones (N)** | Historial de sesiones del paciente |
| **Pagos (N)** | Historial de pagos del paciente |
| **Progreso** | Gráficas de evolución clínica |
| **Contactos (N)** | Registros de contacto entre sesiones (`InterSessions`) |
| **Medicación (N activos)** | Medicación activa registrada |
| **Tareas** | Tareas terapéuticas asignadas al paciente |

Botones del panel de detalle:

| Botón | Flujo |
|---|---|
| **←** (cerrar) | Regresa a la lista de pacientes |
| **Exportar expediente** | Genera PDF del expediente completo |
| **Ver sesiones** | Navega a `Sessions` filtrado por el paciente |
| **Dar de alta** | Abre `DischargeProtocolModal` |
| **Reingreso** *(paciente en alta)* | Abre `ReingresoModal` |
| **Editar** | Abre modal de edición del expediente completo |
| **Nuevo diagnóstico** | Abre modal de agregar diagnóstico CIE-11 |

**Modales**

| Modal | Descripción | Botones |
|---|---|---|
| `PrimerContactoModal` | Formulario de primer contacto: nombre, teléfono, motivo, fecha tentativa de cita. Detecta duplicados por nombre/teléfono. | Guardar → crea expediente y puede navegar al duplicado · Cancelar |
| `Modal — Expediente completo` | Formulario completo: datos demográficos, diagnóstico CIE-11, tarifa, contacto de emergencia, tipo de terapia (individual/pareja/grupo). | Guardar · Cancelar |
| `DischargeProtocolModal` | Protocolo de alta: condiciones de cierre, sesiones realizadas, resumen. | Confirmar alta → dispara `WaAltaModal` · Cancelar |
| `WaAltaModal` | Genera mensaje de WhatsApp con resumen del alta para enviar al paciente. | Enviar por WhatsApp · Cerrar |
| `ReingresoModal` | Opciones de reingreso: con o sin nueva anamnesis, renovación de consentimiento. | Confirmar reingreso → reactiva expediente · Cancelar |
| `ConsentRenewalModal` | Alerta de consentimiento vencido (más de 12 meses). | Ir a consentimiento → navega a `Consent` · Recordar después |
| `Modal — Ver respuesta de tarea` | Muestra la respuesta enviada por el paciente a una tarea asignada. | Cerrar |

---

### Agenda (`Agenda.jsx`)

Calendario de citas con vistas mensual, semanal y diaria.

**Vistas disponibles** (botones en header): Mes · Semana · Día

**Botones principales**

| Botón | Flujo |
|---|---|
| **+ Nueva cita** | Abre modal de nueva cita |
| **Nuevo paciente con pre-cita** | Abre `PrimerContactoModal` desde `Patients` con flujo de cita incluido |
| **◀ / ▶** | Navega entre períodos del calendario |
| **Hoy** | Salta al día actual |

**En la vista de día — sobre cada cita**

| Botón / Acción | Flujo |
|---|---|
| Clic en cita | Abre modal de edición/detalle rápido de la cita |
| **Iniciar sesión** | Lanza protocolo de admisión o resumen dinámico → navega a `Sessions` con prefill |
| **Cambiar estado** | Abre `Modal de cambio de estado` |
| **Eliminar** | Abre modal de confirmación de eliminación |
| **Recordatorio enviado** | Marca la cita como recordatorio enviado (ícono campana) |

**Modales**

| Modal | Descripción | Botones |
|---|---|---|
| `Modal — Nueva / editar cita` | Selector de paciente (o nuevo paciente en línea), fecha, hora, modalidad (presencial/virtual — selector emergente), notas. Opción de **cita recurrente** con frecuencia y número de ocurrencias. Detecta conflictos de horario. | Guardar · Cancelar |
| `Modal de modalidad` | Picker emergente dentro del formulario de cita: presencial / virtual. | Selección directa |
| `Modal de recurrencia` | Controles para frecuencia (semanal/quincenal/mensual) y cantidad de ocurrencias (mín 2, máx 52). | Dentro del modal de cita |
| `Modal de cambio de estado / cancelación` | Cambia el estado de la cita (confirmada, cancelada, no-show, reprogramada). Si se cancela, permite reagendar con nueva fecha. | Guardar · Cancelar |
| `Modal de eliminación de serie` | Al eliminar una cita recurrente: opción de eliminar solo esta instancia o toda la serie. | Eliminar esta cita · Eliminar toda la serie · Cancelar |
| `DynamicSummary` | Para paciente con sesiones previas: resumen rápido de historial clínico antes de iniciar la sesión. | Continuar a sesión · Cerrar |
| `Modal — Protocolo de Admisión` | Para primera cita: captura datos básicos del protocolo de admisión antes de abrir la nota. Botón para completar anamnesis. | Completar anamnesis → navega a `Patients/Anamnesis` · Iniciar sesión de todas formas · Cancelar |

---

### Sesiones (`Sessions.jsx`)

Registro de notas clínicas de cada sesión.

**Vista de lista**

Listado cronológico de sesiones con nombre del paciente, fecha, estado de ánimo y acciones.

| Botón | Flujo |
|---|---|
| **+ Nueva nota** | Abre modal de nueva sesión (puede tener prefill desde `Agenda`) |
| **Exportar** *(ícono sobre sesión)* | Menú con opciones: exportar a PDF |
| Clic en sesión | Abre el detalle / edición de esa sesión |

**Modal — Nueva / editar nota clínica**

Campos del formulario: paciente (con lock si viene desde `Agenda`), fecha, duración, estado de ánimo, notas clínicas, notas privadas, tareas asignadas en esta sesión, sección de riesgo rápido colapsable.

Botones y acciones dentro del modal:

| Botón / Acción | Flujo |
|---|---|
| **Borrador guardado** *(banner)* | Ofrece restaurar o descartar el borrador guardado automáticamente en `localStorage` |
| **Cambiar paciente** *(cuando viene con lock)* | Desbloquea el selector de paciente |
| **Ver respuesta de tarea** *(sobre tarea asignada)* | Abre `TaskResponseModal` con la respuesta del paciente |
| **Usar plantilla** | Abre selector de plantillas de notas clínicas |
| **Resumen IA** | Llama a la API de IA, muestra `Modal de resumen IA`; permite insertar el resumen en notas privadas o copiarlo al portapapeles |
| **▼ Riesgo rápido** | Expande sección con checkboxes de ideación suicida, autolesión, riesgo a otros. Si se activan, ofrece **iniciar evaluación formal** → abre `Safety Plan Wizard` |
| **Imprimir consentimiento** | Genera PDF del consentimiento del paciente |
| **Guardar** | Guarda la sesión. Si hay monto pendiente, lanza `Modal de cobro post-sesión` |
| **Cancelar** | Abre `Modal de confirmación de cierre` si hay cambios sin guardar |

**Modales secundarios**

| Modal | Descripción | Botones |
|---|---|---|
| `Safety Plan Wizard` | Asistente paso a paso para crear el plan de seguridad: factores de riesgo, señales de alerta, estrategias de afrontamiento, contactos de emergencia. | Continuar → · ← Volver · Imprimir plan · Guardar y cerrar |
| `Modal de cobro post-sesión` | Registra el pago de la sesión recién guardada. Selector de servicio, monto, método de pago, modalidad (picker emergente). | Registrar pago · Omitir (dejar pendiente) |
| `Modal de resumen IA` | Muestra el texto generado por la IA con el resumen de la sesión. | Insertar en notas privadas · Copiar · Cerrar |
| `Modal de confirmación de cierre` | Aparece al cerrar el modal con cambios sin guardar. | Descartar cambios · Seguir editando |
| `TaskResponseModal` | Muestra la respuesta completa del paciente a una tarea asignada. | Cerrar |

---

### Evaluación de riesgo (`RiskAssessment.jsx`)

Módulo de evaluación de riesgo suicida y de autolesión.

**Vista de lista**

Pestañas: **Lista** (todas las evaluaciones) · **Por paciente**.

Filtros por nivel de riesgo: Todos · Bajo · Moderado · Alto · Severo.

| Botón | Flujo |
|---|---|
| **+ Nueva evaluación** | Abre `AssessmentForm` en modal |
| Clic en evaluación | Expande el detalle de esa evaluación |
| **Borrar** *(sobre evaluación)* | Abre confirmación de eliminación |

**Modal — AssessmentForm**

Asistente de evaluación en pasos: datos del paciente, factores de riesgo (checkboxes), factores protectores, nivel de riesgo sugerido automáticamente (editable), plan de seguridad narrativo.

| Botón | Flujo |
|---|---|
| **Continuar →** | Avanza al siguiente paso (deshabilitado si no se cumplen campos requeridos) |
| **← Volver** | Retrocede al paso anterior (en paso 0 cierra el modal) |
| **Guardar** *(último paso)* | Guarda la evaluación |
| **Cancelar / Cerrar** | Cierra el modal |

---

### Escalas clínicas (`Scales.jsx`)

Aplicación y seguimiento de escalas psicométricas estandarizadas.

**Escalas disponibles**: PHQ-9 · GAD-7 · BAI · PCL-5 · DASS-21 · ASRS · ISI · AUDIT · ORS · SRS

**Vista principal**

Pestañas: **Resultados** (historial global) · **Por paciente** (agrupado por expediente).

| Botón | Flujo |
|---|---|
| **+ Aplicar escala** | Abre `AssessmentForm` en modal |
| Filtro por escala | Chips de filtrado rápido por tipo de escala |
| **Ver todas** / **Ver menos** | Expande o colapsa la lista completa de escalas disponibles |
| Clic en paciente/resultado | Expande el historial de puntuaciones con sparkline |

**Modal — Aplicar escala**

Asistente por pasos: selección de escala, selección de paciente, respuestas a los ítems (botones de opción por ítem), revisión de puntuación y nivel de severidad calculado automáticamente.

| Botón | Flujo |
|---|---|
| **Continuar →** | Avanza al siguiente paso (requiere paciente seleccionado y respuestas completas) |
| **← Volver / Cancelar** | Retrocede o cierra el modal |
| **Guardar** *(último paso)* | Registra el resultado en el historial |

---

### Plan de tratamiento (`TreatmentPlan.jsx`)

Formulación biopsicosocial, objetivos terapéuticos y cierre clínico.

**Vista de lista**

Tarjetas de planes por paciente con estado (en proceso / completado) y fecha.

Filtros por estado: Todos · En proceso · Completado.

| Botón | Flujo |
|---|---|
| **+ Nuevo plan** | Abre modal de nuevo plan |
| Clic en tarjeta de plan | Abre el detalle/editor del plan |

**Modal — Nuevo plan**

Campos: paciente, fecha de inicio, modalidad, motivo de consulta, enfoque terapéutico.

**Vista de detalle del plan**

Pestañas internas:

| Pestaña | Contenido |
|---|---|
| **Objetivos (N)** | Lista de objetivos terapéuticos con estado (pendiente / en proceso / logrado / abandonado) |
| **Alta terapéutica** | Formulario y flujo de cierre del proceso |

**En pestaña Objetivos**

| Botón / Acción | Flujo |
|---|---|
| **+ Agregar objetivo** | Abre formulario inline de nuevo objetivo |
| Clic en objetivo | Expande detalle / edición del objetivo |
| **Registrar revisión** | Actualiza la fecha de última revisión al día actual |
| **Cancelar** *(objetivo nuevo)* | Descarta el formulario inline |

La formulación biopsicosocial (factores predisponentes, precipitantes, perpetuantes y protectores) se edita directamente en el cuerpo del plan con áreas de texto por sección.

**En pestaña Alta terapéutica**

| Botón | Flujo |
|---|---|
| Generar seguimientos a 3 / 6 / 12 meses | Crea citas de seguimiento en `Agenda` automáticamente |
| **Registrar alta + Imprimir PDF** | Marca el plan como completado y genera el PDF de alta terapéutica |

---

### Consentimiento informado (`Consent.jsx`)

Gestión del consentimiento informado digital con firma en canvas.

**Vistas del módulo**

El módulo opera con tres modos según el estado del paciente:

| Modo | Descripción |
|---|---|
| **Vista** | Muestra el consentimiento firmado, secciones en acordeón colapsable |
| **Edición** | Edita el texto de cada sección del consentimiento |
| **Firma** | Canvas de firma táctil/ratón |

**Botones**

| Botón | Flujo |
|---|---|
| **Imprimir / PDF** | Genera PDF del consentimiento con datos del psicólogo y paciente |
| **Editar** | Cambia a modo de edición de secciones |
| **Firmar** | Cambia a modo de captura de firma |
| **Firmado por: Paciente / Tutor** | Selector del firmante |
| **Guardar firma** | Persiste la firma en Supabase vinculada al expediente |
| **Borrar trazo** | Limpia el canvas de firma |

---

### Informes clínicos (`Reports.jsx`)

Generador de informes clínicos en PDF listos para imprimir o compartir.

**Tipos de informe**

| Tipo | Descripción |
|---|---|
| **Evaluación Inicial** | Informe de primera evaluación: motivo de consulta, impresión clínica y recomendaciones |
| **Alta Terapéutica** | Informe de cierre: evolución, estado al alta, plan de prevención de recaídas, recomendaciones post-alta |
| **Derivación Extendida** | Carta de derivación: destinatario, motivo, resumen clínico, información adicional |

**Flujo del módulo**

1. Seleccionar tipo de informe (tarjetas de selección).
2. Seleccionar paciente del listado.
3. El formulario se prellenará automáticamente con datos del plan de tratamiento si existe.
4. Completar los campos editables.
5. Botón **Generar informe** → abre el PDF en `window.print()`.

| Botón | Flujo |
|---|---|
| Tarjeta de tipo de informe | Selecciona el tipo activo y reinicia el formulario |
| **Generar informe** | Genera y abre el PDF (deshabilitado si faltan datos mínimos) |

---

### Tareas terapéuticas (`Tasks.jsx`)

Biblioteca de plantillas de tareas y gestión de asignaciones a pacientes.

**Vista principal**

Dos vistas seleccionables: **Asignaciones** (tareas enviadas) · **Biblioteca** (plantillas disponibles) · **Respuestas** (dashboard de respuestas pendientes de revisión).

**Vista Asignaciones**

Filtro por categoría de tarea.

| Botón / Acción | Flujo |
|---|---|
| **+ Asignar tarea** | Abre modal de asignación |
| **Ver respuestas** *(sobre asignación)* | Abre `ResponsesModal` con las respuestas del paciente |
| **Eliminar** *(sobre asignación)* | Elimina la asignación con confirmación |

**Vista Biblioteca**

Tarjetas de plantillas agrupadas por categoría. Clic en plantilla → la selecciona para asignar.

Filtros por categoría (chips): mindfulness, psicoeducación, registros conductuales, relajación, etc.

**Modal — Asignar tarea**

Selección de plantilla desde la biblioteca, selección de paciente, notas adicionales opcionales.

| Botón | Flujo |
|---|---|
| **Guardar y enviar por WhatsApp** | Guarda la asignación y abre WhatsApp con el enlace al portal del paciente |
| **Cancelar** | Cierra el modal |

**Modal `ResponsesModal`**

Muestra las respuestas enviadas por el paciente, fecha de envío y contenido de cada ítem.

| Botón | Flujo |
|---|---|
| **Cerrar** | Cierra el modal |

---

### Registros entre sesiones (`InterSessions.jsx`)

Exporta dos sub-módulos que se montan dentro del expediente del paciente (pestaña Contactos y pestaña Medicación) y también pueden usarse de forma independiente.

**ContactsTab** — Registros de contacto entre sesiones

| Botón | Flujo |
|---|---|
| **+ Nuevo contacto** | Abre `ContactForm` en modal |

`ContactForm`: canal (llamada / WhatsApp / email / presencial), fecha, duración, notas, flag de seguimiento requerido.

| Botón | Flujo |
|---|---|
| **Guardar** | Registra el contacto |
| **Cancelar** | Cierra el modal |

Cada ítem de contacto tiene botón de **eliminar** con confirmación.

**MedicationTab** — Medicación activa del paciente

| Botón | Flujo |
|---|---|
| **+ Agregar medicamento** | Abre `MedForm` en modal |
| **Editar** *(sobre ítem)* | Abre `MedForm` con datos precargados |
| **Eliminar** *(sobre ítem)* | Elimina con confirmación |
| **Activo / Suspendido** *(toggle)* | Cambia el estado del medicamento sin eliminarlo |

`MedForm`: nombre del medicamento (con catálogo de clases de psicofármacos), dosis, frecuencia, prescriptor, fecha de inicio, notas.

---

### Finanzas (`Finance.jsx`)

Gestión económica de la consulta.

**Pestañas**

| Pestaña | Contenido |
|---|---|
| **Ingresos** | Listado de pagos recibidos con filtros por estado |
| **Gastos** | Listado de gastos registrados por categoría |
| **Reportes** | 4 reportes financieros exportables a PDF |

**Pestaña Ingresos**

Filtros rápidos por estado: Todos · Pagado · Pendiente · Exento.

| Botón / Acción | Flujo |
|---|---|
| **+ Registrar pago** | Abre `Modal de nuevo pago` |
| **Cobrar** *(sobre pago pendiente)* | Abre `Modal de nuevo pago` con el paciente y monto prellenados |
| **Compartir recibo** *(sobre pago)* | Genera imagen/PDF del recibo y abre compartir del sistema |
| Clic en pago | Abre `Modal de ver/editar pago` |

**Modal — Registrar pago**

Campos: paciente, concepto/servicio, monto, método de pago, modalidad (picker presencial/virtual), fecha, notas. Genera folio automático `YYYY-MM-NNNN`.

| Botón | Flujo |
|---|---|
| **Guardar** | Registra el pago y abre `Modal de confirmación de pago` |
| **Cancelar** | Cierra el modal |

**Modal — Confirmación de pago guardado**

Muestra el folio generado con opciones de compartir.

| Botón | Flujo |
|---|---|
| **Compartir recibo** | Genera el recibo y abre compartir del sistema |
| **Cerrar** | Cierra el modal |

**Modal — Ver / editar pago**

Muestra el detalle del pago con opción de editar campos o compartir el recibo.

| Botón | Flujo |
|---|---|
| **Guardar cambios** | Actualiza el pago |
| **Compartir recibo** | Genera y comparte el recibo |
| **Cerrar** | Cierra el modal |

**Pestaña Gastos**

Listado de gastos agrupados por categoría y período.

| Botón / Acción | Flujo |
|---|---|
| **+ Registrar gasto** | Abre `Modal de nuevo gasto` |
| **Editar** *(sobre gasto)* | Abre `Modal de nuevo gasto` con datos precargados |
| **Eliminar** *(sobre gasto)* | Elimina con confirmación |

**Modal — Registrar / editar gasto**

Campos: categoría (renta, servicios, materiales, software, formación, publicidad, honorarios, otros), concepto, monto, fecha, notas.

| Botón | Flujo |
|---|---|
| **Guardar** | Registra el gasto |
| **Cancelar** | Cierra el modal |

**Pestaña Reportes**

Sub-pestañas: R1 — Ingresos / Período · R2 — Ranking · R3 — Balance · R4 — Proyección.

| Botón | Flujo |
|---|---|
| **Imprimir / Exportar PDF** *(en cada reporte)* | Genera el PDF correspondiente con `window.print()` |

Cada reporte tiene sus propios selectores de período o agrupación (por paciente / por servicio).

---

### Estadísticas (`Stats.jsx`)

Visualizaciones clínicas y métricas avanzadas de la práctica.

Contiene gráficas de: sesiones por mes, pacientes por estado, progreso clínico por paciente, distribución de diagnósticos, horas de consulta y evolución de ingresos. Toda la data se deriva de los registros existentes sin configuración adicional.

---

### Configuración (`Settings.jsx`)

Perfil del psicólogo y configuración de la aplicación.

**Pestañas**

| Pestaña | Contenido |
|---|---|
| **Perfil** | Nombre, foto, cédula profesional, especialidad, datos de contacto, firma digital |
| **Horario** | Días y franjas horarias de atención para el módulo de Agenda |
| **Servicios** | Catálogo de servicios con precio presencial y virtual; historial de cambios de tarifa |
| **Apariencia** | Modo de color (claro / oscuro / automático del sistema) |
| **Datos** | Exportar / importar / restaurar toda la data; eliminación de cuenta |
| **Ayuda** | Guía de uso, atajos de teclado, información de la versión |

Cada pestaña guarda sus cambios de forma independiente con un botón **Guardar** al pie de la sección. La pestaña **Servicios** incluye un historial de precios por servicio y modal de nuevo servicio.

---

### Portal del paciente (`PatientPortal.jsx`, ruta `/p`)

Interfaz independiente accesible sin cuenta, solo con número de teléfono.

**Autenticación**

Pantalla de ingreso con selector de código de país y campo de teléfono. Botón **Ingresar** valida el número contra los expedientes existentes.

**Navegación interna (bottom tab bar)**

| Sección | Contenido |
|---|---|
| **Inicio** | Resumen: próxima cita, tareas pendientes, estado del consentimiento |
| **Actividades** | Listado de tareas asignadas pendientes y completadas; botón para responder cada tarea |
| **Citas** | Próximas citas con opciones de confirmar asistencia o solicitar cambio de horario |
| **Técnicas** | Técnicas de bienestar (respiración, relajación, mindfulness) disponibles sin conexión |
| **Pagos** | Historial de pagos y saldos pendientes |
| **Historial** | Sesiones y registros pasados |
| **Perfil** | Datos personales y botón de cerrar sesión |

**En sección Citas — sobre cada cita**

| Botón | Flujo |
|---|---|
| **Confirmar asistencia** | Marca la cita como confirmada |
| **Solicitar cambio** | Registra solicitud de cambio de horario al psicólogo |
| **Cancelar solicitud** | Revierte la solicitud de cambio |

**Consentimiento informado** *(banner visible si no está firmado o está vencido)*

| Botón | Flujo |
|---|---|
| **Revisar y firmar** | Abre vista de consentimiento con secciones en acordeón |
| **Firma digital** | Canvas de firma con botón **Guardar firma** |

**Actividades** — sobre cada tarea pendiente

| Botón | Flujo |
|---|---|
| Clic en tarea | Abre formulario de respuesta de la tarea |
| **Enviar respuesta** | Persiste la respuesta en Supabase y marca la tarea como completada |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| UI | React 18 + JSX |
| Build | Vite 5 |
| PWA | vite-plugin-pwa + Workbox |
| Estilos | CSS custom properties (sin framework externo) |
| Gráficas | Recharts |
| Iconos | Lucide React |
| Backend / Auth | Supabase (PostgreSQL + Auth OAuth) |
| Exportación PDF | HTML dinámico + `window.print()` / `html2canvas` |
| Despliegue | Vercel |

---

## Demo en producción

🔗 [psychocore.vercel.app](https://psychocore.vercel.app)

---

## Licencia

Proyecto privado — todos los derechos reservados.
