// ── useStats.js ───────────────────────────────────────────────────────────────
// Custom hook: all state, memos, and derived metrics for Stats.
// No JSX. No UI imports.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { fmt, todayDate } from "../../utils.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useIsWide }   from "../../hooks/useIsWide.js";
import {
  buildLast6,
  buildWeekMap,
  buildWeeks,
  buildMonthLabels,
  calcKpis,
  calcIncomeByMonth,
  calcSessionsByMonth,
  calcNewPatientsByMonth,
  calcDiagDist,
  calcTopPatients,
  calcStatusCounts,
  calcProgressDist,
  calcIncomeByService,
  calcModalityBreakdown,
  calcAltaStats,
  calcAdherencia,
  calcAdherenciaByMonth,
  calcCancByPatient,
  calcCancByMonth,
  PROG_MAP,
} from "./stats.utils.js";

// ─────────────────────────────────────────────────────────────────────────────
export function useStats({ patients, appointments, sessions, payments, services, riskAssessments, scaleResults }) {
  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  // ── Global derived ───────────────────────────────────────────────────────
  const todayStr = fmt(todayDate);

  const last6 = useMemo(() => buildLast6(6), []);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const { monthIncome, monthSess, avgPerSession, pendingAmount } = useMemo(
    () => calcKpis({ sessions, payments, todayStr }),
    [sessions, payments, todayStr]
  );

  // ── Charts — financial / volume ──────────────────────────────────────────
  const incomeByMonth = useMemo(
    () => calcIncomeByMonth(last6, payments),
    [last6, payments]
  );

  const sessionsByMonth = useMemo(
    () => calcSessionsByMonth(last6, sessions),
    [last6, sessions]
  );

  const newPatientsByMonth = useMemo(
    () => calcNewPatientsByMonth(last6, patients),
    [last6, patients]
  );

  const diagDist = useMemo(
    () => calcDiagDist(patients),
    [patients]
  );

  const topPatients = useMemo(
    () => calcTopPatients(sessions, payments),
    [sessions, payments]
  );

  const statusCounts = useMemo(
    () => calcStatusCounts(patients),
    [patients]
  );

  const progressDist = useMemo(
    () => calcProgressDist(sessions),
    [sessions]
  );

  const incomeByService = useMemo(
    () => calcIncomeByService(payments, services),
    [payments, services]
  );

  const modalityBreakdown = useMemo(
    () => calcModalityBreakdown(payments),
    [payments]
  );

  // ── ① Alta terapéutica ───────────────────────────────────────────────────
  const {
    totalPatients,
    altaPatients,
    activoPatients,
    tasaAlta,
    altaByMonth,
    avgSessActivo,
    avgSessAlta,
  } = useMemo(
    () => calcAltaStats(patients, sessions, last6),
    [patients, sessions, last6]
  );

  // ── ② Adherencia ─────────────────────────────────────────────────────────
  const {
    completedAppts,
    cancelledAppts,
    noShowAppts,
    totalPast,
    adherencia,
    tasaCancelacion,
    tasaNoShow,
  } = useMemo(
    () => calcAdherencia(appointments, sessions, todayStr),
    [appointments, sessions, todayStr]
  );

  const adherenciaByMonth = useMemo(
    () => calcAdherenciaByMonth(last6, appointments, sessions),
    [last6, appointments, sessions]
  );

  // ── ③ Cancelaciones ──────────────────────────────────────────────────────
  const cancByPatient = useMemo(
    () => calcCancByPatient(appointments, patients),
    [appointments, patients]
  );

  const cancByMonth = useMemo(
    () => calcCancByMonth(last6, appointments),
    [last6, appointments]
  );

  return {
    // layout
    isMobile,
    isWide,
    // KPIs
    monthIncome,
    monthSess,
    avgPerSession,
    pendingAmount,
    // charts
    incomeByMonth,
    sessionsByMonth,
    newPatientsByMonth,
    diagDist,
    topPatients,
    statusCounts,
    progressDist,
    incomeByService,
    modalityBreakdown,
    // alta
    totalPatients,
    altaPatients,
    activoPatients,
    tasaAlta,
    altaByMonth,
    avgSessActivo,
    avgSessAlta,
    // adherencia
    completedAppts,
    cancelledAppts,
    noShowAppts,
    totalPast,
    adherencia,
    tasaCancelacion,
    tasaNoShow,
    adherenciaByMonth,
    // cancelaciones
    cancByPatient,
    cancByMonth,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook for AdherenciaSection (patient selector + progress chart)
// ─────────────────────────────────────────────────────────────────────────────
export function useAdherenciaSection({ patients, sessions, isMobile }) {
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const activePatients = useMemo(
    () => patients.filter(p => (p.status || "activo") === "activo"),
    [patients]
  );

  const patientOptions = useMemo(() => [
    { value: "", label: "— Seleccionar paciente —" },
    ...activePatients.map(p => ({
      value: p.id,
      label: (p.name || "Sin nombre").split(" ").slice(0, 3).join(" "),
    })),
  ], [activePatients]);

  const progressData = useMemo(() => {
    if (!selectedPatientId) return [];
    return sessions
      .filter(s => s.patientId === selectedPatientId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)
      .map((s, i) => ({
        name: `S${i + 1}`,
        date: s.date,
        progreso: PROG_MAP[s.progress] ?? null,
      }));
  }, [selectedPatientId, sessions]);

  const heatmapMonths = isMobile ? 6 : 12;

  return {
    selectedPatientId,
    setSelectedPatientId,
    patientOptions,
    progressData,
    heatmapMonths,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook for AttendanceHeatmap
// ─────────────────────────────────────────────────────────────────────────────
export function useAttendanceHeatmap({ sessions, months }) {
  const weekMap = useMemo(() => buildWeekMap(sessions), [sessions]);

  const totalWeeks = Math.round(months * 4.34);

  const weeks = useMemo(() => buildWeeks(months), [totalWeeks]);

  const monthLabels = useMemo(() => buildMonthLabels(weeks), [weeks]);

  return { weekMap, weeks, monthLabels };
}
