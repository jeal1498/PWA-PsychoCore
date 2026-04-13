// ── agenda.utils.js ──────────────────────────────────────────────────────────
// Funciones puras, constantes y STATUS_CONFIG para el módulo Agenda.
// Sin imports de React. Sin JSX.
// ─────────────────────────────────────────────────────────────────────────────

import { T } from "../../theme.js";
import { uid, fmt, fmtDate } from "../../utils.js";

// ── Colores categóricos locales (no pertenecen al tema) ──────────────────────
export const LAVANDA   = "#6B5B9E";
export const LAVANDA_A = "rgba(107,91,158,0.1)";
export const AZUL      = "#5B8DB8";
export const AZUL_A    = "rgba(91,141,184,0.12)";

// ── Configuración de estados de cita (Sección 2.6 y 4 del Flujo Clínico) ─────
export const STATUS_CONFIG = {
  pendiente:           { label:"Pendiente",             color:T.war,    bg:T.warA    },
  confirmada:          { label:"Confirmada ✓",          color:T.suc,    bg:T.sucA    },
  completada:          { label:"Completada",            color:T.suc,    bg:T.sucA    },
  solicitud_cambio:    { label:"Solicitud cambio 🔔",   color:T.err,    bg:T.errA    },
  cancelada_paciente:  { label:"Cancelada (paciente)",  color:T.tl,     bg:T.bdrL    },
  cancelada_psicologa: { label:"Cancelada (psicóloga)", color:LAVANDA,  bg:LAVANDA_A },
  no_presentado:       { label:"No presentado",         color:T.err,    bg:T.errA    },
};

// ── Horas de trabajo ──────────────────────────────────────────────────────────
export const WORK_HOURS = [8,9,10,11,12,13,14,15,16,17,18,19];

// ── Horas para la Vista Día (08:00–20:00) ────────────────────────────────────
export const DAY_HOURS = [8,9,10,11,12,13,14,15,16,17,18,19,20];

// ── Mensaje WhatsApp de recordatorio de cita ─────────────────────────────────
export function whatsappReminder(appointment, patient, profile) {
  const nombre    = patient?.name?.split(" ")[0] || appointment.patientName?.split(" ")[0] || "";
  const phone     = patient?.phone?.replace(/\D/g, "");
  const fecha     = fmtDate(appointment.date);
  const hora      = appointment.time;
  const tipo      = appointment.type || "consulta";
  const psicologa = profile?.name?.trim() || "tu psicóloga";
  const clinica   = profile?.clinic
    ? ` en ${profile.clinic}`
    : profile?.address
      ? ` en ${profile.address}`
      : "";

  if (!phone) return null;

  const msg = encodeURIComponent(
    `Hola ${nombre} 👋\n\nTe escribo para recordarte tu cita de *${tipo}* programada para:\n\n📅 *${fecha}* a las *${hora}*${clinica}\n\nSi necesitas reagendar o tienes alguna duda, no dudes en escribirme.\n\n¡Hasta pronto! 😊\n— ${psicologa}`
  );
  return `https://wa.me/${phone}?text=${msg}`;
}

// ── Mensaje WhatsApp de cancelación ──────────────────────────────────────────
export function whatsappCancel(appt, patient, profile) {
  const nombre    = patient?.name?.split(" ")[0] || "";
  const phone     = patient?.phone?.replace(/\D/g, "");
  const fecha     = fmtDate(appt.date);
  const psicologa = profile?.name?.trim() || "tu psicóloga";
  if (!phone) return null;
  const msg = encodeURIComponent(
    `Hola ${nombre} 🙏\n\nLamentamos informarte que necesitamos reprogramar tu sesión del *${fecha}*. Por favor escríbenos para coordinar una nueva fecha. Disculpa los inconvenientes.\n\n— ${psicologa}`
  );
  return `https://wa.me/${phone}?text=${msg}`;
}

// ── Construir slots de tiempo según horario del perfil ───────────────────────
// dayKey opcional: "L","M","Mi","J","V","S","D"
// Si el perfil tiene schedule granular por día, lo usa; si no, cae al rango global.
// El intervalo entre slots respeta profile.durationMin (configurado en onboarding).
export function buildTimeSlots(profile, dayKey = null) {
  // Usar la duración de sesión configurada en onboarding como intervalo.
  // durationMin se guarda en el perfil durante el onboarding (30, 45, 60, 90, 120).
  // Fallback a 30 min si aún no está configurado.
  const step = (profile?.durationMin && profile.durationMin > 0) ? profile.durationMin : 30;

  const fallbackSlots = (start, end) => {
    const [sh, sm] = (start || "08:00").split(":").map(Number);
    const [eh, em] = (end   || "20:00").split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    const slots = [];
    for (let m = startMin; m < endMin; m += step)
      slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    return slots.length > 0 ? slots : buildTimeSlots(profile, null);
  };

  // Si hay horario granular por día y se especificó un día, usarlo
  if (dayKey && profile?.schedule?.[dayKey]?.length > 0) {
    const intervals = profile.schedule[dayKey];
    const allSlots = new Set();
    for (const iv of intervals) {
      const [sh, sm] = iv.start.split(":").map(Number);
      const [eh, em] = iv.end.split(":").map(Number);
      for (let m = sh * 60 + sm; m < eh * 60 + em; m += step)
        allSlots.add(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    const sorted = [...allSlots].sort();
    if (sorted.length > 0) return sorted;
  }

  // Fallback: rango global workingStart/workingEnd
  const start = profile?.workingStart;
  const end   = profile?.workingEnd;
  if (!start || !end || start >= end) {
    const slots = [];
    for (let m = 8 * 60; m < 20 * 60; m += step)
      slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    return slots;
  }
  return fallbackSlots(start, end);
}

// ── Determinar si una hora está dentro del horario activo ────────────────────
export function isHourActive(hour, profile) {
  const start = profile?.workingStart;
  const end   = profile?.workingEnd;
  if (!start || !end) return true;
  const startH = parseInt(start.split(":")[0]);
  const endH   = parseInt(end.split(":")[0]);
  return hour >= startH && hour < endH;
}

// ── Obtener los 6 días (lun–sáb) de la semana que contiene anchor ────────────
export function getWeekDays(anchor) {
  const d = new Date(anchor);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 6 }, (_, i) => {
    const nd = new Date(monday);
    nd.setDate(monday.getDate() + i);
    return nd;
  });
}

// ── Extraer la hora entera de un string "HH:MM" ──────────────────────────────
export function apptHour(time) {
  return parseInt(time?.split(":")?.[0] || "0");
}

// ── Generar citas recurrentes a partir de una cita base ──────────────────────
export function generateRecurring(base, frequency, occurrences, pt) {
  const results = [];
  const groupId = "rg" + uid();
  const [y, m, d] = base.date.split("-").map(Number);
  let current = new Date(y, m - 1, d);

  const stepDays = { semanal: 7, quincenal: 14, mensual: null };

  for (let i = 0; i < occurrences; i++) {
    const dateStr = fmt(current);
    results.push({
      ...base,
      id: "a" + uid(),
      date: dateStr,
      patientName: pt?.name || "",
      recurrenceGroupId: groupId,
      isRecurring: true,
    });

    if (frequency === "mensual") {
      current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
    } else {
      current.setDate(current.getDate() + stepDays[frequency]);
    }
  }
  return results;
}
