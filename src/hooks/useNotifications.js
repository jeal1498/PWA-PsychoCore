// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useNotifications.js
// FASE 2 — Extendido con Event Bus.
// Además de citas próximas, ahora reacciona en tiempo real a:
//   · risk:elevated  → alerta inmediata si nivel es alto o inminente
// FASE 3 — Tercer tipo de notificación:
//   · task           → tareas asignadas sin respuesta del paciente tras 48 h
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { fmt } from "../utils.js";
import { bus } from "../lib/eventBus.js";

const DISMISSED_KEY = "pc_dismissed_notifs";

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function saveDismissed(ids) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-100)));
}

// assignments: array de asignaciones de tareas (de Supabase / AppStateContext).
// El llamador debe pasarlo como segundo argumento. Ver nota al final del archivo.
export function useNotifications(appointments, assignments = []) {
  const [notifications, setNotifications] = useState([]);
  const [dismissed,     setDismissed]     = useState(getDismissed);

  // ── Notificaciones de citas (existentes) ─────────────────────────────────
  const rebuild = useCallback(() => {
    const todayStr    = fmt(new Date());
    const tomorrowStr = fmt(new Date(Date.now() + 86_400_000));
    const dayAfterStr = fmt(new Date(Date.now() + 2 * 86_400_000));

    const notifs = appointments
      .filter(a => a.status !== "completada")
      .filter(a => a.date === todayStr || a.date === tomorrowStr || a.date === dayAfterStr)
      .map(a => {
        const isToday    = a.date === todayStr;
        const isTomorrow = a.date === tomorrowStr;
        return {
          id:          `notif_${a.id}`,
          apptId:      a.id,
          type:        "appointment",
          title:       isToday ? "Cita hoy" : isTomorrow ? "Cita mañana" : "Cita en 2 días",
          body:        `${a.patientName.split(" ").slice(0,2).join(" ")} · ${a.time} · ${a.type}`,
          urgent:      isToday,
          date:        a.date,
          time:        a.time,
          patientName: a.patientName,
        };
      })
      .filter(n => !dismissed.includes(n.id))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    setNotifications(prev => {
      // Conservar notificaciones de riesgo (tipo "risk") y de tareas (tipo "task")
      // que ya están en el estado — rebuild solo reemplaza las de tipo "appointment".
      const preserved = prev.filter(
        n => (n.type === "risk" || n.type === "task") && !dismissed.includes(n.id)
      );
      return [...preserved, ...notifs];
    });
  }, [appointments, dismissed]);

  useEffect(() => { rebuild(); }, [rebuild]);

  // Rebuild cada minuto para reflejar cambios de fecha/hora
  useEffect(() => {
    const id = setInterval(rebuild, 60_000);
    return () => clearInterval(id);
  }, [rebuild]);

  // ── FASE 2: Escuchar alertas de riesgo en tiempo real ────────────────────
  useEffect(() => {
    const onRisk = ({ patientId, patientName, sessionId, level }) => {
      // Solo generar notificación para riesgo moderado, alto o inminente
      if (level === "bajo") return;

      const id = `risk_${sessionId}`;
      setNotifications(prev => {
        if (prev.some(n => n.id === id)) return prev; // evitar duplicados
        const isAlto = level === "alto" || level === "inminente";
        return [
          {
            id,
            type:        "risk",
            title:       isAlto ? "⚠️ Alerta de riesgo alto" : "⚠️ Riesgo moderado detectado",
            body:        `${(patientName||"").split(" ").slice(0,2).join(" ")} · Registrado en sesión`,
            urgent:      isAlto,
            patientId,
            patientName,
            sessionId,
            level,
          },
          ...prev,
        ];
      });
    };

    bus.on("risk:elevated", onRisk);
    return () => bus.off("risk:elevated", onRisk);
  }, []);

  // ── FASE 3: Tareas sin respuesta (≥ 48 h en estado "pending") ────────────
  useEffect(() => {
    const now   = Date.now();
    const MS_48H = 48 * 60 * 60 * 1000;

    const unanswered = (assignments || []).filter(a => {
      if (a.status !== "pending") return false;
      // Campos de fecha en orden de prioridad según estructura de Supabase:
      // assignedAt (campo personalizado) → created_at (columna estándar) → date
      const ts = a.assignedAt || a.created_at || a.createdAt || a.date;
      if (!ts) return false;
      return now - new Date(ts).getTime() >= MS_48H;
    });

    if (unanswered.length === 0) return;

    setNotifications(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const newNotifs = unanswered
        .filter(a => !existingIds.has(`task_${a.id}`) && !dismissed.includes(`task_${a.id}`))
        .map(a => ({
          id:           `task_${a.id}`,
          type:         "task",
          title:        "Tarea sin respuesta",
          body:         `${(a.patient_name || a.patientName || "Paciente").split(" ").slice(0,2).join(" ")} · Sin respuesta hace más de 48h`,
          urgent:       false,
          patientId:    a.patientId    || a.patient_id,
          patientName:  a.patient_name || a.patientName,
          assignmentId: a.id,
        }));
      if (newNotifs.length === 0) return prev;
      return [...prev, ...newNotifs];
    });
  }, [assignments, dismissed]);

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const dismiss = useCallback((id) => {
    setDismissed(prev => {
      const next = [...prev, id];
      saveDismissed(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    const ids = notifications.map(n => n.id);
    setDismissed(prev => {
      const next = [...prev, ...ids];
      saveDismissed(next);
      return next;
    });
  }, [notifications]);

  return { notifications, dismiss, dismissAll };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRACIÓN EN EL SITIO DE LLAMADA (App.jsx o el componente que use el hook)
//
// Antes:
//   const { notifications, dismiss, dismissAll } = useNotifications(appointments);
//
// Después:
//   const { notifications, dismiss, dismissAll } = useNotifications(appointments, assignments);
//
// Donde `assignments` es el array que proviene de AppStateContext / Supabase
// con las asignaciones de tareas de todos los pacientes. Si el contexto no lo
// expone aún, puedes cargarlo con:
//   const [assignments, setAssignments] = useSupabaseStorage("pc_assignments", [], userId);
// o bien usando getAssignmentsByPatient() si ya tienes esa utilidad disponible.
// ─────────────────────────────────────────────────────────────────────────────
