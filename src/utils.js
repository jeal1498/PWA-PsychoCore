import { T } from "./theme.js";
import { Smile, Meh, Frown } from "lucide-react";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const todayDate = new Date();

// Formatea una fecha como "YYYY-MM-DD" usando la hora local del dispositivo.
// toISOString() usa UTC — en México (UTC-5/6) a partir de las ~18h devuelve
// "mañana", lo que causaba fechas incorrectas en formularios y notificaciones.
export const fmt = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmt(d);
};

export const daysAhead = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmt(d);
};

export const fmtDate = (d) =>
  new Date(d + "T12:00").toLocaleDateString("es-MX", {
    day: "numeric", month: "short", year: "numeric",
  });

export const fmtCur = (n) => `$${Number(n).toLocaleString("es-MX")}`;

export const moodColor = (m) =>
  ({ bueno: T.suc, moderado: T.war, bajo: T.err })[m] || T.tm;

export const moodIcon = (m) =>
  ({ bueno: Smile, moderado: Meh, bajo: Frown })[m] || Meh;

export const progressStyle = (p) =>
  ({
    excelente: { bg: T.sucA, c: T.suc },
    bueno:     { bg: T.pA,   c: T.p   },
    moderado:  { bg: T.warA, c: T.war },
    bajo:      { bg: T.errA, c: T.err },
  })[p] || { bg: T.bdrL, c: T.tm };

export const RESOURCE_TYPE_COLORS = {
  Ejercicio:      { c: T.p,       bg: T.pA                        },
  Técnica:        { c: T.acc,     bg: T.accA                      },
  Lectura:        { c: "#6B5B9E", bg: "rgba(107,91,158,0.10)"     },
  Evaluación:     { c: T.suc,     bg: T.sucA                      },
  Psicoeducación: { c: "#5B8DB8", bg: "rgba(91,141,184,0.10)"     },
  Video:          { c: T.err,     bg: T.errA                      },
  Otro:           { c: T.tm,      bg: T.bdrL                      },
};
