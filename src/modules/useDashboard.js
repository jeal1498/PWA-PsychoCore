// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  useDashboard.js — Estado, efectos, memos y datos derivados                 ║
// ║  Sin JSX. Sin imports de componentes UI.                                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useIsWide }   from "../../hooks/useIsWide.js";
import { fmt, todayDate } from "../../utils.js";
import {
  computeUrgentCount,
  computeAbsentPatients,
  computeRiskItems,
  computeStatStrip,
  computeSidebarSummary,
  threshold21,
} from "./dashboard.utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function useDashboard({
  patients,
  appointments,
  sessions,
  payments,
  riskAssessments,
  assignments,
}) {
  // ── Responsive ─────────────────────────────────────────────────────────────
  const isMobileHook = useIsMobile();
  const [winWidth, setWinWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handler = () => setWinWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  // Guard adicional: layout de 2 col y StatStrip nunca en < 768px
  const isMobile = isMobileHook || winWidth < 768;
  const isWide   = useIsWide();

  // ── Fecha de hoy ────────────────────────────────────────────────────────────
  const todayStr = fmt(todayDate);

  // ── Pending tasks (local, desde prop assignments) ──────────────────────────
  const pendingTasks = useMemo(
    () => assignments.filter(a => a.status === "pending").length,
    [assignments]
  );

  // ── Citas de hoy ───────────────────────────────────────────────────────────
  const todayAppts = useMemo(() =>
    appointments
      .filter(a => a.date === todayStr)
      .sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [appointments, todayStr]
  );

  // ── Próxima cita futura (solo si no hay citas hoy) ─────────────────────────
  const nextAppt = useMemo(() => {
    if (todayAppts.length > 0) return null;
    return appointments
      .filter(a => a.date > todayStr && a.status === "pendiente")
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""))[0] || null;
  }, [appointments, todayStr, todayAppts]);

  // ── Urgentes (riesgo + ausentes con guard 21 días) ─────────────────────────
  const urgentCount = useMemo(() =>
    computeUrgentCount({ riskAssessments, sessions, patients }),
    [riskAssessments, sessions, patients]
  );

  // ── Datos para RiskRadar ────────────────────────────────────────────────────
  const riskItems = useMemo(() =>
    computeRiskItems(riskAssessments),
    [riskAssessments]
  );

  const absentPatients = useMemo(() =>
    computeAbsentPatients({ patients, sessions }),
    [patients, sessions]
  );

  // ── Stats para StatStrip ───────────────────────────────────────────────────
  const statStrip = useMemo(() =>
    computeStatStrip({ patients, sessions, todayAppts, urgentCount, payments }),
    [patients, sessions, todayAppts, urgentCount, payments]
  );

  // ── Stats para QuickSidebar ────────────────────────────────────────────────
  const sidebarSummary = useMemo(() =>
    computeSidebarSummary({ patients, sessions, payments }),
    [patients, sessions, payments]
  );

  // ── Layout helper ──────────────────────────────────────────────────────────
  const gridGap = isMobile ? 10 : 14;

  return {
    // responsive
    isMobile,
    isWide,
    gridGap,
    // fechas
    todayStr,
    // derivados
    pendingTasks,
    todayAppts,
    nextAppt,
    urgentCount,
    riskItems,
    absentPatients,
    statStrip,
    sidebarSummary,
  };
}
