// ─────────────────────────────────────────────────────────────────────────────
// sessions.utils.js
// Constantes, NOTE_FORMATS, NOTE_TEMPLATES, helpers puros.
// Sin imports de React ni de UI — importable desde cualquier contexto.
// ─────────────────────────────────────────────────────────────────────────────
import { T } from "../../theme.js";

// ─────────────────────────────────────────────────────────────────────────────
// COLOR CONSTANTS — evitan hex directos en JSX
// ─────────────────────────────────────────────────────────────────────────────
export const AZUL      = "#5B8DB8"; export const AZUL_A    = "rgba(91,141,184,0.10)";
export const LAVANDA   = "#6B5B9E"; export const LAVANDA_A = "rgba(107,91,158,0.10)";
export const MALVA     = "#9B6B9E"; export const MALVA_A   = "rgba(155,107,158,0.10)";

// ─────────────────────────────────────────────────────────────────────────────
// MISC CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
export const PORTAL_URL = typeof window !== "undefined" ? `${window.location.origin}/p` : "/p";

export const BLANK_RISK = { suicidalIdeation:"ninguna", selfHarm:"ninguna", harmToOthers:false };

// ─────────────────────────────────────────────────────────────────────────────
// NOTE FORMAT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export const NOTE_FORMATS = {
  libre: {
    id: "libre", label: "Libre",
    color: T.tm,  bg: T.bdrL,
    fields: null,
  },
  SOAP: {
    id: "SOAP", label: "SOAP",
    color: AZUL, bg: AZUL_A,
    fields: [
      { key: "S", label: "S — Subjetivo",  placeholder: "Lo que el paciente reporta: síntomas, preocupaciones, cómo se ha sentido desde la última sesión..." },
      { key: "O", label: "O — Objetivo",   placeholder: "Observaciones clínicas: comportamiento, afecto, apariencia, cognición, pruebas aplicadas..." },
      { key: "A", label: "A — Análisis",   placeholder: "Valoración clínica: interpretación de los datos, hipótesis diagnóstica, cambios respecto a sesión anterior..." },
      { key: "P", label: "P — Plan",       placeholder: "Intervenciones realizadas y planificadas, tareas entre sesiones, objetivos para la próxima cita..." },
    ],
  },
  DAP: {
    id: "DAP", label: "DAP",
    color: LAVANDA, bg: LAVANDA_A,
    fields: [
      { key: "D", label: "D — Datos",    placeholder: "Descripción factual de lo ocurrido en sesión: temas tratados, comportamiento observado, lo que el paciente reportó..." },
      { key: "A", label: "A — Análisis", placeholder: "Interpretación clínica: significado de los datos, relación con el diagnóstico, progreso terapéutico..." },
      { key: "P", label: "P — Plan",     placeholder: "Intervenciones, tareas asignadas, ajustes al tratamiento, objetivos para la próxima sesión..." },
    ],
  },
  BIRP: {
    id: "BIRP", label: "BIRP",
    color: MALVA, bg: MALVA_A,
    fields: [
      { key: "B", label: "B — Conducta",     placeholder: "Comportamiento del paciente al inicio de la sesión: estado de ánimo, actitud, presentación..." },
      { key: "I", label: "I — Intervención", placeholder: "Técnicas e intervenciones aplicadas por el terapeuta durante la sesión..." },
      { key: "R", label: "R — Respuesta",    placeholder: "Respuesta del paciente a las intervenciones: reacciones, insight, cambios observados..." },
      { key: "P", label: "P — Plan",         placeholder: "Próximos pasos: tareas entre sesiones, enfoque de la siguiente cita, derivaciones..." },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTE TEMPLATES — sugerencias por grupo diagnóstico
// ─────────────────────────────────────────────────────────────────────────────
export const NOTE_TEMPLATES = {
  ansiedad: {
    label: "Trastorno de ansiedad",
    match: ["6B00","6B01","6B02","6B03","6B04","6B05","TAG","ansiedad","pánico","fobia"],
    SOAP: {
      S: "Paciente refiere niveles de ansiedad de _/10. Describe preocupación persistente sobre _. Reporta síntomas físicos: _. Sueño: _. Desde la última sesión: _.",
      O: "Paciente se presenta con afecto _, orientado/a en tiempo, lugar y persona. Contacto visual _, ritmo de habla _. No se observan signos de agitación psicomotora.",
      A: "Consistent con TAG/trastorno de pánico. Nivel de ansiedad actual _. Respuesta a técnicas de regulación: _. Cambios respecto sesión anterior: _.",
      P: "Se trabajó _. Se asigna tarea de autorregistro de pensamientos automáticos. Próxima sesión: _. Continuar con protocolo _.",
    },
    DAP: {
      D: "Paciente reporta ansiedad de _/10. Describió situaciones detonantes: _. Aplicó técnica de _ entre sesiones con resultado _.",
      A: "Progreso en identificación de detonantes. Dificultad persistente en _. Se evidencia _ en el manejo de la ansiedad.",
      P: "Se practicó técnica de respiración diafragmática / relajación muscular progresiva. Tarea: registrar pensamientos ansiosos durante la semana. Próxima cita: _.",
    },
    BIRP: {
      B: "Paciente llega con ansiedad visible (_/10). Postura _, contacto visual _. Menciona haber tenido episodio de _ durante la semana.",
      I: "Se aplicó técnica de respiración diafragmática. Se trabajó reestructuración cognitiva sobre el pensamiento '_'. Se exploró evidencia a favor y en contra.",
      R: "Paciente respondió _ a la intervención. Reconoce patrón de pensamiento catastrófico / evitación. Ansiedad bajó de _ a _/10 al final de la sesión.",
      P: "Tarea: registro ABC de situaciones ansiosas. Próxima sesión: exposición gradual a _. Continuar técnica de _.",
    },
  },
  depresion: {
    label: "Depresión / Distimia",
    match: ["6A60","6A61","6A62","6A70","6A71","depresión","depresivo","distimia"],
    SOAP: {
      S: "Paciente refiere ánimo de _/10. Reporta cambios en: sueño (_), apetito (_), energía (_). Pensamientos de _. Funcionamiento diario: _.",
      O: "Afecto _. Psicomotricidad _, habla _. Higiene _. No se detectan síntomas psicóticos. Ideación suicida: _.",
      A: "Episodio depresivo _ (leve/moderado/grave). PHQ-9: _. Factores que mantienen el episodio: _. Recursos de afrontamiento: _.",
      P: "Se trabajó activación conductual. Se asignaron _ actividades placenteras para la semana. Próxima sesión: _. Monitorear _.",
    },
    DAP: {
      D: "Paciente reportó ánimo de _/10 durante la semana. Completó _ de las actividades asignadas. Dormió _ horas promedio.",
      A: "Mejoría leve/moderada en activación conductual. Persiste pensamiento de _. Se evidencia _.",
      P: "Activación conductual: programar 2 actividades placenteras diarias. Registro de pensamientos negativos. Próxima sesión: reestructuración cognitiva sobre _.",
    },
    BIRP: {
      B: "Paciente llega con ánimo bajo (_/10), discurso enlentecido, afecto _. Refiere haber tenido dificultad para _.",
      I: "Se realizó activación conductual, identificando actividades placenteras pendientes. Se exploró el pensamiento '_' con técnica de evidencias.",
      R: "Paciente muestra ligera mejora en ánimo al identificar actividad placentera pendiente. Logra reconocer pensamiento dicotómico en _.",
      P: "Registrar ánimo diario (0-10) y actividades realizadas. Próxima sesión: trabajo con distorsiones cognitivas tipo _.",
    },
  },
  trauma: {
    label: "TEPT / Trauma",
    match: ["6B40","6B41","6B44","TEPT","trauma","estrés postraumático","TEPT complejo"],
    SOAP: {
      S: "Paciente refiere flashbacks (_/semana), pesadillas (_/semana), nivel de malestar _/10. Evitación de: _. Hipervigilancia: _.",
      O: "Afecto _. Alerta fisiológica _. No disociación aparente durante sesión. Contacto con el presente: _.",
      A: "TEPT _ (leve/moderado/grave). PCL-5: _. Respuesta al procesamiento de _. Nivel de activación: _.",
      P: "Se aplicó técnica de _. Trabajamos en anclaje al presente con _. Próxima sesión: continuar procesamiento de _. Evitar detonar _ esta semana.",
    },
    DAP: {
      D: "Paciente reportó _ episodios de reexperimentación. Nivel de angustia promedio _/10. Usó técnica de _ con resultado _.",
      A: "Progreso en regulación emocional. Dificultad con _ del procesamiento. Recursos de afrontamiento: _.",
      P: "Técnica de anclaje y grounding. Tarea: diario de seguridad. Próxima sesión: _.",
    },
    BIRP: {
      B: "Paciente llega con activación de _/10. Refiere episodio de reexperimentación durante _. Postura _, contacto visual _.",
      I: "Se aplicó técnica de grounding (5-4-3-2-1). Se exploró el recuerdo _ con distancia segura. Se reforzó ventana de tolerancia.",
      R: "Activación bajó de _ a _/10. Paciente mantuvo contacto con el presente. Reconoce señales de activación temprana.",
      P: "Practicar grounding diario. Registrar detonantes. Próxima sesión: continuar con _.",
    },
  },
  toc: {
    label: "TOC",
    match: ["6B20","6B21","6B22","TOC","obsesivo","compulsivo","dismorf"],
    SOAP: {
      S: "Paciente reporta obsesiones sobre _ con malestar de _/10 y tiempo dedicado de _ horas/día. Compulsiones: _. Interferencia en vida diaria: _.",
      O: "Afecto _. Ritmo de habla _. Describe pensamiento intrusivo de _. Insight sobre carácter egodistónico: _.",
      A: "TOC _ (leve/moderado/grave). Y-BOCS: _. Respuesta a EPR: _. Principales obsesiones/compulsiones activas: _.",
      P: "Jerarquía de EPR: se trabajó ítem _ (SUDS _). Tarea: exposición a _ sin ejecutar compulsión. Próxima sesión: _.",
    },
    DAP: {
      D: "Paciente reportó _ episodios de obsesión. Logró resistir compulsión en _ ocasiones. SUDS promedio _/100.",
      A: "Progreso en EPR. Reducción de compulsión _. Dificultad en _.",
      P: "EPR: tarea en ítem _ de la jerarquía. Registrar SUDS y tiempo de exposición. Próxima sesión: avanzar a ítem _.",
    },
    BIRP: {
      B: "Paciente llega con malestar de _/10 por obsesión sobre _. Reporta haber realizado compulsión _ veces esta semana.",
      I: "Se realizó EPR en sesión: exposición a _ sin ejecutar compulsión. SUDS: inició en _, máximo _, al finalizar _.",
      R: "Paciente toleró malestar durante _ minutos. Observó habituación. Reconoce que compulsión mantiene el ciclo.",
      P: "Continuar EPR con ítem _ en casa. Registro de SUDS. Próxima sesión: revisión de jerarquía.",
    },
  },
  tdah: {
    label: "TDAH",
    match: ["6A00","6A01","6A02","TDAH","inatento","hiperactivo","neurodesarrollo"],
    SOAP: {
      S: "Paciente / tutor reporta: inatención en _, dificultad para _, impulsividad en _. Desempeño escolar/laboral: _. Sueño: _. Medicación: _.",
      O: "Nivel de actividad motriz _. Atención sostenida en sesión _. Impulsividad verbal _. Regulación emocional _.",
      A: "TDAH presentación _. Respuesta a estrategias: _. Áreas de mayor dificultad: _.",
      P: "Se trabajaron estrategias de _. Tarea: usar _ para organización. Próxima sesión: _. Coordinar con _.",
    },
    DAP: {
      D: "Paciente reportó dificultad con _ esta semana. Usó técnica de _ con resultado _. Tareas completadas: _/_.",
      A: "Mejora en _. Persiste dificultad en regulación emocional / atención sostenida. Recursos de afrontamiento: _.",
      P: "Estrategia de organización: _. Tarea: agenda diaria con _. Próxima sesión: técnicas de autorregulación emocional.",
    },
    BIRP: {
      B: "Paciente llega con energía _, dificultad para mantenerse en tema. Reporta semana difícil en _ por problemas de organización.",
      I: "Se trabajaron técnicas de gestión del tiempo: bloques de trabajo de _ minutos. Se exploró pensamiento sobre frustración en _.",
      R: "Paciente muestra interés en estrategia de _. Logra mantener atención en sesión con _ estructurada.",
      P: "Usar temporizador para tareas. Dividir actividades en pasos pequeños. Próxima sesión: regulación emocional.",
    },
  },
  personalidad: {
    label: "Trastorno de personalidad",
    match: ["6D10","6D11","6D12","TLP","límite","borderline","personalidad"],
    SOAP: {
      S: "Paciente reporta ánimo de _/10. Describe situación de _. Relaciones: _. Conductas de riesgo esta semana: _. Autolesiones: _.",
      O: "Afecto _, lábil/estable. Regulación emocional durante sesión: _. Ideación suicida: _.",
      A: "TLP / TP _. Habilidades DBT aplicadas: _. Cadena conductual de evento: _.",
      P: "Se trabajó habilidad DBT: _. Tarea: ficha de registro de emociones. Próxima sesión: _. Plan de seguridad: revisado / sin cambios.",
    },
    DAP: {
      D: "Paciente reportó episodio de _ con intensidad _/10. Usó habilidad _ con resultado _. Conductas de riesgo: _.",
      A: "Aplicación de habilidades DBT: _. Dificultad en regulación emocional ante _. Progreso en _.",
      P: "Habilidad TIPP / ACCEPTS / opuesta a la acción. Tarea: ficha de habilidades. Próxima sesión: revisión de cadena conductual.",
    },
    BIRP: {
      B: "Paciente llega con afecto lábil (_/10). Reporta crisis de _ durante la semana. Usó habilidad _ con eficacia _.",
      I: "Se trabajó análisis en cadena del episodio de _. Se identificaron puntos de intervención. Se practicó habilidad DBT: _.",
      R: "Paciente muestra comprensión del análisis en cadena. Logra identificar _ como punto de intervención. Compromiso con _.",
      P: "Continuar con ficha de habilidades DBT. Revisar plan de seguridad. Próxima sesión: validación y regulación emocional.",
    },
  },
  pareja: {
    label: "Terapia de pareja",
    match: ["pareja","relación de pareja","PF20","conyugal","matrimonial"],
    SOAP: {
      S: "La pareja reporta: _. Nivel de satisfacción relacional: A (_/10), B (_/10). Principales quejas: _. Desde la última sesión: _.",
      O: "Dinámica observable: _. Comunicación: _. Escalada / distancia emocional: _. Turnos de palabra: _.",
      A: "Patrón perseguidor-distante / _ presente. Ciclo de interacción disfuncional: _. Recursos relacionales: _.",
      P: "Se trabajó técnica de _. Tarea: _ (comunicación No-violenta / tiempo de calidad / acuerdo sobre _). Próxima sesión: _.",
    },
    DAP: {
      D: "La pareja reportó el episodio de _. Nivel de tensión: _. Lograron aplicar _ con resultado _.",
      A: "Ciclo de _ se activó ante _. Ambos muestran disposición a _. Dificultad en _.",
      P: "Tarea de pareja: _. Practicar escucha activa en _ conversación por semana. Próxima sesión: _.",
    },
    BIRP: {
      B: "La pareja llega con tensión _/10. A describe _; B describe _. Dinámica inicial de sesión: _.",
      I: "Se facilitó diálogo estructurado sobre _. Se empleó técnica de escucha activa y validación. Se reformuló _ en términos de necesidad.",
      R: "A muestra _ al escuchar a B. B logra _ al ser validado/a. Tensión bajó de _ a _/10.",
      P: "Tarea: aplicar validación emocional una vez al día. Próxima sesión: ciclo de apego y necesidades subyacentes.",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Compila campos estructurados en texto plano para storage. */
export function compileNotes(formatId, structured) {
  const fd = NOTE_FORMATS[formatId];
  if (!fd?.fields || !structured) return "";
  return fd.fields
    .map(f => structured[f.key] ? `[${f.key}] ${structured[f.key]}` : "")
    .filter(Boolean).join("\n\n");
}

/** Devuelve un objeto con todos los campos del formato en blanco. */
export function blankStructured(formatId) {
  const f = NOTE_FORMATS[formatId];
  if (!f?.fields) return null;
  return Object.fromEntries(f.fields.map(fld => [fld.key, ""]));
}

/** Folio correlativo por paciente (la sesión más antigua = #1). */
export function getSessionFolio(session, allSessions) {
  const patientSessions = [...allSessions]
    .filter(s => s.patientId === session.patientId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const idx = patientSessions.findIndex(s => s.id === session.id);
  return idx >= 0 ? idx + 1 : null;
}

/** Llama a la API de Claude para generar un resumen clínico estructurado. */
export async function generateAISummary({ notes, structured, noteFormat, patientName, diagnosis, duration, mood, progress }) {
  const notesText = noteFormat !== "libre" && structured
    ? Object.entries(structured).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join("\n")
    : notes;

  if (!notesText?.trim()) return null;

  const prompt = `Eres un asistente clínico especializado en psicología. El psicólogo ha escrito las siguientes notas de una sesión${patientName ? ` con ${patientName}` : ""}${diagnosis ? ` (${diagnosis})` : ""}.

Duración: ${duration} min | Estado de ánimo: ${mood} | Progreso: ${progress}

NOTAS:
${notesText}

Genera un resumen clínico estructurado y conciso con estas secciones:
1. **Puntos clave de la sesión** (2-3 oraciones)
2. **Intervenciones utilizadas** (lista breve)
3. **Respuesta del paciente**
4. **Seguimiento recomendado** (qué trabajar en la próxima sesión)

Responde en español, tono profesional clínico. Máximo 200 palabras.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || null;
}
