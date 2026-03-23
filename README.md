# 🧠 PsychoCore — Sistema de Gestión Clínica para Psicólogos

PWA de gestión clínica diseñada para psicólogos en práctica privada. Los datos se sincronizan en la nube con Supabase y están protegidos por Row Level Security — cada psicólogo solo accede a su propia información.

🔗 **Demo:** [psychocore.vercel.app](https://psychocore.vercel.app)

---

## ✨ Módulos

### Gestión clínica

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs en tiempo real: pacientes activos, citas del día, ingresos del mes, pagos pendientes. Widget de alertas clínicas para pacientes en nivel de riesgo alto o inminente. |
| **Pacientes** | Expediente clínico completo: datos de contacto, contacto de emergencia, historial de diagnósticos, consentimiento informado, estado de cuenta, progreso por sesiones y recursos asignados. |
| **Consentimiento Informado** | Gestión de consentimientos por paciente con seguimiento de vigencia (12 meses). Estados: pendiente, vigente, por vencer y vencido. Impresión directa desde la app. |
| **Agenda** | Calendario mensual y vista semanal. Citas individuales y **citas recurrentes** (semanal, quincenal o mensual) con vista previa de fechas. Eliminar una cita o toda la serie. Acceso rápido para registrar nota de sesión desde la cita. |
| **Sesiones** | Notas de evolución con **4 formatos**: Libre, SOAP, DAP y BIRP. Cada nota incluye estado de ánimo, progreso, etiquetas, **tareas terapéuticas** (asignadas y seguimiento de cumplimiento) y **notas de supervisión privadas** (no se exportan). Carta de derivación en PDF. Pantalla de riesgo rápida integrada. |
| **Plan de Tratamiento** | Plan clínico longitudinal por paciente: motivo de consulta, formulación clínica, enfoque terapéutico, objetivos por horizonte (corto/mediano/largo plazo) con seguimiento de estado, criterios de alta y notas de revisión periódica. Exportación a PDF. |
| **Escalas Psicométricas** | Aplicación digital de PHQ-9, GAD-7, BAI y PCL-5. Cálculo automático de score y nivel de severidad. Gráfica de evolución entre aplicaciones. Exportación a PDF con tabla de respuestas. Vista consolidada por paciente. |
| **Evaluación de Riesgo** | Evaluación estructurada de ideación suicida, autolesiones y riesgo a terceros. Nivel de riesgo sugerido automáticamente (bajo/moderado/alto/inminente). Factores protectores, plan de seguridad editable y exportable. Alertas visibles en Dashboard y Sidebar. |
| **Entre Sesiones** | Registro de **contactos entre sesiones** (llamadas, WhatsApp, email, videollamada, crisis) y gestión del **historial de medicación** del paciente (categoría, dosis, prescriptor, estado activo/suspendido/completado). |
| **Tareas Terapéuticas** | Asignación de tareas estructuradas a pacientes usando plantillas predefinidas por categoría. Envío por WhatsApp con enlace al Portal del Paciente. Seguimiento de respuestas y estado de completación desde el módulo del terapeuta. |
| **Portal del Paciente** | Vista pública en `/p`: el paciente accede con su número de teléfono, completa las tareas asignadas y envía sus respuestas. No requiere cuenta ni instalación. |
| **Reportes Clínicos** | Generación de informes psicológicos en PDF listos para imprimir. Tres tipos disponibles: **Evaluación Inicial** (motivo de consulta, diagnóstico, escalas y plan de tratamiento), **Alta Terapéutica** (resumen del proceso, objetivos logrados, evolución en escalas y recomendaciones) y **Derivación Extendida** (historial clínico completo con tratamiento previo y motivo de referencia). |
| **Finanzas** | Registro de pagos, filtros por paciente y período, 3 métricas financieras clave. Integración con el catálogo de servicios para registrar pagos con tarifa predefinida. |
| **Estadísticas** | Indicadores de actividad: sesiones por período, distribución de progreso y estados de ánimo, ingresos acumulados. |

### Configuración y sistema

| Módulo | Descripción |
|--------|-------------|
| **Servicios** | Catálogo de servicios del consultorio: nombre, tipo (individual, pareja, grupo, paquete, otro), modalidad (presencial/en línea/híbrida), precio y notas. Historial de precios por servicio. |
| **Configuración** | Perfil del terapeuta (nombre, cédula, especialidad, teléfono, RFC, correo), exportación a JSON y CSV, importación de backup, estado de suscripción / período de prueba. El RFC se incluye automáticamente en los recibos de pago generados. |
| **Lock Screen** | PIN de 4 dígitos con bloqueo por intentos fallidos (5 intentos / 30 seg). Soporte de teclado físico. |
| **Modo oscuro** | Tres opciones: claro, oscuro y automático (sigue la preferencia del sistema operativo). |

---

## 🔐 Autenticación y acceso

El acceso a la app requiere una cuenta de Google. Al iniciar sesión por primera vez se activa un **período de prueba de 30 días** sin restricciones. Un flujo de **onboarding** guía al psicólogo a completar su perfil antes de usar la aplicación.

```
Login → Google OAuth (Supabase Auth) → Onboarding → Trial 30 días → Suscripción
```

El estado de la suscripción y la fecha de vencimiento del trial son visibles desde **Configuración → Estado de suscripción**.

---

## 🚀 Instalación y desarrollo

### Prerequisitos
- Node.js 18+
- npm 9+
- Cuenta en [Supabase](https://supabase.com) con el schema aplicado (ver abajo)

### Setup inicial

```bash
# 1. Clonar el repositorio
git clone https://github.com/jeal1498/psychocore.git
cd psychocore

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tu URL y clave anon de Supabase

# 4. Aplicar el schema de Supabase
# Abrir Supabase Dashboard → SQL Editor → ejecutar el schema incluido

# 5. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

### Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el schema de la base de datos
3. Activar **Google como proveedor OAuth** en Authentication → Providers
4. Copiar la `Project URL` y la `anon key` a `src/lib/supabase.js`

---

## 🏗️ Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo con HMR
npm run build     # Build de producción optimizado
npm run preview   # Previsualizar el build localmente
npm run lint      # Linting con ESLint
```

---

## 📦 Deploy en Vercel

Desde la UI de Vercel:
1. Importar el repositorio de GitHub
2. Framework: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy ✓

> **Importante:** Los cambios en archivos `.jsx` deben subirse siempre con `git push` desde terminal. El editor web de GitHub puede introducir null bytes que corrompen los archivos JSX.

---

## 📁 Estructura del proyecto

```
psychocore/
├── public/
│   ├── favicon.svg
│   ├── privacidad.html
│   ├── terminos.html
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
│
├── scripts/
│   └── generate-icons.mjs     # Generador de íconos PNG
│
├── src/
│   ├── App.jsx                # Auth, routing, navegación, modo oscuro
│   ├── main.jsx               # Entry point + Service Worker
│   ├── theme.js               # Design tokens
│   ├── utils.js               # Helpers: uid, fmt, fmtDate
│   ├── sampleData.js
│   ├── index.css
│   │
│   ├── context/
│   │   └── AppStateContext.jsx  # Estado global centralizado (11 tablas Supabase)
│   │
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── LockScreen.jsx
│   │   ├── GlobalSearch.jsx
│   │   ├── NotificationBell.jsx
│   │   ├── Onboarding.jsx       # Flujo de primer ingreso
│   │   ├── SyncToast.jsx        # Indicador de sincronización en tiempo real
│   │   └── ui/
│   │       └── index.jsx        # Btn, Card, Modal, Input, Select, Badge…
│   │
│   ├── hooks/
│   │   ├── useSupabaseStorage.js   # Hook genérico de lectura/escritura en Supabase
│   │   ├── useNotifications.js     # Notificaciones de citas próximas
│   │   └── useIsMobile.js
│   │
│   ├── lib/
│   │   ├── supabase.js        # Cliente Supabase + Auth + helpers de suscripción
│   │   ├── taskTemplates.js   # Plantillas de tareas terapéuticas
│   │   └── eventBus.js        # Bus de eventos entre módulos
│   │
│   └── modules/
│       ├── Dashboard.jsx
│       ├── Patients.jsx
│       ├── Consent.jsx        # Consentimiento informado con vigencia
│       ├── Agenda.jsx
│       ├── Sessions.jsx
│       ├── TreatmentPlan.jsx
│       ├── Scales.jsx
│       ├── RiskAssessment.jsx
│       ├── InterSessions.jsx  # Contactos entre sesiones + medicación
│       ├── Tasks.jsx          # Tareas terapéuticas con plantillas
│       ├── PatientPortal.jsx  # Vista pública /p (acceso por teléfono)
│       ├── Reports.jsx        # Informes clínicos en PDF (evaluación, alta, derivación)
│       ├── Finance.jsx
│       ├── Stats.jsx
│       └── Settings.jsx       # Perfil + Servicios + Backup + Suscripción
│
├── index.html
├── package.json
├── vite.config.js
└── eslint.config.js
```

---

## 🎨 Design System

| Token | Valor | Uso |
|-------|-------|-----|
| `T.p` | `#3A6B6E` | Color primario — teal clínico |
| `T.acc` | `#C4895A` | Acento — ámbar cálido |
| `T.t` | `#1A2B28` | Texto principal |
| `T.bg` | `#F4F2EE` | Fondo general — crema |
| `T.suc` | `#4E8B5F` | Éxito / progreso positivo |
| `T.war` | `#B8900A` | Advertencia |
| `T.err` | `#B85050` | Error / riesgo |
| `T.fH` | Cormorant Garamond | Headings — serif editorial |
| `T.fB` | DM Sans | Body — sans funcional |

---

## ☁️ Persistencia de datos (Supabase)

Todos los datos se guardan en Supabase con Row Level Security activo — cada psicólogo solo puede leer y modificar sus propios registros.

| Tabla | Contenido |
|-------|-----------|
| `pc_patients` | Expedientes clínicos |
| `pc_appointments` | Citas individuales y recurrentes |
| `pc_sessions` | Notas de sesión (Libre, SOAP, DAP, BIRP) |
| `pc_payments` | Registro de pagos |
| `pc_profile` | Perfil del terapeuta |
| `pc_risk_assessments` | Evaluaciones de riesgo y planes de seguridad |
| `pc_scale_results` | Resultados PHQ-9, GAD-7, BAI, PCL-5 |
| `pc_treatment_plans` | Planes de tratamiento con objetivos |
| `pc_inter_sessions` | Contactos entre sesiones |
| `pc_medications` | Historial de medicación por paciente |
| `pc_services` | Catálogo de servicios del consultorio |

El schema incluye triggers de `updated_at` automático y políticas RLS que restringen acceso por `auth.uid()`.

---

## 📝 Formatos de nota clínica

| Formato | Secciones | Uso recomendado |
|---------|-----------|-----------------|
| **Libre** | Campo abierto | Notas narrativas sin estructura fija |
| **SOAP** | Subjetivo · Objetivo · Análisis · Plan | Estándar médico general |
| **DAP** | Datos · Análisis · Plan | Orientación cognitivo-conductual |
| **BIRP** | Conducta · Intervención · Respuesta · Plan | Psicología clínica y rehabilitación |

---

## 📊 Escalas psicométricas

| Escala | Dominio | Ítems | Puntos de corte |
|--------|---------|-------|-----------------|
| **PHQ-9** | Depresión | 9 | Mínima (0–4) / Leve (5–9) / Moderada (10–14) / Moderada-grave (15–19) / Grave (20–27) |
| **GAD-7** | Ansiedad generalizada | 7 | Mínima (0–4) / Leve (5–9) / Moderada (10–14) / Grave (15–21) |
| **BAI** | Ansiedad somática | 21 | Mínima (0–7) / Leve (8–15) / Moderada (16–25) / Grave (26–63) |
| **PCL-5** | Trauma / TEPT | 20 | Subclínico (<33) / Clínico probable (≥33) |

> Las escalas son herramientas de apoyo clínico. No sustituyen el juicio diagnóstico del profesional.

---

## 🚨 Evaluación de riesgo

El módulo implementa un flujo guiado de 4 pasos:

1. **Datos de la evaluación** — tipo (intake / sesión / crisis) e intentos previos
2. **Ideación suicida** — ninguna / pasiva / activa con desglose de plan, medios e intención
3. **Autolesiones, riesgo a terceros y factores protectores**
4. **Nivel de riesgo y plan de seguridad** — si el nivel es moderado o superior, el plan de seguridad se activa y genera un documento imprimible

El nivel sugerido se calcula automáticamente pero el clínico puede ajustarlo. Las alertas de pacientes en nivel alto o inminente aparecen en el Dashboard y en el Sidebar con un indicador rojo.

---

## 📋 Tareas Terapéuticas y Portal del Paciente

### Flujo desde el terapeuta (módulo Tareas)
1. Seleccionar paciente y elegir una plantilla de tarea por categoría
2. Enviar el enlace por WhatsApp con un solo clic
3. Monitorear las respuestas y el estado de completación en tiempo real

### Flujo del paciente (Portal `/p`)
1. El paciente abre el enlace en su teléfono
2. Ingresa su número de celular registrado
3. Completa la tarea en un formulario guiado
4. Envía las respuestas — el terapeuta las ve de inmediato

---

## 🔁 Citas recurrentes

Al crear una cita, el botón **"Cita recurrente"** permite configurar frecuencia (semanal, quincenal o mensual), número de ocurrencias (2–52) y muestra una vista previa de las fechas generadas. Todas las citas de una serie quedan vinculadas por `recurrenceGroupId`. Al eliminar, el sistema pregunta si eliminar solo esa instancia o toda la serie.

---

## 📱 PWA — Instalación

1. Abre la app en Chrome, Edge o Safari
2. Busca el ícono de instalación en la barra de direcciones (o "Añadir a pantalla de inicio" en móvil)
3. La app funciona **offline** gracias al Service Worker de Workbox

### Caché offline (Workbox)
- Google Fonts → CacheFirst (1 año)
- Assets de la app → CacheFirst (build hash)
- Actualizaciones → `registerType: "autoUpdate"`

---

## 🔐 Seguridad

- **Autenticación:** Google OAuth gestionado por Supabase Auth — sin contraseñas propias.
- **Row Level Security:** cada fila en Supabase está protegida por políticas que verifican `auth.uid()`. Un usuario no puede leer ni escribir datos de otro.
- **Lock Screen:** PIN de 4 dígitos con bloqueo automático tras 5 intentos fallidos (30 segundos).
- **Transmisión:** HTTPS obligatorio en Vercel. Supabase encripta los datos en reposo y en tránsito.
- **Recomendación:** migrar el PIN local a un hash bcrypt en lugar del valor en texto claro actual.

---

## 🛣️ Roadmap

- [ ] Notificaciones push para recordatorio de citas (Web Push API)
- [ ] Soporte multiusuario con perfiles independientes
- [ ] Terapia de pareja y grupal (múltiples participantes por expediente)
- [ ] Integración con Cal.com para agendamiento externo automatizado
- [ ] Importación de pacientes desde CSV

---

## 📄 Licencia

MIT — uso libre para proyectos personales y comerciales.

---

> Desarrollado para psicólogos clínicos en práctica privada.  
> Stack: React 18 · Vite 5 · Supabase · vite-plugin-pwa · Workbox · Lucide Icons
