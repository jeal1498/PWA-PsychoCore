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
│       ├── Dashboard.jsx       # KPIs, alertas de saldo, barra de configuración, gráficas
│       ├── Patients.jsx        # Gestión de expedientes + Anamnesis + flujo de Reingreso
│       ├── Agenda.jsx          # Calendario de citas
│       ├── Sessions.jsx        # Registro de sesiones clínicas
│       ├── InterSessions.jsx   # Autorregistros entre sesiones
│       ├── RiskAssessment.jsx  # Evaluación de riesgo y plan de seguridad
│       ├── Scales.jsx          # Escalas estandarizadas (PHQ-9, GAD-7…)
│       ├── TreatmentPlan.jsx   # Plan de tratamiento y formulación
│       ├── Consent.jsx         # Consentimiento informado digital
│       ├── Reports.jsx         # Generador de informes clínicos en PDF
│       ├── Tasks.jsx           # Tareas terapéuticas (vista del psicólogo)
│       ├── PatientPortal.jsx   # Portal del paciente (/p)
│       ├── Finance.jsx         # Pagos, gastos, recibos, catálogo de servicios y 4 reportes PDF
│       ├── Stats.jsx           # Estadísticas clínicas avanzadas
│       └── Settings.jsx        # Perfil del psicólogo y configuración
│
├── index.html
├── vite.config.js             # Vite + PWA plugin + code splitting por módulo
├── vercel.json                # Rewrite SPA para Vercel
└── package.json
```

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
