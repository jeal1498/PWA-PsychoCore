# 🧠 PsychoCore — Sistema de Gestión Integral para Psicólogos

PWA de gestión clínica diseñada para psicólogos en práctica privada. Funciona 100% en el navegador — sin servidores, sin suscripciones, sin datos en la nube.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs en tiempo real: pacientes, citas de hoy, ingresos del mes, pagos pendientes |
| **Pacientes** | Expediente clínico con historial de sesiones y estado de cuenta por paciente |
| **Agenda** | Calendario mensual interactivo, toggle de estado por cita, panel de próximas citas |
| **Sesiones** | Notas de evolución con mood, progreso, etiquetas y exportación a PDF profesional |
| **Finanzas** | Registro de pagos, filtros por paciente, 3 métricas financieras clave |
| **Recursos** | Biblioteca de ejercicios, técnicas y materiales categorizados y buscables |
| **Lock Screen** | PIN keypad con bloqueo por intentos fallidos y soporte de teclado físico |

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

# 3. Generar iconos PWA (requiere instalar canvas una sola vez)
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
npm run preview   # Previsualizar el build de producción localmente
npm run lint      # Linting con ESLint
```

---

## 📦 Deploy en Vercel

La forma más rápida de publicar:

```bash
# 1. Instalar Vercel CLI (si no lo tienes)
npm install -g vercel

# 2. Desde la raíz del proyecto
vercel

# Para producción
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
│   ├── favicon.svg           # Ícono SVG del browser tab
│   └── icons/
│       ├── icon-192.png      # Ícono PWA (generar con script)
│       ├── icon-512.png      # Ícono PWA splash (generar con script)
│       └── LEER.txt          # Instrucciones de iconos
│
├── scripts/
│   └── generate-icons.mjs    # Generador automático de íconos PNG
│
├── src/
│   ├── App.jsx               # Componente raíz + todos los módulos
│   ├── main.jsx              # Entry point + registro PWA Service Worker
│   └── index.css             # Reset CSS global + scrollbar + print
│
├── .gitignore
├── eslint.config.js
├── index.html                # HTML shell
├── package.json
├── vite.config.js            # Config Vite + vite-plugin-pwa + Workbox
└── README.md
```

---

## 🎨 Design System

| Token | Valor | Uso |
|-------|-------|-----|
| `T.p` | `#3A6B6E` | Color primario (teal clínico) |
| `T.acc` | `#C4895A` | Acento (ámbar cálido) |
| `T.t` | `#1A2B28` | Texto principal |
| `T.bg` | `#F4F2EE` | Fondo general (crema) |
| `T.fH` | Cormorant Garamond | Headings / serif elegante |
| `T.fB` | DM Sans | Body / UI functional |

---

## 💾 Persistencia de datos

Todos los datos se guardan en `localStorage` bajo estas claves:

| Clave | Descripción |
|-------|-------------|
| `pc_patients` | Expedientes de pacientes |
| `pc_appointments` | Citas de la agenda |
| `pc_sessions` | Notas de sesión |
| `pc_payments` | Registro de pagos |
| `pc_resources` | Biblioteca de recursos |

> **Nota de privacidad:** Los datos nunca salen del dispositivo. Para implementar cifrado de datos sensibles, integrar [crypto-js](https://github.com/brix/crypto-js) y encriptar antes de escribir al localStorage.

---

## 📱 PWA — Instalación

1. Abre la app en Chrome / Edge / Safari
2. Busca el ícono de instalación en la barra de direcciones (o menú "Añadir a pantalla de inicio" en móvil)
3. La app funciona **offline** para consulta de agenda y datos existentes gracias a Workbox

### Soporte de caché offline (Workbox)
- **Google Fonts** → CacheFirst (1 año)
- **Assets de la app** → CacheFirst (build hash)
- **Actualizaciones automáticas** → `registerType: "autoUpdate"`

---

## 🔐 Seguridad

- Lock Screen con PIN de 4 dígitos
- Bloqueo temporal después de 5 intentos fallidos (30 seg)
- Soporte de teclado físico en el PIN keypad
- **Recomendación para producción:** cambiar `CORRECT_PIN` en `App.jsx` por un sistema de PIN hasheado con bcrypt o similar, almacenado en localStorage

---

## 🛣️ Roadmap sugerido

- [ ] Cifrado local de expedientes con crypto-js
- [ ] Backup/exportación de datos en JSON
- [ ] Importación de pacientes desde CSV
- [ ] Generador de cartas de derivación en PDF
- [ ] Modo oscuro
- [ ] Notificaciones push para recordatorio de citas (via Web Push API)
- [ ] Soporte multiusuario con perfiles
- [ ] Sincronización opcional con Supabase / Firebase

---

## 📄 Licencia

MIT — uso libre para proyectos personales y comerciales.

---

> Desarrollado con ❤️ para psicólogos clínicos en práctica privada.
> Stack: React 18 · Vite 5 · vite-plugin-pwa · Workbox · Lucide Icons
