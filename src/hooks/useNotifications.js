// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useNotifications.js
// FASE 2 — Extendido con Event Bus.
// Además de citas próximas, ahora reacciona en tiempo real a:
//   · risk:elevated  → alerta inmediata si nivel es alto o inminente
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

export function useNotifications(appointments) {
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
      // Conservar notificaciones de riesgo (tipo "risk") que ya están en el estado
      const riskNotifs = prev.filter(n => n.type === "risk" && !dismissed.includes(n.id));
      return [...riskNotifs, ...notifs];
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
