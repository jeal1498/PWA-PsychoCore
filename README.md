# 🧠 PsychoCore — Sistema de Gestión Clínica para Psicólogos

PWA de gestión clínica diseñada para psicólogos en práctica privada. Funciona 100% en el navegador — sin servidores, sin suscripciones, sin datos en la nube.

---

## ✨ Módulos

### Gestión clínica

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs en tiempo real: pacientes activos, citas del día, ingresos del mes, pagos pendientes. Widget de alertas clínicas para pacientes en nivel de riesgo alto o inminente. |
| **Pacientes** | Expediente clínico completo: datos de contacto, contacto de emergencia, historial de diagnósticos, consentimiento informado, estado de cuenta, progreso por sesiones y recursos asignados. |
| **Agenda** | Calendario mensual e vista semanal. Citas individuales y **citas recurrentes** (semanal, quincenal o mensual) con vista previa de fechas. Eliminar una cita o toda la serie. Acceso rápido para registrar nota de sesión desde la cita. |
| **Sesiones** | Notas de evolución con **4 formatos**: Libre, SOAP, DAP y BIRP. Cada nota incluye estado de ánimo, progreso, etiquetas, **tareas terapéuticas** (asignadas y seguimiento de cumplimiento) y **notas de supervisión privadas** (no se exportan). Carta de derivación en PDF. Pantalla de riesgo rápida integrada. |
| **Plan de Tratamiento** | Plan clínico longitudinal por paciente: motivo de consulta, formulación clínica, enfoque terapéutico, objetivos por horizonte (corto/mediano/largo plazo) con seguimiento de estado, criterios de alta y notas de revisión periódica. Exportación a PDF completo. |
| **Escalas Psicométricas** | Aplicación digital de PHQ-9, GAD-7, BAI y PCL-5. Cálculo automático de score y nivel de severidad. Gráfica de evolución entre aplicaciones. Exportación a PDF con tabla de respuestas. Vista consolidada por paciente. |
| **Evaluación de Riesgo** | Evaluación estructurada de ideación suicida, autolesiones y riesgo a terceros. Nivel de riesgo sugerido automáticamente (bajo/moderado/alto/inminente). Factores protectores, plan de seguridad editable y exportable. Alertas visibles en Dashboard y Sidebar. |
| **Finanzas** | Registro de pagos, filtros por paciente y período, 3 métricas financieras clave. |
| **Recursos** | Biblioteca de materiales categorizados y buscables. **Asignación a pacientes**: cada recurso puede vincularse a uno o más pacientes, y el expediente del paciente muestra los materiales que tiene asignados. |
| **Estadísticas** | Indicadores de actividad: sesiones por período, distribución de progreso y estados de ánimo, ingresos acumulados. |

### Sistema

| Módulo | Descripción |
|--------|-------------|
| **Lock Screen** | PIN de 4 dígitos con bloqueo por intentos fallidos (5 intentos / 30 seg). Soporte de teclado físico. |
| **Configuración** | Perfil del terapeuta (nombre, cédula, especialidad, consultorio), backup manual y auto-backup con File System Access API, restauración desde JSON. |

---

## 🚀 Instalación y desarrollo

### Prerequisitos
- Node.js 18+
- npm 9+

### Setup inicial

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/psychocore.git
cd psychocore

# 2. Instalar dependencias
npm install

# 3. Generar iconos PWA (requiere canvas, solo la primera vez)
npm install canvas --save-dev
node scripts/generate-icons.mjs

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

**PIN de acceso demo:** `1234`

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

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy desde la raíz del proyecto
vercel --prod
```

O desde la UI de Vercel:
1. Importa el repositorio de GitHub
2. Framework: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy ✓

---

## 📁 Estructura del proyecto

```
psychocore/
├── public/
│   ├── favicon.svg
│   └── icons/
│       ├── icon-192.png       # Ícono PWA (generar con script)
│       └── icon-512.png       # Ícono PWA splash
│
├── scripts/
│   └── generate-icons.mjs     # Generador de íconos PNG
│
├── src/
│   ├── App.jsx                # Raíz: estado global, routing, storage
│   ├── main.jsx               # Entry point + Service Worker
│   ├── theme.js               # Design tokens (colores, tipografía)
│   ├── utils.js               # Helpers: uid, fmt, fmtDate, escalas de color
│   ├── sampleData.js          # Datos de demostración
│   ├── index.css              # Reset CSS + scrollbar + estilos de impresión
│   │
│   ├── components/
│   │   ├── Sidebar.jsx        # Navegación lateral con alertas de riesgo
│   │   ├── LockScreen.jsx     # Pantalla de PIN
│   │   ├── GlobalSearch.jsx   # Búsqueda global de pacientes/citas
│   │   ├── NotificationBell.jsx
│   │   └── ui/
│   │       └── index.jsx      # Btn, Card, Modal, Input, Select, Badge, etc.
│   │
│   ├── hooks/
│   │   ├── useEncryptedStorage.js  # localStorage cifrado con AES-GCM
│   │   ├── useAutoBackup.js        # Auto-backup con File System Access API
│   │   ├── useNotifications.js     # Notificaciones de citas próximas
│   │   └── useIsMobile.js
│   │
│   ├── crypto/
│   │   └── encryption.js      # Cifrado AES-GCM para datos en reposo
│   │
│   └── modules/
│       ├── Dashboard.jsx
│       ├── Patients.jsx       # Expediente + historial Dx + consentimiento
│       ├── Agenda.jsx         # Citas individuales y recurrentes
│       ├── Sessions.jsx       # SOAP/DAP/BIRP + tareas + supervisión
│       ├── TreatmentPlan.jsx  # Plan de tratamiento + objetivos
│       ├── Scales.jsx         # PHQ-9, GAD-7, BAI, PCL-5
│       ├── RiskAssessment.jsx # Evaluación de riesgo + plan de seguridad
│       ├── Finance.jsx
│       ├── Resources.jsx      # Biblioteca + asignación a pacientes
│       ├── Stats.jsx
│       └── Settings.jsx
│
├── index.html
├── package.json
├── vite.config.js             # Vite + vite-plugin-pwa + Workbox
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

## 💾 Persistencia de datos

Todos los datos se guardan cifrados en `localStorage` con AES-GCM (derivación de clave desde el PIN con PBKDF2):

| Clave | Contenido |
|-------|-----------|
| `pc_patients` | Expedientes: datos personales, diagnósticos, consentimiento, contacto de emergencia |
| `pc_appointments` | Citas: individuales y series recurrentes |
| `pc_sessions` | Notas de sesión: formato libre, SOAP, DAP o BIRP |
| `pc_payments` | Registro de pagos por paciente |
| `pc_resources` | Biblioteca de materiales con asignaciones a pacientes |
| `pc_risk_assessments` | Evaluaciones de riesgo y planes de seguridad |
| `pc_scale_results` | Resultados de escalas psicométricas (PHQ-9, GAD-7, BAI, PCL-5) |
| `pc_treatment_plans` | Planes de tratamiento con objetivos y seguimiento |

> Los datos nunca salen del dispositivo. El cifrado opera íntegramente en el navegador — ni el servidor de Vercel ni ningún tercero tiene acceso a ellos.

---

## 📝 Formatos de nota clínica

PsychoCore soporta cuatro formatos en el módulo de Sesiones:

| Formato | Secciones | Uso recomendado |
|---------|-----------|-----------------|
| **Libre** | Campo abierto | Notas narrativas sin estructura fija |
| **SOAP** | Subjetivo · Objetivo · Análisis · Plan | Estándar médico general |
| **DAP** | Datos · Análisis · Plan | Orientación cognitivo-conductual |
| **BIRP** | Conducta · Intervención · Respuesta · Plan | Psicología clínica y rehabilitación |

Las notas estructuradas se exportan a PDF con cada sección identificada por su header de color.

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

El módulo de Evaluación de Riesgo implementa un flujo guiado de 4 pasos:

1. **Datos de la evaluación** — tipo (intake / sesión / crisis) e intentos previos
2. **Ideación suicida** — ninguna / pasiva / activa con desglose de plan, medios e intención
3. **Autolesiones, riesgo a terceros y factores protectores**
4. **Nivel de riesgo y plan de seguridad** — si el nivel es moderado o superior, el plan de seguridad se activa y genera un documento imprimible para que el paciente se lleve a casa

El nivel sugerido se calcula automáticamente pero el clínico puede ajustarlo. Las alertas de pacientes en nivel alto o inminente aparecen en el Dashboard y en el Sidebar con un indicador rojo.

---

## 🔁 Citas recurrentes

Al crear una cita, el botón **"Cita recurrente"** permite configurar:

- **Frecuencia:** semanal, quincenal o mensual
- **Número de ocurrencias:** entre 2 y 52
- **Vista previa en tiempo real** de las primeras fechas generadas

Todas las citas de una serie quedan vinculadas por un `recurrenceGroupId`. Al eliminar una cita recurrente, el sistema pregunta si eliminar solo esa instancia o toda la serie.

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

- **Cifrado en reposo:** AES-GCM 256-bit. La clave se deriva del PIN con PBKDF2 (100 000 iteraciones, SHA-256) y nunca se persiste en disco.
- **Lock Screen:** PIN de 4 dígitos con bloqueo automático tras 5 intentos fallidos (30 segundos).
- **Sin transmisión de datos:** todo el procesamiento es local. El servidor de Vercel solo sirve los archivos estáticos.
- **Recomendación para producción:** migrar el PIN a un hash bcrypt almacenado en localStorage en lugar del valor en texto claro actual.

---

## 🛣️ Roadmap

- [ ] Modo oscuro
- [ ] Importación de pacientes desde CSV
- [ ] Notificaciones push para recordatorio de citas (Web Push API)
- [ ] Generación de informes psicológicos en PDF (evaluación inicial, alta, derivación completa)
- [ ] Sincronización opcional en la nube (Supabase / Firebase)
- [ ] Soporte multiusuario con perfiles independientes
- [ ] Terapia de pareja y grupal (múltiples participantes por expediente)
- [ ] Integración con Cal.com para agendamiento externo automatizado

---

## 📄 Licencia

MIT — uso libre para proyectos personales y comerciales.

---

> Desarrollado para psicólogos clínicos en práctica privada.
> Stack: React 18 · Vite 5 · vite-plugin-pwa · Workbox · Lucide Icons
