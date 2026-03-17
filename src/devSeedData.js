// ─────────────────────────────────────────────────────────────────────────────
// devSeedData.js — Datos de prueba para desarrollo visual
// USO: importar en App.jsx SOLO en desarrollo, eliminar antes de producción
//
// Para activar: en App.jsx reemplaza temporalmente los valores iniciales de
// useSupabaseStorage con estos datos. O úsalo como referencia para poblar
// manualmente Supabase en el entorno de prueba.
// ─────────────────────────────────────────────────────────────────────────────

// Fechas relativas a hoy (2026-03-17)
const T  = "2026-03-17"; // hoy
const T1 = "2026-03-18"; // mañana
const T2 = "2026-03-19";
const T3 = "2026-03-20";
const T_1 = "2026-03-16"; // ayer
const T_3 = "2026-03-14";
const T_7 = "2026-03-10";
const T_14= "2026-03-03";
const T_30= "2026-02-15";
const T_60= "2026-01-16";

// ── PERFIL ────────────────────────────────────────────────────────────────────
export const SEED_PROFILE = {
  name:      "Dra. Karen Trujillo",
  specialty: "Neuropsicología Clínica",
  cedula:    "8547123",
  phone:     "998-134-8558",
  email:     "karen@psychocore.app",
  clinic:    "Centro de Neuropsicología Cancún",
  initials:  "KT",
  rfc:       "TUKA850312XX4",
};

// ── PACIENTES ─────────────────────────────────────────────────────────────────
export const SEED_PATIENTS = [
  {
    id: "p001", name: "Sofía Ramírez Vega", birthdate: "1992-04-15", age: 33,
    phone: "9981234567", email: "sofia.rv@gmail.com",
    diagnosis: "Trastorno de ansiedad generalizada (TAG)", cie11Code: "6B00",
    reason: "Preocupación excesiva, dificultad para dormir y tensión muscular crónica.",
    notes: "Paciente muy motivada. Responde bien a TCC.",
    status: "activo", type: "individual", rate: "900",
    createdAt: T_60, consent: { signed: true, signedAt: T_60, expiresAt: "2027-01-16" },
  },
  {
    id: "p002", name: "Carlos Mendoza López", birthdate: "1988-11-02", age: 37,
    phone: "9987654321", email: "cmendoza@hotmail.com",
    diagnosis: "Episodio depresivo moderado", cie11Code: "6A70",
    reason: "Ánimo bajo persistente, anhedonia y dificultades laborales.",
    notes: "Pendiente evaluación neuropsicológica completa.",
    status: "activo", type: "individual", rate: "900",
    createdAt: T_30, consent: { signed: true, signedAt: T_30, expiresAt: "2027-02-15" },
  },
  {
    id: "p003", name: "Valentina Cruz Torres", birthdate: "2005-07-28", age: 20,
    phone: "9983456789", email: "vale.cruz@gmail.com",
    diagnosis: "TDAH presentación combinada", cie11Code: "6A01",
    reason: "Dificultades académicas, inatención e impulsividad.",
    notes: "Coordinación con escuela en proceso.",
    status: "activo", type: "individual", rate: "800",
    createdAt: T_14, consent: { signed: false },
  },
  {
    id: "p004", name: "Roberto Fuentes García", birthdate: "1975-03-19", age: 51,
    phone: "9989876543", email: "rfuentes@empresa.com",
    diagnosis: "Trastorno de estrés postraumático", cie11Code: "6B40",
    reason: "Evento traumático laboral hace 8 meses. Flashbacks y evitación.",
    notes: "Inicio de protocolo EMDR en sesión 3.",
    status: "activo", type: "individual", rate: "1000",
    createdAt: T_30, consent: { signed: true, signedAt: T_30, expiresAt: "2027-02-15" },
  },
  {
    id: "p005", name: "Ana Lucía Herrera Díaz", birthdate: "1998-09-05", age: 27,
    phone: "9984567890", email: "analucia.h@gmail.com",
    diagnosis: "Trastorno límite de personalidad", cie11Code: "6D10",
    reason: "Inestabilidad emocional, relaciones conflictivas y conductas de riesgo.",
    notes: "Protocolo DBT. Alta adherencia.",
    status: "activo", type: "individual", rate: "900",
    createdAt: T_60, consent: { signed: true, signedAt: T_60, expiresAt: "2027-01-16" },
  },
  {
    id: "p006", name: "Miguel Ángel Ruiz Soto", birthdate: "1990-01-14", age: 36,
    phone: "9982345678", email: "maruiz@gmail.com",
    diagnosis: "TOC — compulsiones de verificación", cie11Code: "6B20",
    reason: "Rituales de verificación que ocupan 3+ horas diarias.",
    notes: "Inicio EPR sesión 4. SUDS promedio 70.",
    status: "activo", type: "individual", rate: "900",
    createdAt: T_14,
  },
  {
    id: "p007", name: "Daniela Morales Peña", birthdate: "2001-12-03", age: 24,
    phone: "9981122334", email: "dmorales@gmail.com",
    diagnosis: "Fobia social (trastorno de ansiedad social)", cie11Code: "6B04",
    reason: "Evitación de situaciones sociales, miedo intenso al juicio ajeno.",
    notes: "",
    status: "alta", type: "individual", rate: "800",
    createdAt: T_60, consent: { signed: true, signedAt: T_60, expiresAt: "2027-01-16" },
  },
  {
    id: "p008", name: "García-Noriega (Pareja)", birthdate: "", age: null,
    phone: "9985544332", email: "",
    diagnosis: "Disfunción de relación de pareja", cie11Code: "",
    reason: "Conflictos de comunicación recurrentes y distancia emocional.",
    notes: "Ambos asisten. Ciclo perseguidor-distante presente.",
    status: "activo", type: "pareja", rate: "1200",
    createdAt: T_14,
  },
];

// ── CITAS ─────────────────────────────────────────────────────────────────────
export const SEED_APPOINTMENTS = [
  // HOY
  { id: "a001", patientId: "p001", patientName: "Sofía Ramírez Vega",      date: T,   time: "09:00", duration: 50, type: "Consulta individual", status: "pendiente",  notes: "" },
  { id: "a002", patientId: "p002", patientName: "Carlos Mendoza López",     date: T,   time: "10:00", duration: 50, type: "Consulta individual", status: "pendiente",  notes: "" },
  { id: "a003", patientId: "p005", patientName: "Ana Lucía Herrera Díaz",   date: T,   time: "12:00", duration: 50, type: "Consulta individual", status: "completada", notes: "" },
  { id: "a004", patientId: "p008", patientName: "García-Noriega (Pareja)",  date: T,   time: "17:00", duration: 80, type: "Terapia de pareja",    status: "pendiente",  notes: "" },
  // MAÑANA
  { id: "a005", patientId: "p003", patientName: "Valentina Cruz Torres",    date: T1,  time: "09:00", duration: 50, type: "Consulta individual", status: "pendiente",  notes: "" },
  { id: "a006", patientId: "p004", patientName: "Roberto Fuentes García",   date: T1,  time: "11:00", duration: 50, type: "Consulta individual", status: "pendiente",  notes: "" },
  { id: "a007", patientId: "p006", patientName: "Miguel Ángel Ruiz Soto",   date: T1,  time: "16:00", duration: 50, type: "Consulta individual", status: "pendiente",  notes: "" },
  // PRÓXIMOS DÍAS
  { id: "a008", patientId: "p001", patientName: "Sofía Ramírez Vega",      date: T2,  time: "09:00", duration: 50, type: "Consulta individual", status: "pendiente",  notes: "" },
  { id: "a009", patientId: "p002", patientName: "Carlos Mendoza López",     date: T3,  time: "10:00", duration: 50, type: "Consulta individual", status: "pendiente",  notes: "" },
  // PASADAS
  { id: "a010", patientId: "p001", patientName: "Sofía Ramírez Vega",      date: T_1, time: "09:00", duration: 50, type: "Consulta individual", status: "completada", notes: "" },
  { id: "a011", patientId: "p004", patientName: "Roberto Fuentes García",   date: T_3, time: "11:00", duration: 50, type: "Consulta individual", status: "completada", notes: "" },
  { id: "a012", patientId: "p007", patientName: "Daniela Morales Peña",     date: T_7, time: "10:00", duration: 50, type: "Seguimiento post-alta", status: "pendiente", notes: "" },
];

// ── SESIONES ──────────────────────────────────────────────────────────────────
export const SEED_SESSIONS = [
  {
    id: "s001", patientId: "p001", patientName: "Sofía Ramírez Vega",
    date: T_1, duration: 50, mood: "moderado", progress: "bueno",
    noteFormat: "SOAP",
    structured: {
      S: "Paciente refiere ansiedad de 6/10 esta semana. Mejor sueño con técnica de respiración. Sigue preocupada por el trabajo.",
      O: "Afecto moderado, contacto visual adecuado. No agitación visible.",
      A: "TAG en mejoría gradual. Responde bien a reestructuración cognitiva.",
      P: "Continuar autorregistro. Próxima sesión: exposición a situación laboral.",
    },
    notes: "[S] Paciente refiere ansiedad de 6/10...",
    tags: ["TCC", "ansiedad", "respiración"],
    tasksAssigned: ["autorregistro"],
    taskCompleted: true, privateNotes: "",
  },
  {
    id: "s002", patientId: "p002", patientName: "Carlos Mendoza López",
    date: T_3, duration: 50, mood: "bajo", progress: "moderado",
    noteFormat: "DAP",
    structured: {
      D: "Paciente reportó ánimo de 4/10. Completó 2 de 5 actividades asignadas. Duerme 10h pero sigue sin energía.",
      A: "Episodio depresivo moderado persistente. Pensamiento dicotómico activo.",
      P: "Activación conductual: agregar 1 actividad placentera diaria. Registro de pensamientos automáticos.",
    },
    notes: "[D] Paciente reportó ánimo de 4/10...",
    tags: ["depresión", "activación conductual"],
    tasksAssigned: [], taskCompleted: false, privateNotes: "Considerar derivación a psiquiatría si no mejora en 2 sesiones.",
  },
  {
    id: "s003", patientId: "p005", patientName: "Ana Lucía Herrera Díaz",
    date: T, duration: 50, mood: "moderado", progress: "bueno",
    noteFormat: "BIRP",
    structured: {
      B: "Paciente llega con afecto estable (6/10). Reportó crisis de intensidad 7 el jueves pasado.",
      I: "Análisis en cadena del episodio. Se identificaron puntos de intervención. Práctica de habilidad TIPP.",
      R: "Paciente logra identificar detonante (crítica de pareja). Compromiso con uso de habilidades.",
      P: "Registro de emociones diario. Próxima sesión: validación y regulación.",
    },
    notes: "[B] Paciente llega con afecto estable...",
    tags: ["DBT", "TLP", "regulación emocional"],
    tasksAssigned: [], taskCompleted: null, privateNotes: "",
  },
  {
    id: "s004", patientId: "p004", patientName: "Roberto Fuentes García",
    date: T_3, duration: 50, mood: "bajo", progress: "moderado",
    noteFormat: "SOAP",
    structured: {
      S: "3 flashbacks esta semana. Evitó ir a la planta de producción. Angustia 8/10.",
      O: "Hipervigilancia visible. Sobresalto al ruido del pasillo. Contacto visual intermitente.",
      A: "TEPT moderado. Respuesta inicial a EMDR. Procesamiento de memoria objetivo incompleto.",
      P: "Continuar procesamiento sesión 4. Técnica de grounding diaria. Evitar exposición no planificada.",
    },
    notes: "[S] 3 flashbacks esta semana...",
    tags: ["TEPT", "EMDR", "trauma"],
    tasksAssigned: [], taskCompleted: null, privateNotes: "Paciente en riesgo moderado. Revisar plan de seguridad.",
  },
  {
    id: "s005", patientId: "p006", patientName: "Miguel Ángel Ruiz Soto",
    date: T_7, duration: 50, mood: "moderado", progress: "bueno",
    noteFormat: "libre",
    notes: "Se trabajó EPR ítem 3 (verificar que la puerta esté cerrada). SUDS inicial 75, final 40. Paciente toleró sin ejecutar compulsión. Gran avance respecto sesión anterior.",
    tags: ["TOC", "EPR"],
    tasksAssigned: [], taskCompleted: true, privateNotes: "",
  },
];

// ── PAGOS ─────────────────────────────────────────────────────────────────────
export const SEED_PAYMENTS = [
  { id: "pay001", patientId: "p001", patientName: "Sofía Ramírez Vega",    date: T,    amount: 900,  status: "pagado",    concept: "Sesión individual", method: "Transferencia" },
  { id: "pay002", patientId: "p002", patientName: "Carlos Mendoza López",   date: T,    amount: 900,  status: "pendiente", concept: "Sesión individual", method: "" },
  { id: "pay003", patientId: "p005", patientName: "Ana Lucía Herrera Díaz", date: T,    amount: 900,  status: "pagado",    concept: "Sesión individual", method: "Efectivo" },
  { id: "pay004", patientId: "p004", patientName: "Roberto Fuentes García", date: T_1,  amount: 1000, status: "pagado",    concept: "Sesión individual", method: "Transferencia" },
  { id: "pay005", patientId: "p001", patientName: "Sofía Ramírez Vega",    date: T_3,  amount: 900,  status: "pagado",    concept: "Sesión individual", method: "Transferencia" },
  { id: "pay006", patientId: "p006", patientName: "Miguel Ángel Ruiz Soto", date: T_7,  amount: 900,  status: "pagado",    concept: "Sesión individual", method: "Efectivo" },
  { id: "pay007", patientId: "p003", patientName: "Valentina Cruz Torres",  date: T_7,  amount: 800,  status: "pendiente", concept: "Sesión individual", method: "" },
  { id: "pay008", patientId: "p008", patientName: "García-Noriega (Pareja)",date: T_14, amount: 1200, status: "pagado",    concept: "Terapia de pareja",  method: "Transferencia" },
  { id: "pay009", patientId: "p002", patientName: "Carlos Mendoza López",   date: T_14, amount: 900,  status: "pagado",    concept: "Sesión individual", method: "Efectivo" },
  { id: "pay010", patientId: "p005", patientName: "Ana Lucía Herrera Díaz", date: T_14, amount: 900,  status: "pagado",    concept: "Sesión individual", method: "Transferencia" },
];

// ── EVALUACIONES DE RIESGO ────────────────────────────────────────────────────
export const SEED_RISK_ASSESSMENTS = [
  {
    id: "ra001", patientId: "p005", patientName: "Ana Lucía Herrera Díaz",
    date: T_3, evaluatedBy: "session", sessionId: "s003",
    suicidalIdeation: "pasiva", selfHarm: "activa", harmToOthers: false,
    hasPlan: false, hasMeans: false, hasIntent: false, previousAttempts: 1,
    protectiveFactors: ["familia", "tratamiento"],
    riskLevel: "moderado",
    clinicalNotes: "Autolesiones superficiales como regulación emocional. Sin intención suicida activa.",
    safetyPlan: {
      warningSignals: "Críticas de pareja, soledad nocturna",
      copingStrategies: "Llamar a terapeuta, técnica TIPP, hielo",
      supportContacts: "Mamá: 998-xxx-xxxx",
      professionalContacts: "Dra. Karen: 998-134-8558",
      environmentSafety: "Retirar objetos cortantes del baño",
      reasonsToLive: "Su perro, sus metas profesionales",
    },
  },
  {
    id: "ra002", patientId: "p004", patientName: "Roberto Fuentes García",
    date: T_7, evaluatedBy: "session", sessionId: "s004",
    suicidalIdeation: "ninguna", selfHarm: "ninguna", harmToOthers: false,
    hasPlan: false, hasMeans: false, hasIntent: false, previousAttempts: 0,
    protectiveFactors: ["trabajo", "hijos", "tratamiento"],
    riskLevel: "bajo",
    clinicalNotes: "Sin ideación activa. Monitorear dada severidad del TEPT.",
    safetyPlan: { warningSignals: "", copingStrategies: "", supportContacts: "", professionalContacts: "", environmentSafety: "", reasonsToLive: "" },
  },
];

// ── RESULTADOS DE ESCALAS ─────────────────────────────────────────────────────
export const SEED_SCALE_RESULTS = [
  {
    id: "sc001", patientId: "p001", patientName: "Sofía Ramírez Vega",
    date: T_30, scaleId: "gad7", scaleName: "GAD-7",
    scores: { total: 14 }, interpretation: "Ansiedad moderada",
    notes: "Inicio de tratamiento.",
  },
  {
    id: "sc002", patientId: "p001", patientName: "Sofía Ramírez Vega",
    date: T_7, scaleId: "gad7", scaleName: "GAD-7",
    scores: { total: 9 }, interpretation: "Ansiedad leve",
    notes: "Mejoría significativa tras 7 sesiones.",
  },
  {
    id: "sc003", patientId: "p002", patientName: "Carlos Mendoza López",
    date: T_14, scaleId: "phq9", scaleName: "PHQ-9",
    scores: { total: 16 }, interpretation: "Depresión moderadamente severa",
    notes: "Inicio de tratamiento.",
  },
];

// ── PLANES DE TRATAMIENTO ─────────────────────────────────────────────────────
export const SEED_TREATMENT_PLANS = [
  {
    id: "tp001", patientId: "p001", patientName: "Sofía Ramírez Vega",
    startDate: T_60, status: "activo",
    diagnosis: "Trastorno de ansiedad generalizada (TAG)", cie11Code: "6B00",
    approach: "Terapia Cognitivo-Conductual (TCC)",
    objectives: [
      { id: "o1", text: "Reducir nivel de ansiedad de 8/10 a 4/10 en 12 semanas", achieved: false },
      { id: "o2", text: "Implementar técnicas de regulación emocional diarias", achieved: true },
      { id: "o3", text: "Retomar actividades evitadas por ansiedad", achieved: false },
    ],
    estimatedSessions: 16,
    notes: "Buena respuesta. Revisar objetivos en sesión 10.",
  },
];

// ── INTER-SESIONES ────────────────────────────────────────────────────────────
export const SEED_INTER_SESSIONS = [
  {
    id: "is001", patientId: "p001", date: T_3,
    type: "llamada", notes: "Paciente llamó por crisis de ansiedad leve. Se aplicó respiración guiada por teléfono. Duración 10 min.",
    duration: 10,
  },
];

// ── MEDICAMENTOS ──────────────────────────────────────────────────────────────
export const SEED_MEDICATIONS = [
  {
    id: "med001", patientId: "p002", patientName: "Carlos Mendoza López",
    name: "Sertralina", dose: "50mg", frequency: "Una vez al día",
    prescribedBy: "Dr. Álvarez (Psiquiatría)", startDate: T_14,
    notes: "Revisión en 4 semanas.",
  },
];
