// ── settings.utils.js ────────────────────────────────────────────────────────
// Constantes locales y helpers puros. Sin imports de React.

// ── Constantes de color ───────────────────────────────────────────────────────
export const NAV_TEXT = "rgba(255,255,255,0.92)"; // texto sobre fondos oscuros (T.nav, T.p)
export const WA       = "#25D366";                 // verde WhatsApp — brand color externo

// ── Datos estáticos de dominio ────────────────────────────────────────────────
export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const SERVICE_TYPES = {
  sesion:     { label: "Sesión individual",   short: "Sesión",     icon: "👤", desc: "Sesión de psicoterapia individual de 50 minutos" },
  evaluacion: { label: "Evaluación",          short: "Evaluación", icon: "📋", desc: "Evaluación neuropsicológica completa con reporte escrito" },
  pareja:     { label: "Terapia de pareja",   short: "Pareja",     icon: "👫", desc: "Sesión de terapia de pareja de 60 minutos" },
  grupo:      { label: "Grupo / Taller",      short: "Grupo",      icon: "👥", desc: "Sesión grupal o taller terapéutico" },
  paquete:    { label: "Paquete de sesiones", short: "Paquete",    icon: "📦", desc: "Paquete de sesiones con precio preferencial" },
  otro:       { label: "Otro",                short: "Otro",       icon: "⚡", desc: "" },
};

export const MODALITIES = [
  { id: "presencial", label: "Presencial", icon: "🏢" },
  { id: "virtual",    label: "Virtual",    icon: "💻" },
  { id: "ambas",      label: "Ambas",      icon: "🔄" },
];

export const DISCOUNTS = [
  { sessions: 4,  label: "Paquete básico",    pct: 0.9  },
  { sessions: 8,  label: "Paquete estándar",  pct: 0.85 },
  { sessions: 12, label: "Paquete intensivo", pct: 0.80 },
];

export const SUGGESTED_SERVICES = [
  { label: "Primera consulta",  type: "sesion",     desc: "Servicio inicial o de admisión",        icon: "🧭" },
  { label: "Seguimiento",       type: "sesion",     desc: "Sesión estándar de seguimiento",        icon: "🔁" },
  { label: "Evaluación",        type: "evaluacion", desc: "Sesión de valoración / reporte",        icon: "📋" },
  { label: "Terapia de pareja", type: "pareja",     desc: "Sesión para dos pacientes",             icon: "👫" },
  { label: "Grupo / Taller",    type: "grupo",      desc: "Atención grupal o taller terapéutico",  icon: "👥" },
  { label: "Cierre / Alta",     type: "otro",       desc: "Sesión final o cierre administrativo",  icon: "🏁" },
];

export const FAQ_ITEMS = [
  {
    q: "¿Cómo agrego un paciente nuevo?",
    a: "Ve al módulo Pacientes → botón «Nuevo paciente» en la esquina superior derecha. Llena los datos básicos y guarda. El paciente aparecerá disponible en Sesiones, Agenda y demás módulos inmediatamente.",
  },
  {
    q: "¿Cómo registro una sesión?",
    a: "Ve a Sesiones → «Nueva nota». Selecciona el paciente, elige el formato de nota (Libre, SOAP, DAP o BIRP), completa los campos y guarda. La nota queda vinculada al expediente del paciente.",
  },
  {
    q: "¿Cómo asigno una tarea a un paciente?",
    a: "Al guardar una sesión puedes seleccionar tareas terapéuticas desde el panel inferior del formulario. El paciente recibirá un enlace por WhatsApp para completarlas. También puedes asignarlas desde el módulo Tareas.",
  },
  {
    q: "¿Cómo agendo una cita?",
    a: "Ve a Agenda → «Nueva cita». Selecciona paciente, fecha, hora y tipo de consulta. Las citas próximas aparecerán en el Dashboard y en las notificaciones.",
  },
  {
    q: "¿Dónde veo los pagos pendientes?",
    a: "En el módulo Finanzas. Puedes registrar pagos, marcarlos como cobrados y ver el resumen mensual de ingresos.",
  },
  {
    q: "¿Cómo exporto un informe de un paciente?",
    a: "Ve a Informes, selecciona el paciente y el tipo de informe. Puedes generar el PDF directamente desde el navegador.",
  },
  {
    q: "¿Los datos están seguros?",
    a: "Sí. Toda la información se almacena en Supabase con autenticación por cuenta de Google. Solo tú tienes acceso a tus expedientes.",
  },
  {
    q: "¿Puedo usar PsychoCore en móvil?",
    a: "Sí, es una PWA. En Android puedes instalarla desde Chrome: menú → «Agregar a pantalla de inicio». Funciona como app nativa.",
  },
  {
    q: "¿Qué pasa si pierdo internet?",
    a: "La app requiere conexión para cargar y guardar datos. Sin internet verás los datos del último caché pero no podrás guardar cambios.",
  },
];

// ── Helpers de formato ────────────────────────────────────────────────────────

/** Formatea un número como moneda MXN: "$1,200" */
export const fmtCur = n => "$" + Number(n).toLocaleString("es-MX");

/** Genera un uid corto (7 chars) */
export const uid = () => Math.random().toString(36).slice(2, 9);

/** Genera la fecha de hoy en formato ISO YYYY-MM-DD */
export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Deriva las iniciales (máx. 2) del nombre completo */
export const getInitials = (name) =>
  name
    ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "PS";

// ── Helpers de validación ────────────────────────────────────────────────────

/** Valida que el horario de trabajo sea coherente */
export const isScheduleValid = (workingDays, workingStart, workingEnd) =>
  workingDays.length > 0 && workingStart < workingEnd;

/** Verifica si un servicio puede agregarse al listado */
export const canAddService = (form) =>
  (form.type === "paquete" || form.name.trim()) &&
  (form.price || form.priceVirtual);

// ── Helpers de cálculo de paquetes ───────────────────────────────────────────

/**
 * Calcula los precios sugeridos para paquetes a partir del precio base de sesión.
 * @param {number} base      — precio sesión presencial
 * @param {number|null} baseV — precio sesión virtual (null si no aplica)
 * @returns {{ row: object, rowV: object|null }}
 */
export const calcPkgPrices = (base, baseV) => {
  const row = {};
  DISCOUNTS.forEach(d => {
    row[d.sessions] = String(Math.round(base * d.sessions * d.pct));
  });
  const rowV = baseV
    ? (() => {
        const r = {};
        DISCOUNTS.forEach(d => { r[d.sessions] = String(Math.round(baseV * d.sessions * d.pct)); });
        return r;
      })()
    : null;
  return { row, rowV };
};

// ── Helper CSV parsing ────────────────────────────────────────────────────────

/**
 * Parsea una línea CSV respetando comillas.
 * @param {string} line
 * @returns {string[]}
 */
export const parseCSVRow = (line) => {
  const cols = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch === '"')              { inQ = !inQ; }
    else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
    else                         { cur += ch; }
  }
  cols.push(cur.trim());
  return cols;
};

/**
 * Convierte filas CSV en objetos paciente.
 * @param {string[]} lines  — líneas del CSV (incluye header en [0])
 * @returns {{ patients: object[], error: string|null }}
 */
export const parseCSVPatients = (lines) => {
  if (lines.length < 2) return { patients: [], error: "El archivo no tiene datos" };

  const header   = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-záéíóúñ_]/gi, ""));
  const nameIdx  = header.findIndex(h => h.includes("nombre") || h === "name");
  const emailIdx = header.findIndex(h => h.includes("email")  || h.includes("correo"));
  const phoneIdx = header.findIndex(h => h.includes("tel")    || h.includes("phone") || h.includes("celular"));
  const bdIdx    = header.findIndex(h => h.includes("nacimiento") || h.includes("birthday") || h.includes("birth"));
  const dxIdx    = header.findIndex(h => h.includes("diagn"));
  const noteIdx  = header.findIndex(h => h.includes("nota")   || h.includes("note") || h.includes("obs"));

  if (nameIdx === -1) return { patients: [], error: "No se encontró columna 'nombre' en el CSV" };

  const today = todayISO();
  const patients = lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = parseCSVRow(line);
    const get  = i => (i >= 0 ? (cols[i] || "").replace(/^"|"$/g, "").trim() : "");
    return {
      id:        Math.random().toString(36).slice(2, 10),
      name:      get(nameIdx),
      email:     get(emailIdx),
      phone:     get(phoneIdx),
      birthdate: get(bdIdx),
      diagnosis: get(dxIdx),
      notes:     get(noteIdx),
      status:    "activo",
      type:      "individual",
      createdAt: today,
      sessions:  [],
    };
  }).filter(p => p.name);

  if (patients.length === 0) return { patients: [], error: "No se encontraron pacientes válidos" };
  return { patients, error: null };
};
