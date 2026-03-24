import { useState, useMemo, useEffect, useRef } from "react";
import { FileText, Trash2, Printer, Tag, Check, Plus, Send, Copy, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, LayoutList, ClipboardCheck, Lock, Eye, Sparkles, X, ShieldCheck, Download, FileCheck, ChevronRight } from "lucide-react";
import { printNotaEvolucion, printConsentimientoInformado, printPlanSeguridad, printReferralLetter } from "../utils/pdfUtils.js";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";
import { RISK_CONFIG } from "./RiskAssessment.jsx";
import { TASK_TEMPLATES } from "../lib/taskTemplates.js";
import { createAssignment, getAssignmentsByPatient, getResponsesByAssignment } from "../lib/supabase.js";
import { emit } from "../lib/eventBus.js"; // FASE 2

const PORTAL_URL = typeof window !== "undefined" ? `${window.location.origin}/p` : "/p";

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
    color: "#5B8DB8", bg: "rgba(91,141,184,0.10)",
    fields: [
      { key: "S", label: "S — Subjetivo",  placeholder: "Lo que el paciente reporta: síntomas, preocupaciones, cómo se ha sentido desde la última sesión..." },
      { key: "O", label: "O — Objetivo",   placeholder: "Observaciones clínicas: comportamiento, afecto, apariencia, cognición, pruebas aplicadas..." },
      { key: "A", label: "A — Análisis",   placeholder: "Valoración clínica: interpretación de los datos, hipótesis diagnóstica, cambios respecto a sesión anterior..." },
      { key: "P", label: "P — Plan",       placeholder: "Intervenciones realizadas y planificadas, tareas entre sesiones, objetivos para la próxima cita..." },
    ],
  },
  DAP: {
    id: "DAP", label: "DAP",
    color: "#6B5B9E", bg: "rgba(107,91,158,0.10)",
    fields: [
      { key: "D", label: "D — Datos",    placeholder: "Descripción factual de lo ocurrido en sesión: temas tratados, comportamiento observado, lo que el paciente reportó..." },
      { key: "A", label: "A — Análisis", placeholder: "Interpretación clínica: significado de los datos, relación con el diagnóstico, progreso terapéutico..." },
      { key: "P", label: "P — Plan",     placeholder: "Intervenciones, tareas asignadas, ajustes al tratamiento, objetivos para la próxima sesión..." },
    ],
  },
  BIRP: {
    id: "BIRP", label: "BIRP",
    color: "#9B6B9E", bg: "rgba(155,107,158,0.10)",
    fields: [
      { key: "B", label: "B — Conducta",     placeholder: "Comportamiento del paciente al inicio de la sesión: estado de ánimo, actitud, presentación..." },
      { key: "I", label: "I — Intervención", placeholder: "Técnicas e intervenciones aplicadas por el terapeuta durante la sesión..." },
      { key: "R", label: "R — Respuesta",    placeholder: "Respuesta del paciente a las intervenciones: reacciones, insight, cambios observados..." },
      { key: "P", label: "P — Plan",         placeholder: "Próximos pasos: tareas entre sesiones, enfoque de la siguiente cita, derivaciones..." },
    ],
  },
};

function compileNotes(formatId, structured) {
  const fd = NOTE_FORMATS[formatId];
  if (!fd?.fields || !structured) return "";
  return fd.fields
    .map(f => structured[f.key] ? `[${f.key}] ${structured[f.key]}` : "")
    .filter(Boolean).join("\n\n");
}

function blankStructured(formatId) {
  const f = NOTE_FORMATS[formatId];
  if (!f?.fields) return null;
  return Object.fromEntries(f.fields.map(fld => [fld.key, ""]));
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF — note (structured-aware) → MOVIDA a pdfUtils.js (printNotaEvolucion)
// Se conserva este wrapper local para compatibilidad interna si fuera necesario.
// ─────────────────────────────────────────────────────────────────────────────
function _legacyPrintNote_UNUSED(session, patients, riskAssessments = []) {
  const pt = patients.find(p => p.id === session.patientId);
  const fd = NOTE_FORMATS[session.noteFormat] || NOTE_FORMATS.libre;
  const w  = window.open("", "_blank");

  const structuredHTML = fd.fields && session.structured
    ? fd.fields.map(f => session.structured[f.key] ? `
      <div class="section">
        <div class="section-label">${f.label}</div>
        <div class="section-body">${session.structured[f.key]}</div>
      </div>` : "").join("")
    : `<div class="section"><div class="section-label">Notas clínicas</div><div class="section-body">${session.notes}</div></div>`;

  const fmtBadge = fd.id !== "libre"
    ? `<span style="padding:3px 12px;border-radius:9999px;background:${fd.bg};color:${fd.color};font-size:12px;font-weight:700;font-family:'DM Sans',sans-serif">${fd.label}</span>`
    : "";

  // ── ETAPA 3: Detección de indicadores de crisis para sección obligatoria PDF ─
  // PRIVACIDAD: privateNotes NUNCA se incluyen. Solo la evaluación de riesgo
  // se agrega cuando hubo indicadores de crisis (valor legal para el terapeuta).
  const sessionRisk = (riskAssessments || []).find(ra => ra.sessionId === session.id);
  const hasCrisisIndicators = sessionRisk && (
    sessionRisk.suicidalIdeation === "activa" ||
    sessionRisk.suicidalIdeation === "pasiva" ||
    sessionRisk.selfHarm === "activa" ||
    sessionRisk.harmToOthers
  );
  const RISK_CLR = { alto:"#C4622A", moderado:"#B8900A", bajo:"#4E8B5F", inminente:"#B85050" };
  const riskSectionHTML = hasCrisisIndicators ? `
    <div style="margin:28px 0;padding:20px 22px;background:rgba(184,80,80,0.05);border:2px solid rgba(184,80,80,0.25);border-radius:12px;page-break-inside:avoid">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#B85050;margin-bottom:14px">
        ⚠️ Evaluación de Riesgo — Sección Obligatoria (Protección Legal del Terapeuta)
      </div>
      <div style="display:inline-flex;align-items:center;padding:3px 12px;border-radius:9999px;background:${(RISK_CLR[sessionRisk.riskLevel]||'#B8900A')}22;color:${(RISK_CLR[sessionRisk.riskLevel]||'#B8900A')};font-size:11px;font-weight:700;border:1px solid ${(RISK_CLR[sessionRisk.riskLevel]||'#B8900A')}44;margin-bottom:14px">
        Nivel ${(sessionRisk.riskLevel||'—').toUpperCase()}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px">
        <tr><td style="padding:5px 0;color:#5A7270;width:46%">Ideación suicida</td><td style="font-weight:600;color:#1A2B28;text-transform:capitalize">${sessionRisk.suicidalIdeation||'Ninguna'}</td></tr>
        <tr><td style="padding:5px 0;color:#5A7270">Autolesiones</td><td style="font-weight:600;color:#1A2B28;text-transform:capitalize">${sessionRisk.selfHarm||'Ninguna'}</td></tr>
        <tr><td style="padding:5px 0;color:#5A7270">Riesgo a terceros</td><td style="font-weight:600;color:#1A2B28">${sessionRisk.harmToOthers?'Sí':'No'}</td></tr>
        ${sessionRisk.clinicalNotes?`<tr><td style="padding:5px 0;color:#5A7270;vertical-align:top">Notas clínicas de riesgo</td><td style="font-size:12.5px;line-height:1.6;color:#1A2B28">${sessionRisk.clinicalNotes}</td></tr>`:""}
      </table>
      <div style="font-size:11px;color:#9BAFAD;border-top:1px solid #EDF1F0;padding-top:10px">
        Plan de seguridad: ${sessionRisk.safetyPlan?.warningSignals?"✓ Elaborado en esta sesión":"⚠ Pendiente de elaborar"} ·
        Nota: Las Notas de Supervisión Privadas del terapeuta NO están incluidas en este documento.
      </div>
    </div>` : "";

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Nota — ${session.patientName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:720px;margin:48px auto;color:#1A2B28;line-height:1.6}
header{border-bottom:3px solid #3A6B6E;padding-bottom:20px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-start}
h1{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:#3A6B6E}
.subtitle{font-size:13px;color:#5A7270;margin-top:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
.field label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD;font-weight:600;display:block;margin-bottom:4px}
.field p{font-size:15px}
.section{margin-bottom:20px}
.section-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:${fd.color};font-weight:700;margin-bottom:8px}
.section-body{background:#F9F8F5;padding:18px 20px;border-radius:10px;border-left:4px solid ${fd.id !== "libre" ? fd.color : "#3A6B6E"};font-size:14px;line-height:1.75;white-space:pre-wrap}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.tag{background:rgba(196,137,90,0.1);color:#C4895A;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600}
footer{margin-top:48px;padding-top:20px;border-top:1px solid #D8E2E0;font-size:12px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0}}
</style></head><body>
<header>
  <div><h1>Nota de Evolución Clínica</h1><p class="subtitle">PsychoCore · ${new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p></div>
  <div>${fmtBadge}</div>
</header>
<div class="grid">
  <div class="field"><label>Paciente</label><p>${session.patientName}</p></div>
  <div class="field"><label>Fecha</label><p>${fmtDate(session.date)}</p></div>
  <div class="field"><label>Duración</label><p>${session.duration} minutos</p></div>
  <div class="field"><label>Estado de ánimo</label><p style="text-transform:capitalize">${session.mood}</p></div>
  <div class="field"><label>Progreso</label><p style="text-transform:capitalize">${session.progress}</p></div>
  ${pt?.diagnosis ? `<div class="field"><label>Diagnóstico</label><p>${pt.diagnosis}</p></div>` : ""}
</div>
${structuredHTML}
${riskSectionHTML}
${(session.tags||[]).length ? `<div class="tags">${session.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ""}
<footer><span>PsychoCore</span><span>Confidencial · Notas de supervisión privadas excluidas de este documento</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF — referral letter → MOVIDA a pdfUtils.js (printReferralLetter)
// Wrapper local preservado para no romper referencias internas si existieran.
// ─────────────────────────────────────────────────────────────────────────────
function _legacyPrintReferral_UNUSED(patient, session, profile, formData) {
  const w = window.open("","_blank");
  const today = new Date().toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"});
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Carta Derivación — ${patient?.name}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;max-width:720px;margin:48px auto;color:#1A2B28;line-height:1.7;font-size:14px}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:20px;border-bottom:2px solid #3A6B6E}
.org h1{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#3A6B6E;margin-bottom:4px}
.org p{font-size:12px;color:#5A7270}.date{font-size:13px;color:#5A7270;text-align:right}
h2{font-family:'Cormorant Garamond',serif;font-size:22px;color:#3A6B6E;margin-bottom:20px}
.body-text{margin-bottom:16px;text-align:justify}
.data-box{background:#F9F8F5;padding:16px 20px;border-radius:8px;margin:20px 0;border-left:4px solid #3A6B6E}
.data-box p{margin-bottom:6px;font-size:13px}.data-box strong{color:#1A2B28}
.signature{margin-top:56px}.sig-line{width:240px;border-top:1px solid #1A2B28;margin-bottom:8px}
.sig-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:500;color:#1A2B28}
.sig-detail{font-size:12px;color:#5A7270}
footer{margin-top:48px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;text-align:center}
@media print{body{margin:0}}</style></head><body>
<div class="letterhead">
  <div class="org">
    <h1>${profile?.clinic||"Consultorio Psicológico"}</h1>
    <p>${profile?.name||""}${profile?.specialty?" · "+profile.specialty:""}</p>
    ${profile?.cedula?`<p>Cédula profesional: ${profile.cedula}</p>`:""}
    ${profile?.phone?`<p>Tel: ${profile.phone}</p>`:""}
  </div>
  <div class="date">${today}</div>
</div>
<h2>Carta de Derivación</h2>
<p class="body-text">Por medio de la presente, me permito referir al/a la paciente:</p>
<div class="data-box">
  <p><strong>Nombre:</strong> ${patient?.name||""}</p>
  <p><strong>Edad:</strong> ${patient?.age?patient.age+" años":"N/D"}</p>
  ${patient?.diagnosis?`<p><strong>Diagnóstico:</strong> ${patient.diagnosis}</p>`:""}
  <p><strong>Tiempo en tratamiento:</strong> ${session?`Desde ${fmtDate(session.date)}`:"N/D"}</p>
</div>
<p class="body-text">${formData.reason||"El/la paciente requiere evaluación y atención especializada."}</p>
${formData.specialist?`<p class="body-text">Se deriva al servicio de <strong>${formData.specialist}</strong>.</p>`:""}
${formData.notes?`<p class="body-text">${formData.notes}</p>`:""}
<p class="body-text">Agradezco de antemano la atención prestada y quedo a disposición para cualquier información adicional.</p>
<p class="body-text">Atentamente,</p>
<div class="signature">
  <div class="sig-line"></div>
  <div class="sig-name">${profile?.name||"Psicólogo/a"}</div>
  <div class="sig-detail">${profile?.specialty||"Psicólogo/a Clínico/a"}${profile?.cedula?" · Ced. "+profile.cedula:""}</div>
  ${profile?.clinic?`<div class="sig-detail">${profile.clinic}</div>`:""}
</div>
<footer>Documento generado por PsychoCore · ${today}</footer>
</body></html>`);
  w.document.close(); setTimeout(() => w.print(), 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function FormatSelector({ value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:8, letterSpacing:"0.06em", textTransform:"uppercase" }}>
        Formato de nota
      </label>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
        {Object.values(NOTE_FORMATS).map(fd => {
          const active = value === fd.id;
          return (
            <button key={fd.id} onClick={() => onChange(fd.id)}
              style={{ padding:"8px 4px", borderRadius:10, border:`1.5px solid ${active ? fd.color : T.bdr}`, background:active ? fd.bg : "transparent", color:active ? fd.color : T.tm, fontFamily:T.fB, fontSize:12.5, fontWeight:active?700:400, cursor:"pointer", transition:"all .13s", textAlign:"center", width:"100%" }}>
              {fd.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StructuredFields({ formatId, structured, onChange }) {
  const fd = NOTE_FORMATS[formatId];
  if (!fd?.fields) return null;
  return (
    <div style={{ border:`1.5px solid ${fd.color}40`, borderRadius:12, overflow:"hidden", marginBottom:16 }}>
      {fd.fields.map((f, i) => (
        <div key={f.key} style={{ borderBottom: i < fd.fields.length - 1 ? `1px solid ${T.bdrL}` : "none" }}>
          <div style={{ padding:"10px 16px 6px", background:fd.bg }}>
            <label style={{ fontSize:11, fontWeight:700, color:fd.color, textTransform:"uppercase", letterSpacing:"0.08em" }}>{f.label}</label>
          </div>
          <textarea value={structured[f.key] || ""} onChange={e => onChange(f.key, e.target.value)}
            placeholder={f.placeholder} rows={3}
            style={{ width:"100%", padding:"12px 16px", border:"none", outline:"none", fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, resize:"vertical", boxSizing:"border-box", lineHeight:1.65 }}/>
        </div>
      ))}
    </div>
  );
}

function StructuredPreview({ session }) {
  const [expanded, setExpanded] = useState(false);
  const fd = NOTE_FORMATS[session.noteFormat];
  if (!fd?.fields || !session.structured) return null;
  const firstField = fd.fields[0];
  const previewText = session.structured[firstField.key] || "";
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ marginBottom:6 }}>
        <span style={{ fontFamily:T.fB, fontSize:13, color:T.tm, lineHeight:1.6,
          display:"-webkit-box", WebkitLineClamp: expanded ? 99 : 2,
          WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {previewText}
        </span>
      </div>
      {expanded && fd.fields.slice(1).map(f => session.structured[f.key] ? (
        <div key={f.key} style={{ marginBottom:8 }}>
          <span style={{ fontSize:10, fontWeight:700, color:fd.color, textTransform:"uppercase", letterSpacing:"0.07em", marginRight:6 }}>{f.key}</span>
          <span style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.65 }}>{session.structured[f.key]}</span>
        </div>
      ) : null)}
      {fd.fields.length > 1 && (
        <button onClick={() => setExpanded(e => !e)}
          style={{ background:"none", border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:12, color:fd.color, padding:"2px 0", display:"flex", alignItems:"center", gap:4, fontWeight:600 }}>
          {expanded ? <><ChevronUp size={12}/>Contraer</> : <><ChevronDown size={12}/>Ver nota completa</>}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE TEMPLATES — sugerencias por grupo diagnóstico
// ─────────────────────────────────────────────────────────────────────────────
export const NOTE_TEMPLATES = {
  // ── Ansiedad (TAG, pánico, fobia, social) ─────────────────────────────────
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
  // ── Depresión ──────────────────────────────────────────────────────────────
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
  // ── TEPT / Trauma ──────────────────────────────────────────────────────────
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
  // ── TOC ────────────────────────────────────────────────────────────────────
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
  // ── TDAH ──────────────────────────────────────────────────────────────────
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
  // ── Trastorno de personalidad / límite ────────────────────────────────────
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
  // ── Pareja / grupal ───────────────────────────────────────────────────────
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

// ── TemplatePanel ─────────────────────────────────────────────────────────────
function TemplatePanel({ patient, noteFormat, onApply, onClose }) {
  const dx = ((patient?.diagnosis || "") + " " + (patient?.cie11Code || "")).toLowerCase();

  // Find matching templates
  const matches = Object.values(NOTE_TEMPLATES).filter(tpl =>
    tpl.match.some(m => dx.includes(m.toLowerCase()))
  );
  const available = matches.length > 0 ? matches : Object.values(NOTE_TEMPLATES);
  const [sel, setSel] = useState(available[0]?.label || "");

  const current = Object.values(NOTE_TEMPLATES).find(t => t.label === sel) || available[0];
  const fields = current?.[noteFormat];

  if (noteFormat === "libre") return (
    <div style={{ padding:"16px 20px", background:T.warA, borderRadius:12, marginBottom:12, fontFamily:T.fB, fontSize:13, color:T.war }}>
      Las plantillas están disponibles para formatos SOAP, DAP y BIRP.
    </div>
  );

  return (
    <div style={{ border:`1.5px solid ${T.bdr}`, borderRadius:14, overflow:"hidden", marginBottom:16 }}>
      {/* Header */}
      <div style={{ padding:"10px 16px", background:T.pA, borderBottom:`1px solid ${T.bdrL}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.07em" }}>
          🗒 Plantillas clínicas — {noteFormat}
        </span>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.tl, fontFamily:T.fB, fontSize:12 }}>✕</button>
      </div>
      {/* Selector */}
      <div style={{ padding:"12px 16px", background:T.cardAlt, borderBottom:`1px solid ${T.bdrL}`, display:"flex", gap:6, flexWrap:"wrap" }}>
        {available.map(t => (
          <button key={t.label} onClick={() => setSel(t.label)}
            style={{ padding:"5px 12px", borderRadius:9999, border:`1.5px solid ${sel===t.label?T.p:T.bdrL}`,
              background:sel===t.label?T.pA:"transparent", color:sel===t.label?T.p:T.tm,
              fontFamily:T.fB, fontSize:11.5, fontWeight:sel===t.label?700:400, cursor:"pointer", transition:"all .12s" }}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Preview + apply */}
      {fields ? (
        <div style={{ padding:"14px 16px" }}>
          {Object.entries(fields).map(([k, v]) => (
            <div key={k} style={{ marginBottom:10 }}>
              <span style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.08em", marginRight:8 }}>{k}</span>
              <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.55 }}>{v.length > 90 ? v.slice(0,90)+"…" : v}</span>
            </div>
          ))}
          <Btn onClick={() => { onApply(fields); onClose(); }} style={{ marginTop:4 }}>
            <Check size={13}/> Aplicar plantilla
          </Btn>
          <p style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:8 }}>
            Los campos con _ son para completar. El texto se aplica a los campos del formato {noteFormat}.
          </p>
        </div>
      ) : (
        <div style={{ padding:"16px", fontFamily:T.fB, fontSize:13, color:T.tl }}>
          Plantilla no disponible para formato {noteFormat}.
        </div>
      )}
    </div>
  );
}

const BLANK_RISK = { suicidalIdeation:"ninguna", selfHarm:"ninguna", harmToOthers:false };

// ── AI Summary ────────────────────────────────────────────────────────────────
async function generateAISummary({ notes, structured, noteFormat, patientName, diagnosis, duration, mood, progress }) {
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

// ── Task response viewer modal ────────────────────────────────────────────────
function TaskResponseModal({ assignment, template, onClose }) {
  const [responses, setResponses] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    getResponsesByAssignment(assignment.id)
      .then(setResponses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignment.id]);

  return (
    <Modal open onClose={onClose} title={`Respuestas — ${assignment.patient_name?.split(" ")[0]}`} width={520}>
      <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:20 }}>{template?.icon}</span>
        <div>
          <div style={{ fontWeight:600, color:T.t }}>{template?.title}</div>
          <div style={{ fontSize:11, color:T.tl }}>
            Completada {new Date(assignment.completed_at).toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"})}
          </div>
        </div>
      </div>
      {loading && (
        <div style={{ textAlign:"center", padding:32 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, margin:"0 auto", animation:"spin .8s linear infinite" }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {!loading && responses.length === 0 && (
        <div style={{ textAlign:"center", padding:"24px 0", color:T.tl, fontFamily:T.fB, fontSize:13 }}>
          Sin respuestas registradas.
        </div>
      )}
      {!loading && responses.map((resp, ri) => (
        <div key={resp.id} style={{ marginBottom: ri < responses.length - 1 ? 20 : 0 }}>
          {template?.fields.map(field => {
            const val = resp.responses?.[field.key];
            if (!val) return null;
            return (
              <div key={field.key} style={{ marginBottom:12 }}>
                <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
                  {field.label}
                </div>
                <div style={{ padding:"10px 14px", background:T.cardAlt, borderRadius:10, border:`1px solid ${T.bdrL}`, fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.65 }}>
                  {field.type === "scale10"
                    ? <span style={{ fontWeight:700, fontSize:20, color: Number(val)<=3?T.suc:Number(val)<=6?"#B8900A":"#B85050" }}>{val}/10</span>
                    : val
                  }
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
        <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL REFERENCE PANEL — Fase 1: Cerebro Clínico
// Columna lateral sticky (desktop) / Acordeón colapsable (mobile < 768px)
// ─────────────────────────────────────────────────────────────────────────────
function ClinicalReferencePanel({ patientId, sessions, treatmentPlans, isMobile, riskAssessments = [], patients = [] }) {
  const [accordionOpen, setAccordionOpen] = useState(false);

  // ── Última nota de sesión del paciente (por fecha desc) ─────────────────────
  const lastSession = useMemo(() => {
    if (!patientId) return null;
    return [...sessions]
      .filter(s => s.patientId === patientId)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [patientId, sessions]);

  // ── Objetivos activos del plan de tratamiento vigente ───────────────────────
  const { activePlan, activeGoals } = useMemo(() => {
    if (!patientId) return { activePlan: null, activeGoals: [] };
    const plans = [...treatmentPlans]
      .filter(tp => tp.patientId === patientId)
      .sort((a, b) =>
        (b.createdAt || b.date || "").localeCompare(a.createdAt || a.date || "")
      );
    const plan = plans[0] || null;
    if (!plan) return { activePlan: null, activeGoals: [] };
    const goals = (plan.goals || []).filter(
      g => g.status !== "completado" && g.status !== "abandonado"
    );
    return { activePlan: plan, activeGoals: goals };
  }, [patientId, treatmentPlans]);

  if (!patientId) return null;

  // ── ETAPA 3: Detectar riesgo activo persistido en el perfil del paciente ─────
  const patientObj = patients.find(p => p.id === patientId);
  const hasActiveRiskAlert = !!(patientObj?.activeRiskAlert);
  const activeRiskData = patientObj?.activeRiskAlert || null;

  const GOAL_STATUS_CFG = {
    "activo":      { color: T.p,   bg: T.pA,   label: "Activo"      },
    "en progreso": { color: T.war, bg: T.warA,  label: "En progreso" },
    "iniciado":    { color: T.suc, bg: T.sucA,  label: "Iniciado"    },
    "pausado":     { color: T.tm,  bg: T.bdrL,  label: "Pausado"     },
  };

  // ── Contenido compartido del panel ──────────────────────────────────────────
  const panelContent = (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ETAPA 3 — Banner de riesgo activo: visible antes de iniciar la sesión */}
      {hasActiveRiskAlert && (
        <div style={{
          display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px",
          background:"rgba(184,80,80,0.08)", border:"2px solid rgba(184,80,80,0.35)",
          borderRadius:12, animation:"pulseRisk 2s ease-in-out infinite"
        }}>
          <ShieldAlert size={18} color="#B85050" style={{ flexShrink:0, marginTop:1 }}/>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:"#B85050", marginBottom:3 }}>
              ⚠ Paciente con Riesgo Activo
            </div>
            <div style={{ fontFamily:T.fB, fontSize:11, color:"#B85050", lineHeight:1.5, opacity:0.9 }}>
              Nivel {(activeRiskData?.level||"—").toUpperCase()} desde {activeRiskData?.date ? new Date(activeRiskData.date).toLocaleDateString("es-MX",{day:"numeric",month:"short"}) : "—"}.
              Revisa el módulo Riesgo antes de iniciar.
            </div>
          </div>
        </div>
      )}

      {/* Última sesión */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:9,
          fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p,
          textTransform:"uppercase", letterSpacing:"0.09em" }}>
          <FileText size={11}/> Última sesión
        </div>
        {lastSession ? (
          <div style={{ background:T.cardAlt, borderRadius:10, padding:"11px 13px", border:`1px solid ${T.bdrL}` }}>
            <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginBottom:6 }}>
              {fmtDate(lastSession.date)} · {lastSession.duration} min · {lastSession.mood}
            </div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.65,
              display:"-webkit-box", WebkitLineClamp:4, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
              {lastSession.noteFormat !== "libre" && lastSession.structured
                ? Object.entries(lastSession.structured)
                    .filter(([, v]) => v?.trim())
                    .map(([k, v]) => `[${k}] ${v.slice(0, 80)}`)
                    .join(" ")
                : (lastSession.notes || "").slice(0, 280)}
            </div>
            <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
              {(() => { const ps = progressStyle(lastSession.progress); return <Badge color={ps.c} bg={ps.bg}>{lastSession.progress}</Badge>; })()}
              {(lastSession.tags || []).slice(0, 2).map(t => (
                <Badge key={t} color={T.acc} bg={T.accA}><Tag size={8}/>{t}</Badge>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background:T.bdrL, borderRadius:10, padding:"12px 13px",
            fontFamily:T.fB, fontSize:12, color:T.tl, textAlign:"center", lineHeight:1.5 }}>
            Sin sesiones previas registradas
          </div>
        )}
      </div>

      {/* Objetivos del plan de tratamiento */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:9,
          fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p,
          textTransform:"uppercase", letterSpacing:"0.09em" }}>
          <LayoutList size={11}/> Objetivos activos
        </div>
        {activePlan && activeGoals.length > 0 ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {activeGoals.slice(0, 6).map((goal, i) => {
              const cfg = GOAL_STATUS_CFG[goal.status] || GOAL_STATUS_CFG["activo"];
              return (
                <div key={goal.id || i} style={{ background:T.cardAlt, borderRadius:9, padding:"9px 11px", border:`1px solid ${T.bdrL}` }}>
                  <div style={{ fontFamily:T.fB, fontSize:12, color:T.t, lineHeight:1.55, marginBottom:6,
                    display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                    {goal.objective || goal.description || goal.text || `Objetivo ${i + 1}`}
                  </div>
                  <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px",
                    borderRadius:9999, background:cfg.bg, color:cfg.color,
                    fontFamily:T.fB, fontSize:10, fontWeight:700, textTransform:"capitalize" }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
            {activeGoals.length > 6 && (
              <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"center", padding:"3px 0" }}>
                +{activeGoals.length - 6} objetivo{activeGoals.length - 6 !== 1 ? "s" : ""} más
              </div>
            )}
          </div>
        ) : activePlan ? (
          <div style={{ background:T.sucA, borderRadius:10, padding:"11px 13px",
            fontFamily:T.fB, fontSize:12, color:T.suc, textAlign:"center" }}>
            🎯 Sin objetivos activos pendientes
          </div>
        ) : (
          // EmptyState discreto cuando no hay plan de tratamiento
          <div style={{ background:T.bdrL, borderRadius:10, padding:"14px 13px",
            fontFamily:T.fB, fontSize:12, color:T.tl, textAlign:"center", lineHeight:1.7 }}>
            Sin plan de tratamiento activo.{" "}
            <span style={{ color:T.p, fontWeight:600 }}>
              Crea uno en el módulo Tratamiento.
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // ── Mobile: acordeón colapsable ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ marginBottom:16, border:`1.5px solid ${accordionOpen ? T.p : T.bdr}`,
        borderRadius:12, overflow:"hidden", transition:"border .15s" }}>
        <button
          onClick={() => setAccordionOpen(o => !o)}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"11px 16px", background:T.pA, border:"none", cursor:"pointer",
            fontFamily:T.fB, fontSize:11.5, fontWeight:700, color:T.p,
            letterSpacing:"0.05em", textTransform:"uppercase" }}>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}>
            <FileText size={13}/> Contexto clínico del paciente
          </span>
          {accordionOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
        </button>
        {accordionOpen && (
          <div style={{ padding:"14px 16px", background:T.card, borderTop:`1px solid ${T.bdrL}` }}>
            {panelContent}
          </div>
        )}
      </div>
    );
  }

  // ── Desktop: columna lateral sticky ────────────────────────────────────────
  return (
    <div style={{ position:"sticky", top:0, width:290, flexShrink:0 }}>
      <div style={{ borderRadius:12, border:`1.5px solid ${T.bdrL}`, overflow:"hidden", background:T.card }}>
        <div style={{ padding:"11px 14px", background:T.pA, borderBottom:`1px solid ${T.bdrL}` }}>
          <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p,
            textTransform:"uppercase", letterSpacing:"0.09em" }}>
            📋 Contexto clínico
          </div>
        </div>
        <div style={{ padding:"14px 14px", maxHeight:"calc(80vh - 80px)", overflowY:"auto" }}>
          {panelContent}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Folio correlativo por paciente (para portada de documentos PDF)
// Orden cronológico: la sesión más antigua del paciente es la #1.
// ─────────────────────────────────────────────────────────────────────────────
function getSessionFolio(session, allSessions) {
  const patientSessions = [...allSessions]
    .filter(s => s.patientId === session.patientId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const idx = patientSessions.findIndex(s => s.id === session.id);
  return idx >= 0 ? idx + 1 : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ExportMenu — Menú flotante de exportación PDF por sesión
// Diseño: cards con icon+label+descripción, hover colorido, badge de riesgo
// ─────────────────────────────────────────────────────────────────────────────
function ExportMenu({ session, patient, profile, riskAssessments, allSessions, noteFormats, onClose }) {
  const folio       = getSessionFolio(session, allSessions);
  const folioLabel  = folio ? `S-${String(folio).padStart(4, "0")}` : null;
  const sessionRisk = riskAssessments?.find(ra => ra.sessionId === session.id);
  const hasRisk     = !!(sessionRisk && (
    sessionRisk.suicidalIdeation !== "ninguna" ||
    sessionRisk.selfHarm         !== "ninguna" ||
    sessionRisk.harmToOthers
  ));
  const riskLevel = sessionRisk?.riskLevel || "moderado";
  const RISK_LABEL = { alto:"Alto", moderado:"Moderado", bajo:"Bajo", inminente:"Inminente" };

  const items = [
    {
      icon:    FileText,
      label:   "Nota de Evolución",
      desc:    folioLabel ? `Folio ${folioLabel} · Formato ${session.noteFormat?.toUpperCase() || "Libre"}` : `Formato ${session.noteFormat?.toUpperCase() || "Libre"}`,
      accent:  "#3A6B6E",
      accentA: "rgba(58,107,110,0.10)",
      border:  "rgba(58,107,110,0.22)",
      badge:   null,
      action:  () => { printNotaEvolucion(session, patient, profile, riskAssessments, folio, noteFormats); onClose(); },
    },
    {
      icon:    FileCheck,
      label:   "Consentimiento Informado",
      desc:    "Pre-llenado con datos del paciente",
      accent:  "#6B5B9E",
      accentA: "rgba(107,91,158,0.10)",
      border:  "rgba(107,91,158,0.22)",
      badge:   null,
      action:  () => { printConsentimientoInformado(patient, profile); onClose(); },
    },
    ...(hasRisk ? [{
      icon:    ShieldCheck,
      label:   "Plan de Seguridad",
      desc:    `Para entregar al paciente antes de salir`,
      accent:  "#B85050",
      accentA: "rgba(184,80,80,0.09)",
      border:  "rgba(184,80,80,0.28)",
      badge:   `Riesgo ${RISK_LABEL[riskLevel] || riskLevel}`,
      badgeClr:"#B85050",
      action:  () => { printPlanSeguridad(sessionRisk?.safetyPlan, patient, profile, riskLevel); onClose(); },
    }] : []),
  ];

  // Cerrar con Escape
  const menuRef = useRef(null);

  return (
    <>
      {/* Overlay transparente para cerrar al hacer clic fuera */}
      <div
        style={{ position:"fixed", inset:0, zIndex:199 }}
        onClick={onClose}
      />
      <div
        ref={menuRef}
        style={{
          position:"absolute", zIndex:200, bottom:"calc(100% + 6px)", right:0,
          width:296, background:T.card,
          borderRadius:16, border:`1.5px solid ${T.bdr}`,
          boxShadow:"0 16px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)",
          overflow:"hidden",
        }}>
        {/* Header del menú */}
        <div style={{
          padding:"11px 16px 10px",
          background:T.pA,
          borderBottom:`1px solid ${T.bdrL}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Download size={12} color={T.p}/>
            <span style={{
              fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.p,
              textTransform:"uppercase", letterSpacing:"0.08em",
            }}>
              Exportar documento
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background:"none", border:"none", cursor:"pointer",
              color:T.tl, width:22, height:22, borderRadius:6,
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"background .12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.bdrL}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <X size={13}/>
          </button>
        </div>

        {/* Cards de acción */}
        <div style={{ padding:"8px 8px 4px" }}>
          {items.map((item, idx) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                width:"100%", display:"flex", alignItems:"center", gap:12,
                padding:"11px 12px", background:"none",
                border:`1.5px solid transparent`,
                borderRadius:11, cursor:"pointer", textAlign:"left",
                transition:"all .14s", marginBottom:4,
                fontFamily:T.fB,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = item.accentA;
                e.currentTarget.style.borderColor = item.border;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.borderColor = "transparent";
              }}>
              {/* Icon bubble */}
              <div style={{
                width:38, height:38, borderRadius:10, flexShrink:0,
                background: item.accentA,
                border:`1.5px solid ${item.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <item.icon size={17} color={item.accent} strokeWidth={1.8}/>
              </div>

              {/* Text */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                  <span style={{ fontSize:13.5, fontWeight:700, color:T.t, lineHeight:1.3 }}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span style={{
                      padding:"1px 7px", borderRadius:9999, flexShrink:0,
                      background:`${item.badgeClr}16`, color:item.badgeClr,
                      border:`1px solid ${item.badgeClr}35`,
                      fontSize:9.5, fontWeight:700, letterSpacing:"0.04em",
                    }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span style={{ fontSize:11, color:T.tl, lineHeight:1.4 }}>{item.desc}</span>
              </div>

              <ChevronRight size={14} color={T.tl} style={{ flexShrink:0 }}/>
            </button>
          ))}
        </div>

        {/* Footer — aviso si no hay riesgo */}
        {!hasRisk && (
          <div style={{
            margin:"0 8px 8px",
            padding:"8px 12px",
            background:T.bdrL, borderRadius:8,
            fontFamily:T.fB, fontSize:11, color:T.tl, lineHeight:1.5,
            display:"flex", alignItems:"flex-start", gap:6,
          }}>
            <ShieldCheck size={13} color={T.tl} style={{ flexShrink:0, marginTop:1 }}/>
            <span>Plan de Seguridad disponible cuando hay indicadores de riesgo activos en la sesión.</span>
          </div>
        )}
      </div>
    </>
  );
}

export default function Sessions({ sessions = [], setSessions, patients = [], setPatients, profile, prefill, riskAssessments = [], setRiskAssessments, services = [], setPayments, payments = [], treatmentPlans = [], appointments = [], setAppointments, interSessions = [], setInterSessions }) {
  // ── Responsive: detectar ancho de ventana ────────────────────────────────
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobileView = windowWidth < 768;

  const [filterPt,  setFilterPt]  = useState("");
  const [showAdd,   setShowAdd]   = useState(!!prefill);
  const [referral,  setReferral]  = useState(null);
  const [refForm,   setRefForm]   = useState({ reason:"", specialist:"", notes:"" });
  const [riskOpen,  setRiskOpen]  = useState(false);
  const [quickRisk, setQuickRisk] = useState(BLANK_RISK);
  const [showTpl,          setShowTpl]          = useState(false);
  const [exportMenuId,     setExportMenuId]      = useState(null); // Etapa 4: id de sesión con menú export abierto

  // ── ETAPA 3: Plan de Seguridad Wizard ────────────────────────────────────
  const [showSafetyWizard,  setShowSafetyWizard]  = useState(false);
  const [pendingRiskSave,   setPendingRiskSave]   = useState(null); // datos del riesgo detectado al guardar
  const [safetyPlanDraft,   setSafetyPlanDraft]   = useState({
    warningSignals:"", copingStrategies:"",
    familyContact:"", familyPhone:"", professionalContact:"", professionalPhone:"",
    reasonsToLive:"", environmentSafety:""
  });

  // ── Tareas del paciente seleccionado ─────────────────────────────────────
  const [patientTasks,     setPatientTasks]     = useState([]);
  const [viewTaskResponse, setViewTaskResponse] = useState(null);

  const blankForm = { patientId:"", date:fmt(todayDate), duration:50, mood:"moderado", progress:"bueno", noteFormat:"libre", notes:"", structured:null, tags:"", taskAssigned:"", tasksAssigned:[], taskCompleted:null, privateNotes:"" };
  const [form, setForm] = useState(prefill ? { ...blankForm, patientId:prefill.patientId||"", date:prefill.date||fmt(todayDate) } : blankForm);

  useEffect(() => {
    if (!form?.patientId) { setPatientTasks([]); return; }
    getAssignmentsByPatient(form.patientId)
      .then(setPatientTasks)
      .catch(() => setPatientTasks([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.patientId]);

  const fld  = k => v => setForm(f => ({ ...f, [k]:v }));
  const rfld = k => v => setRefForm(f => ({ ...f, [k]:v }));
  const rld  = k => v => setQuickRisk(r => ({ ...r, [k]:v }));

  const [aiSummary,    setAiSummary]    = useState(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiError,      setAiError]      = useState("");
  const [showAiModal,  setShowAiModal]  = useState(false);
  const [taskError,    setTaskError]    = useState("");
  const [showCobro,    setShowCobro]    = useState(false);
  const [cobroData,    setCobroData]    = useState(null); // { sessionId, patientId, patientName, date }

  // ── Wizard de Cierre (Secciones 8.3 → 8.4 → 8.5 del Flujo Clínico) ─────────
  const [showCloseWizard, setShowCloseWizard] = useState(false);
  const [closeCtx,        setCloseCtx]        = useState(null); // { patientId, patientName, date, sessionId }
  const [closeStep,       setCloseStep]        = useState(1);   // 1=Intersesión 2=Próxima cita 3=WhatsApp
  const [closeInterForm,  setCloseInterForm]   = useState({ notes:"", type:"Indicación" });
  const [closeNextAppt,   setCloseNextAppt]    = useState({ date:"", time:"09:00", type:"Seguimiento" });
  const cifld = k => v => setCloseInterForm(f => ({ ...f, [k]: v }));
  const cnfld = k => v => setCloseNextAppt(f => ({ ...f, [k]: v }));

  const openCloseWizard = (ctx) => {
    setCloseCtx(ctx);
    setCloseStep(1);
    setCloseInterForm({ notes:"", type:"Indicación" });
    // Pre-fill next appt one week from session date
    const d = new Date(ctx.date);
    d.setDate(d.getDate() + 7);
    const nextDate = d.toISOString().split("T")[0];
    // Find last session time for this patient
    const lastAppt = appointments
      .filter(a => a.patientId === ctx.patientId)
      .sort((a,b) => b.date.localeCompare(a.date))[0];
    setCloseNextAppt({ date: nextDate, time: lastAppt?.time || "09:00", type:"Seguimiento" });
    setShowCloseWizard(true);
  };

  const saveCloseIntersession = () => {
    if (closeInterForm.notes.trim() && setInterSessions) {
      setInterSessions(prev => [...prev, {
        id:        "is" + uid(),
        patientId: closeCtx.patientId,
        sessionId: closeCtx.sessionId,
        date:      closeCtx.date,
        type:      closeInterForm.type,
        notes:     closeInterForm.notes,
        createdAt: new Date().toISOString(),
      }]);
    }
    setCloseStep(2);
  };

  const saveCloseNextAppt = () => {
    if (closeNextAppt.date && setAppointments) {
      const pt = patients.find(p => p.id === closeCtx.patientId);
      setAppointments(prev => [...prev, {
        id:          "a" + uid(),
        patientId:   closeCtx.patientId,
        patientName: pt?.name || closeCtx.patientName,
        date:        closeNextAppt.date,
        time:        closeNextAppt.time,
        type:        closeNextAppt.type,
        modality:    "",
        status:      "pendiente",
        isRecurring: false,
      }]);
    }
    setCloseStep(3);
  };

  const whatsappNextAppt = () => {
    const pt    = patients.find(p => p.id === closeCtx?.patientId);
    const phone = pt?.phone?.replace(/\D/g, "");
    if (!phone || !closeNextAppt.date) return null;
    const nombre   = pt.name?.split(" ")[0] || "";
    const psicologa = profile?.name?.split(" ")[0] || "tu psicóloga";
    const fecha    = new Date(closeNextAppt.date + "T12:00:00")
      .toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" });
    const msg = encodeURIComponent(
      `Hola ${nombre}. 📅 Tu próxima sesión está confirmada para el ${fecha} a las ${closeNextAppt.time}. Si tienes alguna duda, no dudes en escribirnos. ¡Hasta pronto! 💙\n— ${psicologa}`
    );
    return `https://wa.me/52${phone}?text=${msg}`;
  };

  // Service helpers
  const SERVICE_TYPE_LABEL = { sesion:"Sesión individual", evaluacion:"Evaluación neuropsicológica", pareja:"Terapia de pareja", grupo:"Grupo / Taller", paquete:"Paquete", otro:"Otro" };
  const getServiceOptions = (patientId) => {
    if (!services.length) return [];
    return services.map(s => ({
      id: s.id,
      label: s.name || SERVICE_TYPE_LABEL[s.type] || s.type,
      price: s.price, priceVirtual: s.priceVirtual, modality: s.modality,
    }));
  };
  const [cobroForm, setCobroForm] = useState({ serviceId:"", modality:"", amount:"", method:"Transferencia", concept:"" });
  const [showCobroModality, setShowCobroModality] = useState(false);

  // ── Toast de confirmación (Fase 2) ───────────────────────────────────────────
  const [toast, setToast] = useState({ msg:"", type:"success", visible:false });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type, visible:true });
    setTimeout(() => setToast(t => ({ ...t, visible:false })), 4800);
  };

  // ── Folio correlativo numérico (mismo algoritmo que Finance.jsx) ─────────────
  const nextFolio = () => {
    const nums = (payments || []).map(p => Number(p.folio)).filter(n => !isNaN(n) && n > 0);
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  };

  // ── Preload inteligente del servicio en modal cobro ──────────────────────────
  // Prioridad: 1) defaultServiceId del paciente → 2) sessionCost del paciente
  //            → 3) primer servicio tipo "sesion" → 4) primer servicio disponible
  const preloadCobroForPatient = (pt) => {
    if (pt?.defaultServiceId) {
      const svc = services.find(s => s.id === pt.defaultServiceId);
      if (svc) { handleCobroService(svc.id); return; }
    }
    if (pt?.sessionCost) {
      setCobroForm(f => ({ ...f, amount: String(pt.sessionCost), concept:"Sesión individual" }));
      return;
    }
    const fallback = services.find(s => s.type === "sesion") || services[0];
    if (fallback) handleCobroService(fallback.id);
  };

  const handleCobroService = (serviceId) => {
    const svc = services.find(s => s.id === serviceId);
    if (!svc) { setCobroForm(f => ({ ...f, serviceId, modality:"", amount:"", concept:"" })); return; }
    const label = svc.name || SERVICE_TYPE_LABEL[svc.type] || svc.type;
    if (svc.modality === "ambas") {
      setCobroForm(f => ({ ...f, serviceId, concept: label, modality:"", amount:"" }));
      setShowCobroModality(true);
    } else {
      const price = svc.modality === "virtual" ? svc.priceVirtual : svc.price;
      setCobroForm(f => ({ ...f, serviceId, concept: label, modality: svc.modality, amount: String(price || "") }));
      setShowCobroModality(false);
    }
  };

  const applyCobroModality = (mod) => {
    const svc = services.find(s => s.id === cobroForm.serviceId);
    if (!svc) return;
    const price = mod === "virtual" ? svc.priceVirtual : svc.price;
    setCobroForm(f => ({ ...f, modality: mod, amount: String(price || "") }));
    setShowCobroModality(false);
  };

  const saveCobro = () => {
    if (!cobroData || !cobroForm.amount) return;
    const folio = nextFolio();
    const payment = {
      id: "p" + uid(),
      folio,
      patientId:   cobroData.patientId,
      patientName: cobroData.patientName,
      sessionId:   cobroData.sessionId,
      date:        cobroData.date,
      amount:      Number(cobroForm.amount),
      concept:     cobroForm.concept || "Sesión",
      method:      cobroForm.method,
      modality:    cobroForm.modality,
      status:      "pagado",
    };
    setPayments(prev => [...prev, payment]);

    // FASE 2 — Event Bus: notificar al Dashboard para actualizar gráficas
    emit.sessionFinalized({
      patientId: cobroData.patientId,
      sessionId: cobroData.sessionId,
      amount:    payment.amount,
      folio,
      method:    payment.method,
    });

    setShowCobro(false);
    const savedCtx = { ...cobroData };
    setCobroData(null);
    setCobroForm({ serviceId:"", modality:"", amount:"", method:"Transferencia", concept:"" });

    const agendaMsg = savedCtx._agendaSynced ? " · 📅 Cita actualizada" : "";
    showToast(`✓ Sesión guardada${agendaMsg} · 💰 Pago registrado (Folio ${folio})`);
    openCloseWizard({ patientId: savedCtx.patientId, patientName: savedCtx.patientName,
      date: savedCtx.date, sessionId: savedCtx.sessionId });
  };

  // ── Omitir cobro → pago queda como "pendiente" en Finanzas ─────────────────
  const skipCobro = () => {
    if (!cobroData) { setShowCobro(false); return; }
    const folio = nextFolio();
    const pending = {
      id:          "p" + uid(),
      folio,
      patientId:   cobroData.patientId,
      patientName: cobroData.patientName,
      sessionId:   cobroData.sessionId,
      date:        cobroData.date,
      amount:      0,
      concept:     "Sesión (pendiente de cobro)",
      method:      "",
      modality:    "",
      status:      "pendiente",
    };
    setPayments(prev => [...prev, pending]);
    const agendaSkipMsg = cobroData?._agendaSynced ? " · 📅 Cita actualizada" : "";
    const savedCtx = { ...cobroData };
    setShowCobro(false);
    setCobroData(null);
    setCobroForm({ serviceId:"", modality:"", amount:"", method:"Transferencia", concept:"" });
    showToast(`Sesión guardada${agendaSkipMsg} · ⏳ Cobro pendiente en Finanzas`, "warning");
    openCloseWizard({ patientId: savedCtx.patientId, patientName: savedCtx.patientName,
      date: savedCtx.date, sessionId: savedCtx.sessionId });
  };

  const handleAISummary = async () => {
    setAiLoading(true); setAiError(""); setShowAiModal(true);
    const pt = patients.find(p => p.id === form.patientId);
    try {
      const result = await generateAISummary({
        notes: form.notes,
        structured: form.structured,
        noteFormat: form.noteFormat,
        patientName: pt?.name || "",
        diagnosis: pt?.diagnosis || "",
        duration: form.duration,
        mood: form.mood,
        progress: form.progress,
      });
      setAiSummary(result);
    } catch {
      setAiError("No se pudo generar el resumen. Verifica tu conexión.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormatChange = (newFormat) => {
    setForm(f => ({ ...f, noteFormat: newFormat, structured: blankStructured(newFormat), notes: "" }));
  };

  const handleStructuredChange = (key, val) => {
    setForm(f => {
      const s = { ...f.structured, [key]:val };
      return { ...f, structured:s, notes:compileNotes(f.noteFormat, s) };
    });
  };

  const handleApplyTemplate = (fields) => {
    setForm(f => {
      const merged = { ...blankStructured(f.noteFormat) };
      Object.entries(fields).forEach(([k, v]) => { if (merged[k] !== undefined) merged[k] = v; });
      return { ...f, structured: merged, notes: compileNotes(f.noteFormat, merged) };
    });
  };
  const isStructured = form.noteFormat !== "libre";

  const canSave = form.patientId && (
    isStructured
      ? NOTE_FORMATS[form.noteFormat]?.fields?.some(f => form.structured?.[f.key]?.trim())
      : form.notes.trim()
  );

  const filtered = useMemo(() =>
    sessions.filter(s => !filterPt || s.patientId === filterPt).sort((a,b) => b.date.localeCompare(a.date)),
    [sessions, filterPt]);

  const save = () => {
    if (!canSave) return;
    const pt = patients.find(p => p.id === form.patientId);
    const sessionId = "s" + uid();
    const finalNotes = isStructured ? compileNotes(form.noteFormat, form.structured) : form.notes;
    setSessions(prev => [...prev, { ...form, id:sessionId, patientName:pt?.name||"", notes:finalNotes, tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean) }]);

    // FASE 2 ── Agenda Sync: cerrar automáticamente la cita del día ───────────
    let appointmentClosed = false;
    if (setAppointments && appointments.length > 0) {
      const match = appointments.find(a =>
        a.patientId === form.patientId &&
        a.date      === form.date      &&
        a.status    !== "completada"
      );
      if (match) {
        setAppointments(prev =>
          prev.map(a => a.id === match.id ? { ...a, status:"completada" } : a)
        );
        appointmentClosed = true;
      }
    }

    // FASE 2 — notificar al resto de la app que se creó una sesión
    emit.sessionCreated({ patientId: form.patientId, patientName: pt?.name||"", sessionId, date: form.date });

    // FASE 2 ── Finance Sync: abrir modal de cobro con monto precargado ───────
    if (setPayments) {
      setCobroData({ sessionId, patientId: form.patientId, patientName: pt?.name||"", date: form.date, _agendaSynced: appointmentClosed,
        _session: { ...form, id: sessionId, patientName: pt?.name||"", notes: finalNotes, tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean) },
        _patient: pt || null,
      });
      preloadCobroForPatient(pt);
      setShowCobro(true);
    } else {
      // Sin módulo de cobro → toast inmediato
      showToast(appointmentClosed
        ? "✓ Sesión guardada · Cita marcada como completada"
        : "✓ Sesión guardada correctamente"
      );
    }

    // ── ETAPA 3: Protocolo de Riesgo y Alerta Clínica ──────────────────────────
    const hasRisk = quickRisk.suicidalIdeation !== "ninguna" || quickRisk.selfHarm !== "ninguna" || quickRisk.harmToOthers;
    // Crisis crítica = requiere Wizard de Plan de Seguridad obligatorio
    const isCrisis = quickRisk.suicidalIdeation === "activa" ||
                     quickRisk.suicidalIdeation === "pasiva" ||
                     quickRisk.selfHarm === "activa";

    if (hasRisk && setRiskAssessments) {
      const suggested = quickRisk.suicidalIdeation==="activa" ? "alto"
        : quickRisk.suicidalIdeation==="pasiva" || quickRisk.selfHarm==="activa" ? "moderado"
        : "bajo";

      const newRaId = "ra"+uid();
      setRiskAssessments(prev => [...prev, {
        id: newRaId, patientId:form.patientId, patientName:pt?.name||"", sessionId,
        date: form.date, evaluatedBy:"session", ...quickRisk,
        hasPlan:false, hasMeans:false, hasIntent:false, previousAttempts:0,
        protectiveFactors:[], riskLevel:suggested, clinicalNotes:"",
        safetyPlan:{ warningSignals:"",copingStrategies:"",supportContacts:"",
          professionalContacts:"",environmentSafety:"",reasonsToLive:"" }
      }]);

      // ETAPA 3 — Persistencia de alerta en el objeto del paciente (Supabase via AppStateContext)
      // El campo activeRiskAlert se guarda junto al paciente → survives reload/re-open.
      // Se elimina solo cuando el terapeuta pulsa "Riesgo Mitigado" en Patients.jsx.
      if (isCrisis && setPatients) {
        setPatients(prev => prev.map(p => p.id === form.patientId
          ? { ...p, activeRiskAlert: { level: suggested, date: form.date, sessionId, raId: newRaId } }
          : p
        ));
      }

      // FASE 2 — Event Bus: notificar a Dashboard / otros módulos
      emit.riskElevated({ patientId: form.patientId, patientName: pt?.name||"", sessionId, level: suggested });

      // ETAPA 3 — Si es crisis: guardar datos y abrir Wizard antes de cerrar modal
      if (isCrisis) {
        setPendingRiskSave({ patientId: form.patientId, patientName: pt?.name||"", sessionId, raId: newRaId, level: suggested, date: form.date });
        setSafetyPlanDraft({ warningSignals:"",copingStrategies:"",familyContact:"",familyPhone:"",professionalContact:"",professionalPhone:"",reasonsToLive:"",environmentSafety:"" });
        setShowSafetyWizard(true);
        // NO cerramos el modal principal todavía — el Wizard toma el control
      }
    }
    // Crear asignaciones en Supabase para cada plantilla seleccionada
    // FASE 2 — emitir tarea asignada para que Dashboard y Patients se enteren
    if (form.tasksAssigned?.length > 0) {
      emit.taskAssigned({ patientId: form.patientId, patientName: pt?.name||"", sessionId, count: form.tasksAssigned.length });
    }
    if (pt?.phone && form.tasksAssigned?.length > 0) {
      const cleanPhone = pt.phone.replace(/\D/g, "");
      const assignPromises = form.tasksAssigned.map(tplId => {
        const tpl = TASK_TEMPLATES[tplId];
        if (!tpl) return Promise.resolve({ ok: true });
        return createAssignment({
          patientId: form.patientId,
          patientName: pt.name || "",
          patientPhone: cleanPhone,
          templateId: tplId,
          title: tpl.title,
          notes: "",
          sessionId,
        }).then(() => ({ ok: true })).catch(e => ({ ok: false, error: e }));
      });
      Promise.allSettled(assignPromises).then((results) => {
        const failed = results.filter(r => r.value?.ok === false).length;
        if (failed > 0) {
          setTaskError(`⚠️ ${failed} tarea(s) no se pudieron guardar en Supabase. Verifica la conexión.`);
          setTimeout(() => setTaskError(""), 6000);
        }
        const nombre = pt.name?.split(" ")[0] || "";
        const listaTareas = form.tasksAssigned
          .map(id => TASK_TEMPLATES[id])
          .filter(Boolean)
          .map((tpl, i) => `${i + 1}. ${tpl.icon} *${tpl.title}*`)
          .join("\n");
        const msg = encodeURIComponent(
          `Hola ${nombre}! 👋\n\nTe asigné ${form.tasksAssigned.length === 1 ? "una tarea" : "estas tareas"} para trabajar antes de nuestra próxima sesión:\n\n${listaTareas}\n\nPuedes verlas y completarlas aquí:\n${PORTAL_URL}\n\n_Ingresa con tu número de celular._`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
      });
    } else if (form.tasksAssigned?.length > 0) {
      const assignPromises = form.tasksAssigned.map(tplId => {
        const tpl = TASK_TEMPLATES[tplId];
        if (!tpl) return Promise.resolve();
        return createAssignment({ patientId: form.patientId, patientName: pt?.name || "", patientPhone: "", templateId: tplId, title: tpl.title, notes: "", sessionId })
          .catch(() => {
            setTaskError("⚠️ Algunas tareas no se pudieron guardar. Verifica la conexión.");
            setTimeout(() => setTaskError(""), 6000);
          });
      });
      Promise.allSettled(assignPromises);
    }
    setForm(blankForm); setQuickRisk(BLANK_RISK); setRiskOpen(false); setShowAdd(false);
  };

  const duplicate = (s) => {
    setForm({ patientId:s.patientId, date:fmt(todayDate), duration:s.duration, mood:s.mood, progress:s.progress, tags:(s.tags||[]).join(", "), noteFormat:s.noteFormat||"libre", notes:s.noteFormat==="libre"?s.notes:"", structured:s.structured?{...s.structured}:null, taskAssigned:"", tasksAssigned:[], taskCompleted:null, privateNotes:"" });
    setShowAdd(true);
  };

  const del = id => setSessions(prev => prev.filter(s => s.id !== id));

  const openReferral = (session) => {
    setReferral({ session, patient:patients.find(p => p.id === session.patientId) });
    setRefForm({ reason:"", specialist:"", notes:"" });
  };

  return (
    <div>
      <PageHeader title="Notas de Sesión"
        subtitle={`${sessions.length} nota${sessions.length!==1?"s":""} registrada${sessions.length!==1?"s":""}`}
        action={<Btn onClick={() => { setForm(blankForm); setShowAdd(true); }}><Plus size={15}/> Nueva nota</Btn>}
      />
      {/* Toast de error de tareas */}
      {taskError && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", zIndex:500,
          background:"#B85050", color:"#fff", padding:"12px 20px", borderRadius:12,
          fontFamily:T.fB, fontSize:13, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", whiteSpace:"nowrap" }}>
          {taskError}
        </div>
      )}

      {/* ── Toast de confirmación Fase 2 ───────────────────────────────────── */}
      {toast.visible && (
        <div style={{
          position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
          zIndex:600, display:"flex", alignItems:"center", gap:10,
          background: toast.type === "warning" ? "#B8900A" : "#2D6A4F",
          color:"#fff", padding:"13px 22px", borderRadius:14,
          fontFamily:T.fB, fontSize:13.5, fontWeight:600,
          boxShadow:"0 10px 30px rgba(0,0,0,0.25)", whiteSpace:"nowrap",
          animation:"fadeSlideUp .3s ease",
        }}>
          <span style={{ fontSize:17 }}>{toast.type === "warning" ? "⚠️" : "✅"}</span>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}} @keyframes pulseRisk{0%,100%{box-shadow:0 0 0 0 rgba(184,80,80,0.4)}50%{box-shadow:0 0 0 6px rgba(184,80,80,0.0)}}`}</style>

      <div style={{ marginBottom:20 }}>
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
          <option value="">Todos los pacientes</option>
          {patients.map(p => <option key={p.id} value={p.id}>{(p.name || "").split(" ").slice(0,2).join(" ")}</option>)}
        </select>
      </div>

      {filtered.length === 0
        ? <EmptyState icon={FileText} title="Sin notas" desc="Registra la evolución de tus pacientes con el botón de arriba"/>
        : filtered.map(s => {
          const MI = moodIcon(s.mood);
          const ps = progressStyle(s.progress);
          const isStruct = s.noteFormat && s.noteFormat !== "libre" && s.structured;
          return (
            <Card key={s.id} style={{ padding:0, marginBottom:10, overflow:"hidden" }}>
              {/* Contenido */}
              <div style={{ padding:"14px 16px" }}>
                {/* Header: nombre + badge formato + fecha */}
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2, overflow:"hidden" }}>
                  <span style={{ fontFamily:T.fB, fontSize:14.5, fontWeight:600, color:T.t,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {s.patientName.split(" ").slice(0,2).join(" ")}
                  </span>
                  {isStruct && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"1px 7px",
                      borderRadius:9999, background:NOTE_FORMATS[s.noteFormat]?.bg,
                      color:NOTE_FORMATS[s.noteFormat]?.color, fontSize:9, fontWeight:700,
                      fontFamily:T.fB, flexShrink:0, letterSpacing:"0.04em" }}>
                      {s.noteFormat}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginBottom:10 }}>
                  {fmtDate(s.date)} · {s.duration} min
                </div>

                {/* Nota */}
                {isStruct
                  ? <StructuredPreview session={s}/>
                  : <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, margin:"0 0 10px",
                      lineHeight:1.6, display:"-webkit-box", WebkitLineClamp:2,
                      WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {s.notes}
                    </p>
                }

                {/* Estado + tags */}
                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginTop:isStruct?6:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <MI size={13} color={moodColor(s.mood)}/>
                    <span style={{ fontSize:11.5, fontFamily:T.fB, color:moodColor(s.mood), fontWeight:600 }}>{s.mood}</span>
                  </div>
                  <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                  {(s.tags||[]).map(tag => <Badge key={tag} color={T.acc} bg={T.accA}><Tag size={9}/>{tag}</Badge>)}
                </div>

                {/* Task badges */}
                {(s.taskCompleted !== null || s.tasksAssigned?.length > 0) && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:6 }}>
                    {s.taskCompleted === true  && <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, background:T.sucA, color:T.suc, fontSize:10, fontWeight:700, fontFamily:T.fB }}><Check size={9}/>Completada</span>}
                    {s.taskCompleted === false && <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, background:T.warA, color:T.war, fontSize:10, fontWeight:700, fontFamily:T.fB }}>✗ No completada</span>}
                    {s.tasksAssigned?.length > 0 && <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, background:T.pA, color:T.p, fontSize:10, fontWeight:600, fontFamily:T.fB }}><ClipboardCheck size={9}/>{s.tasksAssigned.length} tarea{s.tasksAssigned.length>1?"s":""} asignada{s.tasksAssigned.length>1?"s":""}</span>}
                  </div>
                )}
              </div>

              {/* Barra de acciones — separada con línea */}
              <div style={{ borderTop:`1px solid ${T.bdrL}`, display:"flex", alignItems:"center", background:T.cardAlt, position:"relative" }}>
                {[
                  { label:"Derivar",  icon:Send,    onClick:() => openReferral(s),          color:T.tm },
                  { label:"PDF",      icon:FileText, onClick:() => {
                      const folio = getSessionFolio(s, sessions);
                      printNotaEvolucion(s, patients.find(p => p.id === s.patientId), profile, riskAssessments, folio, NOTE_FORMATS);
                    }, color:T.p },
                  { label:"Eliminar", icon:Trash2,  onClick:() => del(s.id),               color:T.err },
                ].map(a => (
                  <button key={a.label} onClick={a.onClick}
                    style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                      gap:5, padding:"9px 4px", background:"none", border:"none",
                      borderRight:`1px solid ${T.bdrL}`, cursor:"pointer",
                      fontFamily:T.fB, fontSize:11, fontWeight:500, color:a.color,
                      transition:"background .13s" }}
                    onMouseEnter={e => e.currentTarget.style.background=T.bdrL}
                    onMouseLeave={e => e.currentTarget.style.background="none"}>
                    <a.icon size={13}/>{a.label}
                  </button>
                ))}
                {/* Exportar — menú desplegable */}
                <button
                  onClick={() => setExportMenuId(prev => prev === s.id ? null : s.id)}
                  style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                    gap:5, padding:"9px 4px", background: exportMenuId === s.id ? T.pA : "none",
                    border:"none", cursor:"pointer",
                    fontFamily:T.fB, fontSize:11, fontWeight:500,
                    color: exportMenuId === s.id ? T.p : T.tm,
                    transition:"background .13s" }}
                  onMouseEnter={e => { if (exportMenuId !== s.id) e.currentTarget.style.background=T.bdrL; }}
                  onMouseLeave={e => { if (exportMenuId !== s.id) e.currentTarget.style.background="none"; }}>
                  <Download size={13}/>Exportar
                </button>
                {/* Menú de exportación desplegable */}
                {exportMenuId === s.id && (
                  <ExportMenu
                    session={s}
                    patient={patients.find(p => p.id === s.patientId)}
                    profile={profile}
                    riskAssessments={riskAssessments}
                    allSessions={sessions}
                    noteFormats={NOTE_FORMATS}
                    onClose={() => setExportMenuId(null)}
                  />
                )}
              </div>
            </Card>
          );
        })
      }

      {/* ── New/duplicate modal ──────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva nota"
        width={isMobileView ? 620 : 940}>

        {/* Mobile: acordeón de contexto clínico al inicio del formulario */}
        {isMobileView && (
          <ClinicalReferencePanel
            patientId={form.patientId}
            sessions={sessions}
            treatmentPlans={treatmentPlans}
            riskAssessments={riskAssessments}
            patients={patients}
            isMobile
          />
        )}

        {/* Layout: grid en desktop (1fr + panel 290px) / bloque en mobile */}
        <div style={isMobileView ? {} : {
          display:"grid", gridTemplateColumns:"1fr 290px", gap:20, alignItems:"flex-start"
        }}>

          {/* ── Columna principal del formulario ───────────────────── */}
          <div>
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]}/>
        {/* ── Widget de tareas del paciente ─────────────────────── */}
        {form.patientId && patientTasks.length > 0 && (() => {
          const completadas = patientTasks.filter(t => t.status === "completed");
          const pendientes  = patientTasks.filter(t => t.status === "pending");
          const sinRevision = completadas.filter(t => {
            if (!t.completed_at) return false;
            return Date.now() - new Date(t.completed_at).getTime() < 7 * 24 * 3600 * 1000;
          });
          return (
            <div style={{ marginBottom:16, borderRadius:12, border:`1.5px solid ${sinRevision.length > 0 ? T.suc+"60" : T.bdr}`, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", background: sinRevision.length > 0 ? T.sucA : T.bdrL, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <ClipboardCheck size={14} color={sinRevision.length > 0 ? T.suc : T.tm}/>
                  <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color: sinRevision.length > 0 ? T.suc : T.tm, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    Tareas del paciente
                  </span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {sinRevision.length > 0 && <span style={{ padding:"2px 8px", borderRadius:9999, background:T.sucA, border:`1px solid ${T.suc}40`, fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.suc }}>{sinRevision.length} completada{sinRevision.length>1?"s":""}</span>}
                  {pendientes.length > 0  && <span style={{ padding:"2px 8px", borderRadius:9999, background:"rgba(184,144,10,0.1)", border:"1px solid rgba(184,144,10,0.3)", fontFamily:T.fB, fontSize:10, fontWeight:700, color:"#B8900A" }}>{pendientes.length} pendiente{pendientes.length>1?"s":""}</span>}
                </div>
              </div>
              <div style={{ padding:"10px 14px", background:T.card, display:"flex", flexDirection:"column", gap:8 }}>
                {patientTasks.slice(0,4).map(t => {
                  const tpl  = TASK_TEMPLATES[t.template_id];
                  const done = t.status === "completed";
                  const fromThisSession = sessions.some(s => s.id === t.session_id);
                  return (
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:9, background: done ? T.sucA : "rgba(184,144,10,0.06)", border:`1px solid ${done ? T.suc+"30" : "rgba(184,144,10,0.2)"}` }}>
                      <span style={{ fontSize:16 }}>{tpl?.icon || "📋"}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:T.fB, fontSize:12.5, fontWeight:600, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</div>
                        <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
                          {done ? `Completada ${new Date(t.completed_at).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}` : `Asignada ${new Date(t.assigned_at).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}`}
                          {fromThisSession ? " · esta sesión" : ""}
                        </div>
                      </div>
                      {done && (
                        <button onClick={() => setViewTaskResponse(t)}
                          style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:7, border:`1px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:11, fontWeight:600, cursor:"pointer", flexShrink:0 }}>
                          <Eye size={11}/> Ver
                        </button>
                      )}
                    </div>
                  );
                })}
                {patientTasks.length > 4 && (
                  <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"center" }}>+{patientTasks.length - 4} más en el módulo Tareas</div>
                )}
              </div>
            </div>
          );
        })()}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Fecha"      value={form.date}     onChange={fld("date")}     type="date"/>
          <Input label="Duración"   value={form.duration} onChange={fld("duration")} type="number"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Select label="Progreso" value={form.progress} onChange={fld("progress")}
            options={["excelente","bueno","moderado","bajo"].map(p => ({value:p,label:p}))}/>
          <Select label="Ánimo" value={form.mood} onChange={fld("mood")}
            options={["bueno","moderado","bajo"].map(p => ({value:p,label:p}))}/>
        </div>

        <FormatSelector value={form.noteFormat} onChange={(f) => { handleFormatChange(f); setShowTpl(false); }}/>

        {/* ── Template selector ─────────────────────────────────── */}
        {form.patientId && (
          <div style={{ marginBottom:showTpl?0:12 }}>
            {!showTpl && (
              <button onClick={() => setShowTpl(true)}
                style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:9999, border:`1.5px solid ${T.bdrL}`, background:"transparent", cursor:"pointer", fontFamily:T.fB, fontSize:12, color:T.tm, transition:"all .13s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdrL; e.currentTarget.style.color=T.tm; }}>
                🗒 Usar plantilla clínica
              </button>
            )}
            {showTpl && (
              <TemplatePanel
                patient={patients.find(p => p.id === form.patientId)}
                noteFormat={form.noteFormat}
                onApply={handleApplyTemplate}
                onClose={() => setShowTpl(false)}
              />
            )}
          </div>
        )}

        {isStructured
          ? <StructuredFields formatId={form.noteFormat} structured={form.structured||{}} onChange={handleStructuredChange}/>
          : <Textarea label="Notas clínicas *" value={form.notes} onChange={fld("notes")}
              placeholder="Describe la sesión, intervenciones y respuesta del paciente..." rows={5}/>
        }

        {/* ── Botón resumen IA ──────────────────────────────────────── */}
        {(form.notes?.trim() || form.structured) && (
          <button onClick={handleAISummary} disabled={aiLoading}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px",
              borderRadius:10, border:`1.5px solid rgba(107,91,158,0.4)`,
              background:"rgba(107,91,158,0.06)", color:"#6B5B9E",
              fontFamily:T.fB, fontSize:13, fontWeight:600, cursor:"pointer",
              marginBottom:16, transition:"all .15s" }}>
            <Sparkles size={14}/>
            {aiLoading ? "Generando resumen…" : "✨ Resumen con IA"}
          </button>
        )}

        <Input label="Etiquetas (separadas por coma)" value={form.tags} onChange={fld("tags")} placeholder="TCC, ansiedad, respiración"/>

        {/* ── Tareas terapéuticas ───────────────────────────────────── */}
        <div style={{ border:`1.5px solid ${T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16 }}>
          <div style={{ padding:"9px 14px", background:T.pA, borderBottom:`1px solid ${T.bdrL}` }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.07em", display:"flex", alignItems:"center", gap:6 }}>
              <ClipboardCheck size={13}/> Tareas terapéuticas
            </label>
          </div>
          <div style={{ padding:"12px 14px", background:T.card }}>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>¿Completó la tarea anterior?</label>
              <div style={{ display:"flex", gap:7 }}>
                {[{v:null,l:"No aplica"},{v:true,l:"✓ Sí"},{v:false,l:"✗ No"}].map(({v,l}) => {
                  const on = form.taskCompleted === v;
                  const c = v===true?T.suc:v===false?T.err:T.tm;
                  const bg = v===true?T.sucA:v===false?T.errA:T.bdrL;
                  return <button key={String(v)} onClick={() => fld("taskCompleted")(v)} style={{ flex:1, padding:"8px 6px", border:`1.5px solid ${on?c:T.bdr}`, borderRadius:10, background:on?bg:"transparent", cursor:"pointer", fontFamily:T.fB, fontSize:12.5, fontWeight:on?700:400, color:on?c:T.tm, transition:"all .13s" }}>{l}</button>;
                })}
              </div>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Tareas para la próxima sesión</label>
              {/* Selected chips */}
              {form.tasksAssigned?.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                  {form.tasksAssigned.map(id => {
                    const tpl = TASK_TEMPLATES[id];
                    if (!tpl) return null;
                    return (
                      <div key={id} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px 4px 8px", borderRadius:9999, background:T.pA, border:`1.5px solid ${T.p}`, fontFamily:T.fB, fontSize:12, color:T.p, fontWeight:600 }}>
                        <span>{tpl.icon}</span>
                        <span>{tpl.title}</span>
                        <button onClick={() => fld("tasksAssigned")(form.tasksAssigned.filter(x => x !== id))}
                          style={{ background:"none", border:"none", cursor:"pointer", color:T.p, padding:0, marginLeft:2, lineHeight:1, fontSize:14, opacity:0.7 }}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Template grid */}
              <div style={{ maxHeight:220, overflowY:"auto", border:`1.5px solid ${T.bdr}`, borderRadius:10, padding:6, background:T.cardAlt, display:"flex", flexDirection:"column", gap:5 }}>
                {Object.values(TASK_TEMPLATES).map(tpl => {
                  const selected = form.tasksAssigned?.includes(tpl.id);
                  return (
                    <button key={tpl.id}
                      onClick={() => {
                        const cur = form.tasksAssigned || [];
                        fld("tasksAssigned")(selected ? cur.filter(x => x !== tpl.id) : [...cur, tpl.id]);
                      }}
                      style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 9px", borderRadius:8, border:`1.5px solid ${selected ? T.p : T.bdr}`, background:selected ? T.pA : T.card, cursor:"pointer", textAlign:"left", transition:"all .12s" }}>
                      <span style={{ fontSize:17, lineHeight:1, flexShrink:0 }}>{tpl.icon}</span>
                      <div style={{ overflow:"hidden" }}>
                        <div style={{ fontFamily:T.fB, fontSize:11.5, fontWeight:selected?700:500, color:selected?T.p:T.t, lineHeight:1.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tpl.title}</div>
                        <div style={{ fontFamily:T.fB, fontSize:10, color:T.tl, lineHeight:1.2 }}>{tpl.category}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {form.tasksAssigned?.length > 0 && !patients.find(p => p.id === form.patientId)?.phone && (
                <p style={{ fontFamily:T.fB, fontSize:11, color:T.war||"#B8900A", marginTop:6, lineHeight:1.4 }}>
                  ⚠️ Este paciente no tiene teléfono registrado. Las tareas se guardarán en la sesión pero no se enviarán al portal.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Notas de supervisión privadas ────────────────────────── */}
        <div style={{ border:`1.5px solid ${form.privateNotes?"rgba(107,91,158,0.4)":T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16, transition:"border .15s" }}>
          <div style={{ padding:"10px 16px", background:form.privateNotes?"rgba(107,91,158,0.08)":T.bdrL, display:"flex", alignItems:"center", gap:6 }}>
            <Lock size={12} color={form.privateNotes?"#6B5B9E":T.tl}/>
            <label style={{ fontSize:11, fontWeight:700, color:form.privateNotes?"#6B5B9E":T.tm, textTransform:"uppercase", letterSpacing:"0.07em" }}>
              Notas de supervisión <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, fontSize:11 }}>(privadas — no se exportan)</span>
            </label>
          </div>
          <textarea value={form.privateNotes} onChange={e => fld("privateNotes")(e.target.value)} rows={3}
            placeholder="Reflexiones personales, hipótesis no confirmadas, notas para supervisión clínica..."
            style={{ width:"100%", padding:"12px 16px", border:"none", outline:"none", fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, resize:"vertical", boxSizing:"border-box", lineHeight:1.65 }}/>
        </div>
        <div style={{ border:`1.5px solid ${riskOpen?"rgba(184,80,80,0.3)":T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16, transition:"border .15s" }}>
          <button onClick={() => setRiskOpen(o => !o)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"11px 16px", background:riskOpen?"rgba(184,80,80,0.06)":T.bdrL, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:13, fontWeight:600, color:riskOpen?T.err:T.tm, transition:"all .15s" }}>
            <span style={{ display:"flex", alignItems:"center", gap:7 }}>
              <ShieldAlert size={14}/> Pantalla de riesgo rápida
              {(quickRisk.suicidalIdeation!=="ninguna"||quickRisk.selfHarm!=="ninguna"||quickRisk.harmToOthers) && (
                <span style={{ padding:"1px 8px", borderRadius:9999, background:T.errA, color:T.err, fontSize:10, fontWeight:700 }}>ACTIVO</span>
              )}
            </span>
            {riskOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          {riskOpen && (
            <div style={{ padding:"16px 16px 4px", background:T.card }}>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:14 }}>
                Registro rápido. Para evaluación completa usa el módulo <strong>Riesgo</strong>.
              </div>
              {[
                { field:"suicidalIdeation", label:"Ideación suicida", opts:[{v:"ninguna",c:T.suc,bg:T.sucA},{v:"pasiva",c:T.war,bg:T.warA},{v:"activa",c:T.err,bg:T.errA}] },
                { field:"selfHarm",         label:"Autolesiones",     opts:[{v:"ninguna",c:T.suc,bg:T.sucA},{v:"pasada",label:"Historial",c:T.war,bg:T.warA},{v:"activa",c:T.err,bg:T.errA}] },
              ].map(({ field, label, opts }) => (
                <div key={field} style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>{label}</label>
                  <div style={{ display:"flex", gap:7 }}>
                    {opts.map(({ v, label:l, c, bg }) => {
                      const on = quickRisk[field] === v;
                      return <button key={v} onClick={() => rld(field)(v)} style={{ flex:1, padding:"9px 6px", border:`2px solid ${on?c:T.bdr}`, borderRadius:10, background:on?bg:"transparent", cursor:"pointer", fontFamily:T.fB, fontSize:12.5, fontWeight:on?700:400, color:on?c:T.tm, transition:"all .15s", textTransform:"capitalize" }}>{l||v}</button>;
                    })}
                  </div>
                </div>
              ))}
              <div onClick={() => rld("harmToOthers")(!quickRisk.harmToOthers)}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:quickRisk.harmToOthers?T.errA:T.bdrL, borderRadius:10, marginBottom:16, cursor:"pointer", border:`1.5px solid ${quickRisk.harmToOthers?T.err:"transparent"}`, transition:"all .15s" }}>
                <span style={{ fontFamily:T.fB, fontSize:13, color:quickRisk.harmToOthers?T.err:T.t }}>¿Riesgo a terceros?</span>
                <div style={{ width:20, height:20, borderRadius:6, background:quickRisk.harmToOthers?T.err:T.bdr, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
                  {quickRisk.harmToOthers && <Check size={12} color="#fff" strokeWidth={2.5}/>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
          {/* Etapa 4: botón de consentimiento informado rápido desde el formulario */}
          {form.patientId && (
            <button onClick={() => printConsentimientoInformado(patients.find(p => p.id === form.patientId), profile)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px",
                borderRadius:9, border:`1.5px solid rgba(107,91,158,0.35)`,
                background:"rgba(107,91,158,0.06)", cursor:"pointer",
                fontFamily:T.fB, fontSize:12, color:"#6B5B9E", fontWeight:600 }}>
              <FileCheck size={13}/> Consentimiento Informado
            </button>
          )}
          <div style={{ display:"flex", gap:10, marginLeft:"auto" }}>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={!canSave}><Check size={15}/> Guardar nota</Btn>
          </div>
        </div>
          </div>{/* ── fin columna formulario ── */}

          {/* Desktop: panel lateral de referencia clínica (sticky) */}
          {!isMobileView && (
            <ClinicalReferencePanel
              patientId={form.patientId}
              sessions={sessions}
              treatmentPlans={treatmentPlans}
              riskAssessments={riskAssessments}
              patients={patients}
              isMobile={false}
            />
          )}

        </div>{/* ── fin grid wrapper ── */}
      </Modal>


      {/* ══════════════════════════════════════════════════════════════════════
          ETAPA 3 — Mini-Wizard de Plan de Seguridad
          Se abre automáticamente cuando se detecta crisis al guardar la nota.
          Propósito: documentar el plan de seguridad INMEDIATAMENTE tras la sesión.
          Flujo: 3 pasos → (1) Señales de Advertencia (2) Estrategias (3) Contactos
          Al completar → guarda en riskAssessments y genera PDF para el paciente.
      ══════════════════════════════════════════════════════════════════════ */}
      {showSafetyWizard && pendingRiskSave && (() => {
        const RISK_CFG_LOCAL = {
          alto:      { label:"Alto",     color:"#C4622A", bg:"rgba(196,98,42,0.10)"  },
          moderado:  { label:"Moderado", color:"#B8900A", bg:"rgba(184,144,10,0.10)" },
          bajo:      { label:"Bajo",     color:T.suc,     bg:T.sucA                  },
          inminente: { label:"Inminente",color:T.err,     bg:T.errA                  },
        };
        const rc = RISK_CFG_LOCAL[pendingRiskSave.level] || RISK_CFG_LOCAL.moderado;
        const ptObj = patients.find(p => p.id === pendingRiskSave.patientId);
        const spld = k => v => setSafetyPlanDraft(d => ({...d,[k]:v}));

        const saveSafetyPlan = (andClose) => {
          if (!setRiskAssessments) return;
          // Composición de safetyPlan en formato compatible con RiskAssessment.jsx
          const sp = {
            warningSignals:    safetyPlanDraft.warningSignals,
            copingStrategies:  safetyPlanDraft.copingStrategies,
            supportContacts:   safetyPlanDraft.familyContact
              ? `${safetyPlanDraft.familyContact} — ${safetyPlanDraft.familyPhone}` : "",
            professionalContacts: safetyPlanDraft.professionalContact
              ? `${safetyPlanDraft.professionalContact} — ${safetyPlanDraft.professionalPhone}` : "",
            reasonsToLive:     safetyPlanDraft.reasonsToLive,
            environmentSafety: safetyPlanDraft.environmentSafety,
          };
          setRiskAssessments(prev => prev.map(ra =>
            ra.id === pendingRiskSave.raId ? { ...ra, safetyPlan: sp, hasPlan: true } : ra
          ));
          if (andClose) { setShowSafetyWizard(false); setPendingRiskSave(null); }
        };

        const printSafetyPlanFromWizard = () => {
          saveSafetyPlan(false);
          const spForPdf = {
            warningSignals:      safetyPlanDraft.warningSignals,
            copingStrategies:    safetyPlanDraft.copingStrategies,
            reasonsToLive:       safetyPlanDraft.reasonsToLive,
            environmentSafety:   safetyPlanDraft.environmentSafety,
            familyContact:       safetyPlanDraft.familyContact,
            familyPhone:         safetyPlanDraft.familyPhone,
            professionalContact: safetyPlanDraft.professionalContact,
            professionalPhone:   safetyPlanDraft.professionalPhone,
          };
          printPlanSeguridad(spForPdf, ptObj, profile, pendingRiskSave.level);
        };
        // ── legacy inline conservado pero nunca alcanzado ── ↓ cierre de función se mantiene para no romper AST
        const _legacy = () => {
          const today = new Date().toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"});
          const w = window.open("","_blank");
          w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Plan de Seguridad — ${pendingRiskSave.patientName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;max-width:720px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.65}
.header{border-bottom:3px solid #3A6B6E;padding-bottom:20px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-start}
.header h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#3A6B6E;margin-bottom:4px}
.header p{font-size:12px;color:#5A7270}
.risk-badge{padding:6px 16px;border-radius:9999px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:${rc.bg};color:${rc.color};border:1.5px solid ${rc.color}44}
.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:28px}
.info-box{background:#F9F8F5;padding:14px;border-radius:10px}
.info-box label{display:block;font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.info-box p{font-size:14px;font-weight:500}
.warning{background:rgba(184,80,80,0.06);border:1px solid rgba(184,80,80,0.25);border-radius:10px;padding:14px 18px;margin-bottom:24px;font-size:12px;color:#B85050;font-weight:500}
.section{margin-bottom:22px}
.section-title{font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.09em;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #EDF1F0}
.section-body{background:#F9F8F5;padding:16px;border-radius:10px;border-left:4px solid #3A6B6E;font-size:13px;line-height:1.7;color:#1A2B28;white-space:pre-wrap;min-height:40px}
.contacts{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.contact-card{background:#F9F8F5;padding:14px 16px;border-radius:10px;border-left:4px solid #3A6B6E}
.contact-card.urgency{border-left-color:#B85050}
.contact-card label{font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:6px}
.contact-card strong{font-size:14px;display:block;margin-bottom:3px}
.sig-area{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
.sig-line{border-top:1px solid #1A2B28;padding-top:8px;margin-top:48px;font-size:12px;color:#5A7270}
footer{margin-top:40px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0}}
</style></head><body>
<div class="header">
  <div><h1>Plan de Seguridad Personal</h1><p>${profile?.clinic||"Consultorio Psicológico"}${profile?.name?" · "+profile.name:""}${profile?.cedula?" · Céd. "+profile.cedula:""}</p></div>
  <div class="risk-badge">Riesgo ${rc.label}</div>
</div>
<div class="info-grid">
  <div class="info-box"><label>Paciente</label><p>${pendingRiskSave.patientName||"—"}</p></div>
  <div class="info-box"><label>Fecha</label><p>${today}</p></div>
  <div class="info-box"><label>Terapeuta</label><p>${profile?.name||"—"}</p></div>
</div>
<div class="warning">⚠️ Este plan fue elaborado ante la presencia de indicadores de riesgo. Úsalo cuando notes las señales de advertencia. Ante una crisis, contacta a las personas indicadas abajo o acude a urgencias.</div>
<div class="section">
  <div class="section-title">1. Señales de advertencia — Cuándo usar este plan</div>
  <div class="section-body">${safetyPlanDraft.warningSignals||"No especificado"}</div>
</div>
<div class="section">
  <div class="section-title">2. Estrategias de afrontamiento personal</div>
  <div class="section-body">${safetyPlanDraft.copingStrategies||"No especificado"}</div>
</div>
${safetyPlanDraft.reasonsToLive ? `<div class="section"><div class="section-title">3. Razones para vivir / Motivos de esperanza</div><div class="section-body">${safetyPlanDraft.reasonsToLive}</div></div>` : ""}
<div class="section">
  <div class="section-title">4. Red de apoyo en crisis</div>
  <div class="contacts">
    ${safetyPlanDraft.familyContact ? `<div class="contact-card"><label>Contacto familiar / personal</label><strong>${safetyPlanDraft.familyContact}</strong><span>${safetyPlanDraft.familyPhone||"Sin teléfono"}</span></div>` : ""}
    ${safetyPlanDraft.professionalContact ? `<div class="contact-card urgency"><label>Profesional de salud mental / crisis</label><strong>${safetyPlanDraft.professionalContact}</strong><span>${safetyPlanDraft.professionalPhone||""}</span></div>` : ""}
    <div class="contact-card urgency"><label>Línea de crisis (México)</label><strong>SAPTEL: 55 5259-8121</strong><span>24 horas, los 365 días</span></div>
    <div class="contact-card urgency"><label>Emergencias</label><strong>911</strong><span>Urgencias médicas y seguridad</span></div>
  </div>
</div>
${safetyPlanDraft.environmentSafety ? `<div class="section"><div class="section-title">5. Seguridad del entorno</div><div class="section-body">${safetyPlanDraft.environmentSafety}</div></div>` : ""}
<div class="sig-area">
  <div><div class="sig-line">Firma del paciente / Acuerdo verbal</div></div>
  <div><div class="sig-line">${profile?.name||"Terapeuta"} · ${profile?.cedula?"Céd. "+profile.cedula:""}</div></div>
</div>
<footer><span>PsychoCore · Documento generado ${today}</span><span>Este plan es confidencial y de uso personal del paciente</span></footer>
</body></html>`);
          w.document.close(); setTimeout(()=>w.print(),500);
        };

        return (
          <Modal open onClose={() => { setShowSafetyWizard(false); setPendingRiskSave(null); }} title="Plan de Seguridad — Elaborar ahora" width={560}>
            {/* Banner de alerta */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px",
              background:rc.bg, border:`2px solid ${rc.color}44`, borderRadius:12, marginBottom:20 }}>
              <ShieldAlert size={22} color={rc.color} style={{ flexShrink:0, marginTop:2 }}/>
              <div>
                <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:rc.color, marginBottom:4 }}>
                  Crisis detectada — Riesgo {rc.label}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:12, color:rc.color, lineHeight:1.55, opacity:0.9 }}>
                  Se registró un indicador de riesgo para <strong>{pendingRiskSave.patientName}</strong>.
                  Completa el Plan de Seguridad ahora para entregárselo al paciente antes de que salga de sesión.
                  Este plan también quedará en el expediente clínico.
                </div>
              </div>
            </div>

            {/* Paso 1: Señales de advertencia */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:6 }}>
                1 · Señales de advertencia — ¿Cuándo usar este plan?
              </label>
              <textarea value={safetyPlanDraft.warningSignals}
                onChange={e => spld("warningSignals")(e.target.value)} rows={3}
                placeholder="Ej. Cuando me aíslo de todos, cuando siento que nada tiene sentido, cuando el dolor se vuelve insoportable..."
                style={{ width:"100%", padding:"12px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
                  fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, resize:"vertical",
                  outline:"none", boxSizing:"border-box", lineHeight:1.65 }}/>
            </div>

            {/* Paso 2: Estrategias de afrontamiento */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:6 }}>
                2 · Estrategias de afrontamiento personal
              </label>
              <textarea value={safetyPlanDraft.copingStrategies}
                onChange={e => spld("copingStrategies")(e.target.value)} rows={3}
                placeholder="Ej. Respiración profunda, llamar a un amigo, salir a caminar, escuchar música, distracción con actividades..."
                style={{ width:"100%", padding:"12px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
                  fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, resize:"vertical",
                  outline:"none", boxSizing:"border-box", lineHeight:1.65 }}/>
            </div>

            {/* Paso 3: Contactos */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:10 }}>
                3 · Red de apoyo en crisis
              </label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, color:T.tl, marginBottom:5 }}>Familiar / persona de confianza</label>
                  <input value={safetyPlanDraft.familyContact} onChange={e => spld("familyContact")(e.target.value)}
                    placeholder="Nombre" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box", marginBottom:6 }}/>
                  <input value={safetyPlanDraft.familyPhone} onChange={e => spld("familyPhone")(e.target.value)}
                    placeholder="Teléfono" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, color:T.tl, marginBottom:5 }}>Profesional / servicio de crisis</label>
                  <input value={safetyPlanDraft.professionalContact} onChange={e => spld("professionalContact")(e.target.value)}
                    placeholder="Nombre o servicio" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box", marginBottom:6 }}/>
                  <input value={safetyPlanDraft.professionalPhone} onChange={e => spld("professionalPhone")(e.target.value)}
                    placeholder="Teléfono o extensión" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
                </div>
              </div>
              {/* Líneas de crisis fijas — contexto México */}
              <div style={{ padding:"10px 12px", background:"rgba(184,80,80,0.06)", borderRadius:9,
                border:"1px solid rgba(184,80,80,0.2)", fontFamily:T.fB, fontSize:11.5, color:"#B85050" }}>
                🆘 Pre-incluidos: <strong>SAPTEL 55 5259-8121</strong> (24h, gratuito) · <strong>911</strong> emergencias
              </div>
            </div>

            {/* Razones para vivir (opcional) */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:6 }}>
                4 · Razones para vivir <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(opcional)</span>
              </label>
              <textarea value={safetyPlanDraft.reasonsToLive}
                onChange={e => spld("reasonsToLive")(e.target.value)} rows={2}
                placeholder="Ej. Mi familia, mi mascota, mis sueños, querer ver crecer a mis hijos..."
                style={{ width:"100%", padding:"12px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
                  fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, resize:"vertical",
                  outline:"none", boxSizing:"border-box", lineHeight:1.65 }}/>
            </div>

            <div style={{ display:"flex", gap:10, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
              <button onClick={printSafetyPlanFromWizard}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 18px",
                  borderRadius:10, border:`1.5px solid rgba(184,80,80,0.5)`,
                  background:"rgba(184,80,80,0.08)", color:"#B85050",
                  fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                <Printer size={14}/> Imprimir PDF para paciente
              </button>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="ghost" onClick={() => { setShowSafetyWizard(false); setPendingRiskSave(null); }}>
                  Omitir por ahora
                </Btn>
                <Btn onClick={() => saveSafetyPlan(true)}>
                  <Check size={14}/> Guardar plan
                </Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ── Modal cobro post-sesión ─────────────────────────────────────── */}
      <Modal open={showCobro} onClose={skipCobro} title="Registrar cobro" width={420}>
        {/* Resumen de la sesión guardada */}
        {cobroData && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
            background:T.sucA, borderRadius:10, marginBottom:16, border:`1px solid ${T.suc}40` }}>
            <span style={{ fontSize:18 }}>✅</span>
            <div>
              <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:T.suc }}>
                Sesión guardada correctamente
              </div>
              <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm, marginTop:1 }}>
                {cobroData.patientName}
                {cobroData._agendaSynced && <span style={{ marginLeft:8, color:T.suc }}>· 📅 Cita marcada como completada</span>}
              </div>
            </div>
          </div>
        )}
        {/* ── Etapa 4: Sección de documentos para el paciente ──────────────── */}
        {cobroData?._session && (() => {
          const savedSession = cobroData._session;
          const savedPatient = cobroData._patient;
          const sessionRisk  = riskAssessments?.find(ra => ra.sessionId === savedSession.id);
          const hasRisk      = !!(sessionRisk && (
            sessionRisk.suicidalIdeation !== "ninguna" ||
            sessionRisk.selfHarm !== "ninguna" ||
            sessionRisk.harmToOthers
          ));

          const docItems = [
            {
              icon:   FileText,
              label:  "Nota de Evolución",
              hint:   `Formato ${savedSession.noteFormat?.toUpperCase() || "Libre"}`,
              accent: "#3A6B6E",
              accentA:"rgba(58,107,110,0.09)",
              border: "rgba(58,107,110,0.22)",
              action: () => {
                const folio = getSessionFolio(savedSession, [...sessions, savedSession]);
                printNotaEvolucion(savedSession, savedPatient, profile, riskAssessments, folio, NOTE_FORMATS);
              },
            },
            {
              icon:   FileCheck,
              label:  "Consentimiento",
              hint:   "Primera sesión",
              accent: "#6B5B9E",
              accentA:"rgba(107,91,158,0.09)",
              border: "rgba(107,91,158,0.22)",
              action: () => printConsentimientoInformado(savedPatient, profile),
            },
            ...(hasRisk ? [{
              icon:   ShieldCheck,
              label:  "Plan de Seguridad",
              hint:   `Riesgo ${sessionRisk.riskLevel || "activo"}`,
              accent: "#B85050",
              accentA:"rgba(184,80,80,0.09)",
              border: "rgba(184,80,80,0.28)",
              urgent: true,
              action: () => printPlanSeguridad(sessionRisk.safetyPlan, savedPatient, profile, sessionRisk.riskLevel),
            }] : []),
          ];

          return (
            <div style={{
              marginBottom:20,
              border:`1.5px solid ${T.bdr}`,
              borderRadius:14, overflow:"hidden",
            }}>
              {/* Header de la sección */}
              <div style={{
                padding:"10px 16px",
                background:`linear-gradient(135deg, ${T.pA} 0%, rgba(196,137,90,0.07) 100%)`,
                borderBottom:`1px solid ${T.bdrL}`,
                display:"flex", alignItems:"center", gap:8,
              }}>
                <Download size={13} color={T.p}/>
                <span style={{
                  fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p,
                  textTransform:"uppercase", letterSpacing:"0.07em",
                }}>
                  Documentos para el paciente
                </span>
                <span style={{
                  marginLeft:"auto", fontFamily:T.fB, fontSize:10.5,
                  color:T.tl, fontWeight:400,
                }}>
                  Genera antes de que salga de consulta
                </span>
              </div>

              {/* Cards de documentos */}
              <div style={{
                padding:"10px 10px 8px",
                background:T.card,
                display:"flex", flexDirection:"column", gap:6,
              }}>
                {docItems.map(doc => (
                  <button
                    key={doc.label}
                    onClick={doc.action}
                    style={{
                      display:"flex", alignItems:"center", gap:11,
                      padding:"11px 14px",
                      background: doc.urgent ? doc.accentA : T.cardAlt,
                      border:`1.5px solid ${doc.urgent ? doc.border : T.bdrL}`,
                      borderRadius:10, cursor:"pointer", textAlign:"left",
                      transition:"all .14s", fontFamily:T.fB,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = doc.accentA;
                      e.currentTarget.style.borderColor = doc.border;
                      e.currentTarget.style.transform = "translateX(2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = doc.urgent ? doc.accentA : T.cardAlt;
                      e.currentTarget.style.borderColor = doc.urgent ? doc.border : T.bdrL;
                      e.currentTarget.style.transform = "translateX(0)";
                    }}>
                    <div style={{
                      width:34, height:34, borderRadius:9, flexShrink:0,
                      background:`${doc.accent}18`,
                      border:`1.5px solid ${doc.accent}30`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <doc.icon size={16} color={doc.accent} strokeWidth={1.8}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:T.t, marginBottom:1 }}>
                        {doc.label}
                      </div>
                      <div style={{ fontSize:11, color:doc.urgent ? doc.accent : T.tl }}>
                        {doc.hint}
                      </div>
                    </div>
                    <Printer size={14} color={doc.accent} style={{ flexShrink:0, opacity:0.7 }}/>
                  </button>
                ))}
              </div>

              {/* Footer de la sección */}
              <div style={{
                padding:"8px 16px",
                background:T.bdrL,
                borderTop:`1px solid ${T.bdrL}`,
                fontFamily:T.fB, fontSize:10.5, color:T.tl,
                display:"flex", alignItems:"center", gap:5,
              }}>
                <Lock size={11} color={T.tl}/>
                Notas de supervisión privadas excluidas de todos los documentos.
              </div>
            </div>
          );
        })()}
        {getServiceOptions().length > 0 ? (
          <Select label="Servicio" value={cobroForm.serviceId} onChange={handleCobroService}
            options={[{value:"",label:"Seleccionar servicio..."}, ...getServiceOptions().map(s => ({value:s.id, label:s.label}))]} />
        ) : (
          <Input label="Concepto" value={cobroForm.concept} onChange={v => setCobroForm(f => ({...f, concept:v}))} placeholder="Sesión individual" />
        )}
        {showCobroModality && (
          <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:8 }}>
            <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.p, marginBottom:8 }}>¿Modalidad?</div>
            <div style={{ display:"flex", gap:8 }}>
              {[{mod:"presencial", icon:"🏢", label:"Presencial"}, {mod:"virtual", icon:"💻", label:"Virtual"}].map(({mod, icon, label}) => {
                const sel = cobroForm.modality === mod;
                return (
                  <button key={mod} onClick={() => applyCobroModality(mod)}
                    style={{ flex:1, padding:"8px", borderRadius:9, cursor:"pointer", fontFamily:T.fB, fontSize:12, fontWeight:600, transition:"all .15s",
                      border: `1.5px solid ${sel ? T.p : T.bdr}`,
                      background: sel ? T.pA : T.card,
                      color: sel ? T.p : T.t }}>
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {cobroForm.modality && !showCobroModality && (
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginBottom:8 }}>
            {cobroForm.modality === "presencial" ? "🏢 Presencial" : "💻 Virtual"}
            {" · "}<span style={{ color:T.p, cursor:"pointer", textDecoration:"underline" }} onClick={() => setShowCobroModality(true)}>Cambiar</span>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Monto (MXN) *" value={cobroForm.amount} onChange={v => setCobroForm(f => ({...f, amount:v}))} type="number" placeholder="900" />
          <Select label="Método" value={cobroForm.method} onChange={v => setCobroForm(f => ({...f, method:v}))}
            options={["Transferencia","Efectivo","Tarjeta","MercadoPago","PayPal"].map(m => ({value:m,label:m}))} />
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
          <Btn variant="ghost" onClick={skipCobro}>Omitir (pendiente)</Btn>
          <Btn onClick={saveCobro} disabled={!cobroForm.amount}><Check size={15}/> Guardar cobro</Btn>
        </div>
      </Modal>

      {/* ── Modal resumen IA ─────────────────────────────────────────────── */}
      <Modal open={showAiModal} onClose={() => { setShowAiModal(false); setAiSummary(null); setAiError(""); }} title="Resumen clínico con IA" width={540}>
        {aiLoading && (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", border:`3px solid rgba(107,91,158,0.2)`, borderTopColor:"#6B5B9E", animation:"spin .8s linear infinite", margin:"0 auto 16px" }}/>
            <p style={{ fontFamily:T.fB, fontSize:14, color:T.tm }}>Analizando notas clínicas…</p>
          </div>
        )}
        {aiError && (
          <div style={{ padding:"14px 16px", background:T.errA, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.err }}>{aiError}</div>
        )}
        {aiSummary && !aiLoading && (
          <div>
            <div style={{ background:T.cardAlt, borderRadius:12, padding:"18px 20px", marginBottom:16,
              border:`1.5px solid rgba(107,91,158,0.15)`, fontFamily:T.fB, fontSize:13.5,
              color:T.t, lineHeight:1.75, whiteSpace:"pre-wrap" }}>
              {aiSummary}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => navigator.clipboard.writeText(aiSummary)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9,
                  border:`1.5px solid ${T.bdr}`, background:"transparent", fontFamily:T.fB,
                  fontSize:13, color:T.tm, cursor:"pointer" }}>
                <Copy size={13}/> Copiar
              </button>
              <button onClick={() => { fld("privateNotes")(aiSummary); setShowAiModal(false); setAiSummary(null); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9,
                  border:"none", background:"rgba(107,91,158,0.12)", fontFamily:T.fB,
                  fontSize:13, color:"#6B5B9E", fontWeight:600, cursor:"pointer" }}>
                <FileText size={13}/> Agregar a notas privadas
              </button>
            </div>
          </div>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </Modal>

      {/* ── Task response viewer ─────────────────────────────────────────── */}
      {viewTaskResponse && (() => {
        const tpl = TASK_TEMPLATES[viewTaskResponse.template_id];
        return (
          <TaskResponseModal
            assignment={viewTaskResponse}
            template={tpl}
            onClose={() => setViewTaskResponse(null)}
          />
        );
      })()}

      {/* ── Wizard de Cierre de Sesión (Secciones 8.3 → 8.4 → 8.5) ────────── */}
      <Modal
        open={showCloseWizard}
        onClose={() => setShowCloseWizard(false)}
        title={`Cierre de sesión · Paso ${closeStep} de 3`}
        width={480}
      >
        {closeCtx && (() => {
          const pt = patients.find(p => p.id === closeCtx.patientId);

          // ── Indicador de pasos ──────────────────────────────────────────
          const steps = ["Intersesión", "Próxima cita", "Confirmar"];
          return (
            <>
              {/* Progress bar */}
              <div style={{ display:"flex", gap:6, marginBottom:20 }}>
                {steps.map((lbl, i) => {
                  const idx   = i + 1;
                  const done  = closeStep > idx;
                  const active= closeStep === idx;
                  return (
                    <div key={lbl} style={{ flex:1, textAlign:"center" }}>
                      <div style={{
                        height:4, borderRadius:9999, marginBottom:5,
                        background: done ? T.p : active ? T.p : T.bdrL,
                        opacity: done ? 0.4 : 1,
                        transition:"all .2s",
                      }}/>
                      <span style={{
                        fontFamily:T.fB, fontSize:10, fontWeight: active ? 700 : 400,
                        color: active ? T.p : done ? T.tl : T.tl,
                        textTransform:"uppercase", letterSpacing:"0.06em",
                      }}>{lbl}</span>
                    </div>
                  );
                })}
              </div>

              {/* Header paciente */}
              <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10,
                marginBottom:18, border:`1px solid ${T.p}25` }}>
                <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.p }}>
                  {pt?.name?.split(" ").slice(0,2).join(" ") || closeCtx.patientName}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm, marginTop:2 }}>
                  Sesión del {closeCtx.date}
                </div>
              </div>

              {/* ── Paso 1: Intersesión rápida (Sección 8.3) ───────────── */}
              {closeStep === 1 && (
                <>
                  <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:14, lineHeight:1.6 }}>
                    Registra indicaciones de medicación, contactos de seguimiento o intervenciones pautadas
                    entre sesiones. <span style={{ color:T.tl }}>(Opcional — puedes omitir)</span>
                  </p>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                      Tipo
                    </label>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {["Indicación","Medicación","Contacto de seguimiento","Tarea especial"].map(t => {
                        const on = closeInterForm.type === t;
                        return (
                          <button key={t} onClick={() => cifld("type")(t)}
                            style={{ padding:"6px 12px", borderRadius:9, cursor:"pointer",
                              fontFamily:T.fB, fontSize:12, fontWeight: on ? 700 : 400,
                              border:`1.5px solid ${on ? T.p : T.bdr}`,
                              background: on ? T.pA : "transparent",
                              color: on ? T.p : T.tm, transition:"all .13s" }}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ marginBottom:18 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                      Descripción
                    </label>
                    <textarea value={closeInterForm.notes} onChange={e => cifld("notes")(e.target.value)}
                      rows={3} placeholder="Ej: Continuar con sertralina 50mg. Llamar si hay crisis de ansiedad antes de la próxima cita..."
                      style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
                        borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t,
                        background:T.card, outline:"none", resize:"vertical",
                        boxSizing:"border-box", lineHeight:1.6 }}/>
                  </div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={() => setCloseStep(2)}
                      style={{ padding:"9px 16px", borderRadius:9, border:`1px solid ${T.bdrL}`,
                        background:"transparent", fontFamily:T.fB, fontSize:13,
                        color:T.tm, cursor:"pointer" }}>
                      Omitir
                    </button>
                    <button onClick={saveCloseIntersession}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px",
                        borderRadius:9, border:"none", background:T.p, color:"#fff",
                        fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                      <Check size={14}/> {closeInterForm.notes.trim() ? "Guardar y continuar" : "Continuar"}
                    </button>
                  </div>
                </>
              )}

              {/* ── Paso 2: Próxima cita (Sección 8.4) ─────────────────── */}
              {closeStep === 2 && (
                <>
                  <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:16, lineHeight:1.6 }}>
                    Agenda la próxima sesión directamente desde aquí.
                    <span style={{ color:T.tl }}> (Opcional — puedes omitir)</span>
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                        textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Fecha</label>
                      <input type="date" value={closeNextAppt.date}
                        onChange={e => cnfld("date")(e.target.value)}
                        style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
                          borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t,
                          background:T.card, outline:"none", boxSizing:"border-box" }}/>
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                        textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Hora</label>
                      <input type="time" value={closeNextAppt.time}
                        onChange={e => cnfld("time")(e.target.value)}
                        style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
                          borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t,
                          background:T.card, outline:"none", boxSizing:"border-box" }}/>
                    </div>
                  </div>
                  <div style={{ marginBottom:18 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Tipo</label>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {["Seguimiento","Evaluación","Crisis","Cierre"].map(t => {
                        const on = closeNextAppt.type === t;
                        return (
                          <button key={t} onClick={() => cnfld("type")(t)}
                            style={{ padding:"6px 12px", borderRadius:9, cursor:"pointer",
                              fontFamily:T.fB, fontSize:12, fontWeight: on ? 700 : 400,
                              border:`1.5px solid ${on ? T.p : T.bdr}`,
                              background: on ? T.pA : "transparent",
                              color: on ? T.p : T.tm, transition:"all .13s" }}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={() => setCloseStep(3)}
                      style={{ padding:"9px 16px", borderRadius:9, border:`1px solid ${T.bdrL}`,
                        background:"transparent", fontFamily:T.fB, fontSize:13,
                        color:T.tm, cursor:"pointer" }}>
                      Omitir
                    </button>
                    <button onClick={saveCloseNextAppt}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px",
                        borderRadius:9, border:"none", background:T.p, color:"#fff",
                        fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                      <Check size={14}/> {closeNextAppt.date ? "Agendar y continuar" : "Continuar"}
                    </button>
                  </div>
                </>
              )}

              {/* ── Paso 3: Confirmación WhatsApp (Sección 8.5) ──────────── */}
              {closeStep === 3 && (() => {
                const waUrl = whatsappNextAppt();
                return (
                  <>
                    <div style={{ textAlign:"center", padding:"8px 0 20px" }}>
                      <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
                      <div style={{ fontFamily:T.fB, fontSize:16, fontWeight:700, color:T.t, marginBottom:6 }}>
                        Sesión cerrada correctamente
                      </div>
                      <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm }}>
                        {closeInterForm.notes.trim() && "Intersesión registrada · "}
                        {closeNextAppt.date && `Próxima cita: ${closeNextAppt.date} ${closeNextAppt.time}`}
                      </div>
                    </div>

                    {waUrl ? (
                      <a href={waUrl} target="_blank" rel="noreferrer"
                        style={{ display:"flex", alignItems:"center", justifyContent:"center",
                          gap:8, padding:"14px", borderRadius:12, marginBottom:12,
                          background:"#25D36618", border:"1.5px solid #25D36650",
                          color:"#25D366", fontFamily:T.fB, fontSize:14,
                          fontWeight:700, textDecoration:"none", transition:"all .15s" }}
                        onMouseEnter={e => e.currentTarget.style.background="#25D36628"}
                        onMouseLeave={e => e.currentTarget.style.background="#25D36618"}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.529 5.845L.057 23.492l5.799-1.522A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.011-1.374l-.359-.214-3.44.902.918-3.352-.234-.372A9.818 9.818 0 1112 21.818z"/>
                        </svg>
                        Enviar confirmación al paciente
                      </a>
                    ) : (
                      <div style={{ padding:"12px 14px", background:T.bdrL, borderRadius:10,
                        fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:12, textAlign:"center" }}>
                        Sin teléfono registrado — no se puede enviar WhatsApp
                      </div>
                    )}

                    <button onClick={() => setShowCloseWizard(false)}
                      style={{ width:"100%", padding:"11px", borderRadius:10, border:`1px solid ${T.bdrL}`,
                        background:"transparent", fontFamily:T.fB, fontSize:13, color:T.tm, cursor:"pointer" }}>
                      Finalizar
                    </button>
                  </>
                );
              })()}
            </>
          );
        })()}
      </Modal>

      {/* ── Referral modal ───────────────────────────────────────────── */}
      <Modal open={!!referral} onClose={() => setReferral(null)} title="Carta de Derivación" width={520}>
        {referral && (
          <>
            <div style={{ padding:"12px 16px", background:T.pA, borderRadius:10, marginBottom:20 }}>
              <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.p }}>{referral.patient?.name||"Paciente"}</div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{referral.patient?.diagnosis||"Sin diagnóstico registrado"}</div>
            </div>
            <Input label="Derivar a (especialidad / servicio)" value={refForm.specialist} onChange={rfld("specialist")} placeholder="Ej. Psiquiatría, Neurología, Trabajo Social"/>
            <Textarea label="Motivo de derivación *" value={refForm.reason} onChange={rfld("reason")} placeholder="Describe el motivo por el que se deriva al paciente..." rows={3}/>
            <Textarea label="Información clínica adicional" value={refForm.notes} onChange={rfld("notes")} placeholder="Tratamiento actual, observaciones para el especialista..." rows={3}/>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={() => setReferral(null)}>Cancelar</Btn>
              <Btn variant="accent" onClick={() => { printReferralLetter(referral.patient, referral.session, profile, refForm); setReferral(null); }} disabled={!refForm.reason.trim()}>
                <Printer size={14}/> Generar carta PDF
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
