// ── stats.utils.js ────────────────────────────────────────────────────────────
// Pure helpers: constants, cellColor, metric calculations.
// No React imports. No JSX.
// ─────────────────────────────────────────────────────────────────────────────

import { T, MONTHS_ES } from "../../theme.js";
import { fmtCur, fmt, todayDate } from "../../utils.js";

// ── Heat-map color scale ───────────────────────────────────────────────────────
export const HM_EMPTY  = T.bdrL;
export const HM_1      = "#5DCAA5";
export const HM_2      = "#1D9E75";
export const HM_3      = "#0F6E56";
export const HM_0_DARK = "#2a3d38"; // dark mode fallback only

export function cellColor(count) {
  if (!count) return HM_0_DARK;
  if (count === 1) return HM_1;
  if (count === 2) return HM_2;
  return HM_3;
}

// ── Progress category colors ───────────────────────────────────────────────────
export const PROG_MEJORA    = "#2D9B91";
export const PROG_ESTABLE   = T.tl;
export const PROG_RETROCESO = T.err;

// ── Progress numeric map (for recharts AreaChart) ─────────────────────────────
export const PROG_MAP = { mejora: 3, estable: 2, retroceso: 1 };

// ── Diagnosis colors ───────────────────────────────────────────────────────────
// Computed lazily so T is ready; call getDiagColors() in component.
export function getDiagColors() {
  return [T.p, T.acc, T.suc, "#6B5B9E", T.war, T.err];
}

// ── Date helpers ───────────────────────────────────────────────────────────────
/** Returns the last `n` months as { year, month, label } objects, oldest first. */
export function buildLast6(n = 6) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS_ES[d.getMonth()].slice(0, 3) };
  });
}

/** "YYYY-MM" prefix string for a { year, month } object. */
export function monthPrefix({ year, month }) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

// ── Heatmap week builders ──────────────────────────────────────────────────────
/**
 * Returns a Map<"YYYY-WW", count> from an array of sessions.
 * Pure function — no hooks.
 */
export function buildWeekMap(sessions) {
  const map = {};
  sessions.forEach(s => {
    if (!s.date) return;
    const d = new Date(s.date + "T12:00:00");
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-${String(week).padStart(2, "0")}`;
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

/**
 * Returns an array of { key, date } week objects covering the last `months` months.
 * Pure function — no hooks.
 */
export function buildWeeks(months) {
  const today = new Date();
  const totalWeeks = Math.round(months * 4.34);
  const result = [];
  for (let i = totalWeeks - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const jan1 = new Date(monday.getFullYear(), 0, 1);
    const week = Math.ceil(((monday - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${monday.getFullYear()}-${String(week).padStart(2, "0")}`;
    result.push({ key, date: new Date(monday) });
  }
  return result;
}

/**
 * Derives month-label positions from a weeks array.
 * Pure function — no hooks.
 */
export function buildMonthLabels(weeks) {
  const seen = new Set();
  const labels = [];
  weeks.forEach((w, i) => {
    const m = w.date.getMonth();
    const y = w.date.getFullYear();
    const key = `${y}-${m}`;
    if (!seen.has(key)) {
      seen.add(key);
      labels.push({ index: i, label: MONTHS_ES[m].slice(0, 3) });
    }
  });
  return labels;
}

// ── Metric calculations ────────────────────────────────────────────────────────

/** KPI scalars — no useMemo needed, call inside useMemo in the hook. */
export function calcKpis({ sessions, payments, todayStr }) {
  const thisMonth     = todayStr.slice(0, 7);
  const monthIncome   = payments.filter(p => p.status === "pagado" && p.date.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0);
  const monthSess     = sessions.filter(s => s.date.startsWith(thisMonth)).length;
  const totalIncome   = payments.filter(p => p.status === "pagado").reduce((s, p) => s + Number(p.amount), 0);
  const avgPerSession = sessions.length > 0 ? Math.round(totalIncome / sessions.length) : 0;
  const pendingAmount = payments.filter(p => p.status === "pendiente").reduce((s, p) => s + Number(p.amount), 0);
  return { monthIncome, monthSess, avgPerSession, pendingAmount, totalIncome };
}

export function calcIncomeByMonth(last6, payments) {
  return last6.map(m => {
    const ms = monthPrefix(m);
    const val = payments.filter(p => p.status === "pagado" && p.date.startsWith(ms)).reduce((s, p) => s + Number(p.amount), 0);
    return { label: m.label, value: val };
  });
}

export function calcSessionsByMonth(last6, sessions) {
  return last6.map(m => ({
    label: m.label,
    value: sessions.filter(s => s.date.startsWith(monthPrefix(m))).length,
  }));
}

export function calcNewPatientsByMonth(last6, patients) {
  return last6.map(m => ({
    label: m.label,
    value: patients.filter(p => (p.createdAt || "").startsWith(monthPrefix(m))).length,
  }));
}

export function calcDiagDist(patients) {
  const map = {};
  patients.forEach(p => {
    const key = (p.diagnosis || "Sin diagnóstico").split("—")[0].split("–")[0].split("(")[0].trim().slice(0, 45);
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

export function calcTopPatients(sessions, payments) {
  const map = {};
  sessions.forEach(s => {
    if (!map[s.patientId]) map[s.patientId] = { name: s.patientName, sessions: 0, income: 0 };
    map[s.patientId].sessions++;
  });
  payments.filter(p => p.status === "pagado").forEach(p => {
    if (map[p.patientId]) map[p.patientId].income += Number(p.amount);
  });
  return Object.values(map).sort((a, b) => b.sessions - a.sessions).slice(0, 5);
}

export function calcStatusCounts(patients) {
  const activo = patients.filter(p => (p.status || "activo") === "activo").length;
  const pausa  = patients.filter(p => p.status === "pausa").length;
  const alta   = patients.filter(p => p.status === "alta").length;
  return [
    { label: "Activos",  value: activo, color: T.suc },
    { label: "En pausa", value: pausa,  color: T.war },
    { label: "Alta",     value: alta,   color: T.tl  },
  ].filter(s => s.value > 0);
}

export function calcProgressDist(sessions) {
  const map = { excelente: 0, bueno: 0, moderado: 0, bajo: 0 };
  sessions.forEach(s => { if (map[s.progress] !== undefined) map[s.progress]++; });
  return Object.entries(map).map(([k, v]) => ({ label: k, value: v }));
}

export function calcIncomeByService(payments, services) {
  if (!services.length) return [];
  const map = {};
  payments.filter(p => p.status === "pagado").forEach(p => {
    const key = p.concept || "Otro";
    map[key] = (map[key] || 0) + Number(p.amount);
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label: label.length > 20 ? label.slice(0, 18) + "…" : label, value }));
}

export function calcModalityBreakdown(payments) {
  const presencial = payments.filter(p => p.status === "pagado" && p.modality === "presencial").reduce((s, p) => s + Number(p.amount), 0);
  const virtual    = payments.filter(p => p.status === "pagado" && p.modality === "virtual").reduce((s, p) => s + Number(p.amount), 0);
  const sinDato    = payments.filter(p => p.status === "pagado" && !p.modality).reduce((s, p) => s + Number(p.amount), 0);
  return [
    { label: "Presencial", value: presencial, color: T.suc },
    { label: "Virtual",    value: virtual,    color: T.p   },
    ...(sinDato > 0 ? [{ label: "Sin dato", value: sinDato, color: T.tl }] : []),
  ].filter(d => d.value > 0);
}

export function calcAltaStats(patients, sessions, last6) {
  const totalPatients  = patients.length;
  const altaPatients   = patients.filter(p => p.status === "alta").length;
  const activoPatients = patients.filter(p => (p.status || "activo") === "activo").length;
  const tasaAlta       = totalPatients > 0 ? (altaPatients / totalPatients) * 100 : 0;

  const altaByMonth = last6.map(m => {
    const ms = monthPrefix(m);
    const altaPats = patients.filter(p => p.status === "alta");
    const count = altaPats.filter(p => {
      const lastSess = [...sessions.filter(s => s.patientId === p.id)].sort((a, b) => b.date.localeCompare(a.date))[0];
      return lastSess?.date?.startsWith(ms);
    }).length;
    return { label: m.label, value: count };
  });

  const activoPats = patients.filter(p => (p.status || "activo") === "activo");
  const avgSessActivo = activoPats.length
    ? Math.round(activoPats.reduce((acc, p) => acc + sessions.filter(s => s.patientId === p.id).length, 0) / activoPats.length)
    : 0;

  const altaPats = patients.filter(p => p.status === "alta");
  const avgSessAlta = altaPats.length
    ? Math.round(altaPats.reduce((acc, p) => acc + sessions.filter(s => s.patientId === p.id).length, 0) / altaPats.length)
    : 0;

  return { totalPatients, altaPatients, activoPatients, tasaAlta, altaByMonth, avgSessActivo, avgSessAlta };
}

export function calcAdherencia(appointments, sessions, todayStr) {
  const pastAppts      = appointments.filter(a => a.date < todayStr);
  const completedAppts = pastAppts.filter(a =>
    a.status === "completed" || a.status === "realizada" ||
    sessions.some(s => s.patientId === a.patientId && s.date === a.date)
  );
  const cancelledAppts = pastAppts.filter(a => a.status === "cancelled" || a.status === "cancelada");
  const noShowAppts    = pastAppts.filter(a => a.status === "no-show" || a.status === "inasistencia");
  const totalPast      = pastAppts.length;
  const adherencia     = totalPast > 0 ? (completedAppts.length / totalPast) * 100 : 0;
  const tasaCancelacion = totalPast > 0 ? (cancelledAppts.length / totalPast) * 100 : 0;
  const tasaNoShow     = totalPast > 0 ? (noShowAppts.length / totalPast) * 100 : 0;
  return { pastAppts, completedAppts, cancelledAppts, noShowAppts, totalPast, adherencia, tasaCancelacion, tasaNoShow };
}

export function calcAdherenciaByMonth(last6, appointments, sessions) {
  return last6.map(m => {
    const ms        = monthPrefix(m);
    const sched     = appointments.filter(a => a.date.startsWith(ms)).length;
    const realiz    = sessions.filter(s => s.date.startsWith(ms)).length;
    const cancelled = appointments.filter(a => a.date.startsWith(ms) && (a.status === "cancelled" || a.status === "cancelada")).length;
    return { label: m.label, completed: realiz, cancelled, pending: Math.max(0, sched - realiz - cancelled) };
  });
}

export function calcCancByPatient(appointments, patients) {
  const map = {};
  appointments
    .filter(a => a.status === "cancelled" || a.status === "cancelada")
    .forEach(a => {
      const name = patients.find(p => p.id === a.patientId)?.name || a.patientName || "Desconocido";
      map[a.patientId] = { name, count: (map[a.patientId]?.count || 0) + 1 };
    });
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
}

export function calcCancByMonth(last6, appointments) {
  return last6.map(m => ({
    label: m.label,
    value: appointments.filter(a => a.date.startsWith(monthPrefix(m)) && (a.status === "cancelled" || a.status === "cancelada")).length,
  }));
}
