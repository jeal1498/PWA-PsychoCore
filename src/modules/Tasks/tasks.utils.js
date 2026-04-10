// ─────────────────────────────────────────────────────────────────────────────
// src/modules/Tasks/tasks.utils.js
// Constantes y helpers puros — sin imports de React
// ─────────────────────────────────────────────────────────────────────────────
import { fmtDate } from "../../utils.js";

// ── Colores WhatsApp ──────────────────────────────────────────────────────────
export const WA      = "#25D366";
export const WA_DARK = "#128C7E";

// ── Helpers de texto ─────────────────────────────────────────────────────────
export const getPsychologistName = (profile) =>
  profile?.name?.trim() || "tu psicólogo(a)";

export const buildTaskMessage = (patientName, taskTitle, accessUrl, profile) => (
  `Hola ${patientName?.split(" ")[0] || ""}! 👋\n\n` +
  `Te comparto tu tarea terapéutica: *${taskTitle}*\n\n` +
  `Accede aquí:\n${accessUrl}\n\n` +
  `_Este enlace vence en 24 horas. Ábrelo pronto para ver y responder tus tareas._\n\n` +
  `— ${getPsychologistName(profile)}`
);

export const fmtRelative = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7)  return `Hace ${days} días`;
  return fmtDate(iso.split("T")[0]);
};
