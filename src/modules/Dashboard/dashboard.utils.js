// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  dashboard.utils.js — Funciones puras y configuraciones estáticas           ║
// ║  Sin imports de React. Sin efectos secundarios.                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { T } from "../../theme.js";
import { fmt, fmtDate, fmtCur, todayDate } from "../../utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// SALUDO
// ─────────────────────────────────────────────────────────────────────────────
export function greeting() {
  const h = new Date().getHours();
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

// ─────────────────────────────────────────────────────────────────────────────
// FECHA FORMATEADA PARA EL BANNER
// ─────────────────────────────────────────────────────────────────────────────
export function todayFormatted() {
  const s = new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// DÍAS ENTRE DOS FECHAS (strings YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────────────────
export function daysBetween(dateStrA, dateStrB) {
  return Math.floor((new Date(dateStrB) - new Date(dateStrA)) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// UMBRAL DE 21 DÍAS (string YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────────────────
export function threshold21() {
  const d = new Date(todayDate);
  d.setDate(d.getDate() - 21);
  return fmt(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// NOMBRE DE DISPLAY DEL PSICÓLOGO
// ─────────────────────────────────────────────────────────────────────────────
export function resolveDisplayName(profile, googleUser) {
  const googleName = googleUser?.user_metadata?.full_name
    || googleUser?.user_metadata?.name
    || null;
  if (profile?.name) return profile.name.split(" ")[0];
  if (googleName)    return googleName.split(" ")[0];
  return "Psicólogo/a";
}

// ─────────────────────────────────────────────────────────────────────────────
// MES ACTUAL COMO STRING YYYY-MM
// ─────────────────────────────────────────────────────────────────────────────
export function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOY WIDGET — fecha formateada del encabezado
// ─────────────────────────────────────────────────────────────────────────────
export function todayWidgetTitle() {
  const s = new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG DE STATUS DE CITAS (HoyWidget)
// ─────────────────────────────────────────────────────────────────────────────
export const HOY_STATUS_CFG = {
  pendiente:           { label: "Pendiente",  color: T.p,   bg: T.pA   },
  completada:          { label: "Completada", color: T.suc, bg: T.sucA },
  cancelada_paciente:  { label: "Cancelada",  color: T.err, bg: T.errA ?? `${T.err}14` },
  cancelada_psicologa: { label: "Cancelada",  color: T.err, bg: T.errA ?? `${T.err}14` },
  no_asistio:          { label: "No asistió", color: T.war, bg: T.warA },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFINICIÓN DE ACCIONES RÁPIDAS — QuickBar (móvil/tablet)
// handler: null → se resuelve en runtime con onQuickNav(module, "add")
// ─────────────────────────────────────────────────────────────────────────────
export function quickBarActions({ T: theme }) {
  return [
    { label: "Nuevo Paciente",  icon: null /* inyectado en UI */, colorKey: "p",   bgKey: "pA",   module: "patients" },
    { label: "Agendar Cita",    icon: null,                        colorKey: "suc", bgKey: "sucA", module: "agenda"   },
    { label: "Registrar Pago",  icon: null,                        colorKey: "war", bgKey: "warA", module: "finance"  },
    { label: "Reporte Mensual", icon: null,                        colorKey: "acc", bgKey: "accA", module: "reports"  },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR STATS PARA StatStrip
// ─────────────────────────────────────────────────────────────────────────────
export function computeStatStrip({ patients, sessions, todayAppts, urgentCount, payments }) {
  const activePatients  = patients.filter(p => (p.status || "activo") === "activo").length;
  const completedToday  = todayAppts.filter(a => a.status === "completada").length;
  const mStr            = currentMonthStr();
  const monthlyIncome   = payments
    .filter(p => p.date?.startsWith(mStr) && p.status === "pagado")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  return { activePatients, completedToday, monthlyIncome };
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR DATOS DE QuickSidebar
// ─────────────────────────────────────────────────────────────────────────────
export function computeSidebarSummary({ patients, sessions, payments }) {
  const mStr             = currentMonthStr();
  const activePatients   = patients.filter(p => (p.status || "activo") === "activo").length;
  const thisMonthSessions = sessions.filter(s => s.date?.startsWith(mStr)).length;
  const monthlyIncome    = payments
    .filter(p => p.date?.startsWith(mStr) && p.status === "pagado")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  return { activePatients, thisMonthSessions, monthlyIncome };
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR urgentCount (riesgo + ausentes)
// ─────────────────────────────────────────────────────────────────────────────
export function computeUrgentCount({ riskAssessments, sessions, patients }) {
  const thr = threshold21();

  // Última evaluación por paciente
  const latestByPt = {};
  riskAssessments.forEach(a => {
    if (!latestByPt[a.patientId] || a.date > latestByPt[a.patientId].date)
      latestByPt[a.patientId] = a;
  });
  const riskCount = Object.values(latestByPt).filter(
    a => a.riskLevel === "alto" || a.riskLevel === "inminente"
  ).length;

  // Última sesión por paciente
  const lastSessionByPt = {};
  sessions.forEach(s => {
    if (!lastSessionByPt[s.patientId] || s.date > lastSessionByPt[s.patientId])
      lastSessionByPt[s.patientId] = s.date;
  });

  const absentCount = patients
    .filter(p => (p.status || "activo") === "activo")
    .filter(p => {
      const created = p.created_at || p.createdAt;
      if (!created) return true;
      return created < thr;
    })
    .filter(p => { const last = lastSessionByPt[p.id]; return !last || last < thr; })
    .length;

  return riskCount + absentCount;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR absentPatients para RiskRadar
// ─────────────────────────────────────────────────────────────────────────────
export function computeAbsentPatients({ patients, sessions }) {
  const thr = threshold21();

  const lastSessionByPt = {};
  sessions.forEach(s => {
    if (!lastSessionByPt[s.patientId] || s.date > lastSessionByPt[s.patientId])
      lastSessionByPt[s.patientId] = s.date;
  });

  return patients
    .filter(p => (p.status || "activo") === "activo")
    .filter(p => {
      const created = p.created_at || p.createdAt;
      if (!created) return true;
      return created < thr;
    })
    .map(p => ({ ...p, lastSession: lastSessionByPt[p.id] || null }))
    .filter(p => !p.lastSession || p.lastSession < thr)
    .sort((a, b) => {
      if (!a.lastSession) return -1;
      if (!b.lastSession) return 1;
      return a.lastSession.localeCompare(b.lastSession);
    })
    .slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR riskItems para RiskRadar
// ─────────────────────────────────────────────────────────────────────────────
export function computeRiskItems(riskAssessments) {
  const latestByPt = {};
  riskAssessments.forEach(a => {
    if (!latestByPt[a.patientId] || a.date > latestByPt[a.patientId].date)
      latestByPt[a.patientId] = a;
  });
  const ord = { inminente: 0, alto: 1, medio: 2 };
  return Object.values(latestByPt)
    .filter(a => a.riskLevel === "alto" || a.riskLevel === "medio" || a.riskLevel === "inminente")
    .sort((a, b) => (ord[a.riskLevel] ?? 3) - (ord[b.riskLevel] ?? 3))
    .slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORT de helpers de utils.js usados por subcomponentes
// (centraliza las re-exportaciones para que Dashboard.jsx no importe de 2 sitios)
// ─────────────────────────────────────────────────────────────────────────────
export { fmt, fmtDate, fmtCur, todayDate };
