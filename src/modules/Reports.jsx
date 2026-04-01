import { useState, useMemo, useEffect } from "react";
import { FileText, Printer, ChevronRight, AlertTriangle, CheckCircle, Clock, TrendingUp, Clipboard, Check } from "lucide-react";
import { T } from "../theme.js";
import { fmtDate } from "../utils.js";
import { Btn, PageHeader } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useIsWide }   from "../hooks/useIsWide.js";
import { SCALES, getSeverity } from "./Scales.jsx";
import { RISK_CONFIG } from "./RiskAssessment.jsx";

const OBJECTIVE_STATUS = {
  pendiente:   { label: "Pendiente",   color: T.tl,  bg: T.bdrL  },
  en_proceso:  { label: "En proceso",  color: T.war, bg: T.warA  },
  logrado:     { label: "Logrado",     color: T.suc, bg: T.sucA  },
  abandonado:  { label: "Abandonado",  color: T.err, bg: T.errA  },
};

// ─────────────────────────────────────────────────────────────────────────────
// REPORT TYPE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_TYPES = {
  evaluacion: {
    id: "evaluacion",
    label: "Evaluación Inicial",
    desc: "Informe completo del proceso de evaluación: motivo de consulta, diagnóstico, escalas aplicadas y plan de tratamiento.",
    icon: Clipboard,
    color: T.p,
    bg: T.pA,
    requiredData: ["patient"],
    optionalData: ["treatmentPlan", "scales", "risk"],
  },
  alta: {
    id: "alta",
    label: "Alta Terapéutica",
    desc: "Resumen del proceso terapéutico, objetivos logrados, evolución en escalas y recomendaciones post-alta.",
    icon: CheckCircle,
    color: T.suc,
    bg: T.sucA,
    requiredData: ["patient", "sessions"],
    optionalData: ["treatmentPlan", "scales"],
  },
  derivacion: {
    id: "derivacion",
    label: "Derivación Extendida",
    desc: "Carta de derivación con historial clínico completo, tratamiento previo y motivo de referencia.",
    icon: ChevronRight,
    color: T.acc,
    bg: T.accA,
    requiredData: ["patient"],
    optionalData: ["scales", "risk", "sessions"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getLatestRisk(riskAssessments, patientId) {
  return [...riskAssessments.filter(r => r.patientId === patientId)]
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function getPatientScales(scaleResults, patientId) {
  return scaleResults
    .filter(r => r.patientId === patientId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getPatientSessions(sessions, patientId) {
  return [...sessions.filter(s => s.patientId === patientId)]
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getPatientPlan(treatmentPlans, patientId) {
  return treatmentPlans.filter(p => p.patientId === patientId)
    .sort((a, b) => b.startDate?.localeCompare(a.startDate || "") || 0)[0] || null;
}

function progressPct(objectives = []) {
  if (!objectives.length) return null;
  const done = objectives.filter(o => o.status === "logrado").length;
  return Math.round((done / objectives.length) * 100);
}

// Agrupa resultados de escalas por tipo: primero y último
function scaleComparison(allScales) {
  const byType = {};
  allScales.forEach(r => {
    if (!byType[r.scaleId]) byType[r.scaleId] = [];
    byType[r.scaleId].push(r);
  });
  return Object.entries(byType).map(([id, results]) => ({
    scaleId: id,
    first: results[0],
    last: results[results.length - 1],
    count: results.length,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATORS
// ─────────────────────────────────────────────────────────────────────────────
const BASE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:740px;margin:40px auto;color:#1A2B28;font-size:13.5px;line-height:1.7}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:22px;border-bottom:3px solid #3A6B6E}
.org h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#3A6B6E;margin-bottom:3px}
.org p{font-size:12px;color:#5A7270;margin-top:2px}
.date-block{text-align:right;font-size:12px;color:#5A7270}
.report-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#3A6B6E;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #D8E2E0}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
.info-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}
.info-box{background:#F9F8F5;padding:13px 16px;border-radius:10px}
.info-box label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#9BAFAD;margin-bottom:3px}
.info-box p{font-size:13.5px;font-weight:500;color:#1A2B28}
h2{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#3A6B6E;margin:28px 0 12px;padding-bottom:7px;border-bottom:1px solid #D8E2E0}
.text-block{background:#F9F8F5;padding:16px 20px;border-radius:10px;border-left:4px solid #3A6B6E;font-size:13.5px;line-height:1.75;color:#1A2B28;white-space:pre-wrap;margin-bottom:16px}
.text-block.accent{border-left-color:#C4895A}
.text-block.warn{border-left-color:#B8900A;background:rgba(184,144,10,0.06)}
.text-block.danger{border-left-color:#B85050;background:rgba(184,80,80,0.06)}
.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 11px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:.04em}
.scale-table{width:100%;border-collapse:collapse;margin-bottom:16px;border-radius:10px;overflow:hidden;border:1px solid #D8E2E0}
.scale-table thead tr{background:#3A6B6E}
.scale-table thead th{padding:9px 14px;text-align:left;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.9)}
.scale-table tbody tr{border-bottom:1px solid #EDF1F0}
.scale-table tbody tr:last-child{border-bottom:none}
.scale-table tbody td{padding:10px 14px;font-size:13px;vertical-align:middle}
.scale-table tbody tr:hover{background:#F9F8F5}
.obj-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:8px;margin-bottom:6px;background:#F9F8F5}
.obj-dot{width:10px;height:10px;border-radius:50%;margin-top:5px;flex-shrink:0}
.signature-area{margin-top:52px;display:grid;grid-template-columns:1fr 1fr;gap:48px}
.sig-line{border-top:1px solid #1A2B28;padding-top:8px;margin-top:56px;font-size:12px;color:#5A7270}
.sig-name{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:500;color:#1A2B28;margin-top:4px}
footer{margin-top:52px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
.risk-banner{padding:13px 18px;border-radius:10px;margin-bottom:16px;font-size:13px;font-weight:500;border:1px solid}
@media print{body{margin:0;max-width:none}}
`;

function buildLetterhead(profile, today) {
  return `
<div class="letterhead">
  <div class="org">
    <h1>${profile?.clinic || "Consultorio Psicológico"}</h1>
    <p>${profile?.name || ""}${profile?.specialty ? " · " + profile.specialty : ""}</p>
    ${profile?.cedula ? `<p>Cédula profesional: ${profile.cedula}</p>` : ""}
    ${profile?.phone ? `<p>Tel: ${profile.phone}</p>` : ""}
  </div>
  <div class="date-block">
    <div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#9BAFAD;margin-bottom:4px">Fecha de emisión</div>
    <div style="font-size:14px;color:#1A2B28;font-weight:500">${today}</div>
    <div style="margin-top:8px;font-size:11px;color:#9BAFAD">Documento confidencial</div>
  </div>
</div>`;
}

function buildPatientBlock(patient) {
  return `
<div class="info-grid">
  <div class="info-box"><label>Paciente</label><p>${patient.name}</p></div>
  <div class="info-box"><label>Fecha de nacimiento / Edad</label><p>${patient.birthDate ? fmtDate(patient.birthDate) + (patient.age ? " · " + patient.age + " años" : "") : patient.age ? patient.age + " años" : "No registrado"}</p></div>
  ${patient.phone ? `<div class="info-box"><label>Teléfono</label><p>${patient.phone}</p></div>` : ""}
  ${patient.email ? `<div class="info-box"><label>Correo electrónico</label><p>${patient.email}</p></div>` : ""}
</div>
${(patient.diagnosis || patient.diagnoses?.length) ? `
<div class="info-box" style="margin-bottom:16px">
  <label>Diagnóstico(s)</label>
  <p>${patient.diagnoses?.length ? patient.diagnoses.map(d => d.label || d).join(", ") : patient.diagnosis}</p>
</div>` : ""}`;
}

function buildScalesSection(scales, label = "Escalas psicométricas aplicadas") {
  if (!scales.length) return "";
  const rows = scales.map(({ scaleId, first, last, count }) => {
    const sc = SCALES[scaleId];
    if (!sc) return "";
    const firstSev = getSeverity(scaleId, first.score);
    const lastSev  = getSeverity(scaleId, last.score);
    const delta    = count > 1 ? last.score - first.score : null;
    const arrow    = delta === null ? "" : delta < 0 ? "▼" : delta > 0 ? "▲" : "=";
    const arrowColor = delta === null ? "" : delta < 0 ? "#4E8B5F" : delta > 0 ? "#B85050" : "#5A7270";
    return `
    <tr>
      <td><strong>${sc.name}</strong><br><span style="font-size:11px;color:#5A7270">${sc.domain}</span></td>
      <td style="text-align:center"><span class="badge" style="background:${firstSev?.bg};color:${firstSev?.color}">${first.score} ${firstSev?.label}</span><br><span style="font-size:11px;color:#9BAFAD">${fmtDate(first.date)}</span></td>
      ${count > 1 ? `<td style="text-align:center"><span class="badge" style="background:${lastSev?.bg};color:${lastSev?.color}">${last.score} ${lastSev?.label}</span><br><span style="font-size:11px;color:#9BAFAD">${fmtDate(last.date)}</span></td>
      <td style="text-align:center;font-size:18px;font-weight:700;color:${arrowColor}">${arrow} <span style="font-size:13px">${Math.abs(delta)}</span></td>`
      : `<td colspan="2" style="text-align:center;font-size:12px;color:#9BAFAD">Aplicación única</td>`}
      <td style="text-align:center;font-size:12px;color:#5A7270">${count} vez${count !== 1 ? "es" : ""}</td>
    </tr>`;
  }).join("");

  return `
<h2>${label}</h2>
<table class="scale-table">
  <thead>
    <tr>
      <th>Escala</th>
      <th>Primera aplicación</th>
      <th>Última aplicación</th>
      <th>Cambio</th>
      <th>N° aplic.</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildObjectivesSection(plan) {
  if (!plan?.objectives?.length) return "";
  const objRows = plan.objectives.map(obj => {
    const st = OBJECTIVE_STATUS[obj.status] || { label: obj.status, color: "#5A7270", bg: "#EDF1F0" };
    return `
    <div class="obj-item">
      <div class="obj-dot" style="background:${st.color}"></div>
      <div style="flex:1">
        <div style="font-size:13.5px;color:#1A2B28;margin-bottom:3px">${obj.description}</div>
        <span class="badge" style="background:${st.bg};color:${st.color}">${st.label}</span>
        ${obj.horizon ? `<span style="font-size:11px;color:#9BAFAD;margin-left:8px">${{ corto:"Corto plazo", mediano:"Mediano plazo", largo:"Largo plazo" }[obj.horizon] || obj.horizon}</span>` : ""}
        ${obj.achievedDate ? `<span style="font-size:11px;color:#4E8B5F;margin-left:8px">✓ Logrado: ${fmtDate(obj.achievedDate)}</span>` : ""}
      </div>
    </div>`;
  }).join("");
  const pct = progressPct(plan.objectives);
  return `
<h2>Objetivos terapéuticos</h2>
${pct !== null ? `<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
  <div style="flex:1;height:8px;background:#EDF1F0;border-radius:9999px;overflow:hidden">
    <div style="height:100%;width:${pct}%;background:#4E8B5F;border-radius:9999px;transition:width .3s"></div>
  </div>
  <div style="font-size:13px;font-weight:700;color:#4E8B5F;white-space:nowrap">${pct}% logrado</div>
</div>` : ""}
${objRows}`;
}

function buildSignature(profile, today) {
  return `
<div class="signature-area">
  <div>
    <div class="sig-line">
      <div class="sig-name">${profile?.name || "Psicólogo/a"}</div>
      <div style="font-size:12px;color:#5A7270;margin-top:3px">${profile?.specialty || "Psicólogo/a Clínico/a"}${profile?.cedula ? " · Cédula " + profile.cedula : ""}</div>
      ${profile?.clinic ? `<div style="font-size:12px;color:#5A7270">${profile.clinic}</div>` : ""}
    </div>
  </div>
  <div>
    <div class="sig-line">
      <div style="font-size:12px;color:#5A7270;margin-top:6px">Paciente / Tutor legal</div>
      <div style="font-size:12px;color:#9BAFAD;margin-top:3px">${today}</div>
    </div>
  </div>
</div>`;
}

// ── PDF 1: EVALUACIÓN INICIAL ────────────────────────────────────────────────
function printEvaluacion({ patient, plan, allScales, latestRisk, ptSessions, profile, custom }) {
  const w = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const firstSession = ptSessions[0];
  const scaleComp = scaleComparison(allScales);
  const rc = latestRisk ? RISK_CONFIG[latestRisk.riskLevel] : null;

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe de Evaluación — ${patient.name}</title>
<style>${BASE_STYLES}</style></head><body>

${buildLetterhead(profile, today)}

<div class="report-title">Informe de Evaluación Psicológica Inicial</div>

<h2>Datos del paciente</h2>
${buildPatientBlock(patient)}

<h2>Motivo de consulta</h2>
<div class="text-block">${custom.motivo || plan?.chiefComplaint || "No registrado."}</div>

${(() => {
  const fm = plan?.formulation;
  const hasStructured = fm && Object.values(fm).some(Boolean);
  const sec = (title, content, color = "#3A6B6E") =>
    content ? `<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${color};margin-bottom:4px">${title}</div><div class="text-block" style="border-left-color:${color};margin-bottom:0">${content}</div></div>` : "";

  if (hasStructured) return `
<h2>Formulación clínica — Modelo biopsicosocial</h2>
${sec("Historia del problema", fm.historiaPrima)}
${sec("Evolución y cronología", fm.evolucion)}
${sec("Tratamientos previos", fm.tratamientosPrevios)}
<div style="margin:16px 0 8px;font-size:11px;font-weight:700;color:#5B8DB8;text-transform:uppercase;letter-spacing:.07em">Factores predisponentes</div>
${sec("Biológicos", fm.predisponentesBio, "#5B8DB8")}
${sec("Psicológicos", fm.predisponentesPsi, "#5B8DB8")}
${sec("Sociales / contextuales", fm.predisponentesSoc, "#5B8DB8")}
${sec("Factores precipitantes", fm.precipitantes, "#B8900A")}
${sec("Factores mantenedores", fm.mantenedores, "#B8900A")}
${sec("Recursos y fortalezas", fm.recursos, "#C4895A")}
${sec("Hipótesis clínica integradora", fm.hipotesis, "#C4895A")}
${sec("Diagnóstico diferencial", fm.diagnosticoDiferencial, "#C4895A")}`;

  return plan?.clinicalFormulation
    ? `<h2>Formulación clínica</h2><div class="text-block">${plan.clinicalFormulation}</div>`
    : "";
})()}

${plan?.therapeuticApproach ? `<h2>Enfoque terapéutico</h2>
<div class="text-block accent">${plan.therapeuticApproach}</div>` : ""}

${firstSession ? `<h2>Datos de la evaluación</h2>
<div class="info-grid-3">
  <div class="info-box"><label>Fecha de primera sesión</label><p>${fmtDate(firstSession.date)}</p></div>
  <div class="info-box"><label>Total de sesiones</label><p>${ptSessions.length} sesión${ptSessions.length !== 1 ? "es" : ""}</p></div>
  ${plan?.modality ? `<div class="info-box"><label>Modalidad</label><p>${plan.modality}</p></div>` : ""}
</div>` : ""}

${buildScalesSection(scaleComp, "Escalas psicométricas aplicadas")}

${latestRisk ? `<h2>Evaluación de riesgo</h2>
<div class="risk-banner" style="background:${rc?.bg};border-color:${rc?.color};color:${rc?.color}">
  Nivel de riesgo: <strong>${rc?.label}</strong> · Evaluación del ${fmtDate(latestRisk.date)}
  ${latestRisk.suicidalIdeation && latestRisk.suicidalIdeation !== "ninguna" ? ` · Ideación suicida: ${latestRisk.suicidalIdeation}` : ""}
</div>
${latestRisk.safetyPlan?.copingStrategies ? `<div class="text-block warn">Estrategias de afrontamiento activas: ${latestRisk.safetyPlan.copingStrategies}</div>` : ""}` : ""}

${plan?.objectives?.length ? buildObjectivesSection(plan) : ""}

<h2>Impresión clínica y recomendaciones</h2>
<div class="text-block">${custom.impresion || "Pendiente de completar."}</div>

${custom.observaciones ? `<h2>Observaciones adicionales</h2>
<div class="text-block">${custom.observaciones}</div>` : ""}

${buildSignature(profile, today)}

<footer><span>PsychoCore · Informe de Evaluación Psicológica</span><span>Documento confidencial · ${today}</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ── PDF 2: ALTA TERAPÉUTICA ──────────────────────────────────────────────────
export function printAlta({ patient, plan, allScales, ptSessions, profile, custom = {}, discharge }) {
  const w = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const firstSession = ptSessions[0];
  const lastSession  = ptSessions[ptSessions.length - 1];
  const scaleComp    = scaleComparison(allScales);
  const pct          = plan ? progressPct(plan.objectives) : null;

  // Merge discharge data into effective custom fields
  const MOTIVO_LABEL = {
    logros:     "Objetivos terapéuticos logrados",
    voluntaria: "Alta voluntaria del paciente",
    derivacion: "Derivación a otro profesional",
    otros:      "Otros",
  };
  const effectiveCustom = {
    ...custom,
    ...(discharge?.notes           ? { estadoAlta:      discharge.notes           } : {}),
    ...(discharge?.recommendations ? { recomendaciones: discharge.recommendations } : {}),
  };

  // Progress distribution
  const progDist = { excelente: 0, bueno: 0, moderado: 0, bajo: 0 };
  ptSessions.forEach(s => { if (progDist[s.progress] !== undefined) progDist[s.progress]++; });
  const progRows = Object.entries(progDist)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `<span style="margin-right:12px"><strong>${v}</strong> ${k}</span>`).join("");

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe de Alta — ${patient.name}</title>
<style>${BASE_STYLES}</style></head><body>

${buildLetterhead(profile, today)}

<div class="report-title">Informe de Alta Terapéutica</div>

${discharge ? `<div style="background:#EBF5EC;border:1.5px solid #4E8B5F40;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;gap:18px;flex-wrap:wrap">
  ${discharge.date ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#4E8B5F;margin-bottom:3px">Fecha de alta</div><div style="font-size:13.5px;font-weight:600;color:#1A2B28">${fmtDate(discharge.date)}</div></div>` : ""}
  ${discharge.reason ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#4E8B5F;margin-bottom:3px">Motivo de alta</div><div style="font-size:13.5px;font-weight:600;color:#1A2B28">${MOTIVO_LABEL[discharge.reason] || discharge.reason}</div></div>` : ""}
</div>` : ""}

<h2>Datos del paciente</h2>
${buildPatientBlock(patient)}

<h2>Resumen del proceso terapéutico</h2>
<div class="info-grid-3">
  ${firstSession ? `<div class="info-box"><label>Inicio del tratamiento</label><p>${fmtDate(firstSession.date)}</p></div>` : ""}
  ${lastSession  ? `<div class="info-box"><label>Última sesión</label><p>${fmtDate(lastSession.date)}</p></div>` : ""}
  <div class="info-box"><label>Total de sesiones</label><p>${ptSessions.length} sesión${ptSessions.length !== 1 ? "es" : ""}</p></div>
  ${plan?.therapeuticApproach ? `<div class="info-box"><label>Enfoque terapéutico</label><p>${plan.therapeuticApproach}</p></div>` : ""}
  ${plan?.modality ? `<div class="info-box"><label>Modalidad</label><p>${plan.modality}</p></div>` : ""}
  ${pct !== null ? `<div class="info-box"><label>Objetivos logrados</label><p style="color:#4E8B5F;font-weight:700">${pct}%</p></div>` : ""}
</div>

${ptSessions.length > 0 ? `<div style="background:#F9F8F5;padding:13px 18px;border-radius:10px;margin-bottom:16px">
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9BAFAD;margin-bottom:6px">Distribución del progreso</div>
  <div style="font-size:13px;color:#1A2B28">${progRows || "Sin datos"}</div>
</div>` : ""}

${effectiveCustom.evolucion ? `<h2>Evolución del paciente</h2>
<div class="text-block">${effectiveCustom.evolucion}</div>` : ""}

${plan?.objectives?.length ? buildObjectivesSection(plan) : ""}

${buildScalesSection(scaleComp, "Evolución en escalas psicométricas")}

${plan?.dischargeCriteria ? `<h2>Criterios de alta alcanzados</h2>
<div class="text-block">${plan.dischargeCriteria}</div>` : ""}

<h2>Estado al alta</h2>
<div class="text-block">${effectiveCustom.estadoAlta || "Pendiente de completar."}</div>

<h2>Plan de prevención de recaídas</h2>
<div class="text-block">${effectiveCustom.prevencion || "Pendiente de completar."}</div>

<h2>Recomendaciones post-alta</h2>
<div class="text-block accent">${effectiveCustom.recomendaciones || "Pendiente de completar."}</div>

${effectiveCustom.observaciones ? `<h2>Observaciones adicionales</h2>
<div class="text-block">${effectiveCustom.observaciones}</div>` : ""}

${buildSignature(profile, today)}

<footer><span>PsychoCore · Informe de Alta Terapéutica</span><span>Documento confidencial · ${today}</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ── PDF 3: DERIVACIÓN EXTENDIDA ──────────────────────────────────────────────
export function printDerivacion({ patient, plan, allScales, latestRisk, ptSessions, profile, custom }) {
  const w = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  // Escala más reciente por tipo (la que se mostrará en el informe)
  const latestScales = allScales.reduce((acc, r) => {
    if (!acc[r.scaleId] || r.date > acc[r.scaleId].date) acc[r.scaleId] = r;
    return acc;
  }, {});
  const latestScaleList = scaleComparison(
    Object.values(latestScales).map(r => ({ scaleId: r.scaleId, first: r, last: r, count: 1 }))
  );

  const rc = latestRisk ? RISK_CONFIG[latestRisk.riskLevel] : null;
  const firstSession = ptSessions[0];
  const lastSession  = ptSessions[ptSessions.length - 1];

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Carta de Derivación — ${patient.name}</title>
<style>${BASE_STYLES}</style></head><body>

${buildLetterhead(profile, today)}

<div class="report-title">Carta de Derivación Extendida</div>

<p style="margin-bottom:20px">Por medio de la presente, me permito referir al/a la paciente:</p>

<h2>Datos del paciente</h2>
${buildPatientBlock(patient)}

${custom.destinatario ? `<h2>Dirigida a</h2>
<div class="info-grid">
  <div class="info-box"><label>Especialidad / Servicio</label><p>${custom.destinatario}</p></div>
  ${custom.profesional ? `<div class="info-box"><label>Profesional</label><p>${custom.profesional}</p></div>` : ""}
</div>` : ""}

<h2>Motivo de derivación</h2>
<div class="text-block accent">${custom.motivo || "Pendiente de completar."}</div>

${ptSessions.length > 0 ? `<h2>Historial de tratamiento</h2>
<div class="info-grid-3">
  ${firstSession ? `<div class="info-box"><label>Inicio del tratamiento</label><p>${fmtDate(firstSession.date)}</p></div>` : ""}
  ${lastSession  ? `<div class="info-box"><label>Última sesión</label><p>${fmtDate(lastSession.date)}</p></div>` : ""}
  <div class="info-box"><label>Total de sesiones</label><p>${ptSessions.length}</p></div>
  ${plan?.therapeuticApproach ? `<div class="info-box"><label>Enfoque aplicado</label><p>${plan.therapeuticApproach}</p></div>` : ""}
</div>` : ""}

${custom.resumenClinico ? `<h2>Resumen clínico</h2>
<div class="text-block">${custom.resumenClinico}</div>` : ""}

${latestRisk ? `<h2>Estado actual de riesgo</h2>
<div class="risk-banner" style="background:${rc?.bg};border-color:${rc?.color};color:${rc?.color}">
  Nivel de riesgo: <strong>${rc?.label}</strong> · Evaluación del ${fmtDate(latestRisk.date)}
</div>` : ""}

${latestScaleList.length ? buildScalesSection(latestScaleList, "Resultados actuales de escalas") : ""}

${custom.informacionAdicional ? `<h2>Información clínica adicional</h2>
<div class="text-block">${custom.informacionAdicional}</div>` : ""}

<p style="margin:24px 0">Agradezco de antemano la atención prestada y quedo a disposición para cualquier información adicional que se requiera.</p>
<p>Atentamente,</p>

${buildSignature(profile, today)}

<footer><span>PsychoCore · Carta de Derivación</span><span>Documento confidencial · ${today}</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function DataChip({ ok, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: T.fB, background: ok ? T.sucA : T.bdrL, color: ok ? T.suc : T.tl, marginRight: 6, marginBottom: 6 }}>
      {ok ? <Check size={10} /> : <Clock size={10} />} {label}
    </span>
  );
}

function ReportTypeCard({ type, active, onClick, disabled }) {
  const Icon = type.icon;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%", padding: 16, borderRadius: 12, border: `2px solid ${active ? type.color : T.bdr}`, background: active ? type.bg : T.card, cursor: disabled ? "not-allowed" : "pointer", textAlign: "left", transition: "all .15s", opacity: disabled ? 0.5 : 1, marginBottom: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? type.bg : T.bdrL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1.5px solid ${active ? type.color + "40" : "transparent"}` }}>
        <Icon size={16} color={active ? type.color : T.tm} />
      </div>
      <div>
        <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: active ? type.color : T.t, marginBottom: 3 }}>{type.label}</div>
        <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {type.desc}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITABLE FIELDS PER REPORT TYPE
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_FIELDS = {
  evaluacion: [
    { key: "motivo", label: "Motivo de consulta", hint: "Se prellenará desde el plan de tratamiento si existe.", rows: 4 },
    { key: "impresion", label: "Impresión clínica y recomendaciones *", hint: "Síntesis del cuadro clínico y plan propuesto.", rows: 5 },
    { key: "observaciones", label: "Observaciones adicionales", hint: "Información complementaria (opcional).", rows: 3 },
  ],
  alta: [
    { key: "evolucion", label: "Evolución del paciente", hint: "Describe el progreso a lo largo del proceso terapéutico.", rows: 5 },
    { key: "estadoAlta", label: "Estado al alta *", hint: "Condición actual del paciente al cierre del proceso.", rows: 4 },
    { key: "prevencion", label: "Plan de prevención de recaídas *", hint: "Estrategias acordadas con el paciente para mantener los logros.", rows: 4 },
    { key: "recomendaciones", label: "Recomendaciones post-alta", hint: "Seguimiento sugerido, recursos, grupos de apoyo, etc.", rows: 3 },
    { key: "observaciones", label: "Observaciones adicionales", hint: "Opcional.", rows: 2 },
  ],
  derivacion: [
    { key: "destinatario", label: "Especialidad / Servicio al que se deriva", hint: "Ej: Psiquiatría, Neurología, Trabajo Social.", rows: 1 },
    { key: "profesional", label: "Nombre del profesional (opcional)", hint: "", rows: 1 },
    { key: "motivo", label: "Motivo de derivación *", hint: "Razón principal por la que se refiere al paciente.", rows: 4 },
    { key: "resumenClinico", label: "Resumen clínico", hint: "Descripción del cuadro, evolución y estado actual.", rows: 5 },
    { key: "informacionAdicional", label: "Información clínica adicional", hint: "Medicación actual, consideraciones especiales, etc.", rows: 3 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────────────────
export default function Reports({ patients = [], sessions = [], scaleResults = [], treatmentPlans = [], riskAssessments = [], profile }) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [reportType, setReportType]               = useState("evaluacion");
  const [customFields, setCustomFields]            = useState({});
  const [generated, setGenerated]                 = useState(false);
  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  const patient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const ptData = useMemo(() => {
    if (!patient) return null;
    const ptSessions  = getPatientSessions(sessions, patient.id);
    const allScales   = getPatientScales(scaleResults, patient.id);
    const plan        = getPatientPlan(treatmentPlans, patient.id);
    const latestRisk  = getLatestRisk(riskAssessments, patient.id);
    return { ptSessions, allScales, plan, latestRisk };
  }, [patient, sessions, scaleResults, treatmentPlans, riskAssessments]);

  // Pre-fill campos desde datos existentes cuando cambia el paciente o tipo
  useEffect(() => {
    if (!patient || !ptData) { setCustomFields({}); setGenerated(false); return; }
    const fills = {};
    if (reportType === "evaluacion") {
      fills.motivo = ptData.plan?.chiefComplaint || "";
    }
    if (reportType === "alta") {
      fills.prevencion = ptData.plan?.notes || "";
    }
    setCustomFields(fills);
    setGenerated(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId, reportType]);

  const setField = (key, val) => setCustomFields(prev => ({ ...prev, [key]: val }));

  const hasMinData = useMemo(() => {
    if (!patient) return false;
    if (reportType === "alta") return ptData?.ptSessions?.length > 0;
    return true;
  }, [patient, reportType, ptData]);

  const handleGenerate = () => {
    const args = { patient, plan: ptData.plan, allScales: ptData.allScales, latestRisk: ptData.latestRisk, ptSessions: ptData.ptSessions, profile, custom: customFields };
    if (reportType === "evaluacion") printEvaluacion(args);
    else if (reportType === "alta")  printAlta(args);
    else if (reportType === "derivacion") printDerivacion(args);
    setGenerated(true);
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader
        title="Informes"
        subtitle="Generación automática de informes a partir del expediente clínico"
      />

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", gap: 24 }}>

        {/* ── LEFT PANEL ───────────────────────────────────────────── */}
        <div>
          {/* Patient selector */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.tm, marginBottom: 10 }}>
              1 · Seleccionar paciente
            </div>
            <select value={selectedPatientId} onChange={e => { setSelectedPatientId(e.target.value); setGenerated(false); }}
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${selectedPatientId ? T.p : T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", cursor: "pointer" }}>
              <option value="">Seleccionar paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Data availability */}
            {patient && ptData && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.tl, marginBottom: 8 }}>Datos disponibles</div>
                <DataChip ok label="Expediente" />
                <DataChip ok={ptData.ptSessions.length > 0} label={`${ptData.ptSessions.length} sesión${ptData.ptSessions.length !== 1 ? "es" : ""}`} />
                <DataChip ok={!!ptData.plan} label="Plan de tto." />
                <DataChip ok={!!(ptData.plan?.formulation && Object.values(ptData.plan.formulation).some(Boolean))} label="Formulación" />
                <DataChip ok={ptData.allScales.length > 0} label={`${ptData.allScales.length} escala${ptData.allScales.length !== 1 ? "s" : ""}`} />
                <DataChip ok={!!ptData.latestRisk} label="Evaluación riesgo" />
              </div>
            )}
          </div>

          {/* Report type */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.tm, marginBottom: 12 }}>
              2 · Tipo de informe
            </div>
            {Object.values(REPORT_TYPES).map(type => (
              <ReportTypeCard
                key={type.id}
                type={type}
                active={reportType === type.id}
                disabled={!patient}
                onClick={() => { setReportType(type.id); setGenerated(false); }}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────── */}
        <div>
          {!patient ? (
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 400 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: T.pA, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={24} color={T.p} />
              </div>
              <div style={{ fontFamily: T.fH, fontSize: 22, color: T.p, fontWeight: 500 }}>Selecciona un paciente</div>
              <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
                El informe se construirá automáticamente con los datos existentes del expediente. Solo tendrás que completar los campos narrativos.
              </div>
            </div>
          ) : (
            <>
              {/* Report type header */}
              {(() => {
                const rt = REPORT_TYPES[reportType];
                const Icon = rt.icon;
                return (
                  <div style={{ background: rt.bg, borderRadius: 14, border: `1.5px solid ${rt.color}30`, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: rt.bg, border: `1.5px solid ${rt.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={18} color={rt.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: rt.color }}>{rt.label}</div>
                      <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginTop: 1 }}>Para: <strong style={{ color: T.t }}>{patient.name}</strong></div>
                    </div>
                    {!hasMinData && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9999, background: T.warA, color: T.war, fontSize: 11, fontWeight: 700 }}>
                        <AlertTriangle size={11} /> Datos insuficientes
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Auto-populated data summary */}
              <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.tm, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <TrendingUp size={12} color={T.p} /> Datos que se incluirán automáticamente
                </div>
                <div style={{ fontSize: 12.5, color: T.t, lineHeight: 1.7 }}>
                  {reportType === "evaluacion" && <>
                    ✓ Expediente del paciente (datos personales{patient.cie11Code ? `, diagnóstico CIE-11 ${patient.cie11Code}` : ", diagnóstico"})<br />
                    {ptData.plan && <>✓ Motivo de consulta y enfoque terapéutico<br /></>}
                    {ptData.plan?.formulation && Object.values(ptData.plan.formulation).some(Boolean) && <>✓ Formulación biopsicosocial estructurada ({Object.values(ptData.plan.formulation).filter(Boolean).length}/11 secciones)<br /></>}
                    {ptData.ptSessions.length > 0 && <>✓ Fecha de inicio y número de sesiones<br /></>}
                    {ptData.allScales.length > 0 && <>✓ Escalas psicométricas aplicadas ({ptData.allScales.length} resultado{ptData.allScales.length !== 1 ? "s" : ""})<br /></>}
                    {ptData.latestRisk && <>✓ Evaluación de riesgo (nivel: {RISK_CONFIG[ptData.latestRisk.riskLevel]?.label})<br /></>}
                    {ptData.plan?.objectives?.length > 0 && <>✓ Objetivos terapéuticos ({ptData.plan.objectives.length} objetivo{ptData.plan.objectives.length !== 1 ? "s" : ""})</>}
                  </>}
                  {reportType === "alta" && <>
                    ✓ Expediente del paciente<br />
                    {ptData.ptSessions.length > 0 && <>✓ Historial de sesiones ({ptData.ptSessions.length} en total, con progreso y distribución)<br /></>}
                    {ptData.allScales.length > 0 && <>✓ Evolución en escalas (primera vs. última aplicación)<br /></>}
                    {ptData.plan?.objectives?.length > 0 && <>✓ Objetivos con estado de logro ({progressPct(ptData.plan.objectives)}% completados)<br /></>}
                    {ptData.plan?.dischargeCriteria && <>✓ Criterios de alta</>}
                  </>}
                  {reportType === "derivacion" && <>
                    ✓ Expediente del paciente (datos personales, diagnóstico)<br />
                    {ptData.ptSessions.length > 0 && <>✓ Historial de tratamiento (fechas y número de sesiones)<br /></>}
                    {ptData.allScales.length > 0 && <>✓ Resultados más recientes de escalas<br /></>}
                    {ptData.latestRisk && <>✓ Estado actual de riesgo (nivel: {RISK_CONFIG[ptData.latestRisk.riskLevel]?.label})</>}
                  </>}
                </div>
              </div>

              {/* Editable fields */}
              <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.tl, marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={12} color={T.tl} /> Secciones narrativas
                </div>

                {REPORT_FIELDS[reportType].map(field => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t, marginBottom: 4 }}>{field.label}</label>
                    {field.hint && <div style={{ fontSize: 11, color: T.tl, marginBottom: 6 }}>{field.hint}</div>}
                    {field.rows === 1 ? (
                      <input
                        value={customFields[field.key] || ""}
                        onChange={e => setField(field.key, e.target.value)}
                        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.bg, outline: "none", boxSizing: "border-box" }}
                      />
                    ) : (
                      <textarea
                        value={customFields[field.key] || ""}
                        onChange={e => setField(field.key, e.target.value)}
                        rows={field.rows}
                        style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.bg, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Generate button */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
                {generated && (
                  <span style={{ fontFamily: T.fB, fontSize: 12, color: T.suc, display: "flex", alignItems: "center", gap: 5 }}>
                    <Check size={13} /> Informe generado — revisa la ventana emergente
                  </span>
                )}
                <Btn onClick={handleGenerate} disabled={!hasMinData}
                  style={{ padding: "12px 24px", fontSize: 14 }}>
                  <Printer size={16} /> Generar informe PDF
                </Btn>
              </div>

              {!hasMinData && reportType === "alta" && (
                <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: T.warA, border: `1px solid ${T.war}30`, color: T.war, fontSize: 12.5, fontFamily: T.fB }}>
                  <strong>Nota:</strong> El Informe de Alta requiere al menos una sesión registrada para el paciente.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


