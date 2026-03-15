import { useState, useEffect, useCallback } from "react";
import { fmt } from "../utils.js";

const DISMISSED_KEY = "pc_dismissed_notifs";

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function saveDismissed(ids) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-100)));
}

/**
 * Returns notifications for:
 *  - Appointments happening TODAY (not completed)
 *  - Appointments within the next 2 days
 */
export function useNotifications(appointments) {
  const [notifications, setNotifications] = useState([]);
  const [dismissed,     setDismissed]     = useState(getDismissed);

  const rebuild = useCallback(() => {
    const todayStr     = fmt(new Date());
    const tomorrowStr  = fmt(new Date(Date.now() + 86_400_000));
    const dayAfterStr  = fmt(new Date(Date.now() + 2 * 86_400_000));

    const notifs = appointments
      .filter(a => a.status !== "completada")
      .filter(a => a.date === todayStr || a.date === tomorrowStr || a.date === dayAfterStr)
      .map(a => {
        const isToday    = a.date === todayStr;
        const isTomorrow = a.date === tomorrowStr;
        return {
          id:       `notif_${a.id}`,
          apptId:   a.id,
          title:    isToday ? "Cita hoy" : isTomorrow ? "Cita mañana" : "Cita en 2 días",
          body:     `${a.patientName.split(" ").slice(0,2).join(" ")} · ${a.time} · ${a.type}`,
          urgent:   isToday,
          date:     a.date,
          time:     a.time,
          patientName: a.patientName,
        };
      })
      .filter(n => !dismissed.includes(n.id))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    setNotifications(notifs);
  }, [appointments, dismissed]);

  useEffect(() => { rebuild(); }, [rebuild]);

  // Rebuild every minute to catch time changes
  useEffect(() => {
    const id = setInterval(rebuild, 60_000);
    return () => clearInterval(id);
  }, [rebuild]);

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
